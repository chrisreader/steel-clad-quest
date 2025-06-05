
import * as THREE from 'three';
import { 
  RockShapeType, 
  RockInstance, 
  RockGenerationConfig, 
  RockVariation,
  RockShape,
  RockVariationSelector,
  ROCK_VARIATIONS,
  ROCK_SHAPES
} from '../types/RockTypes';
import { RockMaterials } from '../materials/RockMaterials';
import { BaseRockShape } from '../shapes/BaseRockShape';
import { BoulderShape } from '../shapes/BoulderShape';
import { SpireShape } from '../shapes/SpireShape';
import { SlabShape } from '../shapes/SlabShape';
import { AngularShape } from '../shapes/AngularShape';
import { WeatheredShape } from '../shapes/WeatheredShape';
import { FlattenedShape } from '../shapes/FlattenedShape';
import { JaggedShape } from '../shapes/JaggedShape';
import { SmoothingUtils } from '../utils/SmoothingUtils';

export class RockShapeFactory {
  private shapeGenerators: Map<RockShapeType, BaseRockShape>;
  private static generationStats: Map<string, number> = new Map();
  
  constructor() {
    this.shapeGenerators = new Map();
    this.shapeGenerators.set('boulder', new BoulderShape());
    this.shapeGenerators.set('spire', new SpireShape());
    this.shapeGenerators.set('slab', new SlabShape());
    this.shapeGenerators.set('angular', new AngularShape());
    this.shapeGenerators.set('weathered', new WeatheredShape());
    this.shapeGenerators.set('flattened', new FlattenedShape());
    this.shapeGenerators.set('jagged', new JaggedShape());
    
    // Log variation probabilities on initialization
    this.logVariationProbabilities();
  }
  
  private logVariationProbabilities(): void {
    console.log('🗿 Rock Variation Probabilities:');
    const stats = RockVariationSelector.getVariationStats();
    Object.entries(stats).forEach(([category, percentage]) => {
      console.log(`  ${category}: ${percentage.toFixed(1)}%`);
    });
  }
  
  private createBaseGeometry(shape: RockShape): THREE.BufferGeometry {
    switch (shape.baseGeometry) {
      case 'icosahedron':
        return new THREE.IcosahedronGeometry(1, 3); // Detail=3 for high resolution
      case 'sphere':
        return new THREE.SphereGeometry(1, 32, 32); // 32 segments for smooth curves
      case 'dodecahedron':
        return new THREE.DodecahedronGeometry(1, 2); // Detail=2 for good balance
      default:
        return new THREE.IcosahedronGeometry(1, 3);
    }
  }
  
  private applyDeformation(geometry: THREE.BufferGeometry, intensity: number): void {
    // Cap deformation intensity at 0.4 and reduce noise amplitude by 50%
    const cappedIntensity = Math.min(intensity, 0.4) * 0.5;
    
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      // Apply controlled noise with reduced amplitude
      const noise = this.generateSmoothNoise(x * 2, y * 2, z * 2) * cappedIntensity;
      
      const vertex = new THREE.Vector3(x, y, z);
      const length = vertex.length();
      if (length > 0) {
        vertex.normalize();
        vertex.multiplyScalar(length + noise);
        
        positionArray[i] = vertex.x;
        positionArray[i + 1] = vertex.y;
        positionArray[i + 2] = vertex.z;
      }
    }
    
