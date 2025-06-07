
import * as THREE from 'three';

export interface TreeConfig {
  height: number;
  trunkRadius: number;
  trunkRadiusBottom: number;
  trunkColor: number;
  layerCount: number;
  leafColors: THREE.Color[];
}

export enum BushType {
  SMALL_SHRUB = 'small_shrub',
  MEDIUM_BUSH = 'medium_bush',
  LARGE_BUSH = 'large_bush',
  TALL_SHRUB = 'tall_shrub',
  BERRY_BUSH = 'berry_bush',
  FLOWERING_BUSH = 'flowering_bush',
  EVERGREEN_SHRUB = 'evergreen_shrub',
  WILD_BRAMBLE = 'wild_bramble'
}

export enum GrowthPattern {
  COMPACT_ROUND = 'compact_round',
  SPRAWLING_WIDE = 'sprawling_wide',
  UPRIGHT_OVAL = 'upright_oval',
  IRREGULAR_CLUMPING = 'irregular_clumping'
}

export interface BushSpecies {
  type: BushType;
  heightRange: [number, number];
  widthRange: [number, number];
  growthPattern: GrowthPattern;
  clusterCountRange: [number, number];
  colors: THREE.Color[];
  stemChance: number;
  berryChance: number;
  flowerChance: number;
  foliageDensity: number;
  seasonalVariation: boolean;
}

export interface BushConfig {
  sizeRange: [number, number];
  clusterCountRange: [number, number];
  colors: THREE.Color[];
  stemChance: number;
  berryChance: number;
  species: BushSpecies[];
}

export const BUSH_SPECIES: BushSpecies[] = [
  {
    type: BushType.SMALL_SHRUB,
    heightRange: [0.3, 0.8],
    widthRange: [0.4, 1.0],
    growthPattern: GrowthPattern.COMPACT_ROUND,
    clusterCountRange: [2, 4],
    colors: [
      new THREE.Color().setHSL(0.25, 0.7, 0.4), // Fresh green
      new THREE.Color().setHSL(0.3, 0.6, 0.45)  // Light green
    ],
    stemChance: 0.2,
    berryChance: 0.1,
    flowerChance: 0.3,
    foliageDensity: 0.8,
    seasonalVariation: true
  },
  {
    type: BushType.MEDIUM_BUSH,
    heightRange: [0.8, 1.5],
    widthRange: [0.8, 1.4],
    growthPattern: GrowthPattern.IRREGULAR_CLUMPING,
    clusterCountRange: [4, 7],
    colors: [
      new THREE.Color().setHSL(0.25, 0.6, 0.4), // Standard green
      new THREE.Color().setHSL(0.28, 0.7, 0.42) // Forest green
    ],
    stemChance: 0.4,
    berryChance: 0.15,
    flowerChance: 0.2,
    foliageDensity: 0.9,
    seasonalVariation: true
  },
  {
    type: BushType.LARGE_BUSH,
    heightRange: [1.5, 2.5],
    widthRange: [1.2, 2.0],
    growthPattern: GrowthPattern.UPRIGHT_OVAL,
    clusterCountRange: [6, 10],
    colors: [
      new THREE.Color().setHSL(0.22, 0.5, 0.35), // Dark green
      new THREE.Color().setHSL(0.26, 0.6, 0.38)  // Mature green
    ],
    stemChance: 0.6,
    berryChance: 0.1,
    flowerChance: 0.1,
    foliageDensity: 1.0,
    seasonalVariation: false
  },
  {
    type: BushType.TALL_SHRUB,
    heightRange: [2.5, 3.5],
    widthRange: [1.5, 2.2],
    growthPattern: GrowthPattern.UPRIGHT_OVAL,
    clusterCountRange: [8, 12],
    colors: [
      new THREE.Color().setHSL(0.2, 0.4, 0.3),  // Very dark green
      new THREE.Color().setHSL(0.24, 0.5, 0.32) // Deep forest green
    ],
    stemChance: 0.8,
    berryChance: 0.05,
    flowerChance: 0.05,
    foliageDensity: 1.1,
    seasonalVariation: false
  },
  {
    type: BushType.BERRY_BUSH,
    heightRange: [0.5, 1.2],
    widthRange: [0.8, 1.6],
    growthPattern: GrowthPattern.SPRAWLING_WIDE,
    clusterCountRange: [3, 6],
    colors: [
      new THREE.Color().setHSL(0.3, 0.7, 0.45), // Berry bush green
      new THREE.Color().setHSL(0.32, 0.6, 0.4)  // Slightly yellow-green
    ],
    stemChance: 0.3,
    berryChance: 0.8,
    flowerChance: 0.4,
    foliageDensity: 0.7,
    seasonalVariation: true
  },
  {
    type: BushType.FLOWERING_BUSH,
    heightRange: [0.6, 1.8],
    widthRange: [0.7, 1.5],
    growthPattern: GrowthPattern.COMPACT_ROUND,
    clusterCountRange: [4, 8],
    colors: [
      new THREE.Color().setHSL(0.28, 0.8, 0.5), // Bright green
      new THREE.Color().setHSL(0.25, 0.7, 0.48) // Spring green
    ],
    stemChance: 0.4,
    berryChance: 0.1,
    flowerChance: 0.9,
    foliageDensity: 0.8,
    seasonalVariation: true
  },
  {
    type: BushType.EVERGREEN_SHRUB,
    heightRange: [0.8, 2.0],
    widthRange: [0.6, 1.4],
    growthPattern: GrowthPattern.COMPACT_ROUND,
    clusterCountRange: [5, 9],
    colors: [
      new THREE.Color().setHSL(0.18, 0.8, 0.25), // Dark evergreen
      new THREE.Color().setHSL(0.22, 0.7, 0.3)   // Deep pine green
    ],
    stemChance: 0.7,
    berryChance: 0.05,
    flowerChance: 0.02,
    foliageDensity: 1.2,
    seasonalVariation: false
  },
  {
    type: BushType.WILD_BRAMBLE,
    heightRange: [0.4, 1.6],
    widthRange: [1.0, 2.5],
    growthPattern: GrowthPattern.IRREGULAR_CLUMPING,
    clusterCountRange: [3, 8],
    colors: [
      new THREE.Color().setHSL(0.3, 0.5, 0.4),  // Wild green
      new THREE.Color().setHSL(0.35, 0.6, 0.38) // Bramble green
    ],
    stemChance: 0.9,
    berryChance: 0.6,
    flowerChance: 0.3,
    foliageDensity: 0.6,
    seasonalVariation: true
  }
];

export const BUSH_CONFIG: BushConfig = {
  sizeRange: [0.3, 3.5], // Expanded range for realistic variety
  clusterCountRange: [2, 12], // Expanded for different bush types
  colors: [
    new THREE.Color().setHSL(0.25, 0.6, 0.4), // Dark green
    new THREE.Color().setHSL(0.3, 0.7, 0.5),  // Bright green
    new THREE.Color().setHSL(0.2, 0.5, 0.45), // Olive green
    new THREE.Color().setHSL(0.28, 0.8, 0.4)  // Forest green
  ],
  stemChance: 0.3,
  berryChance: 0.15,
  species: BUSH_SPECIES
};

export const TREE_CONFIG: TreeConfig = {
  height: 8, // Fixed height for consistency
  trunkRadius: 0.3,
  trunkRadiusBottom: 1.2,
  trunkColor: 0x8B7355,
  layerCount: 3,
  leafColors: []
};
