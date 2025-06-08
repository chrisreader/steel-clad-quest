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
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 5;
  
  // Improved LOD system with better coverage
  private lodDistances: number[] = [75, 150, 225, 300];
  
  // Performance optimization variables
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 3;
  private readonly FOG_CHECK_INTERVAL: number = 100;
  
  private config: GrassConfig = {
    baseDensity: 1.4, // Increased base density
    patchDensity: 2.8, // Increased patch density
    patchCount: 6, // Increased patch count
    maxDistance: 450, // Increased render distance
    lodLevels: [1.0, 0.8, 0.5, 0.25] // Improved minimum coverage
  };
  
  // NEW: Region tracking for seamless cross-region blending
  private regionCenters: Map<string, THREE.Vector3> = new Map();
  private readonly CROSS_REGION_BLEND_DISTANCE = 25;
  
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
    
    console.log('🌱 Enhanced grass system with seamless coverage initialized with', this.enhancedGrassSpecies.length, 'species');
  }
  
  /**
   * NEW: Get neighboring regions for cross-region blending
   */
  private getNeighboringRegions(currentRegion: RegionCoordinates): Array<{ center: THREE.Vector3; size: number }> {
    const neighbors: Array<{ center: THREE.Vector3; size: number }> = [];
    
    // Check adjacent quadrants in the same ring
    for (let q = 0; q < 4; q++) {
      if (q !== currentRegion.quadrant) {
        const neighborKey = `grass_r${currentRegion.ringIndex}_q${q}`;
        const neighborCenter = this.regionCenters.get(neighborKey);
        if (neighborCenter) {
          neighbors.push({ center: neighborCenter, size: 100 }); // Standard region size
        }
      }
    }
    
    // Check same quadrant in adjacent rings
    if (currentRegion.ringIndex > 0) {
      const innerNeighborKey = `grass_r${currentRegion.ringIndex - 1}_q${currentRegion.quadrant}`;
      const innerNeighborCenter = this.regionCenters.get(innerNeighborKey);
      if (innerNeighborCenter) {
        neighbors.push({ center: innerNeighborCenter, size: 100 });
      }
    }
    
    const outerNeighborKey = `grass_r${currentRegion.ringIndex + 1}_q${currentRegion.quadrant}`;
    const outerNeighborCenter = this.regionCenters.get(outerNeighborKey);
    if (outerNeighborCenter) {
      neighbors.push({ center: outerNeighborCenter, size: 100 });
    }
    
    return neighbors;
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
    
    // Store region center for cross-region blending
    this.regionCenters.set(regionKey, centerPosition.clone());
    
    // Use current player position if provided, otherwise use cached position
    const playerPos = currentPlayerPosition || this.lastPlayerPosition;
    const distanceFromPlayer = centerPosition.distanceTo(playerPos);
    
    // Calculate enhanced LOD density multiplier
    const lodDensityMultiplier = GradientDensity.calculateLODDensity(distanceFromPlayer, this.lodDistances);
    
    console.log(`🌱 Region ${region.ringIndex}-${region.quadrant}: distance=${distanceFromPlayer.toFixed(1)}, LOD density=${lodDensityMultiplier.toFixed(3)}`);
    
    // Determine biome for this region
    const biomeInfo = GrassBiomeManager.getBiomeAtPosition(centerPosition);
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    console.log(`🌱 Generating seamless ${biomeConfig.name} grass (LOD density: ${lodDensityMultiplier.toFixed(3)}) for region ${regionKey}`);
    
    // Get neighboring regions for cross-region blending
    const neighboringRegions = this.getNeighboringRegions(region);
    
    // Create organic environmental factors instead of geometric patterns
    const environmentalFactors = this.createOrganicEnvironmentalFactors(
      centerPosition, 
      region, 
      terrainColor
    );
    
    const adjustedEnvironmentalFactors = GrassBiomeManager.adjustEnvironmentalFactors(
      environmentalFactors,
      biomeInfo
    );
    
    // Generate tall grass with enhanced organic sampling and cross-region blending
    const tallGrassData = this.generateSeamlessGrassDistribution(
      centerPosition, 
      size, 
      adjustedEnvironmentalFactors, 
      lodDensityMultiplier,
      biomeInfo,
      Math.max(0.25, lodDensityMultiplier * 0.5), // Improved minimum coverage
      neighboringRegions
    );
    
    // Generate ground grass with enhanced density and seamless distribution
    const groundGrassData = this.generateSeamlessGroundGrassDistribution(
      centerPosition,
      size,
      adjustedEnvironmentalFactors,
      lodDensityMultiplier,
      biomeInfo,
      Math.max(0.45, lodDensityMultiplier * 0.8), // Improved minimum for ground coverage
      neighboringRegions
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
    
    console.log(`✅ Generated seamless ${biomeConfig.name} grass for region ${regionKey} with ${tallGrassData.positions.length} tall and ${groundGrassData.positions.length} ground blades`);
  }
  
  /**
   * NEW: Generate seamless grass distribution with cross-region blending
   */
  private generateSeamlessGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.35,
    neighboringRegions: Array<{ center: THREE.Vector3; size: number }> = []
  ) {
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * biomeConfig.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    // Use enhanced organic distribution with cross-region blending
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing,
      minimumCoverage,
      lodDensityMultiplier,
      this.CROSS_REGION_BLEND_DISTANCE,
      neighboringRegions
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
   * NEW: Generate seamless ground grass distribution
   */
  private generateSeamlessGroundGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.7,
    neighboringRegions: Array<{ center: THREE.Vector3; size: number }> = []
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
      this.CROSS_REGION_BLEND_DISTANCE,
      neighboringRegions
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
   * Enhanced LOD level calculation with improved minimum coverage
   */
  private getDynamicLODLevel(distance: number): number {
    return GradientDensity.calculateLODDensity(distance, this.lodDistances);
  }
  
  /**
   * Enhanced visibility system with seamless transitions
   */
  private updateGrassVisibility(playerPosition: THREE.Vector3): void {
    let hiddenCount = 0;
    let visibleCount = 0;
    
    // Update tall grass visibility with improved LOD
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= this.config.maxDistance;
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
        // Apply material alpha for distant grass fade with improved visibility
        if (instancedMesh.material && newLodDensity < 0.4) {
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.4, newLodDensity);
          }
        }
      }
    }
    
    // Update ground grass visibility with enhanced render distance
    const groundRenderDistance = this.config.maxDistance * 0.95; // Increased from 0.9
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
      }
    }
    
    if (hiddenCount > 0 || visibleCount > 0) {
      console.log(`🌱 Seamless LOD: ${visibleCount} regions shown, ${hiddenCount} regions hidden`);
    }
  }
  
  /**
   * NEW: Create organic environmental factors using noise instead of geometric patterns
   */
  private createOrganicEnvironmentalFactors(
    centerPosition: THREE.Vector3,
    region: RegionCoordinates,
    terrainColor: number
  ): EnvironmentalFactors {
    // Use the new organic environmental factor generation
    return EnvironmentalGrassDistribution.createOrganicEnvironmentalFactors(
      centerPosition,
      0
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
    
    // Clean up region center tracking
    this.regionCenters.delete(regionKey);
    
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
    
    console.log(`🌱 Removed seamless grass coverage for region ${regionKey}`);
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
    
    // Clean up region tracking
    this.regionCenters.clear();
    
    console.log('🌱 Enhanced GrassSystem with seamless coverage disposed');
  }
}
