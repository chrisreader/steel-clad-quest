import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RockVariation, ROCK_VARIATIONS } from './rocks/config/RockVariationConfig';
import { RockShape, ROCK_SHAPES } from './rocks/config/RockShapeConfig';
import { RockShapeFactory } from './rocks/generators/RockShapeFactory';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { RockMaterialGenerator } from './rocks/materials/RockMaterialGenerator';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  private rockShapeFactory: RockShapeFactory;
  private rockClusterGenerator: RockClusterGenerator;
  private rockShapes: RockShape[] = ROCK_SHAPES;
  private collisionRegistrationCallback: ((object: THREE.Object3D) => void) | null = null;
  
  // Feature storage by region for cleanup
  private regionFeatures: Map<string, THREE.Object3D[]> = new Map();

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.scene = scene;
    this.ringSystem = ringSystem;
    this.rockShapeFactory = new RockShapeFactory();
    this.rockClusterGenerator = new RockClusterGenerator();
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  private generateRocksForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Calculate region size
    const regionSize = region.ringIndex === 0 ? 
      ringDef.outerRadius * 2 : 
      (ringDef.outerRadius - ringDef.innerRadius);
    
    // Determine rock density based on ring index
    const baseDensity = Math.max(0.15, 1.2 - (region.ringIndex * 0.15));
    const rockCount = Math.floor((regionSize / 20) * baseDensity);
    
    console.log(`🏔️ Generating ${rockCount} rocks for region ${regionKey} (ring ${region.ringIndex})`);
    
    const features: THREE.Object3D[] = [];
    
    for (let i = 0; i < rockCount; i++) {
      const variation = this.selectVariationByWeight();
      
      // Generate position within region bounds
      const position = this.generatePositionInRegion(region, centerPosition, regionSize);
      
      let rockObject: THREE.Object3D;
      
      if (variation.isCluster) {
        console.log(`🏔️ Creating ${variation.category} cluster at position:`, position);
        try {
          rockObject = this.createRockCluster(variation, i, position);
          console.log(`✅ Successfully created ${variation.category} cluster`);
        } catch (error) {
          console.error(`❌ Failed to create ${variation.category} cluster:`, error);
          // Fallback to single rock
          rockObject = this.createSingleRock(variation, i, position);
        }
      } else {
        rockObject = this.createSingleRock(variation, i, position);
      }
      
      features.push(rockObject);
      this.scene.add(rockObject);
      
      // Register for collision if callback is set
      if (this.collisionRegistrationCallback) {
        this.collisionRegistrationCallback(rockObject);
      }
    }
    
    // Store features for cleanup
    this.regionFeatures.set(regionKey, features);
    
    console.log(`🏔️ Generated ${features.length} rock features for region ${regionKey}`);
  }

  private createRockCluster(variation: RockVariation, index: number, position: THREE.Vector3): THREE.Object3D {
    console.log(`🏔️ Creating cluster for variation: ${variation.category}`);
    
    const rockGroup = new THREE.Group();
    rockGroup.position.copy(position);
    
    try {
      // Create wrapper functions that match the expected signatures
      const createCharacterBaseGeometryWrapper = (rockShape: RockShape, rockSize: number) => {
        return this.createCharacterBaseGeometry(rockShape, rockSize);
      };
      
      const applyShapeModificationsWrapper = (geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number) => {
        this.applyShapeModifications(geometry, rockShape, rockSize);
      };
      
      // CRITICAL FIX: Create wrapper that adapts the signature from TerrainFeatureGenerator to RockClusterGenerator
      const applyCharacterDeformationWrapper = (
        geometry: THREE.BufferGeometry, 
        intensity: number, 
        rockSize: number, 
        rockShape: RockShape
      ) => {
        // Convert intensity to variation-like object that applySizeAwareCharacterDeformation expects
        const fakeVariation = { category: 'medium' as const }; // Default category for intensity-based calls
        this.applySizeAwareCharacterDeformation(geometry, fakeVariation, rockShape, rockSize);
      };
      
      const validateAndEnhanceGeometryWrapper = (geometry: THREE.BufferGeometry) => {
        this.validateAndEnhanceGeometry(geometry);
      };
      
      // Call cluster generator with proper wrapper functions
      this.rockClusterGenerator.createVariedRockCluster(
        rockGroup,
        variation,
        index,
        createCharacterBaseGeometryWrapper,
        applyShapeModificationsWrapper,
        applyCharacterDeformationWrapper,  // Now matches expected signature
        validateAndEnhanceGeometryWrapper
      );
      
      console.log(`✅ Cluster generation completed for ${variation.category}`);
      
    } catch (error) {
      console.error(`❌ Cluster generation failed for ${variation.category}:`, error);
      throw error;
    }
    
    return rockGroup;
  }

  private generatePositionInRegion(region: RegionCoordinates, centerPosition: THREE.Vector3, regionSize: number): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (region.ringIndex === 0) {
      // Center ring - circular distribution
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * (regionSize / 2) * 0.8; // 80% of radius to avoid edges
      
      position.x = centerPosition.x + Math.cos(angle) * radius;
      position.z = centerPosition.z + Math.sin(angle) * radius;
    } else {
      // Outer rings - rectangular distribution within quadrant
      const offsetX = (Math.random() - 0.5) * regionSize * 0.8;
      const offsetZ = (Math.random() - 0.5) * regionSize * 0.8;
      
      position.x = centerPosition.x + offsetX;
      position.z = centerPosition.z + offsetZ;
    }
    
    position.y = 0; // Terrain level
    
    return position;
  }

  private createCharacterBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    return this.rockShapeFactory.createBaseGeometry(rockShape, rockSize);
  }

  private applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    this.rockShapeFactory.applyShapeModifications(geometry, rockShape, rockSize);
  }

  private applySizeAwareCharacterDeformation(
    geometry: THREE.BufferGeometry, 
    variation: RockVariation, 
    rockShape: RockShape, 
    rockSize: number
  ): void {
    // Apply deformation based on variation category and rock shape
    let deformationIntensity = rockShape.deformationIntensity;
    
    // Adjust intensity based on variation category
    switch (variation.category) {
      case 'tiny':
        deformationIntensity *= 1.3;
        break;
      case 'small':
        deformationIntensity *= 1.1;
        break;
      case 'medium':
        deformationIntensity *= 1.0;
        break;
      case 'large':
        deformationIntensity *= 0.8;
        break;
      case 'massive':
        deformationIntensity *= 0.6;
        break;
    }
    
    this.rockShapeFactory.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
  }

  private validateAndEnhanceGeometry(geometry: THREE.BufferGeometry): void {
    this.rockShapeFactory.validateAndEnhanceGeometry(geometry);
  }

  public dispose(): void {
    // Clean up all region features
    for (const [regionKey, features] of this.regionFeatures.entries()) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
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
    }
    
    this.regionFeatures.clear();
    console.log("TerrainFeatureGenerator disposed");
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    console.log(`Generating terrain features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    this.generateRocksForRegion(region);
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.regionFeatures.get(regionKey);
    
    if (features) {
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
      
      this.regionFeatures.delete(regionKey);
      console.log(`Cleaned up terrain features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    }
  }

  private selectVariationByWeight(): RockVariation {
    const totalWeight = ROCK_VARIATIONS.reduce((sum, variation) => sum + variation.weight, 0);
    let randomValue = Math.random() * totalWeight;
    
    for (const variation of ROCK_VARIATIONS) {
      randomValue -= variation.weight;
      if (randomValue <= 0) {
        return variation;
      }
    }
    
    return ROCK_VARIATIONS[0];
  }

  private createSingleRock(variation: RockVariation, index: number, position: THREE.Vector3): THREE.Object3D {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    // Select rock shape
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create base geometry
    let geometry = this.createCharacterBaseGeometry(rockShape, rockSize);
    
    // Apply shape modifications
    this.applyShapeModifications(geometry, rockShape, rockSize);
    
    // Apply character deformation
    this.applySizeAwareCharacterDeformation(geometry, variation, rockShape, rockSize);
    
    // Validate geometry
    this.validateAndEnhanceGeometry(geometry);
    
    // Create material
    const material = RockMaterialGenerator.createVariationMaterial(variation.category, rockShape, index);
    const rock = new THREE.Mesh(geometry, material);
    
    // Position and rotation
    rock.position.copy(position);
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
}
