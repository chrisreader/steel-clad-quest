import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { RockShapeFactory } from './rocks/generators/RockShapeFactory';
import { TreeGenerator } from './vegetation/TreeGenerator';
import { BushGenerator } from './vegetation/BushGenerator';
import { EnhancedRockDistributionSystem } from './rocks/systems/EnhancedRockDistributionSystem';
import { RockMaterialGenerator } from './rocks/materials/RockMaterialGenerator';
import { ROCK_SHAPES } from './rocks/config/RockShapeConfig';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  private rockClusterGenerator: RockClusterGenerator;
  private treeGenerator: TreeGenerator;
  private bushGenerator: BushGenerator;
  private enhancedRockSystem: EnhancedRockDistributionSystem;
  
  // Storage for generated features by region
  private generatedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Collision registration callback
  private collisionRegistrationCallback: ((object: THREE.Object3D) => void) | null = null;

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.scene = scene;
    this.ringSystem = ringSystem;
    this.rockClusterGenerator = new RockClusterGenerator();
    this.treeGenerator = new TreeGenerator();
    this.bushGenerator = new BushGenerator();
    this.enhancedRockSystem = new EnhancedRockDistributionSystem();
    
    console.log("🌍 TerrainFeatureGenerator initialized with enhanced organic rock distribution");
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
    console.log('🔧 Collision registration callback set for terrain features');
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.generatedFeatures.has(regionKey)) {
      console.log(`Features already exist for region ${regionKey}`);
      return;
    }

    console.log(`🌍 Generating enhanced terrain features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const features: THREE.Object3D[] = [];
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Generate organic rock formations using enhanced system
    this.generateOrganicRockFormations(region, centerPosition, ringDef, features);
    
    // Generate vegetation (keeping existing logic)
    this.generateVegetation(region, centerPosition, ringDef, features);
    
    // Store the generated features
    this.generatedFeatures.set(regionKey, features);
    
    // Generate discovery zones after all rocks are placed
    this.enhancedRockSystem.generateDiscoveryZones(region);
    
    console.log(`✅ Generated ${features.length} enhanced terrain features for region ${regionKey}`);
  }

  private generateOrganicRockFormations(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    ringDef: any, 
    features: THREE.Object3D[]
  ): void {
    const searchRadius = region.ringIndex === 0 ? ringDef.outerRadius : 50;
    const gridSize = 6; // Smaller grid for better coverage
    
    console.log(`🪨 Generating rocks for region ${region.ringIndex}_${region.quadrant} with radius ${searchRadius}`);
    
    for (let x = -searchRadius; x <= searchRadius; x += gridSize) {
      for (let z = -searchRadius; z <= searchRadius; z += gridSize) {
        const testPosition = new THREE.Vector3(
          centerPosition.x + x,
          0,
          centerPosition.z + z
        );
        
        // Check if position is within the ring bounds using correct method
        const positionRegion = this.ringSystem.getRegionForPosition(testPosition);
        if (!positionRegion || 
            positionRegion.ringIndex !== region.ringIndex || 
            positionRegion.quadrant !== region.quadrant) {
          continue;
        }
        
        // Use enhanced rock distribution system with higher spawn rate
        if (this.enhancedRockSystem.shouldSpawnRock(testPosition, region)) {
          const rockVariation = this.enhancedRockSystem.selectRockVariation(testPosition, region);
          if (!rockVariation) continue;
          
          // Get organic spawn position (applies geological bias)
          const organicPosition = this.enhancedRockSystem.getOrganicSpawnPosition(testPosition, region);
          
          // Check if we should create a cluster
          if (this.enhancedRockSystem.shouldCreateCluster(organicPosition, rockVariation, region)) {
            const cluster = this.createOrganicRockCluster(organicPosition, rockVariation, region);
            if (cluster && cluster.children.length > 0) {
              this.scene.add(cluster);
              features.push(cluster);
              
              // Register with collision system
              if (this.collisionRegistrationCallback) {
                this.collisionRegistrationCallback(cluster);
              }
              
              // Register with discovery zone manager
              this.enhancedRockSystem.registerRockFormation(region, organicPosition, rockVariation.sizeRange[1]);
            }
          } else {
            // Single organic rock
            const rock = this.createOrganicSingleRock(organicPosition, rockVariation);
            if (rock) {
              this.scene.add(rock);
              features.push(rock);
              
              // Register with collision system
              if (this.collisionRegistrationCallback) {
                this.collisionRegistrationCallback(rock);
              }
              
              // Register with discovery zone manager  
              this.enhancedRockSystem.registerRockFormation(region, organicPosition, rockVariation.sizeRange[1]);
            }
          }
        }
      }
    }
    
    console.log(`🪨 Generated ${features.length} rock features so far`);
  }

  private createOrganicRockCluster(
    position: THREE.Vector3, 
    rockVariation: any, 
    region: RegionCoordinates
  ): THREE.Group {
    const cluster = new THREE.Group();
    cluster.position.copy(position);
    
    const clusterSize = rockVariation.clusterSize 
      ? Math.floor(Math.random() * (rockVariation.clusterSize[1] - rockVariation.clusterSize[0] + 1)) + rockVariation.clusterSize[0]
      : 3;
    
    for (let i = 0; i < clusterSize; i++) {
      const rockSize = rockVariation.sizeRange[0] + Math.random() * (rockVariation.sizeRange[1] - rockVariation.sizeRange[0]);
      const rock = this.createOrganicSingleRock(new THREE.Vector3(0, 0, 0), rockVariation, rockSize);
      
      if (rock) {
        // Position rocks in cluster
        const angle = (i / clusterSize) * Math.PI * 2 + Math.random() * 0.5;
        const distance = rockSize * (0.5 + Math.random() * 1.5);
        rock.position.set(
          Math.cos(angle) * distance,
          rockSize * 0.1,
          Math.sin(angle) * distance
        );
        
        cluster.add(rock);
      }
    }
    
    return cluster;
  }

  private createOrganicSingleRock(
    position: THREE.Vector3, 
    rockVariation: any, 
    customSize?: number
  ): THREE.Object3D | null {
    const rockSize = customSize || (rockVariation.sizeRange[0] + Math.random() * (rockVariation.sizeRange[1] - rockVariation.sizeRange[0]));
    
    // Select rock type based on size
    let rockType: 'boulder' | 'angular' | 'flat';
    if (rockSize < 0.3) {
      rockType = Math.random() < 0.7 ? 'angular' : 'boulder';
    } else if (rockSize < 1.0) {
      rockType = Math.random() < 0.5 ? 'boulder' : 'angular';
    } else {
      rockType = Math.random() < 0.6 ? 'boulder' : (Math.random() < 0.7 ? 'angular' : 'flat');
    }
    
    // Generate organic rock shape
    const rockShape = RockShapeFactory.generateRock(rockType, rockSize, 0.6);
    
    // Create material
    const material = RockMaterialGenerator.createRoleBasedMaterial(
      rockVariation.category, 
      ROCK_SHAPES[0], // Use first rock shape as default
      0, 
      'foundation'
    );
    
    const rock = new THREE.Mesh(rockShape.geometry, material);
    rock.position.copy(position);
    rock.scale.copy(new THREE.Vector3(rockShape.scale, rockShape.scale, rockShape.scale));
    rock.rotation.copy(rockShape.rotation);
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  private generateVegetation(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    ringDef: any, 
    features: THREE.Object3D[]
  ): void {
    // Improved vegetation generation with better coverage
    const vegetationDensity = this.getVegetationDensity(region.ringIndex);
    const searchRadius = region.ringIndex === 0 ? ringDef.outerRadius : 50;
    const gridSize = 8; // Smaller grid for better bush coverage
    
    console.log(`🌿 Generating vegetation for region ${region.ringIndex}_${region.quadrant} with density ${vegetationDensity}`);
    
    for (let x = -searchRadius; x <= searchRadius; x += gridSize) {
      for (let z = -searchRadius; z <= searchRadius; z += gridSize) {
        const testPosition = new THREE.Vector3(
          centerPosition.x + x + (Math.random() - 0.5) * 6,
          0,
          centerPosition.z + z + (Math.random() - 0.5) * 6
        );
        
        // Check if position is within the ring bounds using correct method
        const positionRegion = this.ringSystem.getRegionForPosition(testPosition);
        if (!positionRegion || 
            positionRegion.ringIndex !== region.ringIndex || 
            positionRegion.quadrant !== region.quadrant) {
          continue;
        }
        
        if (Math.random() < vegetationDensity) {
          const vegetationType = Math.random() < 0.6 ? 'tree' : 'bush';
          let vegetation: THREE.Object3D | null = null;
          
          if (vegetationType === 'tree') {
            vegetation = this.treeGenerator.createTree(testPosition);
          } else {
            vegetation = this.bushGenerator.createBush(testPosition);
          }
          
          if (vegetation) {
            this.scene.add(vegetation);
            features.push(vegetation);
            
            if (this.collisionRegistrationCallback) {
              this.collisionRegistrationCallback(vegetation);
            }
          }
        }
      }
    }
    
    console.log(`🌿 Generated vegetation, total features now: ${features.length}`);
  }

  private getVegetationDensity(ringIndex: number): number {
    // Increased vegetation density for better coverage
    switch (ringIndex) {
      case 0: return 0.25;
      case 1: return 0.35;
      case 2: return 0.45;
      case 3: return 0.55;
      default: return 0.30;
    }
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.generatedFeatures.get(regionKey);
    
    if (features) {
      console.log(`🧹 Cleaning up ${features.length} terrain features for region ${regionKey}`);
      
      features.forEach(feature => {
        this.scene.remove(feature);
        
        // Dispose of geometries and materials
        feature.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) {
              child.geometry.dispose();
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      });
      
      this.generatedFeatures.delete(regionKey);
    }
  }

  public getEnhancedRockSystem(): EnhancedRockDistributionSystem {
    return this.enhancedRockSystem;
  }

  public dispose(): void {
    // Clean up all generated features
    for (const [regionKey, features] of this.generatedFeatures.entries()) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
        feature.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      });
    }
    
    this.generatedFeatures.clear();
    
    // Dispose of generators - only dispose those that have dispose methods
    if (this.treeGenerator && typeof this.treeGenerator.dispose === 'function') {
      this.treeGenerator.dispose();
    }
    if (this.bushGenerator && typeof this.bushGenerator.dispose === 'function') {
      this.bushGenerator.dispose();
    }
    this.enhancedRockSystem.dispose();
    
    console.log("🌍 TerrainFeatureGenerator with enhanced rock distribution disposed");
  }
}
