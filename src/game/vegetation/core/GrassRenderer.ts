
import * as THREE from 'three';
import { GrassGeometry } from './GrassGeometry';
import { GrassShader } from './GrassShader';
import { GrassBladeConfig, BiomeInfo } from './GrassConfig';
import { BiomeManager } from '../biomes/BiomeManager';
import { RegionCoordinates } from '../../world/RingQuadrantSystem';

export class GrassRenderer {
  private scene: THREE.Scene;
  private grassInstances: Map<string, THREE.InstancedMesh> = new Map();
  private groundGrassInstances: Map<string, THREE.InstancedMesh> = new Map();
  private grassMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private groundGrassMaterials: Map<string, THREE.ShaderMaterial> = new Map();

  // PERFORMANCE: Material pooling for better memory usage
  private materialPool: Map<string, THREE.ShaderMaterial> = new Map();
  private geometryPool: Map<string, THREE.BufferGeometry> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createInstancedMesh(
    regionKey: string,
    speciesName: string,
    speciesData: {
      positions: THREE.Vector3[];
      scales: THREE.Vector3[];
      rotations: THREE.Quaternion[];
    },
    region: RegionCoordinates,
    biomeInfo: BiomeInfo,
    isGroundGrass: boolean = false,
    lodLevel: number = 1.0
  ): void {
    const suffix = isGroundGrass ? '_ground' : '';
    const species = GrassGeometry.getGrassSpecies().find(s => s.species === speciesName);
    
    if (!species) return;

    // Get biome-specific color
    const biomeColor = BiomeManager.getBiomeSpeciesColor(speciesName, biomeInfo);
    
    // PERFORMANCE: Use pooled geometry
    const geometryKey = `${speciesName}_${isGroundGrass ? 'ground' : 'tall'}`;
    let geometry = this.geometryPool.get(geometryKey);
    
    if (!geometry) {
      geometry = species.clustered 
        ? GrassGeometry.createGrassCluster(species, isGroundGrass ? 7 : 3, isGroundGrass)
        : GrassGeometry.createGrassBladeGeometry(species, 1.0, isGroundGrass);
      this.geometryPool.set(geometryKey, geometry);
    }
    
    // PERFORMANCE: Use pooled material
    const materialKey = `${speciesName}_${biomeColor.getHexString()}${suffix}`;
    let material = this.materialPool.get(materialKey);
    
    if (!material) {
      material = GrassShader.createGrassMaterial(biomeColor, speciesName, isGroundGrass);
      this.materialPool.set(materialKey, material);
      
      if (isGroundGrass) {
        this.groundGrassMaterials.set(materialKey, material);
      } else {
        this.grassMaterials.set(materialKey, material);
      }
    }
    
    // ENHANCED: More aggressive LOD-based instance reduction
    const baseReductionFactor = isGroundGrass ? 0.6 : 0.7; // Reduce base instances
    const targetInstanceCount = Math.max(1, Math.floor(speciesData.positions.length * lodLevel * baseReductionFactor));
    const lodPositions = speciesData.positions.slice(0, targetInstanceCount);
    const lodScales = speciesData.scales.slice(0, targetInstanceCount);
    const lodRotations = speciesData.rotations.slice(0, targetInstanceCount);
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, lodPositions.length);
    
    // Set instance data with optimized positioning
    for (let i = 0; i < lodPositions.length; i++) {
      const matrix = new THREE.Matrix4();
      const adjustedPosition = lodPositions[i].clone();
      
      // Slight Y adjustment for better ground placement
      if (isGroundGrass) {
        adjustedPosition.y = Math.max(0.02, adjustedPosition.y);
      } else {
        adjustedPosition.y = Math.max(0.05, adjustedPosition.y);
      }
      
      matrix.compose(adjustedPosition, lodRotations[i], lodScales[i]);
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    // PERFORMANCE: Optimize shadow settings
    instancedMesh.castShadow = !isGroundGrass && lodLevel > 0.5; // Only cast shadows for close, tall grass
    instancedMesh.receiveShadow = true;
    
    // PERFORMANCE: Set frustum culling to false to use our custom culling
    instancedMesh.frustumCulled = false;
    
    instancedMesh.userData = {
      regionKey: `${regionKey}_${speciesName}${suffix}`,
      centerPosition: lodPositions[0] || new THREE.Vector3(),
      ringIndex: region.ringIndex,
      species: speciesName,
      biomeType: biomeInfo.type,
      biomeStrength: biomeInfo.strength,
      isGroundGrass,
      lodLevel,
      materialKey // Store for material sharing
    };
    
    this.scene.add(instancedMesh);
    
    if (isGroundGrass) {
      this.groundGrassInstances.set(`${regionKey}_${speciesName}`, instancedMesh);
    } else {
      this.grassInstances.set(`${regionKey}_${speciesName}`, instancedMesh);
    }
  }

  public removeRegion(regionKey: string): void {
    // Remove tall grass instances
    const keysToRemove = Array.from(this.grassInstances.keys()).filter(
      key => key.startsWith(regionKey)
    );
    
    for (const key of keysToRemove) {
      const instancedMesh = this.grassInstances.get(key);
      if (instancedMesh) {
        this.scene.remove(instancedMesh);
        // Don't dispose geometry as it's pooled
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
        // Don't dispose geometry as it's pooled
        this.groundGrassInstances.delete(key);
      }
    }
  }

  public getGrassInstances(): Map<string, THREE.InstancedMesh> {
    return this.grassInstances;
  }

  public getGroundGrassInstances(): Map<string, THREE.InstancedMesh> {
    return this.groundGrassInstances;
  }

  public getGrassMaterials(): Map<string, THREE.ShaderMaterial> {
    return this.grassMaterials;
  }

  public getGroundGrassMaterials(): Map<string, THREE.ShaderMaterial> {
    return this.groundGrassMaterials;
  }

  // PERFORMANCE: Get performance metrics
  public getPerformanceMetrics(): {
    totalInstances: number;
    visibleInstances: number;
    pooledMaterials: number;
    pooledGeometries: number;
  } {
    let totalInstances = 0;
    let visibleInstances = 0;
    
    for (const mesh of this.grassInstances.values()) {
      totalInstances += mesh.count;
      if (mesh.visible) visibleInstances += mesh.count;
    }
    
    for (const mesh of this.groundGrassInstances.values()) {
      totalInstances += mesh.count;
      if (mesh.visible) visibleInstances += mesh.count;
    }
    
    return {
      totalInstances,
      visibleInstances,
      pooledMaterials: this.materialPool.size,
      pooledGeometries: this.geometryPool.size
    };
  }

  public dispose(): void {
    // Clean up instances
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      this.scene.remove(instancedMesh);
    }
    this.grassInstances.clear();
    
    for (const [regionKey, instancedMesh] of this.groundGrassInstances.entries()) {
      this.scene.remove(instancedMesh);
    }
    this.groundGrassInstances.clear();
    
    // Clean up pooled resources
    for (const material of this.materialPool.values()) {
      material.dispose();
    }
    this.materialPool.clear();
    
    for (const geometry of this.geometryPool.values()) {
      geometry.dispose();
    }
    this.geometryPool.clear();
    
    this.grassMaterials.clear();
    this.groundGrassMaterials.clear();
    
    // Clean up cached resources
    GrassGeometry.dispose();
    GrassShader.dispose();
  }
}
