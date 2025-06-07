import * as THREE from 'three';
import { EnhancedGrassGeometry, EnhancedGrassBladeConfig } from './EnhancedGrassGeometry';
import { RealisticGrassShader } from './RealisticGrassShader';
import { EnvironmentalGrassDistribution, EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { RegionCoordinates } from '../world/RingQuadrantSystem';
import { TimeUtils } from '../utils/TimeUtils';
import { TIME_PHASES } from '../config/DayNightConfig';
import { GrassBiomeManager, BiomeType } from './GrassBiomeManager';
import { GrassDebugSystem } from './GrassDebugSystem';

export interface GrassConfig {
  baseDensity: number;
  patchDensity: number;
  patchCount: number;
  maxDistance: number;
  lodLevels: number[];
}

export class GrassSystem {
  private scene: THREE.Scene;
  private grassInstances: Map<string, THREE.InstancedMesh> = new Map();
  private grassMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private grassGeometries: Map<string, THREE.BufferGeometry> = new Map();
  private enhancedGrassSpecies: EnhancedGrassBladeConfig[] = [];
  private renderDistance: number = 150;
  private time: number = 0;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  private debugSystem: GrassDebugSystem;
  
  // Player position tracking for distance-based culling
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 10;
  
  // Performance optimization variables
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 3;
  private readonly FOG_CHECK_INTERVAL: number = 100;
  
  private config: GrassConfig = {
    baseDensity: 0.8,
    patchDensity: 2.5,
    patchCount: 5,
    maxDistance: 150,
    lodLevels: [1.0, 0.5, 0.25, 0.0]
  };
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.debugSystem = new GrassDebugSystem(scene);
    this.initializeEnhancedGrassSystem();
  }
  
  private initializeEnhancedGrassSystem(): void {
    this.enhancedGrassSpecies = EnhancedGrassGeometry.getEnhancedGrassSpecies();
    
    // Create geometries for each species
    for (const species of this.enhancedGrassSpecies) {
      const geometry = species.clustered 
        ? EnhancedGrassGeometry.createGrassCluster(species, 3)
        : EnhancedGrassGeometry.createRealisticGrassBladeGeometry(species);
      
      this.grassGeometries.set(species.species, geometry);
      
      // Create realistic material for each species
      const material = RealisticGrassShader.createRealisticGrassMaterial(
        species.color, 
        0, 
        species.species
      );
      this.grassMaterials.set(species.species, material);
    }
    
    console.log('🌱 Enhanced grass system initialized with', this.enhancedGrassSpecies.length, 'species');
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number
  ): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    if (this.grassInstances.has(regionKey)) return;
    
    // Early distance check
    const distanceFromSpawn = centerPosition.length();
    if (distanceFromSpawn > this.renderDistance) {
      return;
    }
    
    // Determine biome for this region
    const biomeInfo = GrassBiomeManager.getBiomeAtPosition(centerPosition);
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    console.log(`🌱 Generating ${biomeConfig.name} grass for region ${region.ringIndex}-${region.quadrant}`);
    
    // Create environmental factors adjusted for biome
    const baseEnvironmentalFactors = this.createRegionEnvironmentalFactors(
      centerPosition, 
      region, 
      terrainColor
    );
    
    const environmentalFactors = GrassBiomeManager.adjustEnvironmentalFactors(
      baseEnvironmentalFactors,
      biomeInfo
    );
    
    // Generate grass distribution with biome adjustments
    const lodLevel = this.getLODLevel(distanceFromSpawn);
    if (lodLevel === 0) return;
    
    const grassData = this.generateBiomeAwareGrassDistribution(
      centerPosition, 
      size, 
      environmentalFactors, 
      lodLevel,
      biomeInfo
    );
    
    if (grassData.positions.length === 0) return;
    
    // Group by species for efficient rendering
    const speciesGroups = this.groupGrassBySpecies(grassData);
    
    // Create instanced meshes for each species present
    for (const [speciesName, speciesData] of Object.entries(speciesGroups)) {
      this.createBiomeAwareSpeciesInstancedMesh(
        regionKey, 
        speciesName, 
        speciesData, 
        region,
        biomeInfo
      );
    }
    
    console.log(`✅ Generated ${biomeConfig.name} grass for region ${regionKey} with ${grassData.positions.length} blades`);
  }
  
  private createBiomeAwareSpeciesInstancedMesh(
    regionKey: string,
    speciesName: string,
    speciesData: {
      positions: THREE.Vector3[];
      scales: THREE.Vector3[];
      rotations: THREE.Quaternion[];
    },
    region: RegionCoordinates,
    biomeInfo: { type: BiomeType; strength: number }
  ): void {
    // Get biome-specific geometry
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    const biomeSpecies = EnhancedGrassGeometry.getEnhancedGrassSpeciesForBiome(biomeInfo.type);
    const speciesConfig = biomeSpecies.find(s => s.species === speciesName);
    
    if (!speciesConfig) return;
    
    // Create geometry with biome-specific height variation
    const heightVariation = biomeConfig.heightMultiplier;
    const geometry = speciesConfig.clustered 
      ? EnhancedGrassGeometry.createGrassCluster(speciesConfig, 3, heightVariation)
      : EnhancedGrassGeometry.createRealisticGrassBladeGeometry(speciesConfig, heightVariation);
    
    // Use existing material or create new one
    let material = this.grassMaterials.get(speciesName);
    if (!material) {
      material = RealisticGrassShader.createRealisticGrassMaterial(
        speciesConfig.color, 
        0, 
        speciesConfig.species
      );
      this.grassMaterials.set(speciesName, material);
    }
    
    // Apply biome-specific wind exposure
    if (material.uniforms.windStrength) {
      material.uniforms.windStrength.value *= biomeConfig.windExposureMultiplier;
    }
    
    const instancedMesh = new THREE.InstancedMesh(
      geometry, 
      material, 
      speciesData.positions.length
    );
    
    // Set instance data
    for (let i = 0; i < speciesData.positions.length; i++) {
      const matrix = new THREE.Matrix4();
      const adjustedPosition = speciesData.positions[i].clone();
      adjustedPosition.y = Math.max(0.1, adjustedPosition.y);
      
      matrix.compose(
        adjustedPosition,
        speciesData.rotations[i],
        speciesData.scales[i]
      );
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    
    // Store biome data
    instancedMesh.userData = {
      regionKey: `${regionKey}_${speciesName}`,
      centerPosition: speciesData.positions[0] || new THREE.Vector3(),
      ringIndex: region.ringIndex,
      species: speciesName,
      biomeType: biomeInfo.type,
      biomeStrength: biomeInfo.strength
    };
    
    this.scene.add(instancedMesh);
    this.grassInstances.set(`${regionKey}_${speciesName}`, instancedMesh);
  }
  
  private generateBiomeAwareGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number }
  ) {
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * lodMultiplier * biomeConfig.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing
    );
    
    // Apply biome species distribution
    grassData.species = GrassBiomeManager.adjustSpeciesForBiome(
      grassData.species, 
      biomeInfo
    );
    
    // Apply biome height variations
    for (let i = 0; i < grassData.scales.length; i++) {
      const heightVariation = 0.7 + Math.random() * 0.6; // ±30% height variation
      grassData.scales[i].y *= biomeConfig.heightMultiplier * heightVariation;
    }
    
    return grassData;
  }
  
  private createRegionEnvironmentalFactors(
    centerPosition: THREE.Vector3,
    region: RegionCoordinates,
    terrainColor: number
  ): EnvironmentalFactors {
    // Simulate environmental conditions based on region
    const distanceFromCenter = centerPosition.length();
    const moisture = 0.6 - (distanceFromCenter * 0.001); // Drier further from center
    const slope = Math.random() * 0.4; // Random slope variation
    const lightExposure = 0.8 - (region.ringIndex * 0.1); // Less light in outer rings
    
    return EnvironmentalGrassDistribution.createEnvironmentalFactorsForTerrain(
      centerPosition,
      0, // Simplified terrain height
      {
        hasWater: Math.random() < 0.1,
        hasTrees: Math.random() < 0.3,
        hasRocks: Math.random() < 0.2,
        playerTraffic: 0 // No trampling for now
      }
    );
  }
  
  private generateEnvironmentalGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodMultiplier: number
  ) {
    const adjustedDensity = this.config.baseDensity * lodMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    return EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing
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
  
  private getLODLevel(distance: number): number {
    if (distance < 50) return this.config.lodLevels[0];
    if (distance < 100) return this.config.lodLevels[1];
    if (distance < 150) return this.config.lodLevels[2];
    return this.config.lodLevels[3];
  }
  
  private updateGrassVisibility(playerPosition: THREE.Vector3): void {
    let hiddenCount = 0;
    let visibleCount = 0;
    
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= this.renderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        if (shouldBeVisible) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
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
    this.time += deltaTime;
    this.updateCounter++;
    this.grassCullingUpdateCounter++;
    
    // Update debug system
    this.debugSystem.updateDebugInfo(playerPosition);
    
    // Update grass visibility
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      const playerMovedDistance = this.lastPlayerPosition.distanceTo(playerPosition);
      if (playerMovedDistance > 5.0) {
        this.updateGrassVisibility(playerPosition);
        this.lastPlayerPosition.copy(playerPosition);
      }
      this.grassCullingUpdateCounter = 0;
    }
    
    // Update materials
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      // Calculate day/night factors
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Enhanced wind with gusts
      const baseWindStrength = 0.2 + Math.sin(this.time * 0.3) * 0.1;
      const gustIntensity = 0.1 + Math.sin(this.time * 0.8) * 0.08;
      
      for (const material of this.grassMaterials.values()) {
        RealisticGrassShader.updateRealisticWindAnimation(
          material, 
          this.time, 
          baseWindStrength,
          gustIntensity
        );
        RealisticGrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
        RealisticGrassShader.updateSeasonalVariation(material, this.currentSeason);
      }
      
      // Update fog uniforms
      if (this.checkFogChanges() && this.cachedFogValues) {
        for (const material of this.grassMaterials.values()) {
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
    }
  }
  
  public setSeason(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    this.currentSeason = season;
    for (const material of this.grassMaterials.values()) {
      RealisticGrassShader.updateSeasonalVariation(material, season);
    }
  }
  
  public removeGrassForRegion(region: RegionCoordinates): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    // Remove all species instances for this region
    const keysToRemove = Array.from(this.grassInstances.keys()).filter(
      key => key.startsWith(regionKey)
    );
    
    for (const key of keysToRemove) {
      const instancedMesh = this.grassInstances.get(key);
      if (instancedMesh) {
        this.scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        this.grassInstances.delete(key);
      }
    }
    
    console.log(`🌱 Removed enhanced grass for region ${regionKey}`);
  }
  
  public dispose(): void {
    // Clean up all grass instances
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      this.scene.remove(instancedMesh);
      instancedMesh.geometry.dispose();
    }
    this.grassInstances.clear();
    
    // Clean up materials
    for (const material of this.grassMaterials.values()) {
      material.dispose();
    }
    this.grassMaterials.clear();
    
    // Clean up geometries
    for (const geometry of this.grassGeometries.values()) {
      geometry.dispose();
    }
    this.grassGeometries.clear();
    
    // Clean up debug system
    this.debugSystem.dispose();
    
    console.log('🌱 Enhanced GrassSystem disposed');
  }
}
