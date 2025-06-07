
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
  clusterCountRange: [number, number];
  colors: THREE.Color[];
  stemChance: number;
  berryChance: number;
}

export const TREE_CONFIG: TreeConfig = {
  height: 8, // Fixed height for consistency
  trunkRadius: 0.3,
  trunkRadiusBottom: 1.2,
  trunkColor: 0x8B7355,
  layerCount: 3,
  leafColors: []
};

export const BUSH_CONFIG: BushConfig = {
  sizeRange: [0.5, 0.9],
  clusterCountRange: [3, 6],
  colors: [
    new THREE.Color().setHSL(0.25, 0.6, 0.4), // Dark green
    new THREE.Color().setHSL(0.3, 0.7, 0.5),  // Bright green
    new THREE.Color().setHSL(0.2, 0.5, 0.45), // Olive green
    new THREE.Color().setHSL(0.28, 0.8, 0.4)  // Forest green
  ],
  stemChance: 0.3,
  berryChance: 0.15
};
