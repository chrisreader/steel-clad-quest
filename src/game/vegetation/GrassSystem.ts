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
import { GradientDensity } from '../utils/math/GradientDensity';

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
  
  // Enhanced player position tracking for dynamic LOD
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 5; // More frequent updates
  
  // Expanded LOD system - extended distances to cover Ring 3 (300-600 units)
  private lodDistances: number[] = [150, 300, 450, 600]; // Covers all rings including Ring 3
  
  // Performance optimization variables
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 3;
  private readonly FOG_CHECK_INTERVAL: number = 100;
  
  private config: GrassConfig = {
    baseDensity: 1.2, // Increased base density
    patchDensity: 2.5,
    patchCount: 5,
    maxDistance: 700, // Extended to cover Ring 3 entirely (600 units + buffer)
    lodLevels: [1.0, 0.8, 0.6, 0.4] // Higher minimum levels - Ring 3 gets 40% density
  };
  
  // Enhanced region tracking for overlap management
  private regionOverlapMap: Map<string, Set<string>> = new Map();
  private readonly EDGE_BLEND_DISTANCE = 20;
  
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
    
    console.log('🌱 Enhanced grass system with extended coverage for all rings initialized with', this.enhancedGrassSpecies.length, 'species');
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number,
    currentPlayerPosition?: THREE.Vector3
  ): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    if (this.grassInstances.has(regionKey)) return;
    
    // Use current player position if provided, otherwise use cached position
    const playerPos = currentPlayerPosition || this.lastPlayerPosition;
    const distanceFromPlayer = centerPosition.distanceTo(playerPos);
    
    // Calculate improved LOD density multiplier for extended coverage
    const lodDensityMultiplier = GradientDensity.calculateLODDensity(distanceFromPlayer, this.lodDistances);
    
    console.log(`🌱 Ring ${region.ringIndex}-${region.quadrant}: distance=${distanceFromPlayer.toFixed(1)}, LOD density=${lodDensityMultiplier.toFixed(3)} (Ring 3 support)`);
    
    // Determine biome for this region
    const biomeInfo = GrassBiomeManager.getBiomeAtPosition(centerPosition);
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    console.log(`🌱 Generating ${biomeConfig.name} grass (extended coverage: ${lodDensityMultiplier.toFixed(3)}) for region ${regionKey}`);
    
    // Create environmental factors with gradual transitions
    const environmentalFactors = this.createImprovedEnvironmentalFactors(
      centerPosition, 
      region, 
      terrainColor
    );
    
    const adjustedEnvironmentalFactors = GrassBiomeManager.adjustEnvironmentalFactors(
      environmentalFactors,
      biomeInfo
    );
    
    // Generate tall grass with organic sampling and edge blending
    const tallGrassData = this.generateOrganicGrassDistribution(
      centerPosition, 
      size, 
      adjustedEnvironmentalFactors, 
      lodDensityMultiplier,
      biomeInfo,
      Math.max(0.25, lodDensityMultiplier * 0.5) // Higher minimum coverage for all rings
    );
    
    // Generate ground grass with higher density and organic distribution
    const groundGrassData = this.generateOrganicGroundGrassDistribution(
      centerPosition,
      size,
      adjustedEnvironmentalFactors,
      lodDensityMultiplier,
      biomeInfo,
      Math.max(0.5, lodDensityMultiplier * 0.8) // Much higher minimum for ground coverage
    );
    
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
        false, // tall grass
        lodDensityMultiplier
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
        true, // ground grass
        lodDensityMultiplier
      );
    }
    
    // Track region overlap for blending
    this.trackRegionOverlap(regionKey, centerPosition, size + this.EDGE_BLEND_DISTANCE * 2);
    
    console.log(`✅ Generated extended coverage ${biomeConfig.name} grass for region ${regionKey} with ${tallGrassData.positions.length} tall and ${groundGrassData.positions.length} ground blades`);
  }
  
  /**
   * NEW: Track region overlaps for proper edge blending
   */
  private trackRegionOverlap(regionKey: string, centerPosition: THREE.Vector3, expandedSize: number): void {
    const overlappingRegions = new Set<string>();
    
    // Check for overlaps with existing regions
    for (const [existingKey, existingMesh] of this.grassInstances.entries()) {
      if (existingKey === regionKey) continue;
      
      const existingCenter = existingMesh.userData.centerPosition as THREE.Vector3;
      const distance = centerPosition.distanceTo(existingCenter);
      
      // If regions are close enough to potentially overlap
      if (distance < expandedSize) {
        overlappingRegions.add(existingKey);
        
        // Also update the existing region's overlap set
        if (!this.regionOverlapMap.has(existingKey)) {
          this.regionOverlapMap.set(existingKey, new Set());
        }
        this.regionOverlapMap.get(existingKey)!.add(regionKey);
      }
    }
    
    this.regionOverlapMap.set(regionKey, overlappingRegions);
  }
  
  /**
   * NEW: Generate organic grass distribution with Poisson sampling
   */
  private generateOrganicGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.25
  ) {
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * biomeConfig.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    // Use enhanced organic distribution
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing,
      minimumCoverage,
      lodDensityMultiplier,
      this.EDGE_BLEND_DISTANCE
    );
    
    grassData.species = GrassBiomeManager.adjustSpeciesForBiome(
      grassData.species, 
      biomeInfo
    );
    
    // Apply biome height multiplier with existing terrain height variation
    for (let i = 0; i < grassData.scales.length; i++) {
      const terrainHeightVariation = grassData.scales[i].y;
      const additionalHeightVariation = 0.7 + Math.random() * 0.6;
      
      grassData.scales[i].y = terrainHeightVariation * biomeConfig.heightMultiplier * additionalHeightVariation;
    }
    
    return grassData;
  }
  
  /**
   * NEW: Generate organic ground grass distribution
   */
  private generateOrganicGroundGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.6
  ) {
    const groundConfig = GroundGrassBiomeConfig.getGroundConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * groundConfig.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing,
      minimumCoverage,
      lodDensityMultiplier,
      this.EDGE_BLEND_DISTANCE
    );
    
    grassData.species = GroundGrassBiomeConfig.adjustGroundSpeciesForBiome(
      grassData.species, 
      biomeInfo.type
    );
    
    // Apply ground grass height reductions with terrain variation
    for (let i = 0; i < grassData.scales.length; i++) {
      const terrainHeightVariation = grassData.scales[i].y;
      const additionalHeightVariation = 0.8 + Math.random() * 0.4;
      
      grassData.scales[i].y = terrainHeightVariation * groundConfig.heightReduction * additionalHeightVariation;
    }
    
    return grassData;
  }
  
  /**
   * Updated LOD level calculation with extended coverage
   */
  private getDynamicLODLevel(distance: number): number {
    return GradientDensity.calculateLODDensity(distance, this.lodDistances);
  }
  
  /**
   * Updated visibility system with extended coverage for Ring 3
   */
  private updateGrassVisibility(playerPosition: THREE.Vector3): void {
    let hiddenCount = 0;
    let visibleCount = 0;
    
    // Update tall grass visibility with extended coverage
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= this.config.maxDistance; // Now covers Ring 3
      const newLodDensity = this.getDynamicLODLevel(distanceToPlayer);
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        if (shouldBeVisible) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
      }
      
      // Update LOD density for smooth transitions
      if (instancedMesh.userData.lodLevel !== newLodDensity && shouldBeVisible) {
        instancedMesh.userData.lodLevel = newLodDensity;
        // Apply material alpha for distant grass fade (optional)
        if (instancedMesh.material && newLodDensity < 0.5) {
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.4, newLodDensity);
          }
        }
      }
    }
    
    // Update ground grass visibility with extended render distance
    const groundRenderDistance = this.config.maxDistance * 0.95; // Extended from 0.8 to 0.95
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
      }
    }
    
    if (hiddenCount > 0 || visibleCount > 0) {
      console.log(`🌱 Extended coverage LOD: ${visibleCount} regions shown, ${hiddenCount} regions hidden`);
    }
  }
  
  private createImprovedEnvironmentalFactors(
    centerPosition: THREE.Vector3,
    region: RegionCoordinates,
    terrainColor: number
  ): EnvironmentalFactors {
    const distanceFromCenter = centerPosition.length();
    
    // Use gradual environmental factors instead of binary
    const waterInfluence = Math.sin(centerPosition.x * 0.02) * Math.cos(centerPosition.z * 0.02);
    const treeInfluence = Math.sin(centerPosition.x * 0.03 + 1) * Math.cos(centerPosition.z * 0.03 + 1);
    const rockInfluence = Math.sin(centerPosition.x * 0.025 + 2) * Math.cos(centerPosition.z * 0.025 + 2);
    
    return EnvironmentalGrassDistribution.createEnvironmentalFactorsForTerrain(
      centerPosition,
      0,
      {
        hasWater: waterInfluence > 0.3, // Less frequent water
        hasTrees: treeInfluence > 0.2, // Moderate tree coverage
        hasRocks: rockInfluence > 0.4, // Less frequent rocks
        playerTraffic: 0
      }
    );
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
    isGroundGrass: boolean = false,
    lodLevel: number = 1.0
  ): void {
    const suffix = isGroundGrass ? '_ground' : '';
    const geometryMap = isGroundGrass ? this.groundGrassGeometries : this.grassGeometries;
    const materialMap = isGroundGrass ? this.groundGrassMaterials : this.grassMaterials;
    const instanceMap = isGroundGrass ? this.groundGrassInstances : this.grassInstances;
    
    // Get appropriate geometry and material
    const geometry = geometryMap.get(speciesName);
    let material = materialMap.get(speciesName);
    
    if (!geometry || !material) return;
    
    // Apply LOD-based instance count reduction
    const targetInstanceCount = Math.max(1, Math.floor(speciesData.positions.length * lodLevel));
    const lodPositions = speciesData.positions.slice(0, targetInstanceCount);
    const lodScales = speciesData.scales.slice(0, targetInstanceCount);
    const lodRotations = speciesData.rotations.slice(0, targetInstanceCount);
    
    // Apply biome-specific wind exposure for ground grass with improved values
    if (isGroundGrass && material.uniforms.windStrength) {
      const groundConfig = GroundGrassBiomeConfig.getGroundConfiguration(biomeInfo.type);
      material.uniforms.windStrength.value *= (1 - groundConfig.windReduction); // Use 1 - reduction for proper calculation
    }
    
    const instancedMesh = new THREE.InstancedMesh(
      geometry, 
      material, 
      lodPositions.length
    );
    
    // Set instance data
    for (let i = 0; i < lodPositions.length; i++) {
      const matrix = new THREE.Matrix4();
      const adjustedPosition = lodPositions[i].clone();
      
      // Position ground grass properly to stand upright
      if (isGroundGrass) {
        adjustedPosition.y = Math.max(0.05, adjustedPosition.y); // Raised from 0.01 to 0.05
      } else {
        adjustedPosition.y = Math.max(0.1, adjustedPosition.y);
      }
      
      matrix.compose(
        adjustedPosition,
        lodRotations[i],
        lodScales[i]
      );
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = !isGroundGrass; // Ground grass doesn't cast shadows for performance
    instancedMesh.receiveShadow = true;
    
    // Store metadata including LOD level
    instancedMesh.userData = {
      regionKey: `${regionKey}_${speciesName}${suffix}`,
      centerPosition: lodPositions[0] || new THREE.Vector3(),
      ringIndex: region.ringIndex,
      species: speciesName,
      biomeType: biomeInfo.type,
      biomeStrength: biomeInfo.strength,
      isGroundGrass,
      lodLevel
    };
    
    this.scene.add(instancedMesh);
    instanceMap.set(`${regionKey}_${speciesName}`, instancedMesh);
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
    this.time += deltaTime;
    this.updateCounter++;
    this.grassCullingUpdateCounter++;
    
    // Update last player position for future use
    this.lastPlayerPosition.copy(playerPosition);
    
    // More frequent grass visibility updates for dynamic LOD
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      this.updateGrassVisibility(playerPosition);
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
    
    // Clean up overlap tracking
    this.regionOverlapMap.delete(regionKey);
    for (const [otherKey, overlapSet] of this.regionOverlapMap.entries()) {
      overlapSet.delete(regionKey);
    }
    
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
    
    console.log(`🌱 Removed extended coverage grass for region ${regionKey}`);
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
    
    console.log('🌱 Enhanced GrassSystem with extended Ring 3 coverage disposed');
  }
}
