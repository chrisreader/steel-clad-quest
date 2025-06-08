
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

export class GrassSystem {
  private scene: THREE.Scene;
  private config: GrassConfig;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  
  // Core systems
  private renderer: GrassRenderer;
  private lodManager: LODManager;
  private windSystem: WindSystem;
  
  // Performance optimization
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 3;
  private readonly FOG_CHECK_INTERVAL: number = 100;
  
  constructor(scene: THREE.Scene, config?: Partial<GrassConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_GRASS_CONFIG, ...config };
    
    this.renderer = new GrassRenderer(scene);
    this.lodManager = new LODManager();
    this.windSystem = new WindSystem();
    
    console.log('🌱 Optimized grass system initialized with modular architecture');
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
      grassData.species = BiomeManager.adjustGroundSpeciesForBiome(grassData.species, biomeInfo.type);
      const heightMultiplier = config.heightReduction;
      for (let i = 0; i < grassData.scales.length; i++) {
        grassData.scales[i].y *= heightMultiplier * (0.8 + Math.random() * 0.4);
      }
    } else {
      grassData.species = BiomeManager.adjustSpeciesForBiome(grassData.species, biomeInfo);
      const heightMultiplier = (config as any).heightMultiplier || 1.0;
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
    
    // Update visibility and LOD
    this.lodManager.updateVisibility(
      playerPosition,
      this.renderer.getGrassInstances(),
      this.renderer.getGroundGrassInstances(),
      this.config.maxDistance
    );
    
    // Update materials periodically
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      // Calculate day/night factors
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Update all materials
      for (const material of this.renderer.getGrassMaterials().values()) {
        this.windSystem.updateMaterialWind(material, false);
        GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
        GrassShader.updateSeasonalVariation(material, this.currentSeason);
      }
      
      for (const material of this.renderer.getGroundGrassMaterials().values()) {
        this.windSystem.updateMaterialWind(material, true);
        GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
        GrassShader.updateSeasonalVariation(material, this.currentSeason);
      }
      
      // Update fog if changed
      if (this.checkFogChanges() && this.cachedFogValues) {
        this.updateFogUniforms();
      }
    }
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
