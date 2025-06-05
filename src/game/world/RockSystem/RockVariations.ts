
import * as THREE from 'three';

export interface RockVariation {
  name: string;
  weight: number;
  sizeRange: { min: number; max: number };
  heightMultiplier: { min: number; max: number };
  deformationIntensity: { min: number; max: number };
  surfaceComplexity: { min: number; max: number };
  canCluster: boolean;
  isCluster: boolean;
  clusterSize?: { min: number; max: number };
}

export const ROCK_VARIATIONS: RockVariation[] = [
  {
    name: 'tiny',
    weight: 3.0,
    sizeRange: { min: 0.05, max: 0.15 },
    heightMultiplier: { min: 0.3, max: 0.8 },
    deformationIntensity: { min: 0.1, max: 0.3 },
    surfaceComplexity: { min: 0.2, max: 0.5 },
    canCluster: true,
    isCluster: false
  },
  {
    name: 'small',
    weight: 4.0,
    sizeRange: { min: 0.15, max: 0.4 },
    heightMultiplier: { min: 0.4, max: 1.0 },
    deformationIntensity: { min: 0.2, max: 0.5 },
    surfaceComplexity: { min: 0.3, max: 0.7 },
    canCluster: true,
    isCluster: false
  },
  {
    name: 'medium',
    weight: 2.5,
    sizeRange: { min: 0.4, max: 1.2 },
    heightMultiplier: { min: 0.6, max: 1.4 },
    deformationIntensity: { min: 0.3, max: 0.7 },
    surfaceComplexity: { min: 0.4, max: 0.8 },
    canCluster: true,
    isCluster: false
  },
  {
    name: 'large',
    weight: 0.8,
    sizeRange: { min: 2.0, max: 4.0 },
    heightMultiplier: { min: 0.8, max: 1.8 },
    deformationIntensity: { min: 0.4, max: 0.9 },
    surfaceComplexity: { min: 0.6, max: 1.0 },
    canCluster: true,
    isCluster: true,
    clusterSize: { min: 3, max: 5 }
  },
  {
    name: 'massive',
    weight: 0.1,
    sizeRange: { min: 4.0, max: 8.0 },
    heightMultiplier: { min: 1.0, max: 2.5 },
    deformationIntensity: { min: 0.5, max: 1.2 },
    surfaceComplexity: { min: 0.8, max: 1.5 },
    canCluster: true,
    isCluster: true,
    clusterSize: { min: 4, max: 7 }
  }
];

export const ROCK_SHAPES = [
  'angular', 'rounded', 'jagged', 'smooth',
  'crystalline', 'weathered', 'stratified', 'fractured'
];

export function selectRandomVariation(): RockVariation {
  const totalWeight = ROCK_VARIATIONS.reduce((sum, variation) => sum + variation.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const variation of ROCK_VARIATIONS) {
    random -= variation.weight;
    if (random <= 0) {
      return variation;
    }
  }
  
  return ROCK_VARIATIONS[0];
}

export function selectRandomShape(): string {
  return ROCK_SHAPES[Math.floor(Math.random() * ROCK_SHAPES.length)];
}
