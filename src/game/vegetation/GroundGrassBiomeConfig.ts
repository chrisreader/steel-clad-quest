
import { BiomeType } from './GrassBiomeManager';

export interface GroundGrassConfiguration {
  densityMultiplier: number; // 6-7x denser than tall grass
  heightReduction: number; // Height factor (0.85 = 15% shorter than tall grass)
  speciesDistribution: {
    meadow: number;
    prairie: number;
    clumping: number;
    fine: number;
  };
  windReduction: number; // How much to reduce wind animation (0.2 = 80% of regular wind)
}

export class GroundGrassBiomeConfig {
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 6.0, // Increased from 4.0 for proper carpet coverage
      heightReduction: 0.85, // 15% shorter instead of 25%
      speciesDistribution: {
        meadow: 0.3,
        prairie: 0.15,
        clumping: 0.45, // Good for ground coverage
        fine: 0.1
      },
      windReduction: 0.2 // 80% of regular wind strength
    },
    meadow: {
      densityMultiplier: 7.0, // Densest coverage in meadow
      heightReduction: 0.85,
      speciesDistribution: {
        meadow: 0.6,
        prairie: 0.05,
        clumping: 0.05,
        fine: 0.3
      },
      windReduction: 0.2
    },
    prairie: {
      densityMultiplier: 6.0, // Dense but allowing for wind exposure
      heightReduction: 0.85,
      speciesDistribution: {
        meadow: 0.1,
        prairie: 0.7,
        clumping: 0.05,
        fine: 0.15
      },
      windReduction: 0.25 // Slightly more wind exposure in prairie
    }
  };

  public static getGroundConfiguration(biomeType: BiomeType): GroundGrassConfiguration {
    return this.GROUND_CONFIGS[biomeType];
  }

  public static adjustGroundSpeciesForBiome(
    baseSpecies: string[], 
    biomeType: BiomeType
  ): string[] {
    const config = this.getGroundConfiguration(biomeType);
    const adjustedSpecies: string[] = [];

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
}
