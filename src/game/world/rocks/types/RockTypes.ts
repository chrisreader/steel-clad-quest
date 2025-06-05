
import * as THREE from 'three';

export type RockShapeType = 
  | 'boulder'
  | 'spire' 
  | 'slab'
  | 'angular'
  | 'weathered'
  | 'flattened'
  | 'jagged'
  | 'cluster';

export type RockSizeCategory = 'small' | 'medium' | 'large' | 'massive';

export interface RockProperties {
  shapeType: RockShapeType;
  sizeCategory: RockSizeCategory;
  baseSize: number;
  material: THREE.Material;
  weatheringLevel: number; // 0-1
  stability: number; // 0-1, affects stacking physics
}

export interface RockInstance {
  mesh: THREE.Object3D;
  properties: RockProperties;
  boundingRadius: number;
  contactPoints: THREE.Vector3[];
}

export interface RockGenerationConfig {
  shapeType: RockShapeType;
  sizeRange: { min: number; max: number };
  materialVariation: number;
  weatheringRange: { min: number; max: number };
}
