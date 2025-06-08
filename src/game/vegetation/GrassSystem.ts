import * as THREE from 'three';
import { GrassConfig, DEFAULT_GRASS_CONFIG, BiomeInfo } from './core/GrassConfig';
import { GrassRenderer } from './core/GrassRenderer';
import { BiomeManager } from './biomes/BiomeManager';
import { LODManager } from './performance/LODManager';
import { WindSystem } from './animation/WindSystem';
import { EnvironmentalGrassDistribution, EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { RegionCoordinates } from '../world/RingQuadrantSystem';
import { TimeUtils } from '../utils/TimeUtils';
import { TIME_PHASES } from '../config/DayNightConfig';
import { GrassShader } from './core/GrassShader';
import { BatchProcessor } from '../utils/performance/BatchProcessor';
import { EnhancedLODManager } from '../utils/performance/EnhancedLODManager';
import { PerformanceMonitor } from '../utils/performance/PerformanceMonitor';

export class GrassSystem {
  private scene: THREE.Scene;
  private config: GrassConfig;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  
  // Core systems
  private renderer: GrassRenderer;
  private lodManager: LODManager;
  private enhancedLODManager: EnhancedLODManager;
  private windSystem: WindSystem;
  
  // Performance optimization systems
  private materialUpdateProcessor: BatchProcessor<THREE.ShaderMaterial>;
  private visibilityUpdateProcessor: BatchProcessor<THREE.InstancedMesh>;
  private performanceMonitor: PerformanceMonitor;
  
  // Enhanced performance optimization
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 5; // Reduced frequency
  private readonly FOG_CHECK_INTERVAL: number = 150; // Reduced frequency
  private readonly VISIBILITY_UPDATE_INTERVAL: number = 10; // Batch visibility updates
  
  constructor(scene: THREE.Scene, config?: Partial<GrassConfig>, performanceMonitor?: PerformanceMonitor) {
    this.scene = scene;
    this.config = { ...DEFAULT_GRASS_CONFIG, ...config };
    
    this.renderer = new GrassRenderer(scene);
    this.lodManager = new LODManager();
    this.windSystem = new WindSystem();
    
    // Performance systems
    this.performanceMonitor = performanceMonitor || new PerformanceMonitor();
    this.enhancedLODManager = new EnhancedLODManager(this.performanceMonitor);
    
    // Batched processors for performance
    this.materialUpdateProcessor = new BatchProcessor<THREE.ShaderMaterial>(
      (material, deltaTime) => this.updateSingleMaterial(material, deltaTime),
      5 // Process 5 materials per frame
    );
    
    this.visibilityUpdateProcessor = new BatchProcessor<THREE.InstancedMesh>(
      (mesh, deltaTime) => this.updateSingleMeshVisibility(mesh),
      8 // Process 8 meshes per frame
    );
    
    console.log('🌱 Optimized grass system initialized with enhanced performance systems');
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number,
    currentPlayerPosition?: THREE.Vector3
  ): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    if (this.renderer.getGrassInstances().has(regionKey)) return;
    
    // Calculate LOD density
    const playerPos = currentPlayerPosition || this.lodManager.getLastPlayerPosition();
    const distanceFromPlayer = centerPosition.distanceTo(playerPos);
    const lodDensityMultiplier = this.lodManager.calculateLODDensity(distanceFromPlayer);
    
    // Get biome information
    const biomeInfo = BiomeManager.getBiomeAtPosition(centerPosition);
    const biomeConfig = BiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    console.log(`🌱 Generating ${biomeConfig.name} grass (LOD: ${lodDensityMultiplier.toFixed(3)}) for region ${regionKey}`);
    
    // Create environmental factors
    const environmentalFactors = this.createEnvironmentalFactors(centerPosition, region, terrainColor);
    
    // Generate grass distributions
    const tallGrassData = this.generateGrassDistribution(
      centerPosition, size, environmentalFactors, lodDensityMultiplier, biomeInfo, false
    );
    
    const groundGrassData = this.generateGrassDistribution(
      centerPosition, size, environmentalFactors, lodDensityMultiplier, biomeInfo, true
    );
    
    // Group by species and create meshes
    const tallGrassGroups = this.groupGrassBySpecies(tallGrassData);
    const groundGrassGroups = this.groupGrassBySpecies(groundGrassData);
    
    // Create instanced meshes
    for (const [speciesName, speciesData] of Object.entries(tallGrassGroups)) {
      this.renderer.createInstancedMesh(
        regionKey, speciesName, speciesData, region, biomeInfo, false, lodDensityMultiplier
      );
    }
    
    for (const [speciesName, speciesData] of Object.entries(groundGrassGroups)) {
      this.renderer.createInstancedMesh(
        regionKey, speciesName, speciesData, region, biomeInfo, true, lodDensityMultiplier
      );
    }
    
    console.log(`✅ Generated ${biomeConfig.name} grass: ${tallGrassData.positions.length} tall, ${groundGrassData.positions.length} ground blades`);
  }
  
  private generateGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number,
    biomeInfo: BiomeInfo,
    isGroundGrass: boolean
  ) {
    // Get the appropriate config based on grass type
    const config = isGroundGrass 
      ? BiomeManager.getGroundConfiguration(biomeInfo.type)
      : BiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    const adjustedDensity = this.config.baseDensity * config.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    const minimumCoverage = isGroundGrass ? 0.6 : 0.25;
    
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing,
      minimumCoverage,
      lodDensityMultiplier,
      20 // edge blend distance
    );
    
    // Adjust species and heights for biome
    if (isGroundGrass) {
      const groundConfig = BiomeManager.getGroundConfiguration(biomeInfo.type);
      grassData.species = BiomeManager.adjustGroundSpeciesForBiome(grassData.species, biomeInfo.type);
      const heightMultiplier = groundConfig.heightReduction;
      for (let i = 0; i < grassData.scales.length; i++) {
        grassData.scales[i].y *= heightMultiplier * (0.8 + Math.random() * 0.4);
      }
    } else {
      const biomeConfig = BiomeManager.getBiomeConfiguration(biomeInfo.type);
      grassData.species = BiomeManager.adjustSpeciesForBiome(grassData.species, biomeInfo);
      const heightMultiplier = biomeConfig.heightMultiplier;
      for (let i = 0; i < grassData.scales.length; i++) {
        grassData.scales[i].y *= heightMultiplier * (0.7 + Math.random() * 0.6);
      }
    }
    
    return grassData;
  }
  
  private createEnvironmentalFactors(
    centerPosition: THREE.Vector3,
    region: RegionCoordinates,
    terrainColor: number
  ): EnvironmentalFactors {
    const waterInfluence = Math.sin(centerPosition.x * 0.02) * Math.cos(centerPosition.z * 0.02);
    const treeInfluence = Math.sin(centerPosition.x * 0.03 + 1) * Math.cos(centerPosition.z * 0.03 + 1);
    const rockInfluence = Math.sin(centerPosition.x * 0.025 + 2) * Math.cos(centerPosition.z * 0.025 + 2);
    
    return EnvironmentalGrassDistribution.createEnvironmentalFactorsForTerrain(
      centerPosition,
      0,
      {
        hasWater: waterInfluence > 0.3,
        hasTrees: treeInfluence > 0.2,
        hasRocks: rockInfluence > 0.4,
        playerTraffic: 0
      }
    );
  }
  
  private groupGrassBySpecies(grassData: {
    positions: THREE.Vector3[];
    scales: THREE.Vector3[];
    rotations: THREE.Quaternion[];
    species: string[];
  }) {
    const groups: { [species: string]: {
      positions: THREE.Vector3[];
      scales: THREE.Vector3[];
      rotations: THREE.Quaternion[];
    }} = {};
    
    for (let i = 0; i < grassData.positions.length; i++) {
      const species = grassData.species[i];
      if (!groups[species]) {
        groups[species] = { positions: [], scales: [], rotations: [] };
      }
      
      groups[species].positions.push(grassData.positions[i]);
      groups[species].scales.push(grassData.scales[i]);
      groups[species].rotations.push(grassData.rotations[i]);
    }
    
    return groups;
  }
  
  private updateSingleMaterial(material: THREE.ShaderMaterial, deltaTime: number): void {
    this.windSystem.updateMaterialWind(material, material.userData?.isGroundGrass || false);
    
    // Update seasonal and lighting only periodically
    if (this.updateCounter % 30 === 0) {
      GrassShader.updateSeasonalVariation(material, this.currentSeason);
    }
  }
  
  private updateSingleMeshVisibility(mesh: THREE.InstancedMesh): void {
    const centerPosition = mesh.userData.centerPosition as THREE.Vector3;
    if (!centerPosition) return;
    
    const playerPos = this.lodManager.getLastPlayerPosition();
    const distance = centerPosition.distanceTo(playerPos);
    
    // Enhanced LOD-based visibility
    const isVisible = this.enhancedLODManager.isVisible(distance, this.config.maxDistance);
    const shouldUpdate = this.enhancedLODManager.shouldUpdate(distance, this.updateCounter);
    
    if (mesh.visible !== isVisible) {
      mesh.visible = isVisible;
    }
    
    // Update LOD quality
    if (isVisible && shouldUpdate) {
      const qualityMultiplier = this.enhancedLODManager.getQualityMultiplier(distance);
      if (mesh.material && (mesh.material as THREE.ShaderMaterial).uniforms?.opacity) {
        (mesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.3, qualityMultiplier);
      }
    }
  }
  
  private checkFogChanges(): boolean {
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) return false;
    
    const now = performance.now();
    if (now - this.lastFogUpdate < this.FOG_CHECK_INTERVAL) return false;
    
    const currentFog = {
      color: this.scene.fog.color.clone(),
      near: this.scene.fog.near,
      far: this.scene.fog.far
    };
    
    if (!this.cachedFogValues || 
        !this.cachedFogValues.color.equals(currentFog.color) ||
        this.cachedFogValues.near !== currentFog.near ||
        this.cachedFogValues.far !== currentFog.far) {
      
      this.cachedFogValues = currentFog;
      this.lastFogUpdate = now;
      return true;
    }
    
    return false;
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    this.updateCounter++;
    this.windSystem.update(deltaTime);
    
    // Update visibility with enhanced LOD system (less frequent)
    if (this.updateCounter % this.VISIBILITY_UPDATE_INTERVAL === 0) {
      this.lodManager.updateVisibility(
        playerPosition,
        this.renderer.getGrassInstances(),
        this.renderer.getGroundGrassInstances(),
        this.config.maxDistance
      );
      
      // Add meshes to batched visibility processor
      for (const mesh of this.renderer.getGrassInstances().values()) {
        this.visibilityUpdateProcessor.addItem(mesh);
      }
      for (const mesh of this.renderer.getGroundGrassInstances().values()) {
        this.visibilityUpdateProcessor.addItem(mesh);
      }
    }
    
    // Process batched visibility updates
    this.visibilityUpdateProcessor.process(deltaTime);
    
    // Update materials with reduced frequency and batching
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      // Calculate day/night factors once
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Add materials to batched processor
      for (const material of this.renderer.getGrassMaterials().values()) {
        this.materialUpdateProcessor.addItem(material);
        // Update day/night cycle immediately (lightweight operation)
        GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
      }
      
      for (const material of this.renderer.getGroundGrassMaterials().values()) {
        this.materialUpdateProcessor.addItem(material);
        // Update day/night cycle immediately (lightweight operation)
        GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
      }
      
      // Update fog if changed (less frequent check)
      if (this.checkFogChanges() && this.cachedFogValues) {
        this.updateFogUniforms();
      }
    }
    
    // Process batched material updates
    this.materialUpdateProcessor.process(deltaTime);
  }
  
  private updateFogUniforms(): void {
    if (!this.cachedFogValues) return;
    
    const allMaterials = [
      ...this.renderer.getGrassMaterials().values(),
      ...this.renderer.getGroundGrassMaterials().values()
    ];
    
    for (const material of allMaterials) {
      if (material.uniforms.fogColor) {
        material.uniforms.fogColor.value.copy(this.cachedFogValues.color);
      }
      if (material.uniforms.fogNear) {
        material.uniforms.fogNear.value = this.cachedFogValues.near;
      }
      if (material.uniforms.fogFar) {
        material.uniforms.fogFar.value = this.cachedFogValues.far;
      }
    }
  }
  
  public setSeason(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    this.currentSeason = season;
    
    for (const material of this.renderer.getGrassMaterials().values()) {
      GrassShader.updateSeasonalVariation(material, season);
    }
    
    for (const material of this.renderer.getGroundGrassMaterials().values()) {
      GrassShader.updateSeasonalVariation(material, season);
    }
  }
  
  public removeGrassForRegion(region: RegionCoordinates): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    this.renderer.removeRegion(regionKey);
    console.log(`🌱 Removed grass coverage for region ${regionKey}`);
  }
  
  public dispose(): void {
    this.renderer.dispose();
    console.log('🌱 Optimized grass system disposed');
  }
}

export type { GrassConfig };
