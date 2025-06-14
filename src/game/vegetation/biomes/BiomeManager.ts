import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';

export class BiomeManager {
  // ENHANCED biome configurations with all 8 realistic biomes
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.5,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x6db070),
      speciesDistribution: { meadow: 0.4, prairie: 0.25, clumping: 0.25, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Lush Meadow',
      densityMultiplier: 2.0,
      heightMultiplier: 1.4,
      colorModifier: new THREE.Color(0x4db84d),
      speciesDistribution: { meadow: 0.8, prairie: 0.05, clumping: 0.05, fine: 0.1 },
      windExposure: 0.6
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 1.2,
      heightMultiplier: 0.8,
      colorModifier: new THREE.Color(0xb8b84d),
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.15, fine: 0.05 },
      windExposure: 1.5
    },
    wildflower_meadow: {
      name: 'Wildflower Meadow',
      densityMultiplier: 1.5,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x5eb85e),
      speciesDistribution: { meadow: 0.35, prairie: 0.05, clumping: 0.2, fine: 0.0, wildflower: 0.4 },
      windExposure: 0.8
    },
    dense_thicket: {
      name: 'Dense Thicket',
      densityMultiplier: 4.0,
      heightMultiplier: 2.5,
      colorModifier: new THREE.Color(0x2d5a2d),
      speciesDistribution: { meadow: 0.1, prairie: 0.0, clumping: 0.25, fine: 0.05, thicket: 0.6 },
      windExposure: 0.4
    },
    sparse_steppe: {
      name: 'Sparse Steppe',
      densityMultiplier: 0.3,
      heightMultiplier: 0.6,
      colorModifier: new THREE.Color(0xd4c55a),
      speciesDistribution: { meadow: 0.02, prairie: 0.2, clumping: 0.08, fine: 0.0, golden: 0.7 },
      windExposure: 2.0
    },
    rolling_savanna: {
      name: 'Rolling Savanna',
      densityMultiplier: 1.2,
      heightMultiplier: 0.9,
      colorModifier: new THREE.Color(0xc4a855),
      speciesDistribution: { meadow: 0.15, prairie: 0.5, clumping: 0.05, fine: 0.0, golden: 0.3 },
      windExposure: 1.4
    },
    lush_valley: {
      name: 'Lush Valley',
      densityMultiplier: 3.0,
      heightMultiplier: 1.6,
      colorModifier: new THREE.Color(0x3eb83e),
      speciesDistribution: { meadow: 0.6, prairie: 0.05, clumping: 0.25, fine: 0.0, wildflower: 0.1 },
      windExposure: 0.6
    }
  };

  // Enhanced ground grass configurations for all biomes
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 10.0,
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 12.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.7, prairie: 0.05, clumping: 0.05, fine: 0.2 },
      windReduction: 0.15
    },
    prairie: {
      densityMultiplier: 8.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.05, prairie: 0.75, clumping: 0.1, fine: 0.1 },
      windReduction: 0.3
    },
    wildflower_meadow: {
      densityMultiplier: 11.0,
      heightReduction: 0.7,
      speciesDistribution: { meadow: 0.3, prairie: 0.1, clumping: 0.2, fine: 0.1, wildflower: 0.3 },
      windReduction: 0.2
    },
    dense_thicket: {
      densityMultiplier: 20.0,
      heightReduction: 0.9,
      speciesDistribution: { meadow: 0.15, prairie: 0.0, clumping: 0.3, fine: 0.15, thicket: 0.4 },
      windReduction: 0.1
    },
    sparse_steppe: {
      densityMultiplier: 2.0,
      heightReduction: 0.5,
      speciesDistribution: { meadow: 0.05, prairie: 0.2, clumping: 0.05, fine: 0.0, golden: 0.7 },
      windReduction: 0.5
    },
    rolling_savanna: {
      densityMultiplier: 7.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.15, prairie: 0.4, clumping: 0.1, fine: 0.05, golden: 0.3 },
      windReduction: 0.3
    },
    lush_valley: {
      densityMultiplier: 18.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.5, prairie: 0.1, clumping: 0.2, fine: 0.1, wildflower: 0.1 },
      windReduction: 0.15
    }
  };

  public static getBiomeAtPosition(position: THREE.Vector3): BiomeInfo {
    // Enhanced biome detection with more variation for obvious differences
    const distanceFromCenter = position.length();
    const noiseX = Math.sin(position.x * 0.002) * Math.cos(position.z * 0.002);
    const noiseZ = Math.sin(position.z * 0.002) * Math.cos(position.x * 0.002);
    
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    
    // Enhanced biome selection with all 8 types
    if (noiseX > 0.3) {
      biomeType = 'lush_valley';
      strength = Math.min(1.0, (noiseX - 0.3) / 0.4);
    } else if (noiseX > 0.1) {
      biomeType = 'wildflower_meadow';
      strength = Math.min(1.0, (noiseX - 0.1) / 0.4);
    } else if (noiseZ > 0.2) {
      biomeType = 'dense_thicket';
      strength = Math.min(1.0, (noiseZ - 0.2) / 0.5);
    } else if (noiseZ > 0.0) {
      biomeType = 'rolling_savanna';
      strength = Math.min(1.0, noiseZ / 0.4);
    } else if (noiseZ < -0.2) {
      biomeType = 'sparse_steppe';
      strength = Math.min(1.0, Math.abs(noiseZ + 0.2) / 0.5);
    } else if (noiseX < -0.1) {
      biomeType = 'prairie';
      strength = Math.min(1.0, Math.abs(noiseX + 0.1) / 0.4);
    } else if (Math.abs(noiseX) < 0.05) {
      biomeType = 'meadow';
      strength = 0.8;
    }
    
    return {
      type: biomeType,
      strength: strength,
      transitionZone: strength < 0.8
    };
  }

  public static getBiomeConfiguration(biomeType: BiomeType): BiomeConfiguration {
    return this.BIOME_CONFIGS[biomeType];
  }

  public static getGroundConfiguration(biomeType: BiomeType): GroundGrassConfiguration {
    return this.GROUND_CONFIGS[biomeType];
  }

  public static getBiomeSpeciesColor(
    species: string, 
    biomeInfo: BiomeInfo, 
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer'
  ): THREE.Color {
    const biomeConfig = this.getBiomeConfiguration(biomeInfo.type);
    
    // Enhanced base colors for all species including new ones
    const baseColors = {
      meadow: new THREE.Color(0x7aad62),
      prairie: new THREE.Color(0xa0a055),
      clumping: new THREE.Color(0x9bc471),
      fine: new THREE.Color(0x8bbf67),
      wildflower: new THREE.Color(0x8faf72),
      thicket: new THREE.Color(0x5a7a45),
      golden: new THREE.Color(0xb8a555)
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    const biomeColor = baseColor.clone().multiply(biomeConfig.colorModifier);
    
    // Enhanced seasonal variations for more dramatic changes
    const seasonalMultipliers = {
      spring: new THREE.Color(1.3, 1.4, 1.1),
      summer: new THREE.Color(1.1, 1.2, 1.0),
      autumn: new THREE.Color(1.4, 1.2, 0.7),
      winter: new THREE.Color(0.7, 0.8, 0.9)
    };
    
    return biomeColor.multiply(seasonalMultipliers[season]);
  }

  public static adjustSpeciesForBiome(baseSpecies: string[], biomeInfo: BiomeInfo): string[] {
    const config = this.getBiomeConfiguration(biomeInfo.type);
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

  public static adjustGroundSpeciesForBiome(baseSpecies: string[], biomeType: BiomeType): string[] {
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
