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
  
  // Enhanced player position tracking for dynamic LOD
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 5;
  
  // Dynamic LOD system - continuous scaling
  private lodDistances: number[] = [75, 150, 225, 300];
  
  // Performance optimization variables
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 3;
  private readonly FOG_CHECK_INTERVAL: number = 100;
  
  private config: GrassConfig = {
    baseDensity: 1.2,
    patchDensity: 2.5,
    patchCount: 5,
    maxDistance: 500, // For visibility only, not generation
    lodLevels: [1.0, 0.7, 0.4, 0.15] // Never go to 0
  };
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeEnhancedGrassSystem();
  }
  
  private initializeEnhancedGrassSystem(): void {
    this.enhancedGrassSpecies = EnhancedGrassGeometry.getEnhancedGrassSpecies();
    
    for (const species of this.enhancedGrassSpecies) {
      const geometry = species.clustered 
        ? EnhancedGrassGeometry.createGrassCluster(species, 3)
        : EnhancedGrassGeometry.createRealisticGrassBladeGeometry(species);
      
      this.grassGeometries.set(species.species, geometry);
      
      const groundGeometry = species.clustered
        ? GroundGrassGeometry.createGroundGrassCluster(species, 7)
        : GroundGrassGeometry.createGroundGrassBladeGeometry(species, 0.85);
      
      this.groundGrassGeometries.set(species.species, groundGeometry);
      
      const material = RealisticGrassShader.createRealisticGrassMaterial(
        species.color, 
        0, 
        species.species
      );
      this.grassMaterials.set(species.species, material);
      
      const groundMaterial = RealisticGrassShader.createRealisticGrassMaterial(
        species.color.clone().multiplyScalar(0.9),
        0, 
        `ground_${species.species}`
      );
      
      if (groundMaterial.uniforms.windStrength) {
        groundMaterial.uniforms.windStrength.value *= 0.8;
      }
      
      this.groundGrassMaterials.set(species.species, groundMaterial);
    }
    
    console.log('🌱 Enhanced grass system with continuous LOD initialized with', this.enhancedGrassSpecies.length, 'species');
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number
  ): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    if (this.grassInstances.has(regionKey)) return;
    
    const distanceFromPlayer = centerPosition.distanceTo(this.lastPlayerPosition);
    const lodLevel = this.calculateContinuousLOD(distanceFromPlayer);
    
    console.log(`🌱 Region ${region.ringIndex}-${region.quadrant}: distance=${distanceFromPlayer.toFixed(1)}, LOD=${lodLevel.toFixed(3)}`);
    
    const biomeInfo = GrassBiomeManager.getBiomeAtPosition(centerPosition);
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    console.log(`🌱 Generating ${biomeConfig.name} grass (LOD: ${lodLevel.toFixed(3)}) for region ${region.ringIndex}-${region.quadrant}`);
    
    const baseEnvironmentalFactors = this.createImprovedEnvironmentalFactors(
      centerPosition, 
      region, 
      terrainColor
    );
    
    const environmentalFactors = GrassBiomeManager.adjustEnvironmentalFactors(
      baseEnvironmentalFactors,
      biomeInfo
    );
    
    const tallGrassMinCoverage = Math.max(0.01, lodLevel * 0.2);
    const groundGrassMinCoverage = Math.max(0.02, lodLevel * 0.5);
    
    const tallGrassData = this.generateBiomeAwareGrassDistribution(
      centerPosition, 
      size, 
      environmentalFactors, 
      lodLevel,
      biomeInfo,
      tallGrassMinCoverage
    );
    
    const groundGrassData = this.generateGroundGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      lodLevel,
      biomeInfo,
      groundGrassMinCoverage
    );
    
    if (tallGrassData.positions.length === 0 && groundGrassData.positions.length === 0) {
      console.error(`🚨 CRITICAL: No grass generated for region ${regionKey}, forcing emergency grass`);
      this.forceEmergencyGrass(tallGrassData, groundGrassData, centerPosition, size, environmentalFactors);
    }
    
    const tallGrassGroups = this.groupGrassBySpecies(tallGrassData);
    const groundGrassGroups = this.groupGrassBySpecies(groundGrassData);
    
    for (const [speciesName, speciesData] of Object.entries(tallGrassGroups)) {
      this.createBiomeAwareSpeciesInstancedMesh(
        regionKey, 
        speciesName, 
        speciesData, 
        region,
        biomeInfo,
        false,
        lodLevel
      );
    }
    
    for (const [speciesName, speciesData] of Object.entries(groundGrassGroups)) {
      this.createBiomeAwareSpeciesInstancedMesh(
        regionKey, 
        speciesName, 
        speciesData, 
        region,
        biomeInfo,
        true,
        lodLevel
      );
    }
    
    console.log(`✅ Generated ${biomeConfig.name} grass for region ${regionKey} with ${tallGrassData.positions.length} tall and ${groundGrassData.positions.length} ground blades`);
  }
  
  private calculateContinuousLOD(distance: number): number {
    if (distance < this.lodDistances[0]) return this.config.lodLevels[0]; // 1.0
    if (distance < this.lodDistances[1]) return this.config.lodLevels[1]; // 0.7
    if (distance < this.lodDistances[2]) return this.config.lodLevels[2]; // 0.4
    if (distance < this.lodDistances[3]) return this.config.lodLevels[3]; // 0.15
    
    const excessDistance = distance - this.lodDistances[3];
    const decayFactor = Math.exp(-excessDistance / 200);
    return Math.max(0.01, this.config.lodLevels[3] * decayFactor);
  }
  
  private forceEmergencyGrass(
    tallGrassData: any,
    groundGrassData: any,
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors
  ): void {
    const minBlades = 5;
    const halfSize = size * 0.5;
    
    for (let i = 0; i < minBlades; i++) {
      const randomX = centerPosition.x - halfSize + Math.random() * size;
      const randomZ = centerPosition.z - halfSize + Math.random() * size;
      const worldPos = new THREE.Vector3(randomX, 0, randomZ);
      
      if (i < 2) {
        tallGrassData.positions.push(worldPos.clone());
        tallGrassData.scales.push(new THREE.Vector3(0.6 + Math.random() * 0.3, 0.8, 0.6 + Math.random() * 0.3));
        tallGrassData.rotations.push(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2));
        tallGrassData.species.push('meadow');
      } else {
        groundGrassData.positions.push(worldPos.clone());
        groundGrassData.scales.push(new THREE.Vector3(0.5 + Math.random() * 0.3, 0.5, 0.5 + Math.random() * 0.3));
        groundGrassData.rotations.push(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2));
        groundGrassData.species.push('clumping');
      }
    }
    
    console.log(`🚨 EMERGENCY: Forced ${minBlades} grass blades for coverage`);
  }
  
  private createImprovedEnvironmentalFactors(
    centerPosition: THREE.Vector3,
    region: RegionCoordinates,
    terrainColor: number
  ): EnvironmentalFactors {
    const distanceFromCenter = centerPosition.length();
    
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
  
  private getDynamicLODLevel(distance: number): number {
    return this.calculateContinuousLOD(distance);
  }
  
  private generateGroundGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.02
  ) {
    const groundConfig = GroundGrassBiomeConfig.getGroundConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * lodMultiplier * groundConfig.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing,
      minimumCoverage
    );
    
    grassData.species = GroundGrassBiomeConfig.adjustGroundSpeciesForBiome(
      grassData.species, 
      biomeInfo.type
    );
    
    for (let i = 0; i < grassData.scales.length; i++) {
      const terrainHeightVariation = grassData.scales[i].y;
      const additionalHeightVariation = 0.8 + Math.random() * 0.4;
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
    isGroundGrass: boolean = false,
    lodLevel: number = 1.0
  ): void {
    const suffix = isGroundGrass ? '_ground' : '';
    const geometryMap = isGroundGrass ? this.groundGrassGeometries : this.grassGeometries;
    const materialMap = isGroundGrass ? this.groundGrassMaterials : this.grassMaterials;
    const instanceMap = isGroundGrass ? this.groundGrassInstances : this.grassInstances;
    
    const geometry = geometryMap.get(speciesName);
    let material = materialMap.get(speciesName);
    
    if (!geometry || !material) return;
    
    const targetInstanceCount = Math.max(1, Math.floor(speciesData.positions.length));
    const lodPositions = speciesData.positions.slice(0, targetInstanceCount);
    const lodScales = speciesData.scales.slice(0, targetInstanceCount);
    const lodRotations = speciesData.rotations.slice(0, targetInstanceCount);
    
    if (isGroundGrass && material.uniforms.windStrength) {
      const groundConfig = GroundGrassBiomeConfig.getGroundConfiguration(biomeInfo.type);
      material.uniforms.windStrength.value *= (1 - groundConfig.windReduction);
    }
    
    const instancedMesh = new THREE.InstancedMesh(
      geometry, 
      material, 
      lodPositions.length
    );
    
    for (let i = 0; i < lodPositions.length; i++) {
      const matrix = new THREE.Matrix4();
      const adjustedPosition = lodPositions[i].clone();
      
      if (isGroundGrass) {
        adjustedPosition.y = Math.max(0.05, adjustedPosition.y);
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
    instancedMesh.castShadow = !isGroundGrass;
    instancedMesh.receiveShadow = true;
    
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
  
  private generateBiomeAwareGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    lodMultiplier: number,
    biomeInfo: { type: BiomeType; strength: number; transitionZone: boolean },
    minimumCoverage: number = 0.01
  ) {
    const biomeConfig = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);
    const adjustedDensity = this.config.baseDensity * lodMultiplier * biomeConfig.densityMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    const grassData = EnvironmentalGrassDistribution.calculateGrassDistribution(
      centerPosition,
      size,
      environmentalFactors,
      baseSpacing,
      minimumCoverage
    );
    
    grassData.species = GrassBiomeManager.adjustSpeciesForBiome(
      grassData.species, 
      biomeInfo
    );
    
    for (let i = 0; i < grassData.scales.length; i++) {
      const terrainHeightVariation = grassData.scales[i].y;
      const additionalHeightVariation = 0.7 + Math.random() * 0.6;
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
    return this.calculateContinuousLOD(distance);
  }
  
  private updateGrassVisibility(playerPosition: THREE.Vector3): void {
    let hiddenCount = 0;
    let visibleCount = 0;
    
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= this.config.maxDistance;
      const newLodLevel = this.calculateContinuousLOD(distanceToPlayer);
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        if (shouldBeVisible) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
      }
      
      if (instancedMesh.userData.lodLevel !== newLodLevel && shouldBeVisible) {
        instancedMesh.userData.lodLevel = newLodLevel;
      }
    }
    
    const groundRenderDistance = this.config.maxDistance * 0.8;
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
      }
    }
    
    if (hiddenCount > 0 || visibleCount > 0) {
      console.log(`🌱 Dynamic LOD: ${visibleCount} regions shown, ${hiddenCount} regions hidden`);
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
    
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      const playerMovedDistance = this.lastPlayerPosition.distanceTo(playerPosition);
      if (playerMovedDistance > 2.0) {
        this.updateGrassVisibility(playerPosition);
        this.lastPlayerPosition.copy(playerPosition);
      }
      this.grassCullingUpdateCounter = 0;
    }
    
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
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
      
      for (const material of this.groundGrassMaterials.values()) {
        RealisticGrassShader.updateRealisticWindAnimation(
          material, 
          this.time, 
          baseWindStrength * 0.8,
          gustIntensity * 0.6
        );
        RealisticGrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
        RealisticGrassShader.updateSeasonalVariation(material, this.currentSeason);
      }
      
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
    
    for (const material of this.grassMaterials.values()) {
      RealisticGrassShader.updateSeasonalVariation(material, season);
    }
    
    for (const material of this.groundGrassMaterials.values()) {
      RealisticGrassShader.updateSeasonalVariation(material, season);
    }
  }
  
  public removeGrassForRegion(region: RegionCoordinates): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
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
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      this.scene.remove(instancedMesh);
      instancedMesh.geometry.dispose();
    }
    this.grassInstances.clear();
    
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      this.scene.remove(instancedMesh);
      instancedMesh.geometry.dispose();
    }
    this.groundGrassInstances.clear();
    
    for (const material of this.grassMaterials.values()) {
      material.dispose();
    }
    this.grassMaterials.clear();
    
    for (const material of this.groundGrassMaterials.values()) {
      material.dispose();
    }
    this.groundGrassMaterials.clear();
    
    for (const geometry of this.grassGeometries.values()) {
      geometry.dispose();
    }
    this.grassGeometries.clear();
    
    for (const geometry of this.groundGrassGeometries.values()) {
      geometry.dispose();
    }
    this.groundGrassGeometries.clear();
    
    console.log('🌱 Enhanced GrassSystem with continuous LOD disposed');
  }
}
