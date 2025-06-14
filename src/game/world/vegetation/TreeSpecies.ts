
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';

export enum TreeSpeciesType {
  OAK = 'oak',
  PINE = 'pine', 
  BIRCH = 'birch',
  WILLOW = 'willow',
  DEAD = 'dead'
}

export interface TreeSpeciesConfig {
  name: string;
  trunkColor: number;
  foliageColor: number;
  height: { min: number; max: number };
  trunkRadius: { min: number; max: number };
  branchCount: number;
  foliageType: 'spherical' | 'conical' | 'drooping' | 'none';
  textureType: 'bark' | 'birch' | 'weathered';
}

export class TreeSpeciesManager {
  private static readonly SPECIES_CONFIGS: Record<TreeSpeciesType, TreeSpeciesConfig> = {
    [TreeSpeciesType.OAK]: {
      name: 'Oak Tree',
      trunkColor: 0x8B4513,
      foliageColor: 0x228B22,
      height: { min: 12, max: 18 },
      trunkRadius: { min: 0.8, max: 1.2 },
      branchCount: 3,
      foliageType: 'spherical',
      textureType: 'bark'
    },
    [TreeSpeciesType.PINE]: {
      name: 'Pine Tree',
      trunkColor: 0x654321,
      foliageColor: 0x0F5132,
      height: { min: 15, max: 25 },
      trunkRadius: { min: 0.4, max: 0.7 },
      branchCount: 0,
      foliageType: 'conical',
      textureType: 'bark'
    },
    [TreeSpeciesType.BIRCH]: {
      name: 'Birch Tree',
      trunkColor: 0xF5F5DC,
      foliageColor: 0x90EE90,
      height: { min: 10, max: 16 },
      trunkRadius: { min: 0.3, max: 0.5 },
      branchCount: 2,
      foliageType: 'spherical',
      textureType: 'birch'
    },
    [TreeSpeciesType.WILLOW]: {
      name: 'Willow Tree',
      trunkColor: 0x8B7355,
      foliageColor: 0x9ACD32,
      height: { min: 8, max: 14 },
      trunkRadius: { min: 0.6, max: 1.0 },
      branchCount: 4,
      foliageType: 'drooping',
      textureType: 'bark'
    },
    [TreeSpeciesType.DEAD]: {
      name: 'Dead Tree',
      trunkColor: 0x2F1B14,
      foliageColor: 0x000000,
      height: { min: 6, max: 12 },
      trunkRadius: { min: 0.4, max: 0.8 },
      branchCount: 2,
      foliageType: 'none',
      textureType: 'weathered'
    }
  };

  public static getSpeciesConfig(species: TreeSpeciesType): TreeSpeciesConfig {
    return this.SPECIES_CONFIGS[species];
  }

  public static getAllSpecies(): TreeSpeciesType[] {
    return Object.values(TreeSpeciesType);
  }

  public static getRandomHeight(species: TreeSpeciesType): number {
    const config = this.getSpeciesConfig(species);
    return config.height.min + Math.random() * (config.height.max - config.height.min);
  }

  public static getRandomTrunkRadius(species: TreeSpeciesType): number {
    const config = this.getSpeciesConfig(species);
    return config.trunkRadius.min + Math.random() * (config.trunkRadius.max - config.trunkRadius.min);
  }
}
