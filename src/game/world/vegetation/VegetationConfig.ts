
import * as THREE from 'three';

export interface TreeConfig {
  height: number;
  trunkRadius: number;
  trunkRadiusBottom: number;
  trunkColor: number;
  layerCount: number;
  leafColors: THREE.Color[];
}

export interface BushType {
  name: string;
  heightRange: [number, number];
  baseSize: [number, number];
  clusterCount: [number, number];
  asymmetryFactor: number;
  droopFactor: number;
  density: number;
  spawnWeight: number;
}

export interface BushConfig {
  types: BushType[];
  colors: THREE.Color[];
  stemChance: number;
  berryChance: number;
  organicDeformation: {
    enabled: boolean;
    intensity: number;
    scale: number;
  };
  naturalMerging: {
    overlapFactor: number;
    fillerClusters: boolean;
  };
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
  types: [
    {
      name: 'low_shrub',
      heightRange: [0.3, 0.8],
      baseSize: [0.4, 0.7],
      clusterCount: [2, 4],
      asymmetryFactor: 0.3,
      droopFactor: 0.1,
      density: 1.2,
      spawnWeight: 0.6 // Most common
    },
    {
      name: 'medium_bush',
      heightRange: [0.8, 1.5],
      baseSize: [0.6, 1.0],
      clusterCount: [3, 6],
      asymmetryFactor: 0.5,
      droopFactor: 0.3,
      density: 1.0,
      spawnWeight: 0.3
    },
    {
      name: 'tall_bush',
      heightRange: [1.5, 2.5],
      baseSize: [0.8, 1.3],
      clusterCount: [4, 8],
      asymmetryFactor: 0.7,
      droopFactor: 0.5,
      density: 0.8,
      spawnWeight: 0.1 // Least common
    }
  ],
  colors: [
    new THREE.Color().setHSL(0.25, 0.6, 0.4), // Dark green
    new THREE.Color().setHSL(0.3, 0.7, 0.5),  // Bright green
    new THREE.Color().setHSL(0.2, 0.5, 0.45), // Olive green
    new THREE.Color().setHSL(0.28, 0.8, 0.4), // Forest green
    new THREE.Color().setHSL(0.22, 0.4, 0.3), // Muted green
    new THREE.Color().setHSL(0.32, 0.6, 0.6)  // Light green
  ],
  stemChance: 0.4,
  berryChance: 0.2,
  organicDeformation: {
    enabled: true,
    intensity: 0.3,
    scale: 2.0
  },
  naturalMerging: {
    overlapFactor: 0.4,
    fillerClusters: true
  }
};
