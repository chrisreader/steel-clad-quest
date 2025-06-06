
import * as THREE from 'three';

export interface RockShape {
  type: 'boulder' | 'spire' | 'slab' | 'cluster' | 'weathered' | 'angular' | 'flattened' | 'jagged';
  baseGeometry: 'icosahedron' | 'sphere' | 'dodecahedron' | 'custom';
  deformationIntensity: number;
  weatheringLevel: number;
  shapeModifier: 'none' | 'stretch' | 'flatten' | 'fracture' | 'erode';
}

export interface RockVariation {
  category: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  sizeRange: [number, number];
  weight: number;
  isCluster: boolean;
  clusterSize?: [number, number];
  shapePersonality: 'character' | 'basic';
}

export type RockCategory = 'tiny' | 'small' | 'medium' | 'large' | 'massive';
export type RockType = 'boulder' | 'spire' | 'slab' | 'cluster' | 'weathered' | 'angular' | 'flattened' | 'jagged';
export type RockMaterial = 'granite' | 'sandstone' | 'limestone' | 'slate' | 'volcanic';
export type ClusterRole = 'foundation' | 'support' | 'accent';

export interface RockGenerationOptions {
  position?: THREE.Vector3;
  size?: number;
  shape?: RockShape;
  material?: RockMaterial;
  role?: ClusterRole;
  index?: number;
  forceCategory?: RockCategory;
  enableEnvironmentalDetails?: boolean;
  collisionCallback?: (object: THREE.Object3D) => void;
}

export interface ClusterGenerationOptions extends RockGenerationOptions {
  variation: RockVariation;
  scatterRadius?: number;
  clusterCounts?: {
    foundationCount: number;
    supportCount: number;
    accentCount: number;
    total: number;
  };
}

export interface RockGenerationConfig {
  rockShape: RockShape;
  rockSize: number;
  variation: RockVariation;
  index: number;
  role?: ClusterRole;
}

export interface GeometryProcessor {
  createCharacterBaseGeometry: (rockShape: RockShape, rockSize: number) => THREE.BufferGeometry;
  applyShapeModifications: (geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number) => void;
  applyCharacterDeformation: (geometry: THREE.BufferGeometry, intensity: number, rockSize: number, rockShape: RockShape) => void;
  validateAndEnhanceGeometry: (geometry: THREE.BufferGeometry) => void;
}

export interface DeformationOptions {
  intensity: number;
  noiseSeed?: number;
  category?: RockCategory;
  weatheringLevel?: number;
}

export interface ClusterLayoutOptions {
  count: number;
  radiusRange: [number, number];
  centerPosition: THREE.Vector3;
  role?: ClusterRole;
}
