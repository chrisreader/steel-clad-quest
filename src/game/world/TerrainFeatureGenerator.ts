
import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { TreeGenerator } from './vegetation/TreeGenerator';
import { BushGenerator } from './vegetation/BushGenerator';
import { PoissonDiskSampling } from '../utils/math/PoissonDiskSampling';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { DeterministicBiomeManager } from '../vegetation/biomes/DeterministicBiomeManager';
import { BiomeType } from '../vegetation/core/GrassConfig';

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private treeGenerator: TreeGenerator;
  private bushGenerator: BushGenerator;
  private rockGenerator: RockClusterGenerator;
  private regionFeatures: Map<string, THREE.Object3D[]> = new Map();
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    
    // Initialize generators with enhanced tree system
    this.treeGenerator = new TreeGenerator();
    this.bushGenerator = new BushGenerator();
    this.rockGenerator = new RockClusterGenerator();
    
    console.log('🌲 TerrainFeatureGenerator: Enhanced tree system initialized');
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.regionFeatures.has(regionKey)) {
      return;
    }

    const features: THREE.Object3D[] = [];
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);

    // Calculate region bounds for feature generation
    let regionSize: number;
    let bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

    if (region.ringIndex === 0) {
      regionSize = ringDef.outerRadius * 2;
      const halfSize = regionSize / 2;
      bounds = {
        minX: centerPosition.x - halfSize,
        maxX: centerPosition.x + halfSize,
        minZ: centerPosition.z - halfSize,
        maxZ: centerPosition.z + halfSize
      };
    } else {
      const innerRadius = ringDef.innerRadius;
      const outerRadius = ringDef.outerRadius;
      regionSize = outerRadius - innerRadius;
      
      bounds = {
        minX: centerPosition.x - regionSize / 2,
        maxX: centerPosition.x + regionSize / 2,
        minZ: centerPosition.z - regionSize / 2,
        maxZ: centerPosition.z + regionSize / 2
      };
    }

    // Generate features with biome-aware distribution
    this.generateBiomeAwareTrees(features, bounds, region);
    this.generateBushes(features, bounds, region);
    this.generateRocks(features, bounds, region);

    // Add all features to scene
    features.forEach(feature => {
      this.scene.add(feature);
      
      // Register for collision if callback is set
      if (this.collisionRegistrationCallback) {
        this.collisionRegistrationCallback(feature);
      }
    });

    this.regionFeatures.set(regionKey, features);
    console.log(`🌲 Generated ${features.length} enhanced terrain features for region ${regionKey}`);
  }

  private generateBiomeAwareTrees(features: THREE.Object3D[], bounds: any, region: RegionCoordinates): void {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Enhanced tree density based on ring type
    let baseDensity = 0.0015; // Base trees per square unit
    let minSpacing = 8; // Minimum distance between trees
    
    switch (ringDef.name) {
      case 'Spawn Area':
        baseDensity = 0.001; // Fewer trees in spawn area
        minSpacing = 12;
        break;
      case 'Dense Thicket':
        baseDensity = 0.003; // Dense forest
        minSpacing = 6;
        break;
      case 'Lush Valley':
        baseDensity = 0.0025; // Moderate density with variety
        minSpacing = 7;
        break;
      case 'Rolling Savanna':
        baseDensity = 0.0008; // Sparse trees
        minSpacing = 15;
        break;
      case 'Sparse Steppe':
        baseDensity = 0.0005; // Very sparse
        minSpacing = 20;
        break;
    }

    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const treeCount = Math.floor(area * baseDensity);

    // Use Poisson disk sampling for natural distribution
    const positions = PoissonDiskSampling.generatePoints(
      bounds.minX, bounds.minZ,
      bounds.maxX, bounds.maxZ,
      minSpacing,
      treeCount
    );

    positions.forEach(pos => {
      const treePosition = new THREE.Vector3(pos.x, 0, pos.z);
      
      // Get biome type at this position for species selection
      const biomeData = DeterministicBiomeManager.getBiomeAtPosition(treePosition);
      
      // Create biome-appropriate tree
      const tree = this.treeGenerator.createTree(treePosition, biomeData.biomeType);
      
      if (tree) {
        // Add height variation based on terrain (simple for now)
        tree.position.y = this.getTerrainHeight(treePosition);
        
        features.push(tree);
        console.log(`🌳 Generated ${this.getTreeSpeciesForBiome(biomeData.biomeType)} tree in ${biomeData.biomeType} biome at (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
      }
    });
  }

  private getTreeSpeciesForBiome(biomeType: BiomeType): string {
    // Helper method to log which species are being used
    const distributions = {
      normal: ['Oak', 'Birch', 'Willow'],
      meadow: ['Birch', 'Oak', 'Willow'],
      prairie: ['Dead', 'Willow', 'Oak']
    };
    
    const species = distributions[biomeType] || distributions.normal;
    return species[Math.floor(Math.random() * species.length)];
  }

  private generateBushes(features: THREE.Object3D[], bounds: any, region: RegionCoordinates): void {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Bush density varies by ring
    let bushDensity = 0.002;
    let minSpacing = 4;
    
    switch (ringDef.name) {
      case 'Dense Thicket':
        bushDensity = 0.004;
        minSpacing = 3;
        break;
      case 'Lush Valley':
        bushDensity = 0.003;
        minSpacing = 3.5;
        break;
      case 'Sparse Steppe':
        bushDensity = 0.001;
        minSpacing = 6;
        break;
    }

    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const bushCount = Math.floor(area * bushDensity);

    const positions = PoissonDiskSampling.generatePoints(
      bounds.minX, bounds.minZ,
      bounds.maxX, bounds.maxZ,
      minSpacing,
      bushCount
    );

    positions.forEach(pos => {
      const bushPosition = new THREE.Vector3(pos.x, 0, pos.z);
      const bush = this.bushGenerator.createBush(bushPosition);
      
      if (bush) {
        bush.position.y = this.getTerrainHeight(bushPosition);
        features.push(bush);
      }
    });
  }

  private generateRocks(features: THREE.Object3D[], bounds: any, region: RegionCoordinates): void {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Rock density varies by ring
    let rockDensity = 0.0008;
    let minSpacing = 6;
    
    switch (ringDef.name) {
      case 'Dense Thicket':
        rockDensity = 0.0005; // Fewer rocks in dense areas
        break;
      case 'Sparse Steppe':
        rockDensity = 0.0012; // More rocks in sparse areas
        minSpacing = 5;
        break;
    }

    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const rockCount = Math.floor(area * rockDensity);

    const positions = PoissonDiskSampling.generatePoints(
      bounds.minX, bounds.minZ,
      bounds.maxX, bounds.maxZ,
      minSpacing,
      rockCount
    );

    positions.forEach(pos => {
      const rockPosition = new THREE.Vector3(pos.x, 0, pos.z);
      const rockCluster = this.rockGenerator.generateCluster(rockPosition, 1 + Math.floor(Math.random() * 3));
      
      if (rockCluster) {
        rockCluster.position.y = this.getTerrainHeight(rockPosition);
        features.push(rockCluster);
      }
    });
  }

  private getTerrainHeight(position: THREE.Vector3): number {
    // Simple terrain height calculation
    // In a more complex system, this would sample actual terrain height
    return 0;
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.regionFeatures.get(regionKey);

    if (features) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
        // Dispose geometry and materials
        feature.traverse(child => {
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
      });

      this.regionFeatures.delete(regionKey);
      console.log(`🧹 Cleaned up enhanced features for region ${regionKey}`);
    }
  }

  public dispose(): void {
    // Clean up all features
    for (const features of this.regionFeatures.values()) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
        feature.traverse(child => {
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
      });
    }

    this.regionFeatures.clear();

    // Dispose generators
    if (this.treeGenerator) {
      this.treeGenerator.dispose();
    }
    
    if (this.bushGenerator) {
      this.bushGenerator.dispose();
    }

    if (this.rockGenerator) {
      this.rockGenerator.dispose();
    }

    console.log('🧹 TerrainFeatureGenerator with enhanced trees disposed');
  }
}
