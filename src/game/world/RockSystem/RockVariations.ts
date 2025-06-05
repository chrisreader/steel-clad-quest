
import * as THREE from 'three';

export interface RockVariation {
  category: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  sizeRange: [number, number];
  weight: number;
  isCluster: boolean;
  clusterSize?: [number, number];
}

export interface RockShape {
  type: 'boulder' | 'spire' | 'slab' | 'cluster' | 'weathered' | 'angular' | 'flattened' | 'jagged';
  baseGeometry: 'icosahedron' | 'sphere' | 'dodecahedron';
  deformationIntensity: number;
  weatheringLevel: number;
  shapeModifier: 'none' | 'stretch' | 'flatten' | 'fracture' | 'erode';
}

export const ROCK_VARIATIONS: RockVariation[] = [
  { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false },
  { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false },
  { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false },
  { category: 'large', sizeRange: [2.0, 4.0], weight: 0.8, isCluster: true, clusterSize: [3, 5] },
  { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.1, isCluster: true, clusterSize: [4, 7] }
];

export const ROCK_SHAPES: RockShape[] = [
  { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.15, weatheringLevel: 0.6, shapeModifier: 'erode' },
  { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.2, weatheringLevel: 0.3, shapeModifier: 'stretch' },
  { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.1, weatheringLevel: 0.8, shapeModifier: 'flatten' },
  { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.2, weatheringLevel: 0.4, shapeModifier: 'fracture' },
  { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.9, shapeModifier: 'erode' },
  { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.15, weatheringLevel: 0.7, shapeModifier: 'flatten' },
  { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.2, weatheringLevel: 0.5, shapeModifier: 'fracture' },
  { type: 'cluster', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.6, shapeModifier: 'none' }
];
