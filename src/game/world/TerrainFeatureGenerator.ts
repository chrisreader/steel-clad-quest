import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { RockShapeFactory } from './rocks/generators/RockShapeFactory';
import { BiomeRockSpawner } from './rocks/generators/BiomeRockSpawner';
import { GeologicalPlacementSystem } from './rocks/generators/GeologicalPlacementSystem';
import { ROCK_VARIATIONS } from './rocks/config/RockVariationConfig';
import { TreeGenerator } from './vegetation/TreeGenerator';
import { BushGenerator } from './vegetation/BushGenerator';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  private rockClusterGenerator: RockClusterGenerator;
  private biomeRockSpawner: BiomeRockSpawner;
  private geologicalPlacement: GeologicalPlacementSystem;
  private treeGenerator: TreeGenerator;
  private bushGenerator: BushGenerator;
  private collisionRegistrationCallback: ((object: THREE.Object3D) => void) | null = null;
  
  // Track generated features per region for cleanup
  private regionFeatures: Map<string, THREE.Object3D[]> = new Map();

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.scene = scene;
    this.ringSystem = ringSystem;
    this.rockClusterGenerator = new RockClusterGenerator();
    this.biomeRockSpawner = new BiomeRockSpawner();
    this.geologicalPlacement = new GeologicalPlacementSystem();
    this.treeGenerator = new TreeGenerator();
    this.bushGenerator = new BushGenerator();
    
    console.log('🌍 TerrainFeatureGenerator initialized with organic rock distribution system');
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.regionFeatures.has(regionKey)) {
      console.log(`Features already generated for region ${regionKey}`);
      return;
    }

    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    const regionSize = region.ringIndex === 0 ? ringDef.outerRadius * 2 : 100;
    
    console.log(`🗿 Generating organic rock distribution for region ${regionKey} (${ringDef.difficulty})`);
    
    const regionFeatures: THREE.Object3D[] = [];

    // Generate organic rock placements using the new system
    const rockPlacements = this.geologicalPlacement.generateRockPlacements(
      region,
      centerPosition,
      regionSize,
      (pos: THREE.Vector3) => this.getTerrainHeightAtPosition(pos)
    );

    // Create exploration corridors for better gameplay
    if (region.ringIndex > 0) {
      const spawnPosition = new THREE.Vector3(0, 0, 0);
      this.geologicalPlacement.createExplorationCorridor(
        spawnPosition,
        centerPosition,
        rockPlacements
      );
    }

    // Create rock objects from placements
    for (const placement of rockPlacements) {
      const rockGroup = this.createRockFromPlacement(placement, region);
      if (rockGroup) {
        this.scene.add(rockGroup);
        regionFeatures.push(rockGroup);
        
        if (this.collisionRegistrationCallback) {
          this.collisionRegistrationCallback(rockGroup);
        }
      }
    }

    // Generate vegetation with organic distribution
    this.generateOrganicVegetation(region, centerPosition, regionSize, regionFeatures);
    
    this.regionFeatures.set(regionKey, regionFeatures);
    
    console.log(`✅ Generated ${regionFeatures.length} organic features for region ${regionKey}`);
  }

  private createRockFromPlacement(
    placement: any,
    region: RegionCoordinates
  ): THREE.Group | null {
    const rockGroup = new THREE.Group();
    
    // Use cluster generation for larger rocks, individual rocks for smaller ones
    if (placement.variation.isCluster) {
      // Create cluster using the existing cluster generator
      const mockCallbacks = {
        createCharacterBaseGeometry: (rockShape: any, rockSize: number) => {
          const rockShapeObj = RockShapeFactory.generateRock('boulder', rockSize, 0.5);
          return rockShapeObj.geometry;
        },
        applyShapeModifications: () => {}, // No-op, modifications are in generateRock
        applyCharacterDeformation: () => {}, // No-op, deformation is in generateRock  
        validateAndEnhanceGeometry: () => {} // No-op, validation is in generateRock
      };

      this.rockClusterGenerator.createVariedRockCluster(
        rockGroup,
        placement.variation,
        0,
        mockCallbacks.createCharacterBaseGeometry,
        mockCallbacks.applyShapeModifications,
        mockCallbacks.applyCharacterDeformation,
        mockCallbacks.validateAndEnhanceGeometry
      );
    } else {
      // Create individual rock using RockShapeFactory
      const rockType = Math.random() < 0.33 ? 'boulder' : Math.random() < 0.5 ? 'angular' : 'flat';
      const rockShapeObj = RockShapeFactory.generateRock(rockType, placement.scale, 0.5);
      
      const material = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        roughness: 0.9,
        metalness: 0.1
      });
      
      const rock = new THREE.Mesh(rockShapeObj.geometry, material);
      rock.castShadow = true;
      rock.receiveShadow = true;
      rockGroup.add(rock);
    }
    
    // Apply placement transformations
    rockGroup.position.copy(placement.position);
    rockGroup.rotation.copy(placement.rotation);
    rockGroup.scale.setScalar(placement.scale);
    
    // Add landmark marker for navigation
    if (placement.isLandmark) {
      rockGroup.userData.isLandmark = true;
      console.log(`🗻 Created landmark rock at ${placement.position.x.toFixed(1)}, ${placement.position.z.toFixed(1)}`);
    }
    
    return rockGroup;
  }

  private generateOrganicVegetation(
    region: RegionCoordinates,
    centerPosition: THREE.Vector3,
    regionSize: number,
    regionFeatures: THREE.Object3D[]
  ): void {
    // Generate trees with biome-aware placement
    const treeCount = this.calculateVegetationCount(region, 'trees');
    for (let i = 0; i < treeCount; i++) {
      const treePosition = this.findVegetationPosition(centerPosition, regionSize, regionFeatures);
      if (treePosition) {
        const tree = this.treeGenerator.createTree(treePosition);
        if (tree) {
          this.scene.add(tree);
          regionFeatures.push(tree);
          
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(tree);
          }
        }
      }
    }
    
    // Generate bushes with organic distribution
    const bushCount = this.calculateVegetationCount(region, 'bushes');
    for (let i = 0; i < bushCount; i++) {
      const bushPosition = this.findVegetationPosition(centerPosition, regionSize, regionFeatures);
      if (bushPosition) {
        const bush = this.bushGenerator.createBush(bushPosition);
        if (bush) {
          this.scene.add(bush);
          regionFeatures.push(bush);
          
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(bush);
          }
        }
      }
    }
  }

  private calculateVegetationCount(region: RegionCoordinates, type: 'trees' | 'bushes'): number {
    const baseCounts = {
      trees: [2, 5, 8, 4], // Fewer trees in outer chaotic regions
      bushes: [5, 10, 15, 8]
    };
    
    const baseCount = baseCounts[type][Math.min(region.ringIndex, 3)];
    return baseCount + Math.floor(Math.random() * (baseCount / 2));
  }

  private findVegetationPosition(
    centerPosition: THREE.Vector3,
    regionSize: number,
    existingFeatures: THREE.Object3D[]
  ): THREE.Vector3 | null {
    const maxAttempts = 30;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const position = new THREE.Vector3(
        centerPosition.x + (Math.random() - 0.5) * regionSize,
        0,
        centerPosition.z + (Math.random() - 0.5) * regionSize
      );
      
      // Check minimum distance from existing features
      let validPosition = true;
      for (const feature of existingFeatures) {
        if (position.distanceTo(feature.position) < 5) {
          validPosition = false;
          break;
        }
      }
      
      if (validPosition) {
        position.y = this.getTerrainHeightAtPosition(position);
        return position;
      }
    }
    
    return null;
  }

  private getTerrainHeightAtPosition(position: THREE.Vector3): number {
    // This would integrate with the actual terrain system
    // For now, return a simple height based on distance from center
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    return Math.max(0.1, Math.sin(distanceFromCenter * 0.01) * 2 + 2);
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.regionFeatures.get(regionKey);
    
    if (features) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
        if (feature instanceof THREE.Mesh) {
          if (feature.geometry) feature.geometry.dispose();
          if (feature.material) {
            if (Array.isArray(feature.material)) {
              feature.material.forEach(mat => mat.dispose());
            } else {
              feature.material.dispose();
            }
          }
        }
      });
      
      this.regionFeatures.delete(regionKey);
      console.log(`🧹 Cleaned up features for region ${regionKey}`);
    }
  }

  public dispose(): void {
    // Clean up all regions
    for (const [regionKey] of this.regionFeatures) {
      const region = this.parseRegionKey(regionKey);
      if (region) {
        this.cleanupFeaturesForRegion(region);
      }
    }
    
    this.regionFeatures.clear();
    console.log('🧹 TerrainFeatureGenerator disposed');
  }

  private parseRegionKey(regionKey: string): RegionCoordinates | null {
    const match = regionKey.match(/r(\d+)_q(\d+)/);
    if (match) {
      return {
        ringIndex: parseInt(match[1]),
        quadrant: parseInt(match[2])
      };
    }
    return null;
  }
}
