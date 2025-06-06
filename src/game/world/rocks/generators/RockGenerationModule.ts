
import * as THREE from 'three';
import { RockVariation, RockShape, GeometryProcessor } from '../types/RockTypes';
import { ROCK_VARIATIONS, ROCK_SHAPES } from '../index';
import { RockClusterGenerator } from './RockClusterGenerator';
import { RockShapeFactory } from './RockShapeFactory';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';

export interface RockGenerationConfig {
  density: number;
  minDistance: number;
  maxRocksPerCluster: number;
  enableClustering: boolean;
}

export class RockGenerationModule implements GeometryProcessor {
  private clusterGenerator: RockClusterGenerator;
  private config: RockGenerationConfig;

  constructor(config: RockGenerationConfig = {
    density: 0.3,
    minDistance: 2.0,
    maxRocksPerCluster: 7,
    enableClustering: true
  }) {
    this.config = config;
    this.clusterGenerator = new RockClusterGenerator();
  }

  public generateRocksInRegion(
    regionGroup: THREE.Group,
    regionSize: number,
    centerX: number,
    centerZ: number
  ): void {
    const rockCount = Math.floor(regionSize * regionSize * this.config.density);
    const placedPositions: THREE.Vector3[] = [];

    console.log(`🪨 Generating ${rockCount} rocks in region at (${centerX}, ${centerZ})`);

    for (let i = 0; i < rockCount; i++) {
      const position = this.generateValidPosition(
        centerX, 
        centerZ, 
        regionSize, 
        placedPositions
      );

      if (position) {
        const rockGroup = this.createRockAtPosition(position, i);
        regionGroup.add(rockGroup);
        placedPositions.push(position);
      }
    }
  }

  private generateValidPosition(
    centerX: number,
    centerZ: number,
    regionSize: number,
    existingPositions: THREE.Vector3[]
  ): THREE.Vector3 | null {
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = centerX + (Math.random() - 0.5) * regionSize;
      const z = centerZ + (Math.random() - 0.5) * regionSize;
      const position = new THREE.Vector3(x, 0, z);

      // Check minimum distance from existing rocks
      const tooClose = existingPositions.some(existing => 
        existing.distanceTo(position) < this.config.minDistance
      );

      if (!tooClose) {
        return position;
      }
    }

    return null; // Could not find valid position
  }

  private createRockAtPosition(position: THREE.Vector3, index: number): THREE.Group {
    const rockGroup = new THREE.Group();
    rockGroup.position.copy(position);

    // Select rock variation based on weighted random selection
    const variation = this.selectRockVariation();
    
    if (variation.isCluster && this.config.enableClustering) {
      // Create rock cluster
      this.clusterGenerator.createVariedRockCluster(
        rockGroup,
        variation,
        index,
        this
      );
    } else {
      // Create single rock
      const singleRock = this.createSingleRock(variation, index);
      rockGroup.add(singleRock);
    }

    return rockGroup;
  }

  private selectRockVariation(): RockVariation {
    const totalWeight = ROCK_VARIATIONS.reduce((sum, variation) => sum + variation.weight, 0);
    let random = Math.random() * totalWeight;

    for (const variation of ROCK_VARIATIONS) {
      random -= variation.weight;
      if (random <= 0) {
        return variation;
      }
    }

    return ROCK_VARIATIONS[0]; // Fallback
  }

  private createSingleRock(variation: RockVariation, index: number): THREE.Object3D {
    const rockShape = ROCK_SHAPES[index % ROCK_SHAPES.length];
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);

    // Create geometry using the factory
    const shapeResult = RockShapeFactory.generateRock(
      this.mapRockType(rockShape.type),
      rockSize,
      rockShape.deformationIntensity
    );

    // Create material
    const material = RockMaterialGenerator.createEnhancedRockMaterial(
      variation.category,
      rockShape,
      index
    );

    const rock = new THREE.Mesh(shapeResult.geometry, material);
    rock.scale.setScalar(shapeResult.scale);
    rock.rotation.copy(shapeResult.rotation);
    rock.castShadow = true;
    rock.receiveShadow = true;

    return rock;
  }

  private mapRockType(type: string): 'boulder' | 'angular' | 'flat' {
    switch (type) {
      case 'angular':
      case 'jagged':
        return 'angular';
      case 'slab':
      case 'flattened':
        return 'flat';
      default:
        return 'boulder';
    }
  }

  // GeometryProcessor interface implementation
  public createCharacterBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    const shapeResult = RockShapeFactory.generateRock(
      this.mapRockType(rockShape.type),
      rockSize,
      rockShape.deformationIntensity
    );
    return shapeResult.geometry;
  }

  public applyShapeModifications(
    geometry: THREE.BufferGeometry, 
    rockShape: RockShape, 
    rockSize: number
  ): void {
    // Shape modifications are handled by RockShapeFactory
    // This method exists for interface compliance
  }

  public applyCharacterDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape
  ): void {
    // Deformation is handled by RockShapeFactory
    // This method exists for interface compliance
  }

  public validateAndEnhanceGeometry(geometry: THREE.BufferGeometry): void {
    // Ensure geometry has proper normals
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    
    // Ensure geometry is properly indexed
    if (!geometry.index) {
      geometry = geometry.toNonIndexed();
    }
  }

  public updateConfig(newConfig: Partial<RockGenerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): RockGenerationConfig {
    return { ...this.config };
  }
}
