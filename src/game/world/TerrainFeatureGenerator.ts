
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
    
    // Enhanced tree density based on ring index
    let baseDensity = 0.0015; // Base trees per square unit
    let minSpacing = 8; // Minimum distance between trees
    
    // Adjust density based on ring index (inner rings are spawn areas, outer rings are wilderness)
    if (region.ringIndex === 0) {
      baseDensity = 0.001; // Fewer trees in center spawn area
      minSpacing = 12;
    } else if (region.ringIndex >= 3) {
      baseDensity = 0.003; // More trees in outer wilderness
      minSpacing = 6;
    }

    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const treeCount = Math.floor(area * baseDensity);

    // Use Poisson disk sampling for natural distribution
    const poissonBounds = {
      min: new THREE.Vector2(bounds.minX, bounds.minZ),
      max: new THREE.Vector2(bounds.maxX, bounds.maxZ)
    };
    
    const positions = PoissonDiskSampling.generatePoissonPoints(
      poissonBounds,
      minSpacing,
      30 // max attempts
    );

    // Limit to desired tree count
    const limitedPositions = positions.slice(0, treeCount);

    limitedPositions.forEach(pos => {
      const treePosition = new THREE.Vector3(pos.x, 0, pos.y);
      
      // Get biome type at this position for species selection
      const biomeData = DeterministicBiomeManager.getBiomeAtPosition(treePosition);
      
      // Create biome-appropriate tree
      const tree = this.treeGenerator.createTree(treePosition, biomeData.biomeType);
      
      if (tree) {
        // Add height variation based on terrain (simple for now)
        tree.position.y = this.getTerrainHeight(treePosition);
        
        features.push(tree);
        console.log(`🌳 Generated ${this.getTreeSpeciesForBiome(biomeData.biomeType)} tree in ${biomeData.biomeType} biome at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
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
    // Bush density varies by ring
    let bushDensity = 0.002;
    let minSpacing = 4;
    
    // Adjust based on ring index
    if (region.ringIndex === 0) {
      bushDensity = 0.001;
      minSpacing = 6;
    } else if (region.ringIndex >= 3) {
      bushDensity = 0.004;
      minSpacing = 3;
    }

    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const bushCount = Math.floor(area * bushDensity);

    const poissonBounds = {
      min: new THREE.Vector2(bounds.minX, bounds.minZ),
      max: new THREE.Vector2(bounds.maxX, bounds.maxZ)
    };
    
    const positions = PoissonDiskSampling.generatePoissonPoints(
      poissonBounds,
      minSpacing,
      30
    );

    const limitedPositions = positions.slice(0, bushCount);

    limitedPositions.forEach(pos => {
      const bushPosition = new THREE.Vector3(pos.x, 0, pos.y);
      const bush = this.bushGenerator.createBush(bushPosition);
      
      if (bush) {
        bush.position.y = this.getTerrainHeight(bushPosition);
        features.push(bush);
      }
    });
  }

  private generateRocks(features: THREE.Object3D[], bounds: any, region: RegionCoordinates): void {
    // Rock density varies by ring
    let rockDensity = 0.0008;
    let minSpacing = 6;
    
    // Adjust based on ring index
    if (region.ringIndex >= 4) {
      rockDensity = 0.0012; // More rocks in far outer areas
      minSpacing = 5;
    }

    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const rockCount = Math.floor(area * rockDensity);

    const poissonBounds = {
      min: new THREE.Vector2(bounds.minX, bounds.minZ),
      max: new THREE.Vector2(bounds.maxX, bounds.maxZ)
    };
    
    const positions = PoissonDiskSampling.generatePoissonPoints(
      poissonBounds,
      minSpacing,
      30
    );

    const limitedPositions = positions.slice(0, rockCount);

    limitedPositions.forEach(pos => {
      const rockPosition = new THREE.Vector3(pos.x, 0, pos.y);
      
      // Create a simple rock cluster using a basic approach
      const rockGroup = new THREE.Group();
      const clusterSize = 1 + Math.floor(Math.random() * 3);
      
      // Create simple rock geometries
      for (let i = 0; i < clusterSize; i++) {
        const rockGeometry = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 6, 4);
        const rockMaterial = new THREE.MeshLambertMaterial({ 
          color: 0x666666 + Math.floor(Math.random() * 0x222222)
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        rock.position.set(
          (Math.random() - 0.5) * 2,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 2
        );
        rock.scale.set(
          0.8 + Math.random() * 0.4,
          0.6 + Math.random() * 0.8,
          0.8 + Math.random() * 0.4
        );
        rock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        rock.castShadow = true;
        rock.receiveShadow = true;
        rockGroup.add(rock);
      }
      
      rockGroup.position.copy(rockPosition);
      rockGroup.position.y = this.getTerrainHeight(rockPosition);
      features.push(rockGroup);
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

    console.log('🧹 TerrainFeatureGenerator with enhanced trees disposed');
  }
}
