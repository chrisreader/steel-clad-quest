import * as THREE from 'three';
import { TreeSpeciesType } from './TreeSpecies';

export enum ForestBiomeType {
  BIRCH_FOREST = 'birch_forest',
  PINE_FOREST = 'pine_forest', 
  WILLOW_GROVE = 'willow_grove',
  OAK_FOREST = 'oak_forest',
  MIXED_FOREST = 'mixed_forest'
}

export interface ForestBiomeConfig {
  name: string;
  treeDistribution: Record<TreeSpeciesType, number>;
  density: number;
  preferredElevation: { min: number; max: number };
  clusterDensity?: number; // New property for cluster variation
  sparseDensity?: number; // New property for sparse areas
}

export class ForestBiomeManager {
  private static readonly FOREST_CONFIGS: Record<ForestBiomeType, ForestBiomeConfig> = {
    [ForestBiomeType.BIRCH_FOREST]: {
      name: 'Birch Forest',
      treeDistribution: {
        [TreeSpeciesType.BIRCH]: 0.70,
        [TreeSpeciesType.DEAD]: 0.20,
        [TreeSpeciesType.OAK]: 0.10,
        [TreeSpeciesType.PINE]: 0.0,
        [TreeSpeciesType.WILLOW]: 0.0
      },
      density: 0.15,
      preferredElevation: { min: 0, max: 100 }
    },
    [ForestBiomeType.PINE_FOREST]: {
      name: 'Pine Forest',
      treeDistribution: {
        [TreeSpeciesType.PINE]: 0.80,
        [TreeSpeciesType.DEAD]: 0.15,
        [TreeSpeciesType.BIRCH]: 0.05,
        [TreeSpeciesType.OAK]: 0.0,
        [TreeSpeciesType.WILLOW]: 0.0
      },
      density: 0.12,
      preferredElevation: { min: 20, max: 200 },
      clusterDensity: 0.25, // Dense clusters
      sparseDensity: 0.04   // Sparse clearings
    },
    [ForestBiomeType.WILLOW_GROVE]: {
      name: 'Willow Grove',
      treeDistribution: {
        [TreeSpeciesType.WILLOW]: 0.60,
        [TreeSpeciesType.BIRCH]: 0.25,
        [TreeSpeciesType.OAK]: 0.15,
        [TreeSpeciesType.PINE]: 0.0,
        [TreeSpeciesType.DEAD]: 0.0
      },
      density: 0.10,
      preferredElevation: { min: -10, max: 50 }
    },
    [ForestBiomeType.OAK_FOREST]: {
      name: 'Oak Forest',
      treeDistribution: {
        [TreeSpeciesType.OAK]: 0.65,
        [TreeSpeciesType.BIRCH]: 0.25,
        [TreeSpeciesType.DEAD]: 0.10,
        [TreeSpeciesType.PINE]: 0.0,
        [TreeSpeciesType.WILLOW]: 0.0
      },
      density: 0.08,
      preferredElevation: { min: 10, max: 150 }
    },
    [ForestBiomeType.MIXED_FOREST]: {
      name: 'Mixed Forest',
      treeDistribution: {
        [TreeSpeciesType.OAK]: 0.25,
        [TreeSpeciesType.PINE]: 0.25,
        [TreeSpeciesType.BIRCH]: 0.25,
        [TreeSpeciesType.WILLOW]: 0.15,
        [TreeSpeciesType.DEAD]: 0.10
      },
      density: 0.18,
      preferredElevation: { min: 0, max: 120 }
    }
  };

  public static getForestBiomeAtPosition(position: THREE.Vector3): ForestBiomeType | null {
    // Use noise-based forest biome determination
    const noiseX = Math.sin(position.x * 0.001) * Math.cos(position.z * 0.001);
    const noiseZ = Math.sin(position.z * 0.001) * Math.cos(position.x * 0.001);
    const elevation = position.y;

    // Determine forest biome based on noise and elevation
    if (noiseX > 0.3) {
      return elevation > 30 ? ForestBiomeType.PINE_FOREST : ForestBiomeType.BIRCH_FOREST;
    } else if (noiseZ > 0.2) {
      return elevation < 20 ? ForestBiomeType.WILLOW_GROVE : ForestBiomeType.OAK_FOREST;
    } else if (Math.abs(noiseX) < 0.1 && Math.abs(noiseZ) < 0.1) {
      return ForestBiomeType.MIXED_FOREST;
    }

    return null; // No forest biome, use existing grass biomes
  }

  public static getForestConfig(biomeType: ForestBiomeType): ForestBiomeConfig {
    return this.FOREST_CONFIGS[biomeType];
  }

  public static selectTreeSpecies(biomeType: ForestBiomeType): TreeSpeciesType {
    const config = this.getForestConfig(biomeType);
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const [species, probability] of Object.entries(config.treeDistribution)) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return species as TreeSpeciesType;
      }
    }

    // Fallback to oak
    return TreeSpeciesType.OAK;
  }

  public static shouldSpawnTree(biomeType: ForestBiomeType, position: THREE.Vector3): boolean {
    const config = this.getForestConfig(biomeType);
    
    // Check elevation preference
    const elevation = position.y;
    if (elevation < config.preferredElevation.min || elevation > config.preferredElevation.max) {
      return Math.random() < config.density * 0.3; // Reduced chance outside preferred elevation
    }

    // Enhanced density variation for pine forests
    if (biomeType === ForestBiomeType.PINE_FOREST && config.clusterDensity && config.sparseDensity) {
      // Use noise to create clusters and clearings
      const clusterNoise = Math.sin(position.x * 0.003) * Math.cos(position.z * 0.003);
      const detailNoise = Math.sin(position.x * 0.01) * Math.cos(position.z * 0.01);
      
      // Create cluster zones
      if (clusterNoise > 0.2) {
        // Dense cluster area
        return Math.random() < config.clusterDensity * (0.8 + detailNoise * 0.4);
      } else if (clusterNoise < -0.1) {
        // Sparse clearing area
        return Math.random() < config.sparseDensity * (0.5 + detailNoise * 0.5);
      } else {
        // Normal density area
        return Math.random() < config.density * (0.7 + detailNoise * 0.6);
      }
    }

    return Math.random() < config.density;
  }

  public static getAllForestBiomes(): ForestBiomeType[] {
    return Object.values(ForestBiomeType);
  }
}
