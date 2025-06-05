import * as THREE from 'three';
import { RockShapeType, RockInstance, RockGenerationConfig } from '../types/RockTypes';
import { RockMaterials } from '../materials/RockMaterials';
import { BaseRockShape } from '../shapes/BaseRockShape';
import { BoulderShape } from '../shapes/BoulderShape';
import { SpireShape } from '../shapes/SpireShape';
import { SlabShape } from '../shapes/SlabShape';
import { AngularShape } from '../shapes/AngularShape';
import { WeatheredShape } from '../shapes/WeatheredShape';
import { FlattenedShape } from '../shapes/FlattenedShape';
import { JaggedShape } from '../shapes/JaggedShape';

export class RockShapeFactory {
  private shapeGenerators: Map<RockShapeType, BaseRockShape>;
  
  constructor() {
    this.shapeGenerators = new Map();
    this.shapeGenerators.set('boulder', new BoulderShape());
    this.shapeGenerators.set('spire', new SpireShape());
    this.shapeGenerators.set('slab', new SlabShape());
    this.shapeGenerators.set('angular', new AngularShape());
    this.shapeGenerators.set('weathered', new WeatheredShape());
    this.shapeGenerators.set('flattened', new FlattenedShape());
    this.shapeGenerators.set('jagged', new JaggedShape());
  }
  
  public createRock(shapeType: RockShapeType, config: RockGenerationConfig): RockInstance {
    if (shapeType === 'cluster') {
      throw new Error('Cluster rocks should be generated through ClusterGenerator');
    }
    
    const shapeGenerator = this.shapeGenerators.get(shapeType);
    if (!shapeGenerator) {
      throw new Error(`Unknown rock shape type: ${shapeType}`);
    }
    
    // Generate geometry
    const geometry = shapeGenerator.generateGeometry(config);
    
    // Select material type based on shape and weathering
    const materialType = this.selectMaterialType(shapeType);
    const weatheringLevel = config.weatheringRange.min + 
      Math.random() * (config.weatheringRange.max - config.weatheringRange.min);
    
    const material = RockMaterials.getRockMaterial(materialType, weatheringLevel);
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Calculate bounding radius
    geometry.computeBoundingSphere();
    const boundingRadius = geometry.boundingSphere?.radius || 1;
    
    // Generate contact points for physics
    const contactPoints = this.generateContactPoints(geometry, boundingRadius);
    
    // Create rock properties
    const properties = {
      shapeType,
      sizeCategory: this.determineSizeCategory(boundingRadius),
      baseSize: boundingRadius,
      material,
      weatheringLevel,
      stability: this.calculateStability(shapeType, weatheringLevel)
    };
    
    return {
      mesh,
      properties,
      boundingRadius,
      contactPoints
    };
  }
  
  private selectMaterialType(shapeType: RockShapeType): 'granite' | 'sandstone' | 'limestone' | 'basalt' | 'weathered' {
    const materialMappings = {
      boulder: 'granite',
      spire: 'basalt',
      slab: 'sandstone',
      angular: 'basalt',
      weathered: 'weathered',
      flattened: 'limestone',
      jagged: 'granite'
    };
    
    return materialMappings[shapeType] as any;
  }
  
  private determineSizeCategory(boundingRadius: number): 'small' | 'medium' | 'large' | 'massive' {
    if (boundingRadius < 0.5) return 'small';
    if (boundingRadius < 1.0) return 'medium';
    if (boundingRadius < 2.0) return 'large';
    return 'massive';
  }
  
  private calculateStability(shapeType: RockShapeType, weatheringLevel: number): number {
    const baseStability = {
      boulder: 0.9,
      spire: 0.3,
      slab: 0.8,
      angular: 0.6,
      weathered: 0.7,
      flattened: 0.9,
      jagged: 0.4
    };
    
    const base = baseStability[shapeType];
    return Math.max(0.1, base - (weatheringLevel * 0.3));
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
}
