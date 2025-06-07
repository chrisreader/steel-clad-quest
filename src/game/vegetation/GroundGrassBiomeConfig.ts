
import { BiomeType } from './GrassBiomeManager';

export interface GroundGrassConfiguration {
  densityMultiplier: number; // How much denser than tall grass
  heightReduction: number; // Height factor (0.25 = 25% of tall grass height)
  speciesDistribution: {
    meadow: number;
    prairie: number;
    clumping: number;
    fine: number;
  };
  windReduction: number; // How much to reduce wind animation
}

export class GroundGrassBiomeConfig {
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 4.0,
      heightReduction: 0.25,
      speciesDistribution: {
        meadow: 0.3,
        prairie: 0.15, // Reduced prairie for ground coverage
        clumping: 0.45, // Increased clumping for fuller coverage
        fine: 0.1
      },
      windReduction: 0.3 // Much less wind animation
    },
    meadow: {
      densityMultiplier: 5.0, // Even denser in meadow
      heightReduction: 0.28,
      speciesDistribution: {
        meadow: 0.6,
        prairie: 0.05,
        clumping: 0.05,
        fine: 0.3
      },
      windReduction: 0.2
    },
    prairie: {
      densityMultiplier: 3.5, // Slightly less dense in prairie
      heightReduction: 0.3,
      speciesDistribution: {
        meadow: 0.1,
        prairie: 0.7,
        clumping: 0.05,
        fine: 0.15
      },
      windReduction: 0.4 // More wind exposure even for ground grass
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
