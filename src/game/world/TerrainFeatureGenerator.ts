
import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RockGenerationModule } from './rocks/generators/RockGenerationModule';
import { TreeGenerator, BushGenerator } from './vegetation';

export interface FeatureCluster {
  position: THREE.Vector3;
  type: 'rocks' | 'trees' | 'bushes' | 'mixed';
  size: number;
  density: number;
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private rockGenerator: RockGenerationModule;
  private treeGenerator: TreeGenerator;
  private bushGenerator: BushGenerator;
  private collisionRegistrationCallback: ((object: THREE.Object3D) => void) | null = null;
  private regionGroups: Map<string, THREE.Group> = new Map();

  constructor(ringSystem: RingQuadrantSystem) {
    this.ringSystem = ringSystem;
    this.rockGenerator = new RockGenerationModule({
      density: 0.3,
      minDistance: 2.0,
      maxRocksPerCluster: 7,
      enableClustering: true
    });
    this.treeGenerator = new TreeGenerator();
    this.bushGenerator = new BushGenerator();
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  public generateFeaturesForRegion(coordinates: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(coordinates);
    const centerPosition = this.ringSystem.getRegionCenter(coordinates);
    const ringDef = this.ringSystem.getRingDefinition(coordinates.ringIndex);
    const regionSize = coordinates.ringIndex === 0 ? ringDef.outerRadius * 2 : 100;

    console.log(`🌍 Generating features for region ${coordinates.ringIndex}-${coordinates.quadrant}`);

    // Create region group
    const regionGroup = new THREE.Group();
    this.regionGroups.set(regionKey, regionGroup);

    // Generate rocks using the specialized module
    this.rockGenerator.generateRocksInRegion(
      regionGroup,
      regionSize,
      centerPosition.x,
      centerPosition.z
    );

    // Generate vegetation
    this.generateVegetation(regionGroup, regionSize, centerPosition);

    // Register collisions if callback is set
    if (this.collisionRegistrationCallback) {
      regionGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          this.collisionRegistrationCallback!(child);
        }
      });
    }
  }

  private generateVegetation(
    regionGroup: THREE.Group,
    regionSize: number,
    centerPosition: THREE.Vector3
  ): void {
    // Tree generation
    const treeCount = Math.floor(regionSize * regionSize * 0.1);
    for (let i = 0; i < treeCount; i++) {
      const x = centerPosition.x + (Math.random() - 0.5) * regionSize;
      const z = centerPosition.z + (Math.random() - 0.5) * regionSize;
      const position = new THREE.Vector3(x, 0, z);
      
      const tree = this.treeGenerator.createTree(position);
      if (tree) {
        regionGroup.add(tree);
      }
    }

    // Bush generation
    const bushCount = Math.floor(regionSize * regionSize * 0.2);
    for (let i = 0; i < bushCount; i++) {
      const x = centerPosition.x + (Math.random() - 0.5) * regionSize;
      const z = centerPosition.z + (Math.random() - 0.5) * regionSize;
      const position = new THREE.Vector3(x, 0, z);
      
      const bush = this.bushGenerator.createBush(position);
      if (bush) {
        regionGroup.add(bush);
      }
    }
  }

  public cleanupFeaturesForRegion(coordinates: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(coordinates);
    const regionGroup = this.regionGroups.get(regionKey);
    
    if (regionGroup) {
      // Remove from scene if it has a parent
      if (regionGroup.parent) {
        regionGroup.parent.remove(regionGroup);
      }
      
      // Dispose geometries and materials
      regionGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      
      this.regionGroups.delete(regionKey);
    }
  }

  public updateRockDensity(density: number): void {
    this.rockGenerator.updateConfig({ density });
  }

  public getRockConfig() {
    return this.rockGenerator.getConfig();
  }

  public dispose(): void {
    // Clean up all region groups
    for (const [regionKey, regionGroup] of this.regionGroups) {
      if (regionGroup.parent) {
        regionGroup.parent.remove(regionGroup);
      }
      
      regionGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }
    
    this.regionGroups.clear();
    this.collisionRegistrationCallback = null;
  }
}
