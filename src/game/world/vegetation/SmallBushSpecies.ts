
import * as THREE from 'three';
import { BushSpeciesConfig, BushSpeciesType } from './BushSpecies';

export enum SmallBushSpeciesType {
  UNDERSTORY_FERN = 'understory_fern',
  FOREST_MOSS = 'forest_moss',
  TREE_BASE_SHRUB = 'tree_base_shrub',
  ROCK_HUGGING = 'rock_hugging',
  GROUND_COVER = 'ground_cover'
}

export interface SmallBushSpeciesConfig extends BushSpeciesConfig {
  preferredLocation: 'tree_base' | 'rock_side' | 'open_ground' | 'shade' | 'any';
  clusterSize: [number, number];
  spacingRange: [number, number];
}

export const SMALL_BUSH_SPECIES_CONFIGS: Record<SmallBushSpeciesType, SmallBushSpeciesConfig> = {
  [SmallBushSpeciesType.UNDERSTORY_FERN]: {
    name: 'Understory Fern',
    type: SmallBushSpeciesType.UNDERSTORY_FERN as any,
    sizeRange: [0.2, 0.4],
    heightRange: [0.1, 0.3],
    layerCountRange: [2, 3],
    growthPattern: 'spreading',
    leafDensity: 0.8,
    stemVisibility: 0.1,
    seasonalVariation: true,
    flowerChance: 0.0,
    berryChance: 0.0,
    textureVariations: 3,
    environmentalAdaptation: true,
    preferredLocation: 'shade',
    clusterSize: [3, 6],
    spacingRange: [0.3, 0.8]
  },

  [SmallBushSpeciesType.FOREST_MOSS]: {
    name: 'Forest Moss Bush',
    type: SmallBushSpeciesType.FOREST_MOSS as any,
    sizeRange: [0.15, 0.3],
    heightRange: [0.05, 0.15],
    layerCountRange: [1, 2],
    growthPattern: 'compact',
    leafDensity: 0.9,
    stemVisibility: 0.0,
    seasonalVariation: false,
    flowerChance: 0.0,
    berryChance: 0.0,
    textureVariations: 2,
    environmentalAdaptation: true,
    preferredLocation: 'tree_base',
    clusterSize: [5, 12],
    spacingRange: [0.1, 0.4]
  },

  [SmallBushSpeciesType.TREE_BASE_SHRUB]: {
    name: 'Tree Base Shrub',
    type: SmallBushSpeciesType.TREE_BASE_SHRUB as any,
    sizeRange: [0.3, 0.6],
    heightRange: [0.2, 0.4],
    layerCountRange: [2, 4],
    growthPattern: 'compact',
    leafDensity: 0.7,
    stemVisibility: 0.3,
    seasonalVariation: true,
    flowerChance: 0.15,
    berryChance: 0.25,
    textureVariations: 4,
    environmentalAdaptation: true,
    preferredLocation: 'tree_base',
    clusterSize: [2, 5],
    spacingRange: [0.4, 1.0]
  },

  [SmallBushSpeciesType.ROCK_HUGGING]: {
    name: 'Rock Hugging Bush',
    type: SmallBushSpeciesType.ROCK_HUGGING as any,
    sizeRange: [0.2, 0.5],
    heightRange: [0.15, 0.35],
    layerCountRange: [2, 3],
    growthPattern: 'cascading',
    leafDensity: 0.6,
    stemVisibility: 0.4,
    seasonalVariation: true,
    flowerChance: 0.3,
    berryChance: 0.1,
    textureVariations: 3,
    environmentalAdaptation: true,
    preferredLocation: 'rock_side',
    clusterSize: [1, 3],
    spacingRange: [0.2, 0.6]
  },

  [SmallBushSpeciesType.GROUND_COVER]: {
    name: 'Ground Cover',
    type: SmallBushSpeciesType.GROUND_COVER as any,
    sizeRange: [0.4, 0.8],
    heightRange: [0.1, 0.25],
    layerCountRange: [2, 3],
    growthPattern: 'spreading',
    leafDensity: 0.8,
    stemVisibility: 0.2,
    seasonalVariation: true,
    flowerChance: 0.4,
    berryChance: 0.05,
    textureVariations: 4,
    environmentalAdaptation: true,
    preferredLocation: 'open_ground',
    clusterSize: [4, 8],
    spacingRange: [0.5, 1.2]
  }
};

export class SmallBushSpeciesManager {
  static getRandomSmallSpecies(preferredLocation?: string): SmallBushSpeciesConfig {
    const allSpecies = Object.values(SMALL_BUSH_SPECIES_CONFIGS);
    
    if (preferredLocation) {
      const filtered = allSpecies.filter(s => 
        s.preferredLocation === preferredLocation || s.preferredLocation === 'any'
      );
      if (filtered.length > 0) {
        return filtered[Math.floor(Math.random() * filtered.length)];
      }
    }
    
    return allSpecies[Math.floor(Math.random() * allSpecies.length)];
  }

  static getSpeciesByType(type: SmallBushSpeciesType): SmallBushSpeciesConfig {
    return SMALL_BUSH_SPECIES_CONFIGS[type];
  }

  static getAllSmallSpecies(): SmallBushSpeciesConfig[] {
    return Object.values(SMALL_BUSH_SPECIES_CONFIGS);
  }

  static getTreeBaseSpecies(): SmallBushSpeciesConfig[] {
    return Object.values(SMALL_BUSH_SPECIES_CONFIGS).filter(
      s => s.preferredLocation === 'tree_base' || s.preferredLocation === 'shade'
    );
  }
}