    positions.needsUpdate = true;
  }
  
  private generateSmoothNoise(x: number, y: number, z: number): number {
    // Improved smooth noise using multiple octaves
    const noise1 = Math.sin(x * 0.5) * Math.cos(y * 0.7) * Math.sin(z * 0.3);
    const noise2 = Math.sin(x * 1.2) * Math.cos(y * 0.9) * Math.sin(z * 1.1) * 0.5;
    const noise3 = Math.sin(x * 2.1) * Math.cos(y * 1.7) * Math.sin(z * 1.9) * 0.25;
    
    return (noise1 + noise2 + noise3) / 1.75;
  }
  
  public createRock(shapeType: RockShapeType, config: RockGenerationConfig): RockInstance {
    if (shapeType === 'cluster') {
      throw new Error('Cluster rocks should be generated through ClusterGenerator');
    }
    
    // Select variation and shape based on new system
    const variation = config.variation || RockVariationSelector.selectRandomVariation();
    const shape = config.shape || RockVariationSelector.getShapeForType(shapeType);
    
    // Update generation statistics
    this.updateGenerationStats(variation.category, shapeType);
    
    // Use variation size range if no specific size range provided
    const sizeRange = config.sizeRange || {
      min: variation.sizeRange[0],
      max: variation.sizeRange[1]
    };
    
    const size = sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min);
    
    // Create high-resolution base geometry
    const geometry = this.createBaseGeometry(shape);
    
    // Scale to desired size
    geometry.scale(size, size, size);
    
    // Apply controlled deformation
    this.applyDeformation(geometry, shape.deformationIntensity);
    
    // Apply smoothing operations for organic appearance
    SmoothingUtils.smoothGeometry(geometry, 2);
    SmoothingUtils.weldVertices(geometry, 0.01);
    
    // Select material type based on shape and weathering
    const materialType = this.selectMaterialType(shapeType);
    const weatheringLevel = shape.weatheringLevel + 
      (Math.random() - 0.5) * 0.2; // Add some variation to weathering
    
    const material = RockMaterials.getRockMaterial(materialType, Math.max(0, Math.min(1, weatheringLevel)));
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Calculate bounding radius
    geometry.computeBoundingSphere();
    const boundingRadius = geometry.boundingSphere?.radius || 1;
    
    // Generate contact points for physics
    const contactPoints = this.generateContactPoints(geometry, boundingRadius);
    
    // Create enhanced rock properties
    const properties = {
      shapeType,
      sizeCategory: variation.category,
      baseSize: boundingRadius,
      material,
      weatheringLevel: Math.max(0, Math.min(1, weatheringLevel)),
      stability: this.calculateStability(shapeType, weatheringLevel, variation),
      variation,
      shape
    };
    
    return {
      mesh,
      properties,
      boundingRadius,
      contactPoints
    };
  }
  
  private updateGenerationStats(category: string, shapeType: RockShapeType): void {
    const key = `${category}_${shapeType}`;
    const current = RockShapeFactory.generationStats.get(key) || 0;
    RockShapeFactory.generationStats.set(key, current + 1);
    
    // Log stats every 50 rocks generated
    const totalGenerated = Array.from(RockShapeFactory.generationStats.values())
      .reduce((sum, count) => sum + count, 0);
    
    if (totalGenerated % 50 === 0) {
      this.logGenerationStats();
    }
  }
  
  private logGenerationStats(): void {
    console.log('🗿 Rock Generation Statistics:');
    
    // Group by category
    const categoryStats = new Map<string, number>();
    const shapeStats = new Map<string, number>();
    
    RockShapeFactory.generationStats.forEach((count, key) => {
      const [category, shape] = key.split('_');
      categoryStats.set(category, (categoryStats.get(category) || 0) + count);
      shapeStats.set(shape, (shapeStats.get(shape) || 0) + count);
    });
    
    console.log('  By Category:');
    categoryStats.forEach((count, category) => {
      console.log(`    ${category}: ${count}`);
    });
    
    console.log('  By Shape:');
    shapeStats.forEach((count, shape) => {
      console.log(`    ${shape}: ${count}`);
    });
  }
  
  private selectMaterialType(shapeType: RockShapeType): 'granite' | 'sandstone' | 'limestone' | 'basalt' | 'weathered' {
    const materialMappings = {
      boulder: 'granite',
      spire: 'basalt',
      slab: 'sandstone',
      angular: 'basalt',
      weathered: 'weathered',
      flattened: 'limestone',
      jagged: 'granite',
      cluster: 'granite'
    };
    
    return materialMappings[shapeType] as any;
  }
  
  private calculateStability(shapeType: RockShapeType, weatheringLevel: number, variation: RockVariation): number {
    const baseStability = {
      boulder: 0.9,
      spire: 0.3,
      slab: 0.8,
      angular: 0.6,
      weathered: 0.7,
      flattened: 0.9,
      jagged: 0.4,
      cluster: 0.8
    };
    
    const base = baseStability[shapeType];
    const weatheringPenalty = weatheringLevel * 0.3;
    const sizePenalty = variation.category === 'massive' ? 0.1 : 0; // Massive rocks are slightly less stable
    
    return Math.max(0.1, base - weatheringPenalty - sizePenalty);
  }
  
  private generateContactPoints(geometry: THREE.BufferGeometry, boundingRadius: number): THREE.Vector3[] {
    // Generate contact points for physics calculations
    const points: THREE.Vector3[] = [];
    
    // Add points at cardinal directions at ground level
    const groundRadius = boundingRadius * 0.8;
    points.push(
      new THREE.Vector3(groundRadius, 0, 0),
      new THREE.Vector3(-groundRadius, 0, 0),
      new THREE.Vector3(0, 0, groundRadius),
      new THREE.Vector3(0, 0, -groundRadius)
    );
    
    return points;
  }
  
  public static getGenerationStats(): Map<string, number> {
    return new Map(RockShapeFactory.generationStats);
  }
  
  public static resetGenerationStats(): void {
    RockShapeFactory.generationStats.clear();
  }
}
