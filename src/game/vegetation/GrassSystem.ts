import * as THREE from 'three';
import { EnhancedGrassGeometry, EnhancedGrassBladeConfig } from './EnhancedGrassGeometry';
import { GroundGrassGeometry } from './GroundGrassGeometry';
import { GroundGrassBiomeConfig } from './GroundGrassBiomeConfig';
import { RealisticGrassShader } from './RealisticGrassShader';
import { EnvironmentalGrassDistribution, EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { RegionCoordinates } from '../world/RingQuadrantSystem';
import { TimeUtils } from '../utils/TimeUtils';
import { TIME_PHASES } from '../config/DayNightConfig';
import { GrassBiomeManager, BiomeType } from './GrassBiomeManager';

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
  private groundGrassInstances: Map<string, THREE.InstancedMesh> = new Map();
  private grassMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private groundGrassMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private grassGeometries: Map<string, THREE.BufferGeometry> = new Map();
  private groundGrassGeometries: Map<string, THREE.BufferGeometry> = new Map();
  private enhancedGrassSpecies: EnhancedGrassBladeConfig[] = [];
  private renderDistance: number = 150;
  private time: number = 0;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  
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
    this.initializeEnhancedGrassSystem();
  }
  
  private initializeEnhancedGrassSystem(): void {
    this.enhancedGrassSpecies = EnhancedGrassGeometry.getEnhancedGrassSpecies();
    
    // Create geometries for each species (tall grass)
    for (const species of this.enhancedGrassSpecies) {
      const geometry = species.clustered 
        ? EnhancedGrassGeometry.createGrassCluster(species, 3)
        : EnhancedGrassGeometry.createRealisticGrassBladeGeometry(species);
      
      this.grassGeometries.set(species.species, geometry);
      
      // Create ground grass geometries using realistic geometry
      const groundGeometry = species.clustered
        ? GroundGrassGeometry.createGroundGrassCluster(species, 7) // Increased cluster size
        : GroundGrassGeometry.createGroundGrassBladeGeometry(species, 0.85); // 15% shorter
      
      this.groundGrassGeometries.set(species.species, groundGeometry);
      
      // Create materials for tall grass
      const material = RealisticGrassShader.createRealisticGrassMaterial(
        species.color, 
        0, 
        species.species
      );
      this.grassMaterials.set(species.species, material);
      
      // Create materials for ground grass with improved wind
      const groundMaterial = RealisticGrassShader.createRealisticGrassMaterial(
        species.color.clone().multiplyScalar(0.9), // 10% darker for ground shadow effect
        0, 
        `ground_${species.species}`
      );
      
      // Reduce wind strength for ground grass but keep it natural (80% instead of 30%)
      if (groundMaterial.uniforms.windStrength) {
        groundMaterial.uniforms.windStrength.value *= 0.8;
      }
      
      this.groundGrassMaterials.set(species.species, groundMaterial);
    }
    
    console.log('🌱 Enhanced grass system with realistic ground coverage initialized with', this.enhancedGrassSpecies.length, 'species');
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
    
    console.log(`🌱 Generating ${biomeConfig.name} grass with ground coverage for region ${region.ringIndex}-${region.quadrant}`);
    
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
    
    // Generate tall grass (existing system)
    const tallGrassData = this.generateBiomeAwareGrassDistribution(
      centerPosition, 
      size, 
      environmentalFactors, 
      lodLevel,
      biomeInfo
    );
    
    // Generate ground grass (new dense layer)
    const groundGrassData = this.generateGroundGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      lodLevel,
      biomeInfo
    );
    
    if (tallGrassData.positions.length === 0 && groundGrassData.positions.length === 0) return;
    
    // Group by species for efficient rendering
    const tallGrassGroups = this.groupGrassBySpecies(tallGrassData);
    const groundGrassGroups = this.groupGrassBySpecies(groundGrassData);
    
    // Create instanced meshes for tall grass
    for (const [speciesName, speciesData] of Object.entries(tallGrassGroups)) {
      this.createBiomeAwareSpeciesInstancedMesh(
        regionKey, 
        speciesName, 
        speciesData, 
        region,
        biomeInfo,
        false // tall grass
      );
    }
    
    // Create instanced meshes for ground grass
    for (const [speciesName, speciesData] of Object.entries(groundGrassGroups)) {
      this.createBiomeAwareSpeciesInstancedMesh(
        regionKey, 
        speciesName, 
        speciesData, 
        region,
        biomeInfo,
        true // ground grass
      );
    }
    
    console.log(`✅ Generated ${biomeConfig.name} grass for region ${regionKey} with ${tallGrassData.positions.length} tall and ${groundGrassData.positions.length} ground blades`);
  }
  
  private generateGroundGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean }
  ) {
    const groundConfig = GroundGrassBiomeConfig.getGroundConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * lodMultiplier * groundConfig.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing
    );
    
    // Apply ground-specific species distribution
    grassData.species = GroundGrassBiomeConfig.adjustGroundSpeciesForBiome(
      grassData.species, 
      biomeInfo.type
    );
    
    // Apply ground grass height reductions with terrain variation
    for (let i = 0; i < grassData.scales.length; i++) {
      // The scale.y already contains terrain height variation from EnvironmentalGrassDistribution
      const terrainHeightVariation = grassData.scales[i].y;
      const additionalHeightVariation = 0.8 + Math.random() * 0.4; // Less variation for ground grass
      
      // Apply ground height reduction while preserving terrain variation
      grassData.scales[i].y = terrainHeightVariation * groundConfig.heightReduction * additionalHeightVariation;
    }
    
    return grassData;
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
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    isGroundGrass: boolean = false
  ): void {
    const suffix = isGroundGrass ? '_ground' : '';
    const geometryMap = isGroundGrass ? this.groundGrassGeometries : this.grassGeometries;
    const materialMap = isGroundGrass ? this.groundGrassMaterials : this.grassMaterials;
    const instanceMap = isGroundGrass ? this.groundGrassInstances : this.grassInstances;
    
    // Get appropriate geometry and material
    const geometry = geometryMap.get(speciesName);
    let material = materialMap.get(speciesName);
    
    if (!geometry || !material) return;
    
    // Apply biome-specific wind exposure for ground grass with improved values
    if (isGroundGrass && material.uniforms.windStrength) {
      const groundConfig = GroundGrassBiomeConfig.getGroundConfiguration(biomeInfo.type);
      material.uniforms.windStrength.value *= (1 - groundConfig.windReduction); // Use 1 - reduction for proper calculation
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
      
      // Position ground grass properly to stand upright
      if (isGroundGrass) {
        adjustedPosition.y = Math.max(0.05, adjustedPosition.y); // Raised from 0.01 to 0.05
      } else {
        adjustedPosition.y = Math.max(0.1, adjustedPosition.y);
      }
      
      matrix.compose(
        adjustedPosition,
        speciesData.rotations[i],
        speciesData.scales[i]
      );
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = !isGroundGrass; // Ground grass doesn't cast shadows for performance
    instancedMesh.receiveShadow = true;
    
    // Store metadata
    instancedMesh.userData = {
      regionKey: `${regionKey}_${speciesName}${suffix}`,
      centerPosition: speciesData.positions[0] || new THREE.Vector3(),
      ringIndex: region.ringIndex,
      species: speciesName,
      biomeType: biomeInfo.type,
      biomeStrength: biomeInfo.strength,
      isGroundGrass
    };
    
    this.scene.add(instancedMesh);
    instanceMap.set(`${regionKey}_${speciesName}`, instancedMesh);
  }
  
  private generateBiomeAwareGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean }
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
    
    grassData.species = GrassBiomeManager.adjustSpeciesForBiome(
      grassData.species, 
      biomeInfo
    );
    
    // Apply biome height multiplier with existing terrain height variation
    for (let i = 0; i < grassData.scales.length; i++) {
      // The scale.y already contains terrain height variation from EnvironmentalGrassDistribution
      const terrainHeightVariation = grassData.scales[i].y;
      const additionalHeightVariation = 0.7 + Math.random() * 0.6;
      
      // Combine terrain variation with biome configuration and random variation
      grassData.scales[i].y = terrainHeightVariation * biomeConfig.heightMultiplier * additionalHeightVariation;
    }
    
    return grassData;
  }
  
  private createRegionEnvironmentalFactors(
    centerPosition: THREE.Vector3,
    region: RegionCoordinates,
    terrainColor: number
  ): EnvironmentalFactors {
    const distanceFromCenter = centerPosition.length();
    const moisture = 0.6 - (distanceFromCenter * 0.001);
    const slope = Math.random() * 0.4;
    const lightExposure = 0.8 - (region.ringIndex * 0.1);
    
    return EnvironmentalGrassDistribution.createEnvironmentalFactorsForTerrain(
      centerPosition,
      0,
      {
        hasWater: Math.random() < 0.1,
        hasTrees: Math.random() < 0.3,
        hasRocks: Math.random() < 0.2,
        playerTraffic: 0
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
    
    // Update tall grass visibility
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
    
    // Update ground grass visibility with shorter render distance for performance
    const groundRenderDistance = this.renderDistance * 0.7;
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
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
      
      // Update tall grass materials
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
      
      // Update ground grass materials with improved wind
      for (const material of this.groundGrassMaterials.values()) {
        RealisticGrassShader.updateRealisticWindAnimation(
          material, 
          this.time, 
          baseWindStrength * 0.8, // Improved from 0.3 to 0.8
          gustIntensity * 0.6    // Improved from 0.2 to 0.6
        );
        RealisticGrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
        RealisticGrassShader.updateSeasonalVariation(material, this.currentSeason);
      }
      
      // Update fog uniforms
      if (this.checkFogChanges() && this.cachedFogValues) {
        // Update fog for tall grass materials
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
        
        // Update fog for ground grass materials
        for (const material of this.groundGrassMaterials.values()) {
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
    
    // Update season for tall grass
    for (const material of this.grassMaterials.values()) {
      RealisticGrassShader.updateSeasonalVariation(material, season);
    }
    
    // Update season for ground grass
    for (const material of this.groundGrassMaterials.values()) {
      RealisticGrassShader.updateSeasonalVariation(material, season);
    }
  }
  
  public removeGrassForRegion(region: RegionCoordinates): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    // Remove tall grass instances
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
    
    // Remove ground grass instances
    const groundKeysToRemove = Array.from(this.groundGrassInstances.keys()).filter(
      key => key.startsWith(regionKey)
    );
    
    for (const key of groundKeysToRemove) {
      const instancedMesh = this.groundGrassInstances.get(key);
      if (instancedMesh) {
        this.scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        this.groundGrassInstances.delete(key);
      }
    }
    
    console.log(`🌱 Removed enhanced grass and ground coverage for region ${regionKey}`);
  }
  
  public dispose(): void {
    // Clean up all tall grass instances
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      this.scene.remove(instancedMesh);
      instancedMesh.geometry.dispose();
    }
    this.grassInstances.clear();
    
    // Clean up all ground grass instances
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      this.scene.remove(instancedMesh);
      instancedMesh.geometry.dispose();
    }
    this.groundGrassInstances.clear();
    
    // Clean up materials
    for (const material of this.grassMaterials.values()) {
      material.dispose();
    }
    this.grassMaterials.clear();
    
    for (const material of this.groundGrassMaterials.values()) {
      material.dispose();
    }
    this.groundGrassMaterials.clear();
    
    // Clean up geometries
    for (const geometry of this.grassGeometries.values()) {
      geometry.dispose();
    }
    this.grassGeometries.clear();
    
    for (const geometry of this.groundGrassGeometries.values()) {
      geometry.dispose();
    }
    this.groundGrassGeometries.clear();
    
    console.log('🌱 Enhanced GrassSystem with ground coverage disposed');
  }
}
