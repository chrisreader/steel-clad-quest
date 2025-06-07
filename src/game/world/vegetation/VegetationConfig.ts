
import * as THREE from 'three';

export interface TreeConfig {
  height: number;
  trunkRadius: number;
  trunkRadiusBottom: number;
  trunkColor: number;
  layerCount: number;
  leafColors: THREE.Color[];
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
  sizeRange: [0.4, 0.8], // Smaller base size for more variety
  heightRange: [0.3, 0.7], // Natural height variation
  layerCountRange: [2, 4], // Multi-layer organic growth
  segmentRange: [12, 20], // Higher resolution for smoother organic shapes
  noiseIntensityRange: [0.03, 0.08], // Subtle to moderate deformation
  colors: [
    new THREE.Color().setHSL(0.25, 0.6, 0.4), // Dark green
    new THREE.Color().setHSL(0.3, 0.7, 0.5),  // Bright green
    new THREE.Color().setHSL(0.2, 0.5, 0.45), // Olive green
    new THREE.Color().setHSL(0.28, 0.8, 0.4), // Forest green
    new THREE.Color().setHSL(0.22, 0.6, 0.35) // Deep woodland green
  ],
  stemChance: 0.4, // Increased chance for more realistic bushes
  berryChance: 0.2, // Slightly increased for visual interest
  asymmetryFactor: 0.3, // Natural asymmetric growth
  droopIntensity: 0.15 // Natural settling effect
};
