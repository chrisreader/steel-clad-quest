
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

  public generateFeaturesForRegion(
    regionGroup: THREE.Group,
    coordinates: RegionCoordinates
  ): void {
    const regionSize = this.ringSystem.getRegionSize(coordinates.ring);
    const centerPosition = this.ringSystem.getRegionCenter(coordinates);

    console.log(`🌍 Generating features for region ${coordinates.ring}-${coordinates.quadrant}-${coordinates.regionIndex}`);

    // Generate rocks using the specialized module
    this.rockGenerator.generateRocksInRegion(
      regionGroup,
      regionSize,
      centerPosition.x,
      centerPosition.z
    );

    // Generate vegetation
    this.generateVegetation(regionGroup, regionSize, centerPosition.x, centerPosition.z);
  }

  private generateVegetation(
    regionGroup: THREE.Group,
    regionSize: number,
    centerX: number,
    centerZ: number
  ): void {
    // Tree generation
    const treeCount = Math.floor(regionSize * regionSize * 0.1);
    for (let i = 0; i < treeCount; i++) {
      const x = centerX + (Math.random() - 0.5) * regionSize;
      const z = centerZ + (Math.random() - 0.5) * regionSize;
      
      const tree = this.treeGenerator.createTree(i);
      tree.position.set(x, 0, z);
      regionGroup.add(tree);
    }

    // Bush generation
    const bushCount = Math.floor(regionSize * regionSize * 0.2);
    for (let i = 0; i < bushCount; i++) {
      const x = centerX + (Math.random() - 0.5) * regionSize;
      const z = centerZ + (Math.random() - 0.5) * regionSize;
      
      const bush = this.bushGenerator.createBush(i);
      bush.position.set(x, 0, z);
      regionGroup.add(bush);
    }
  }

  public updateRockDensity(density: number): void {
    this.rockGenerator.updateConfig({ density });
  }

  public getRockConfig() {
    return this.rockGenerator.getConfig();
  }
}
