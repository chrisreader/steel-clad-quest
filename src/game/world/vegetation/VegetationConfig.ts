
import * as THREE from 'three';

export interface TreeConfig {
  height: number;
  trunkRadius: number;
  trunkRadiusBottom: number;
  trunkColor: number;
  layerCount: number;
  leafColors: THREE.Color[];
}

export interface BushSpecies {
  name: string;
  scientificName: string;
  heightRange: [number, number];
  widthRatio: [number, number]; // Width as ratio of height
  density: [number, number]; // Foliage density range
  asymmetryFactor: [number, number];
  droopFactor: [number, number];
  clusterCount: [number, number];
  growthStages: {
    juvenile: { scale: number; density: number };
    mature: { scale: number; density: number };
    old: { scale: number; density: number };
  };
  seasonalColors: {
    spring: THREE.Color[];
    summer: THREE.Color[];
    autumn: THREE.Color[];
    winter: THREE.Color[];
  };
  spawnWeight: number;
  preferredTerrain: string[];
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
  species: BushSpecies[];
  colors: THREE.Color[];
  stemChance: number;
  berryChance: number;
  organicDeformation: {
    enabled: boolean;
    intensity: number;
    scale: number;
    octaves: number;
    persistence: number;
  };
  naturalMerging: {
    overlapFactor: number;
    fillerClusters: boolean;
  };
  realism: {
    environmentalResponse: boolean;
    seasonalVariation: boolean;
    ageVariation: boolean;
    weatherEffects: boolean;
    naturalClustering: boolean;
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
      spawnWeight: 0.6
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
      spawnWeight: 0.1
    }
  ],
  species: [
    {
      name: 'Elderberry',
      scientificName: 'Sambucus canadensis',
      heightRange: [1.5, 3.0],
      widthRatio: [0.8, 1.2],
      density: [0.7, 1.0],
      asymmetryFactor: [0.2, 0.5],
      droopFactor: [0.1, 0.3],
      clusterCount: [4, 8],
      growthStages: {
        juvenile: { scale: 0.3, density: 0.8 },
        mature: { scale: 1.0, density: 1.0 },
        old: { scale: 1.2, density: 0.7 }
      },
      seasonalColors: {
        spring: [new THREE.Color(0.4, 0.8, 0.3), new THREE.Color(0.3, 0.7, 0.2)],
        summer: [new THREE.Color(0.2, 0.6, 0.1), new THREE.Color(0.3, 0.5, 0.2)],
        autumn: [new THREE.Color(0.8, 0.6, 0.2), new THREE.Color(0.7, 0.4, 0.1)],
        winter: [new THREE.Color(0.4, 0.3, 0.2), new THREE.Color(0.3, 0.2, 0.1)]
      },
      spawnWeight: 0.3,
      preferredTerrain: ['forest', 'meadow']
    },
    {
      name: 'Hawthorn',
      scientificName: 'Crataegus monogyna',
      heightRange: [2.0, 4.0],
      widthRatio: [0.9, 1.5],
      density: [0.8, 1.2],
      asymmetryFactor: [0.4, 0.8],
      droopFactor: [0.2, 0.6],
      clusterCount: [5, 12],
      growthStages: {
        juvenile: { scale: 0.25, density: 0.9 },
        mature: { scale: 1.0, density: 1.0 },
        old: { scale: 1.3, density: 0.6 }
      },
      seasonalColors: {
        spring: [new THREE.Color(0.5, 0.9, 0.4), new THREE.Color(0.4, 0.8, 0.3)],
        summer: [new THREE.Color(0.2, 0.5, 0.1), new THREE.Color(0.3, 0.6, 0.2)],
        autumn: [new THREE.Color(0.9, 0.5, 0.1), new THREE.Color(0.8, 0.3, 0.0)],
        winter: [new THREE.Color(0.3, 0.2, 0.1), new THREE.Color(0.2, 0.1, 0.0)]
      },
      spawnWeight: 0.25,
      preferredTerrain: ['hillside', 'forest_edge']
    },
    {
      name: 'Wild Rose',
      scientificName: 'Rosa canina',
      heightRange: [0.8, 2.0],
      widthRatio: [0.6, 1.0],
      density: [0.6, 0.9],
      asymmetryFactor: [0.3, 0.7],
      droopFactor: [0.4, 0.8],
      clusterCount: [3, 6],
      growthStages: {
        juvenile: { scale: 0.4, density: 0.7 },
        mature: { scale: 1.0, density: 1.0 },
        old: { scale: 0.9, density: 0.8 }
      },
      seasonalColors: {
        spring: [new THREE.Color(0.3, 0.7, 0.2), new THREE.Color(0.4, 0.6, 0.3)],
        summer: [new THREE.Color(0.2, 0.5, 0.1), new THREE.Color(0.1, 0.4, 0.0)],
        autumn: [new THREE.Color(0.6, 0.4, 0.1), new THREE.Color(0.7, 0.3, 0.0)],
        winter: [new THREE.Color(0.4, 0.2, 0.1), new THREE.Color(0.3, 0.1, 0.0)]
      },
      spawnWeight: 0.2,
      preferredTerrain: ['meadow', 'forest_edge']
    },
    {
      name: 'Juniper',
      scientificName: 'Juniperus communis',
      heightRange: [0.5, 1.5],
      widthRatio: [0.4, 0.8],
      density: [1.0, 1.4],
      asymmetryFactor: [0.1, 0.3],
      droopFactor: [0.0, 0.2],
      clusterCount: [6, 15],
      growthStages: {
        juvenile: { scale: 0.2, density: 1.2 },
        mature: { scale: 1.0, density: 1.0 },
        old: { scale: 1.1, density: 1.3 }
      },
      seasonalColors: {
        spring: [new THREE.Color(0.2, 0.4, 0.1), new THREE.Color(0.1, 0.5, 0.2)],
        summer: [new THREE.Color(0.1, 0.3, 0.0), new THREE.Color(0.0, 0.4, 0.1)],
        autumn: [new THREE.Color(0.2, 0.3, 0.1), new THREE.Color(0.1, 0.4, 0.0)],
        winter: [new THREE.Color(0.1, 0.2, 0.0), new THREE.Color(0.0, 0.3, 0.1)]
      },
      spawnWeight: 0.25,
      preferredTerrain: ['rocky', 'hillside']
    }
  ],
  colors: [
    new THREE.Color().setHSL(0.25, 0.6, 0.4),
    new THREE.Color().setHSL(0.3, 0.7, 0.5),
    new THREE.Color().setHSL(0.2, 0.5, 0.45),
    new THREE.Color().setHSL(0.28, 0.8, 0.4),
    new THREE.Color().setHSL(0.22, 0.4, 0.3),
    new THREE.Color().setHSL(0.32, 0.6, 0.6)
  ],
  stemChance: 0.6,
  berryChance: 0.25,
  organicDeformation: {
    enabled: true,
    intensity: 0.4,
    scale: 1.8,
    octaves: 4,
    persistence: 0.5
  },
  naturalMerging: {
    overlapFactor: 0.3,
    fillerClusters: true
  },
  realism: {
    environmentalResponse: true,
    seasonalVariation: true,
    ageVariation: true,
    weatherEffects: true,
    naturalClustering: true
  }
};
