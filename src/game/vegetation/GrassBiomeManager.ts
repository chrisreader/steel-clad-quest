
import * as THREE from 'three';
import { EnvironmentalFactors } from './EnvironmentalGrassDistribution';

export type BiomeType = 'normal' | 'meadow' | 'prairie';

export interface BiomeConfiguration {
  name: string;
  speciesDistribution: {
    meadow: number;
    prairie: number;
    clumping: number;
    fine: number;
  };
  densityMultiplier: number;
  heightMultiplier: number;
  windExposureMultiplier: number;
  preferredMoisture: number;
  color: THREE.Color; // For debug visualization
}

export interface BiomeInfo {
  type: BiomeType;
  strength: number; // 0-1, how pure the biome is
  transitionZone: boolean;
}

export class GrassBiomeManager {
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Temperate Grassland',
      speciesDistribution: {
        meadow: 0.3,
        prairie: 0.2, // Reduced from previous
        clumping: 0.35, // Increased density
        fine: 0.15
      },
      densityMultiplier: 1.0,
      heightMultiplier: 0.68, // Reduced from 0.85 to 0.68 (20% reduction)
      windExposureMultiplier: 1.0,
      preferredMoisture: 0.5,
      color: new THREE.Color(0x90EE90) // Light green
    },
    meadow: {
      name: 'Lush Meadow',
      speciesDistribution: {
        meadow: 0.6,
        prairie: 0.05,
        clumping: 0.05,
        fine: 0.3
      },
      densityMultiplier: 1.5,
      heightMultiplier: 1.1, // Keep meadow unchanged
      windExposureMultiplier: 0.7,
      preferredMoisture: 0.8,
      color: new THREE.Color(0x32CD32) // Lime green
    },
    prairie: {
      name: 'Open Prairie',
      speciesDistribution: {
        meadow: 0.1,
        prairie: 0.7,
        clumping: 0.05,
        fine: 0.15
      },
      densityMultiplier: 0.8,
      heightMultiplier: 1.04, // Reduced from 1.3 to 1.04 (20% reduction)
      windExposureMultiplier: 1.4,
      preferredMoisture: 0.4,
      color: new THREE.Color(0xFFD700) // Golden
    }
  };

  private static readonly NORMAL_BIOME_RADIUS = 100; // Spawn area radius
  private static noiseScale = 0.015; // Controls biome patch size

  public static getBiomeAtPosition(position: THREE.Vector3): BiomeInfo {
    const distanceFromSpawn = position.length();
    
    // Normal biome around spawn
    if (distanceFromSpawn < this.NORMAL_BIOME_RADIUS) {
      return {
        type: 'normal',
        strength: Math.max(0.7, 1.0 - (distanceFromSpawn / this.NORMAL_BIOME_RADIUS) * 0.3),
        transitionZone: distanceFromSpawn > this.NORMAL_BIOME_RADIUS * 0.8
      };
    }

    // Procedural biome generation using noise
    const noiseValue = this.generateBiomeNoise(position.x, position.z);
    const secondaryNoise = this.generateBiomeNoise(position.x * 1.7, position.z * 1.3) * 0.3;
    const combinedNoise = noiseValue + secondaryNoise;

    // Determine biome based on noise
    let biomeType: BiomeType;
    let strength: number;

    if (combinedNoise > 0.3) {
      biomeType = 'meadow';
      strength = Math.min(1.0, (combinedNoise - 0.3) / 0.4);
    } else if (combinedNoise < -0.2) {
      biomeType = 'prairie';
      strength = Math.min(1.0, Math.abs(combinedNoise + 0.2) / 0.3);
    } else {
      biomeType = 'normal';
      strength = 1.0 - Math.abs(combinedNoise) / 0.3;
    }

    return {
      type: biomeType,
      strength: Math.max(0.3, strength),
      transitionZone: strength < 0.7
    };
  }

  private static generateBiomeNoise(x: number, z: number): number {
    // Simple noise function for biome generation
    const frequency = this.noiseScale;
    return Math.sin(x * frequency) * Math.cos(z * frequency) + 
           Math.sin(x * frequency * 2.1) * Math.cos(z * frequency * 1.7) * 0.5 +
           Math.sin(x * frequency * 4.3) * Math.cos(z * frequency * 3.9) * 0.25;
  }

  public static getBiomeConfiguration(biomeType: BiomeType): BiomeConfiguration {
    return this.BIOME_CONFIGS[biomeType];
  }

  public static adjustSpeciesForBiome(
    baseSpecies: string[], 
    biomeInfo: BiomeInfo
  ): string[] {
    const config = this.getBiomeConfiguration(biomeInfo.type);
    const adjustedSpecies: string[] = [];

    // Apply biome species distribution
    for (let i = 0; i < baseSpecies.length; i++) {
      const random = Math.random();
      let cumulativeProbability = 0;

      for (const [species, probability] of Object.entries(config.speciesDistribution)) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
          adjustedSpecies.push(species);
          break;
        }
      }
    }

    return adjustedSpecies;
  }

  public static adjustEnvironmentalFactors(
    baseFactors: EnvironmentalFactors,
    biomeInfo: BiomeInfo
  ): EnvironmentalFactors {
    const config = this.getBiomeConfiguration(biomeInfo.type);
    
    return {
      ...baseFactors,
      moisture: this.lerpTowardsTarget(
        baseFactors.moisture, 
        config.preferredMoisture, 
        biomeInfo.strength * 0.4
      )
    };
  }

  private static lerpTowardsTarget(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  public static getAllBiomeTypes(): BiomeType[] {
    return Object.keys(this.BIOME_CONFIGS) as BiomeType[];
  }
}
