
import * as THREE from 'three';

export interface TreeConfig {
  height: number;
  trunkRadius: number;
  trunkRadiusBottom: number;
  trunkColor: number;
  layerCount: number;
  leafColors: THREE.Color[];
}

export interface BushArchetype {
  name: string;
  heightRange: [number, number];
  sizeRange: [number, number];
  layerCountRange: [number, number];
  density: number;
  growthPattern: 'compact' | 'sprawling' | 'upright' | 'wild';
  colorVariation: number;
}

export interface BushConfig {
  sizeRange: [number, number];
  heightRange: [number, number];
  layerCountRange: [number, number];
  segmentRange: [number, number];
  noiseIntensityRange: [number, number];
  colors: THREE.Color[];
  stemChance: number;
  berryChance: number;
  asymmetryFactor: number;
  droopIntensity: number;
  archetypes: BushArchetype[];
}

export const TREE_CONFIG: TreeConfig = {
  height: 8,
  trunkRadius: 0.3,
  trunkRadiusBottom: 1.2,
  trunkColor: 0x8B7355,
  layerCount: 3,
  leafColors: []
};

export const BUSH_CONFIG: BushConfig = {
  sizeRange: [0.3, 1.0], // Expanded range for more variety
  heightRange: [0.2, 1.2], // Dramatically expanded height range
  layerCountRange: [2, 5], // More layers for complex growth
  segmentRange: [16, 24], // Higher resolution for better organic shapes
  noiseIntensityRange: [0.04, 0.12], // Increased noise for more deformation
  colors: [
    new THREE.Color().setHSL(0.25, 0.6, 0.4), // Dark green
    new THREE.Color().setHSL(0.3, 0.7, 0.5),  // Bright green
    new THREE.Color().setHSL(0.2, 0.5, 0.45), // Olive green
    new THREE.Color().setHSL(0.28, 0.8, 0.4), // Forest green
    new THREE.Color().setHSL(0.22, 0.6, 0.35), // Deep woodland green
    new THREE.Color().setHSL(0.15, 0.5, 0.3), // Autumn brown-green
    new THREE.Color().setHSL(0.35, 0.6, 0.45) // Yellow-green
  ],
  stemChance: 0.5,
  berryChance: 0.25,
  asymmetryFactor: 0.4, // Increased asymmetry
  droopIntensity: 0.2,
  archetypes: [
    {
      name: 'ground-hugger',
      heightRange: [0.2, 0.4],
      sizeRange: [0.4, 0.8],
      layerCountRange: [2, 3],
      density: 1.2,
      growthPattern: 'compact',
      colorVariation: 0.1
    },
    {
      name: 'medium-bush',
      heightRange: [0.5, 0.8],
      sizeRange: [0.5, 0.9],
      layerCountRange: [3, 4],
      density: 1.0,
      growthPattern: 'wild',
      colorVariation: 0.15
    },
    {
      name: 'tall-bush',
      heightRange: [0.9, 1.2],
      sizeRange: [0.6, 1.0],
      layerCountRange: [4, 5],
      density: 0.8,
      growthPattern: 'upright',
      colorVariation: 0.2
    },
    {
      name: 'sprawling-bush',
      heightRange: [0.3, 0.6],
      sizeRange: [0.7, 1.2],
      layerCountRange: [2, 4],
      density: 0.7,
      growthPattern: 'sprawling',
      colorVariation: 0.12
    }
  ]
};
