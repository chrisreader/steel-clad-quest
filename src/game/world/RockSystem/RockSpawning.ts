
import * as THREE from 'three';
import { RockVariation, selectRandomVariation, selectRandomShape } from './RockVariations';
import { RockGeometry } from './RockGeometry';
import { RockMaterials } from './RockMaterials';
import { RockFeatures } from './RockFeatures';
import { RockClusters } from './RockClusters';

export interface RockSpawnConfig {
  density: number;
  minDistance: number;
  maxDistance: number;
  tavernExclusionRadius: number;
  minimumLargeRockDistance: number;
}

export class RockSpawning {
  private static spawnedPositions: THREE.Vector3[] = [];
  private static largeRockPositions: THREE.Vector3[] = [];

  static initialize(): void {
    this.spawnedPositions = [];
    this.largeRockPositions = [];
  }

  static spawnRocksInRegion(
    regionCenter: THREE.Vector3,
    regionSize: number,
    config: RockSpawnConfig,
    scene: THREE.Scene,
    collisionCallback?: (object: THREE.Object3D) => void
  ): THREE.Object3D[] {
    const spawnedRocks: THREE.Object3D[] = [];
    const rockCount = Math.floor(regionSize * regionSize * config.density / 10000);

    console.log(`🪨 Spawning ${rockCount} rocks in region at ${regionCenter.x}, ${regionCenter.z}`);

    for (let i = 0; i < rockCount; i++) {
      const position = this.generateValidPosition(regionCenter, regionSize, config);
      
      if (!position) continue;

      const variation = selectRandomVariation();
      
      if (variation.isCluster) {
        const formation = RockClusters.createCluster(variation, position, scene);
        const allRocks = [
          ...formation.foundationRocks,
          ...formation.supportRocks,
          ...formation.accentRocks
        ];
        
        allRocks.forEach(rock => {
          if (collisionCallback) {
            collisionCallback(rock);
          }
          spawnedRocks.push(rock);
        });

        if (variation.name === 'large' || variation.name === 'massive') {
          this.largeRockPositions.push(position);
          console.log(`🏔️ ${variation.name} rock cluster spawned at ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
        }
      } else {
        const rock = this.createSingleRock(variation, position);
        scene.add(rock);
        
        if (collisionCallback) {
          collisionCallback(rock);
        }
        
        spawnedRocks.push(rock);
      }

      this.spawnedPositions.push(position);
    }

    console.log(`✅ Spawned ${spawnedRocks.length} total rock objects in region`);
    return spawnedRocks;
  }

  private static generateValidPosition(
    regionCenter: THREE.Vector3,
    regionSize: number,
    config: RockSpawnConfig
  ): THREE.Vector3 | null {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const position = new THREE.Vector3(
        regionCenter.x + (Math.random() - 0.5) * regionSize,
        0,
        regionCenter.z + (Math.random() - 0.5) * regionSize
      );

      if (this.isValidPosition(position, config)) {
        return position;
      }
    }

    return null;
  }

  private static isValidPosition(position: THREE.Vector3, config: RockSpawnConfig): boolean {
    // Check tavern exclusion
    const distanceFromTavern = position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (distanceFromTavern < config.tavernExclusionRadius) {
      return false;
    }

    // Check minimum distance from other rocks
    for (const existingPos of this.spawnedPositions) {
      const distance = position.distanceTo(existingPos);
      if (distance < config.minDistance) {
        return false;
      }
    }

    // Check large rock distance constraints
    for (const largePos of this.largeRockPositions) {
      const distance = position.distanceTo(largePos);
      if (distance < config.minimumLargeRockDistance) {
        return false;
      }
    }

    return true;
  }

  private static createSingleRock(variation: RockVariation, position: THREE.Vector3): THREE.Mesh {
    const shape = selectRandomShape();
    const geometry = RockGeometry.createRockGeometry(variation, shape);
    const material = RockMaterials.createRockMaterial(variation, shape);
    
    const rock = new THREE.Mesh(geometry, material);
    rock.position.copy(position);
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.castShadow = true;
    rock.receiveShadow = true;

    // Add surface features for larger rocks
    if (variation.sizeRange.max > 0.5) {
      RockFeatures.addSurfaceFeatures(rock, variation, shape);
      RockFeatures.addWeathering(rock, variation);
    }

    return rock;
  }

  static clearRegion(regionCenter: THREE.Vector3, regionSize: number): void {
    // Remove positions within the region from tracking
    this.spawnedPositions = this.spawnedPositions.filter(pos => {
      const distance = pos.distanceTo(regionCenter);
      return distance > regionSize * 0.7; // Keep some overlap for seamless transitions
    });

    this.largeRockPositions = this.largeRockPositions.filter(pos => {
      const distance = pos.distanceTo(regionCenter);
      return distance > regionSize * 0.7;
    });
  }

  static getSpawnedPositions(): THREE.Vector3[] {
    return [...this.spawnedPositions];
  }

  static getLargeRockPositions(): THREE.Vector3[] {
    return [...this.largeRockPositions];
  }
}
