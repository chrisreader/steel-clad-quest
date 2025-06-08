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
import { EnvironmentalRealism } from './EnvironmentalRealism';
import { RealisticSpeciesDistribution } from './RealisticSpeciesDistribution';
import { AdvancedBiomeTransitions } from './AdvancedBiomeTransitions';

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
  
  // Dynamic LOD system - more forgiving distances
  private lodDistances: number[] = [75, 150, 225, 300];
  
  // Performance optimization variables
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 3;
  private readonly FOG_CHECK_INTERVAL: number = 100;
  
  // NEW: Player traffic tracking for realistic wear patterns
  private playerTrafficMap: Map<string, number> = new Map();
  private readonly TRAFFIC_DECAY_RATE = 0.98; // Traffic slowly fades over time
  private readonly TRAFFIC_INFLUENCE_RADIUS = 3;
  
  private config: GrassConfig = {
    baseDensity: 1.4, // Slightly increased for more realistic coverage
    patchDensity: 2.8,
    patchCount: 6,
    maxDistance: 400,
    lodLevels: [1.0, 0.8, 0.5, 0.2] // More gradual LOD transitions
  };
  
  // Enhanced region tracking for overlap management
  private regionOverlapMap: Map<string, Set<string>> = new Map();
  private readonly EDGE_BLEND_DISTANCE = 25; // Increased for smoother transitions
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeEnhancedGrassSystem();
  }
  
  private initializeEnhancedGrassSystem(): void {
    this.enhancedGrassSpecies = EnhancedGrassGeometry.getEnhancedGrassSpecies();
    
    // Create geometries for each species (tall grass)
    for (const species of this.enhancedGrassSpecies) {
      const geometry = species.clustered 
        ? EnhancedGrassGeometry.createGrassCluster(species, 4) // Slightly larger clusters
        : EnhancedGrassGeometry.createRealisticGrassBladeGeometry(species);
      
      this.grassGeometries.set(species.species, geometry);
      
      // Create ground grass geometries using realistic geometry
      const groundGeometry = species.clustered
        ? GroundGrassGeometry.createGroundGrassCluster(species, 8) // Larger ground clusters
        : GroundGrassGeometry.createGroundGrassBladeGeometry(species, 0.8); // Slightly taller ground grass
      
      this.groundGrassGeometries.set(species.species, groundGeometry);
      
      // Create materials for tall grass
      const material = RealisticGrassShader.createRealisticGrassMaterial(
        species.color, 
        0, 
        species.species
      );
      this.grassMaterials.set(species.species, material);
      
      // Create materials for ground grass
      const groundMaterial = RealisticGrassShader.createRealisticGrassMaterial(
        species.color.clone().multiplyScalar(0.92), // Less darkening for more realistic look
        0, 
        `ground_${species.species}`
      );
      
      // Improve ground grass wind for more realism (85% instead of 80%)
      if (groundMaterial.uniforms.windStrength) {
        groundMaterial.uniforms.windStrength.value *= 0.85;
      }
      
      this.groundGrassMaterials.set(species.species, groundMaterial);
    }
    
    console.log('🌱 Enhanced realistic grass system initialized with', this.enhancedGrassSpecies.length, 'species');
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
    
    // Calculate smooth LOD density multiplier
    const lodDensityMultiplier = GradientDensity.calculateLODDensity(distanceFromPlayer, this.lodDistances);
    
    console.log(`🌱 Region ${region.ringIndex}-${region.quadrant}: distance=${distanceFromPlayer.toFixed(1)}, LOD density=${lodDensityMultiplier.toFixed(3)}`);
    
    // Use enhanced biome system with smooth transitions
    const biomeInfo = AdvancedBiomeTransitions.getEnhancedBiomeInfo(centerPosition);
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    console.log(`🌱 Generating enhanced ${biomeConfig.name} grass (strength: ${biomeInfo.strength.toFixed(2)}) for region ${regionKey}`);
    
    // Create enhanced environmental factors
    const environmentalFactors = this.createRealisticEnvironmentalFactors(
      centerPosition, 
      region, 
      terrainColor
    );
    
    // Generate realistic grass distribution with environmental awareness
    const tallGrassData = this.generateRealisticGrassDistribution(
      centerPosition, 
      size, 
      environmentalFactors, 
      lodDensityMultiplier,
      biomeInfo,
      Math.max(0.2, lodDensityMultiplier * 0.5) // Higher minimum coverage
    );
    
    // Generate enhanced ground grass with better coverage
    const groundGrassData = this.generateRealisticGroundGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      lodDensityMultiplier,
      biomeInfo,
      Math.max(0.4, lodDensityMultiplier * 0.8) // Much higher ground coverage
    );
    
    // Group by species for efficient rendering
    const tallGrassGroups = this.groupGrassBySpecies(tallGrassData);
    const groundGrassGroups = this.groupGrassBySpecies(groundGrassData);
    
    // Create instanced meshes with realistic variations
    for (const [speciesName, speciesData] of Object.entries(tallGrassGroups)) {
      this.createRealisticSpeciesInstancedMesh(
        regionKey, 
        speciesName, 
        speciesData, 
        region,
        biomeInfo,
        false, // tall grass
        lodDensityMultiplier
      );
    }
    
    // Create ground grass instances
    for (const [speciesName, speciesData] of Object.entries(groundGrassGroups)) {
      this.createRealisticSpeciesInstancedMesh(
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
    
    console.log(`✅ Generated realistic ${biomeConfig.name} grass for region ${regionKey} with ${tallGrassData.positions.length} tall and ${groundGrassData.positions.length} ground blades`);
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
   * ENHANCED: Generate realistic grass distribution using new environmental system
   */
  private generateRealisticGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.3
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
    
    // Use realistic species distribution system
    grassData.species = RealisticSpeciesDistribution.generateRealisticDistribution(
      grassData.positions,
      biomeInfo,
      this.currentSeason
    );
    
    // Apply realistic height variations based on environmental conditions
    for (let i = 0; i < grassData.scales.length; i++) {
      const position = grassData.positions[i];
      const species = grassData.species[i];
      const conditions = EnvironmentalRealism.calculateEnvironmentalConditions(position);
      
      // Add player traffic influence
      const trafficKey = this.getTrafficKey(position);
      conditions.playerTraffic = this.playerTrafficMap.get(trafficKey) || 0;
      
      const baseHeight = grassData.scales[i].y;
      const realisticHeight = RealisticSpeciesDistribution.calculateRealisticHeight(
        species,
        baseHeight * biomeConfig.heightMultiplier,
        conditions,
        this.currentSeason
      );
      
      grassData.scales[i].y = realisticHeight;
    }
    
    return grassData;
  }
  
  /**
   * ENHANCED: Generate realistic ground grass distribution
   */
  private generateRealisticGroundGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.7
  ) {
    const groundConfig = GroundGrassBiomeConfig.getGroundConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * groundConfig.densityMultiplier * 1.2; // Higher density for ground
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
    
    // Use realistic distribution for ground grass too
    grassData.species = RealisticSpeciesDistribution.generateRealisticDistribution(
      grassData.positions,
      biomeInfo,
      this.currentSeason
    );
    
    // Apply realistic height reductions with environmental factors
    for (let i = 0; i < grassData.scales.length; i++) {
      const position = grassData.positions[i];
      const species = grassData.species[i];
      const conditions = EnvironmentalRealism.calculateEnvironmentalConditions(position);
      
      // Add player traffic influence
      const trafficKey = this.getTrafficKey(position);
      conditions.playerTraffic = this.playerTrafficMap.get(trafficKey) || 0;
      
      const baseHeight = grassData.scales[i].y;
      const realisticHeight = RealisticSpeciesDistribution.calculateRealisticHeight(
        species,
        baseHeight * groundConfig.heightReduction,
        conditions,
        this.currentSeason
      );
      
      grassData.scales[i].y = realisticHeight;
    }
    
    return grassData;
  }
  
  /**
   * Updated LOD level calculation with smooth density scaling
   */
  private getDynamicLODLevel(distance: number): number {
    return GradientDensity.calculateLODDensity(distance, this.lodDistances);
  }
  
  /**
   * Updated visibility system with smooth transitions
   */
  private updateGrassVisibility(playerPosition: THREE.Vector3): void {
    let hiddenCount = 0;
    let visibleCount = 0;
    
    // Update tall grass visibility with smooth LOD
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
        // Apply material alpha for distant grass fade (optional)
        if (instancedMesh.material && newLodDensity < 0.3) {
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.3, newLodDensity);
          }
        }
      }
    }
    
    // Update ground grass visibility with extended render distance
    const groundRenderDistance = this.config.maxDistance * 0.9; // Increased from 0.8
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
      }
    }
    
    if (hiddenCount > 0 || visibleCount > 0) {
      console.log(`🌱 Organic LOD: ${visibleCount} regions shown, ${hiddenCount} regions hidden`);
    }
  }
  
  private createRealisticEnvironmentalFactors(
    centerPosition: THREE.Vector3,
    region: RegionCoordinates,
    terrainColor: number
  ): EnvironmentalFactors {
    // Use more realistic environmental modeling
    const waterInfluence = Math.sin(centerPosition.x * 0.015) * Math.cos(centerPosition.z * 0.015);
    const treeInfluence = Math.sin(centerPosition.x * 0.025 + 100) * Math.cos(centerPosition.z * 0.025 + 100);
    const rockInfluence = Math.sin(centerPosition.x * 0.02 + 200) * Math.cos(centerPosition.z * 0.02 + 200);
    
    return EnvironmentalGrassDistribution.createEnvironmentalFactorsForTerrain(
      centerPosition,
      0,
      {
        hasWater: waterInfluence > 0.25,
        hasTrees: treeInfluence > 0.15,
        hasRocks: rockInfluence > 0.35,
        playerTraffic: 0 // Will be updated by traffic tracking
      }
    );
  }
  
  private createRealisticSpeciesInstancedMesh(
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
    
    // Update material with realistic biome colors
    for (let i = 0; i < lodPositions.length; i++) {
      const position = lodPositions[i];
      const realisticColor = AdvancedBiomeTransitions.getTransitionAwareColor(
        position,
        speciesName,
        this.currentSeason
      );
      
      // Apply environmental color modifications
      const conditions = EnvironmentalRealism.calculateEnvironmentalConditions(position);
      const trafficKey = this.getTrafficKey(position);
      conditions.playerTraffic = this.playerTrafficMap.get(trafficKey) || 0;
      
      const finalColor = EnvironmentalRealism.getEnvironmentalColorModifier(
        realisticColor,
        conditions,
        this.currentSeason
      );
      
      // Update material uniforms with realistic colors
      RealisticGrassShader.updateBiomeColors(material, finalColor, biomeInfo.strength);
    }
    
    const instancedMesh = new THREE.InstancedMesh(
      geometry, 
      material, 
      lodPositions.length
    );
    
    // Set instance data with improved positioning
    for (let i = 0; i < lodPositions.length; i++) {
      const matrix = new THREE.Matrix4();
      const adjustedPosition = lodPositions[i].clone();
      
      // Better ground grass positioning
      if (isGroundGrass) {
        adjustedPosition.y = Math.max(0.08, adjustedPosition.y); // Slightly higher
      } else {
        adjustedPosition.y = Math.max(0.12, adjustedPosition.y);
      }
      
      matrix.compose(
        adjustedPosition,
        lodRotations[i],
        lodScales[i]
      );
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = !isGroundGrass;
    instancedMesh.receiveShadow = true;
    
    // Store enhanced metadata
    instancedMesh.userData = {
      regionKey: `${regionKey}_${speciesName}${suffix}`,
      centerPosition: lodPositions[0] || new THREE.Vector3(),
      ringIndex: region.ringIndex,
      species: speciesName,
      biomeType: biomeInfo.type,
      biomeStrength: biomeInfo.strength,
      isGroundGrass,
      lodLevel,
      isRealistic: true // Mark as using realistic system
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
  
  public updatePlayerTraffic(playerPosition: THREE.Vector3): void {
    const trafficKey = this.getTrafficKey(playerPosition);
    const currentTraffic = this.playerTrafficMap.get(trafficKey) || 0;
    
    // Increase traffic at current position
    this.playerTrafficMap.set(trafficKey, Math.min(1.0, currentTraffic + 0.02));
    
    // Decay all traffic values over time
    for (const [key, value] of this.playerTrafficMap.entries()) {
      const newValue = value * this.TRAFFIC_DECAY_RATE;
      if (newValue < 0.01) {
        this.playerTrafficMap.delete(key); // Remove very low traffic
      } else {
        this.playerTrafficMap.set(key, newValue);
      }
    }
  }
  
  private getTrafficKey(position: THREE.Vector3): string {
    // Create a grid key for traffic tracking
    const gridSize = 2;
    const gridX = Math.floor(position.x / gridSize);
    const gridZ = Math.floor(position.z / gridSize);
    return `${gridX},${gridZ}`;
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    this.time += deltaTime;
    this.updateCounter++;
    this.grassCullingUpdateCounter++;
    
    // Update last player position and traffic
    this.lastPlayerPosition.copy(playerPosition);
    this.updatePlayerTraffic(playerPosition);
    
    // More frequent grass visibility updates for dynamic LOD
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      this.updateGrassVisibility(playerPosition);
      this.grassCullingUpdateCounter = 0;
    }
    
    // Update materials with enhanced realism
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      // Calculate day/night factors
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Enhanced wind with more realistic variation
      const baseWindStrength = 0.15 + Math.sin(this.time * 0.25) * 0.08;
      const gustIntensity = 0.08 + Math.sin(this.time * 0.6) * 0.06;
      
      // Update all materials with enhanced wind
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
      
      // Update ground grass with improved wind responsiveness
      for (const material of this.groundGrassMaterials.values()) {
        RealisticGrassShader.updateRealisticWindAnimation(
          material, 
          this.time, 
          baseWindStrength * 0.9, // More responsive ground grass
          gustIntensity * 0.7
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
    
    console.log(`🌱 Removed organic grass coverage for region ${regionKey}`);
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
    
    console.log('🌱 Enhanced GrassSystem with dynamic LOD and guaranteed coverage disposed');
  }
}
