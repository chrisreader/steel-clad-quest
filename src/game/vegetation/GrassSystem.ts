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
  
  // Performance optimization with reduced update frequencies
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 8; // Slightly more frequent for responsiveness
  private readonly FOG_CHECK_INTERVAL: number = 150;
  
  // Player movement tracking for conditional updates
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerVelocity: number = 0;
  
  // Track region metadata for regeneration (kept for fallback)
  private regionMetadata: Map<string, {
    centerPosition: THREE.Vector3;
    size: number;
    terrainColor: number;
    region: RegionCoordinates;
  }> = new Map();
  
  constructor(scene: THREE.Scene, config?: Partial<GrassConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_GRASS_CONFIG, ...config };
    
    this.renderer = new GrassRenderer(scene);
    this.lodManager = new LODManager();
    this.windSystem = new WindSystem();
    
    console.log('🌱 Enhanced grass system initialized with continuous LOD updates');
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number,
    currentPlayerPosition?: THREE.Vector3
  ): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    // Store region metadata
    this.regionMetadata.set(regionKey, {
      centerPosition: centerPosition.clone(),
      size,
      terrainColor,
      region
    });
    
    if (this.renderer.getGrassInstances().has(regionKey)) return;
    
    this.generateGrassForRegionInternal(region, centerPosition, size, terrainColor, currentPlayerPosition);
  }

  private generateGrassForRegionInternal(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number,
    currentPlayerPosition?: THREE.Vector3
  ): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    // Always generate full density - LOD will be handled at instance level
    const playerPos = currentPlayerPosition || this.lodManager.getLastPlayerPosition();
    const distanceFromPlayer = centerPosition.distanceTo(playerPos);
    
    // Skip generation for very distant regions
    if (distanceFromPlayer > this.config.maxDistance) {
      return;
    }
    
    // Get biome information
    const biomeInfo = BiomeManager.getBiomeAtPosition(centerPosition);
    const biomeConfig = BiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    console.log(`🌱 Generating ${biomeConfig.name} grass for region ${regionKey} (distance: ${distanceFromPlayer.toFixed(1)})`);
    
    // Create environmental factors
    const environmentalFactors = this.createEnvironmentalFactors(centerPosition, region, terrainColor);
    
    // Generate grass distributions with full density (LOD handled by instance manager)
    const tallGrassData = this.generateGrassDistribution(
      centerPosition, size, environmentalFactors, 1.0, biomeInfo, false // Always full density
    );
    
    // Generate ground grass within reasonable distance
    let groundGrassData = { positions: [], scales: [], rotations: [], species: [] };
    if (distanceFromPlayer <= 180) {
      groundGrassData = this.generateGrassDistribution(
        centerPosition, size, environmentalFactors, 1.0, biomeInfo, true // Always full density
      );
    }
    
    // Group by species
    const tallGrassGroups = this.groupGrassBySpecies(tallGrassData);
    const groundGrassGroups = this.groupGrassBySpecies(groundGrassData);
    
    // Create instanced meshes with full density
    for (const [speciesName, speciesData] of Object.entries(tallGrassGroups)) {
      this.renderer.createInstancedMesh(
        regionKey, speciesName, speciesData as { positions: THREE.Vector3[]; scales: THREE.Vector3[]; rotations: THREE.Quaternion[]; }, region, biomeInfo, false, 1.0 // Full density
      );
    }
    
    for (const [speciesName, speciesData] of Object.entries(groundGrassGroups)) {
      this.renderer.createInstancedMesh(
        regionKey, speciesName, speciesData as { positions: THREE.Vector3[]; scales: THREE.Vector3[]; rotations: THREE.Quaternion[]; }, region, biomeInfo, true, 1.0 // Full density
      );
    }
    
    console.log(`✅ Generated ${biomeConfig.name} grass: ${tallGrassData.positions.length} tall, ${groundGrassData.positions.length} ground blades`);
  }

  private regenerateRegion(regionKey: string, currentPlayerPosition: THREE.Vector3): void {
    const metadata = this.regionMetadata.get(regionKey);
    if (!metadata) return;
    
    console.log(`🔄 Regenerating grass for region ${regionKey} with new LOD`);
    
    // Remove existing grass
    this.removeGrassForRegionInternal(regionKey);
    
    // Generate with current player position for accurate LOD
    this.generateGrassForRegionInternal(
      metadata.region, 
      metadata.centerPosition, 
      metadata.size, 
      metadata.terrainColor, 
      currentPlayerPosition
    );
    
    // Mark as regenerated
    this.lodManager.markRegionRegenerated(regionKey);
  }
  
  private getDominantSpecies(species: string[]): string {
    const counts: { [key: string]: number } = {};
    species.forEach(s => counts[s] = (counts[s] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'meadow');
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
    
    const minimumCoverage = isGroundGrass ? 0.4 : 0.2;
    
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
    
    // Track player velocity for conditional updates
    this.playerVelocity = playerPosition.distanceTo(this.lastPlayerPosition) / deltaTime;
    this.lastPlayerPosition.copy(playerPosition);
    
    // More responsive updates - don't skip when player is moving
    const shouldSkipUpdate = this.playerVelocity < 0.05 && this.updateCounter % 20 !== 0;
    if (shouldSkipUpdate) {
      return;
    }
    
    this.windSystem.update(deltaTime);
    
    // Update visibility and LOD with new instance-based system
    this.lodManager.updateVisibility(
      playerPosition,
      this.renderer.getGrassInstances(),
      this.renderer.getGroundGrassInstances(),
      this.config.maxDistance
    );
    
    // Update materials less frequently for better performance
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      // Calculate day/night factors
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Update materials with staggered updates
      const shouldUpdateTallGrass = this.updateCounter % 16 === 0;
      const shouldUpdateGroundGrass = this.updateCounter % 16 === 8;
      
      if (shouldUpdateTallGrass) {
        for (const material of this.renderer.getGrassMaterials().values()) {
          this.windSystem.updateMaterialWind(material, false);
          GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
          GrassShader.updateSeasonalVariation(material, this.currentSeason);
        }
      }
      
      if (shouldUpdateGroundGrass) {
        for (const material of this.renderer.getGroundGrassMaterials().values()) {
          this.windSystem.updateMaterialWind(material, true);
          GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
          GrassShader.updateSeasonalVariation(material, this.currentSeason);
        }
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
    this.removeGrassForRegionInternal(regionKey);
    this.regionMetadata.delete(regionKey);
    this.lodManager.clearRegionLODState(regionKey);
    console.log(`🌱 Removed grass coverage for region ${regionKey}`);
  }

  private removeGrassForRegionInternal(regionKey: string): void {
    this.renderer.removeRegion(regionKey);
  }
  
  public dispose(): void {
    this.renderer.dispose();
    this.regionMetadata.clear();
    console.log('🌱 Enhanced grass system disposed');
  }
}

export type { GrassConfig };
