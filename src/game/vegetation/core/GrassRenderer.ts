
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
    
    // Create or get geometry
    const geometry = species.clustered 
      ? GrassGeometry.createGrassCluster(species, isGroundGrass ? 7 : 3, isGroundGrass)
      : GrassGeometry.createGrassBladeGeometry(species, 1.0, isGroundGrass);
    
    // Create or get material
    const materialKey = `${speciesName}${suffix}`;
    let material = isGroundGrass 
      ? this.groundGrassMaterials.get(materialKey)
      : this.grassMaterials.get(materialKey);
    
    if (!material) {
      material = GrassShader.createGrassMaterial(biomeColor, speciesName, isGroundGrass);
      
      if (isGroundGrass) {
        this.groundGrassMaterials.set(materialKey, material);
      } else {
        this.grassMaterials.set(materialKey, material);
      }
    }
    
    // Apply LOD-based instance count reduction
    const targetInstanceCount = Math.max(1, Math.floor(speciesData.positions.length * lodLevel));
    const lodPositions = speciesData.positions.slice(0, targetInstanceCount);
    const lodScales = speciesData.scales.slice(0, targetInstanceCount);
    const lodRotations = speciesData.rotations.slice(0, targetInstanceCount);
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, lodPositions.length);
    
    // Set instance data
    for (let i = 0; i < lodPositions.length; i++) {
      const matrix = new THREE.Matrix4();
      const adjustedPosition = lodPositions[i].clone();
      
      if (isGroundGrass) {
        adjustedPosition.y = Math.max(0.05, adjustedPosition.y);
      } else {
        adjustedPosition.y = Math.max(0.1, adjustedPosition.y);
      }
      
      matrix.compose(adjustedPosition, lodRotations[i], lodScales[i]);
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

  public dispose(): void {
    // Clean up instances
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
    
    // Clean up materials
    for (const material of this.grassMaterials.values()) {
      material.dispose();
    }
    this.grassMaterials.clear();
    
    for (const material of this.groundGrassMaterials.values()) {
      material.dispose();
    }
    this.groundGrassMaterials.clear();
    
    // Clean up cached resources
    GrassGeometry.dispose();
    GrassShader.dispose();
  }
}
