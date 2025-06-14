import * as THREE from 'three';
import { GrassGeometry } from './GrassGeometry';
import { GrassShader } from './GrassShader';
import { GrassBladeConfig, BiomeInfo } from './GrassConfig';
import { DeterministicBiomeManager } from '../biomes/DeterministicBiomeManager';
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

    // FIXED: Calculate average biome color from actual positions, not chunk center
    const biomeColor = this.calculateAverageBiomeColor(speciesData.positions, speciesName, biomeInfo);
    
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
    
    // Set instance data with per-position biome coloring
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
      
      // Apply position-specific biome coloring
      const positionBiome = DeterministicBiomeManager.getBiomeAtPosition(lodPositions[i]);
      const positionBiomeInfo = DeterministicBiomeManager.getBiomeInfo(lodPositions[i]);
      const positionColor = DeterministicBiomeManager.getBiomeSpeciesColor(speciesName, positionBiomeInfo);
      
      // Apply color variation per instance (this would need shader support for full implementation)
      instancedMesh.setColorAt(i, positionColor);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
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
    
    console.log(`🌱 ORGANIC RENDER: Created ${lodPositions.length} ${speciesName} blades with position-based biome colors`);
  }

  private calculateAverageBiomeColor(positions: THREE.Vector3[], speciesName: string, fallbackBiomeInfo: BiomeInfo): THREE.Color {
    if (positions.length === 0) {
      return DeterministicBiomeManager.getBiomeSpeciesColor(speciesName, fallbackBiomeInfo);
    }
    
    // Sample a few positions to determine average biome color
    const sampleCount = Math.min(10, positions.length);
    const sampleStep = Math.max(1, Math.floor(positions.length / sampleCount));
    
    let totalR = 0, totalG = 0, totalB = 0;
    let validSamples = 0;
    
    for (let i = 0; i < positions.length; i += sampleStep) {
      const biomeInfo = DeterministicBiomeManager.getBiomeInfo(positions[i]);
      const color = DeterministicBiomeManager.getBiomeSpeciesColor(speciesName, biomeInfo);
      
      totalR += color.r;
      totalG += color.g;
      totalB += color.b;
      validSamples++;
      
      if (validSamples >= sampleCount) break;
    }
    
    if (validSamples === 0) {
      return DeterministicBiomeManager.getBiomeSpeciesColor(speciesName, fallbackBiomeInfo);
    }
    
    return new THREE.Color(
      totalR / validSamples,
      totalG / validSamples,
      totalB / validSamples
    );
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
