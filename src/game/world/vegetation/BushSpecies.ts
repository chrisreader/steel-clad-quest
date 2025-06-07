
import * as THREE from 'three';

export enum BushSpeciesType {
  DENSE_ROUND = 'dense_round',
  SPRAWLING_GROUND = 'sprawling_ground', 
  TALL_UPRIGHT = 'tall_upright',
  WILD_BERRY = 'wild_berry',
  FLOWERING_ORNAMENTAL = 'flowering_ornamental'
}

export interface BushSpeciesConfig {
  name: string;
  type: BushSpeciesType;
  sizeRange: [number, number];
  heightRange: [number, number];
  layerCountRange: [number, number];
  growthPattern: 'compact' | 'spreading' | 'upright' | 'cascading';
  leafDensity: number;
  stemVisibility: number;
  seasonalVariation: boolean;
  flowerChance: number;
  berryChance: number;
  textureVariations: number;
  environmentalAdaptation: boolean;
}

export const BUSH_SPECIES_CONFIGS: Record<BushSpeciesType, BushSpeciesConfig> = {
  [BushSpeciesType.DENSE_ROUND]: {
    name: 'Dense Round Bush',
    type: BushSpeciesType.DENSE_ROUND,
    sizeRange: [0.6, 1.2],
    heightRange: [0.5, 0.9],
    layerCountRange: [4, 7],
    growthPattern: 'compact',
    leafDensity: 0.9,
    stemVisibility: 0.2,
    seasonalVariation: true,
    flowerChance: 0.1,
    berryChance: 0.15,
    textureVariations: 4,
    environmentalAdaptation: true
  },
  
  [BushSpeciesType.SPRAWLING_GROUND]: {
    name: 'Sprawling Ground Cover',
    type: BushSpeciesType.SPRAWLING_GROUND,
    sizeRange: [0.8, 1.4], // Reduced from 1.0-2.0 to 0.8-1.4 for more realistic size
    heightRange: [0.2, 0.4],
    layerCountRange: [3, 5],
    growthPattern: 'spreading',
    leafDensity: 0.7,
    stemVisibility: 0.4,
    seasonalVariation: true,
    flowerChance: 0.25,
    berryChance: 0.05,
    textureVariations: 3,
    environmentalAdaptation: true
  },
  
  [BushSpeciesType.TALL_UPRIGHT]: {
    name: 'Tall Upright Shrub',
    type: BushSpeciesType.TALL_UPRIGHT,
    sizeRange: [0.4, 0.8],
    heightRange: [1.0, 1.8],
    layerCountRange: [5, 8],
    growthPattern: 'upright',
    leafDensity: 0.6,
    stemVisibility: 0.6,
    seasonalVariation: true,
    flowerChance: 0.2,
    berryChance: 0.1,
    textureVariations: 5,
    environmentalAdaptation: true
  },
  
  [BushSpeciesType.WILD_BERRY]: {
    name: 'Wild Berry Bush',
    type: BushSpeciesType.WILD_BERRY,
    sizeRange: [0.7, 1.1],
    heightRange: [0.6, 1.0],
    layerCountRange: [3, 6],
    growthPattern: 'cascading',
    leafDensity: 0.8,
    stemVisibility: 0.3,
    seasonalVariation: true,
    flowerChance: 0.4,
    berryChance: 0.8,
    textureVariations: 4,
    environmentalAdaptation: false
  },
  
  [BushSpeciesType.FLOWERING_ORNAMENTAL]: {
    name: 'Flowering Ornamental',
    type: BushSpeciesType.FLOWERING_ORNAMENTAL,
    sizeRange: [0.5, 0.9],
    heightRange: [0.4, 0.7],
    layerCountRange: [4, 6],
    growthPattern: 'compact',
    leafDensity: 0.7,
    stemVisibility: 0.3,
    seasonalVariation: true,
    flowerChance: 0.9,
    berryChance: 0.0,
    textureVariations: 6,
    environmentalAdaptation: false
  }
};

export class BushSpeciesManager {
  static getRandomSpecies(): BushSpeciesConfig {
    const species = Object.values(BUSH_SPECIES_CONFIGS);
    return species[Math.floor(Math.random() * species.length)];
  }
  
  static getSpeciesByType(type: BushSpeciesType): BushSpeciesConfig {
    return BUSH_SPECIES_CONFIGS[type];
  }
  
  static getAllSpecies(): BushSpeciesConfig[] {
    return Object.values(BUSH_SPECIES_CONFIGS);
  }
}
