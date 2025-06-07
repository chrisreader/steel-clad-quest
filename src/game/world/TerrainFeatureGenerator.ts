import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { TreeGenerator } from './vegetation/TreeGenerator';
import { BushGenerator } from './vegetation/BushGenerator';
import { EnhancedRockDistributionSystem } from './rocks/systems/EnhancedRockDistributionSystem';

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
    const gridSize = 8; // Denser sampling for better distribution
    
    for (let x = -searchRadius; x <= searchRadius; x += gridSize) {
      for (let z = -searchRadius; z <= searchRadius; z += gridSize) {
        const testPosition = new THREE.Vector3(
          centerPosition.x + x,
          0,
          centerPosition.z + z
        );
        
        // Check if position is within the ring bounds
        if (!this.ringSystem.isPositionInRegion(testPosition, region)) {
          continue;
        }
        
        // Use enhanced rock distribution system
        if (this.enhancedRockSystem.shouldSpawnRock(testPosition, region)) {
          const rockVariation = this.enhancedRockSystem.selectRockVariation(testPosition, region);
          if (!rockVariation) continue;
          
          // Get organic spawn position (applies geological bias)
          const organicPosition = this.enhancedRockSystem.getOrganicSpawnPosition(testPosition, region);
          
          // Check if we should create a cluster
          if (this.enhancedRockSystem.shouldCreateCluster(organicPosition, rockVariation, region)) {
            const clusterSize = rockVariation.clusterSize 
              ? Math.floor(Math.random() * (rockVariation.clusterSize[1] - rockVariation.clusterSize[0] + 1)) + rockVariation.clusterSize[0]
              : 1;
            
            const cluster = this.rockClusterGenerator.generateCluster(
              organicPosition,
              clusterSize,
              rockVariation.category,
              rockVariation.shapePersonality
            );
            
            if (cluster) {
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
            // Single rock
            const rock = this.rockClusterGenerator.generateSingleRock(
              organicPosition,
              rockVariation.category,
              rockVariation.shapePersonality
            );
            
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
  }

  private generateVegetation(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    ringDef: any, 
    features: THREE.Object3D[]
  ): void {
    // Keep existing vegetation generation logic unchanged
    const vegetationDensity = this.getVegetationDensity(region.ringIndex);
    const searchRadius = region.ringIndex === 0 ? ringDef.outerRadius : 50;
    const gridSize = 12;
    
    for (let x = -searchRadius; x <= searchRadius; x += gridSize) {
      for (let z = -searchRadius; z <= searchRadius; z += gridSize) {
        const testPosition = new THREE.Vector3(
          centerPosition.x + x + (Math.random() - 0.5) * 8,
          0,
          centerPosition.z + z + (Math.random() - 0.5) * 8
        );
        
        if (!this.ringSystem.isPositionInRegion(testPosition, region)) {
          continue;
        }
        
        if (Math.random() < vegetationDensity) {
          const vegetationType = Math.random() < 0.7 ? 'tree' : 'bush';
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
  }

  private getVegetationDensity(ringIndex: number): number {
    // Keep existing vegetation density logic
    switch (ringIndex) {
      case 0: return 0.15;
      case 1: return 0.25;
      case 2: return 0.35;
      case 3: return 0.45;
      default: return 0.20;
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
    
    // Dispose of generators
    this.rockClusterGenerator.dispose();
    this.treeGenerator.dispose();
    this.bushGenerator.dispose();
    this.enhancedRockSystem.dispose();
    
    console.log("🌍 TerrainFeatureGenerator with enhanced rock distribution disposed");
  }
}
