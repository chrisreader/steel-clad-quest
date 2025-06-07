
import * as THREE from 'three';

export enum BushSpeciesType {
  DENSE_ROUND = 'dense_round',
  SPRAWLING_GROUND = 'sprawling_ground', 
  TALL_UPRIGHT = 'tall_upright',
  WILD_BERRY = 'wild_berry',
  FLOWERING_ORNAMENTAL = 'flowering_ornamental',
  TINY_SHRUB = 'tiny_shrub',
  LOW_GROUND_COVER = 'low_ground_cover'
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
    sizeRange: [0.4, 0.8], // Reduced from [0.6, 1.2]
    heightRange: [0.3, 0.6], // Reduced from [0.5, 0.9]
    layerCountRange: [3, 5], // Reduced from [4, 7]
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
    sizeRange: [0.6, 1.0], // Reduced from [0.8, 1.4]
    heightRange: [0.15, 0.3], // Reduced from [0.2, 0.4]
    layerCountRange: [2, 4], // Reduced from [3, 5]
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
    sizeRange: [0.3, 0.6], // Reduced from [0.4, 0.8]
    heightRange: [0.8, 1.2], // Reduced from [1.0, 1.8]
    layerCountRange: [4, 6], // Reduced from [5, 8]
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
    sizeRange: [0.5, 0.8], // Reduced from [0.7, 1.1]
    heightRange: [0.4, 0.7], // Reduced from [0.6, 1.0]
    layerCountRange: [3, 5], // Reduced from [3, 6]
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
    sizeRange: [0.3, 0.6], // Reduced from [0.5, 0.9]
    heightRange: [0.3, 0.5], // Reduced from [0.4, 0.7]
    layerCountRange: [3, 5], // Reduced from [4, 6]
    growthPattern: 'compact',
    leafDensity: 0.7,
    stemVisibility: 0.3,
    seasonalVariation: true,
    flowerChance: 0.9,
    berryChance: 0.0,
    textureVariations: 6,
    environmentalAdaptation: false
  },

  [BushSpeciesType.TINY_SHRUB]: {
    name: 'Tiny Shrub',
    type: BushSpeciesType.TINY_SHRUB,
    sizeRange: [0.2, 0.4],
    heightRange: [0.15, 0.35],
    layerCountRange: [2, 3],
    growthPattern: 'compact',
    leafDensity: 0.8,
    stemVisibility: 0.4,
    seasonalVariation: true,
    flowerChance: 0.3,
    berryChance: 0.2,
    textureVariations: 3,
    environmentalAdaptation: true
  },

  [BushSpeciesType.LOW_GROUND_COVER]: {
    name: 'Low Ground Cover',
    type: BushSpeciesType.LOW_GROUND_COVER,
    sizeRange: [0.4, 0.7],
    heightRange: [0.1, 0.2],
    layerCountRange: [2, 3],
    growthPattern: 'spreading',
    leafDensity: 0.9,
    stemVisibility: 0.1,
    seasonalVariation: true,
    flowerChance: 0.4,
    berryChance: 0.1,
    textureVariations: 4,
    environmentalAdaptation: true
  }
};

export class BushSpeciesManager {
  static getRandomSpecies(): BushSpeciesConfig {
    const species = Object.values(BUSH_SPECIES_CONFIGS);
    // Bias towards smaller bushes
    const weights = [1, 1, 0.6, 0.8, 1, 1.5, 1.5]; // Higher weights for smaller bushes
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < species.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return species[i];
      }
    }
    
    return species[species.length - 1];
  }
  
  static getSpeciesByType(type: BushSpeciesType): BushSpeciesConfig {
    return BUSH_SPECIES_CONFIGS[type];
  }
  
  static getAllSpecies(): BushSpeciesConfig[] {
    return Object.values(BUSH_SPECIES_CONFIGS);
  }
}
