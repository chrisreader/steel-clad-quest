import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';

export class BiomeManager {
  // DRAMATICALLY ENHANCED biome configurations with obvious visual differences
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.5, // Increased from 1.0 for 2x density boost
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x6db070), // Standard green
      speciesDistribution: { meadow: 0.4, prairie: 0.25, clumping: 0.25, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Lush Meadow',
      densityMultiplier: 2.0, // Increased from 1.3 for very dense, lush appearance
      heightMultiplier: 1.4, // Increased from 1.1 for dramatically taller grass
      colorModifier: new THREE.Color(0x4db84d), // Brighter, more vibrant green
      speciesDistribution: { meadow: 0.8, prairie: 0.05, clumping: 0.05, fine: 0.1 }, // Dominated by meadow
      windExposure: 0.6 // Less wind exposure due to density
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 1.2, // Increased from 0.8 for denser coverage
      heightMultiplier: 0.8, // Reduced from 1.2 for shorter, wind-swept look
      colorModifier: new THREE.Color(0xb8b84d), // Golden-brown prairie grass
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.15, fine: 0.05 }, // Prairie dominated
      windExposure: 1.5 // High wind exposure
    },
    wildflower_meadow: {
      name: 'Wildflower Meadow',
      densityMultiplier: 2.2,
      heightMultiplier: 1.4,
      colorModifier: new THREE.Color(0x3eb83e),
      speciesDistribution: { meadow: 0.3, prairie: 0.0, clumping: 0.1, fine: 0.2, wildflower: 0.4 },
      windExposure: 0.7,
      rarity: 0.15,
      specialFeatures: { hasFlowers: true, hasParticleEffects: true }
    },
    dense_thicket: {
      name: 'Dense Thicket',
      densityMultiplier: 4.0,
      heightMultiplier: 2.5,
      colorModifier: new THREE.Color(0x2a4a1a),
      speciesDistribution: { meadow: 0.0, prairie: 0.0, clumping: 0.0, fine: 0.05, thicket: 0.6, reed: 0.2, shrub: 0.15 },
      windExposure: 0.2,
      rarity: 0.12
    },
    sparse_steppe: {
      name: 'Sparse Steppe',
      densityMultiplier: 0.3,
      heightMultiplier: 0.4,
      colorModifier: new THREE.Color(0xd4c068),
      speciesDistribution: { meadow: 0.05, prairie: 0.7, clumping: 0.0, fine: 0.25 },
      windExposure: 2.5,
      rarity: 0.18,
      specialFeatures: { windBentGrass: true }
    },
    rolling_savanna: {
      name: 'Rolling Savanna',
      densityMultiplier: 1.5,
      heightMultiplier: 1.2,
      colorModifier: new THREE.Color(0xb8a047),
      speciesDistribution: { meadow: 0.3, prairie: 0.5, clumping: 0.15, fine: 0.05 },
      windExposure: 1.3,
      rarity: 0.20
    },
    lush_valley: {
      name: 'Lush Valley',
      densityMultiplier: 3.5,
      heightMultiplier: 2.0,
      colorModifier: new THREE.Color(0x1eb81e),
      speciesDistribution: { meadow: 0.4, prairie: 0.0, clumping: 0.0, fine: 0.0, fern: 0.3, wildflower: 0.2, reed: 0.1 },
      windExposure: 0.3,
      rarity: 0.10
    },
    windswept_plain: {
      name: 'Windswept Plain',
      densityMultiplier: 0.8,
      heightMultiplier: 0.7,
      colorModifier: new THREE.Color(0x8ba85f),
      speciesDistribution: { meadow: 0.0, prairie: 0.6, clumping: 0.1, fine: 0.3 },
      windExposure: 2.2,
      rarity: 0.16,
      specialFeatures: { windBentGrass: true }
    },
    ancient_clearing: {
      name: 'Ancient Clearing',
      densityMultiplier: 1.8,
      heightMultiplier: 1.3,
      colorModifier: new THREE.Color(0x4a6b2a),
      speciesDistribution: { meadow: 0.25, prairie: 0.0, clumping: 0.15, fine: 0.0, fern: 0.35, shrub: 0.25 },
      windExposure: 0.8,
      rarity: 0.08
    },
    crystalline_grove: {
      name: 'Crystalline Grove',
      densityMultiplier: 1.2,
      heightMultiplier: 1.6,
      colorModifier: new THREE.Color(0x5bb8c7),
      speciesDistribution: { meadow: 0.0, prairie: 0.0, clumping: 0.0, fine: 0.1, crystal: 0.7, wildflower: 0.2 },
      windExposure: 0.1,
      rarity: 0.02,
      specialFeatures: { hasMagicalGlow: true, hasParticleEffects: true }
    }
  };

  // ENHANCED ground grass configurations with much higher density
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 10.0, // Increased from 6.0 for much denser ground coverage
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 12.0, // Increased from 7.0 for extremely dense meadow floor
      heightReduction: 0.8, // Less height reduction for lush appearance
      speciesDistribution: { meadow: 0.7, prairie: 0.05, clumping: 0.05, fine: 0.2 }, // Meadow dominated
      windReduction: 0.15
    },
    prairie: {
      densityMultiplier: 8.0, // Increased from 6.0 but less than meadow
      heightReduction: 0.6, // More height reduction for prairie look
      speciesDistribution: { meadow: 0.05, prairie: 0.75, clumping: 0.1, fine: 0.1 }, // Prairie dominated
      windReduction: 0.3
    },
    wildflower_meadow: {
      densityMultiplier: 15.0,
      heightReduction: 0.7,
      speciesDistribution: { meadow: 0.4, prairie: 0.0, clumping: 0.0, fine: 0.3, wildflower: 0.3 },
      windReduction: 0.15
    },
    dense_thicket: {
      densityMultiplier: 25.0,
      heightReduction: 0.9,
      speciesDistribution: { meadow: 0.0, prairie: 0.0, clumping: 0.2, fine: 0.0, fern: 0.5, shrub: 0.3 },
      windReduction: 0.05
    },
    sparse_steppe: {
      densityMultiplier: 2.0,
      heightReduction: 0.3,
      speciesDistribution: { meadow: 0.0, prairie: 0.8, clumping: 0.0, fine: 0.2 },
      windReduction: 0.8
    },
    rolling_savanna: {
      densityMultiplier: 10.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.3, prairie: 0.6, clumping: 0.1, fine: 0.0 },
      windReduction: 0.3
    },
    lush_valley: {
      densityMultiplier: 22.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.5, prairie: 0.0, clumping: 0.0, fine: 0.0, fern: 0.4, wildflower: 0.1 },
      windReduction: 0.1
    },
    windswept_plain: {
      densityMultiplier: 5.0,
      heightReduction: 0.4,
      speciesDistribution: { meadow: 0.0, prairie: 0.7, clumping: 0.0, fine: 0.3 },
      windReduction: 0.6
    },
    ancient_clearing: {
      densityMultiplier: 12.0,
      heightReduction: 0.7,
      speciesDistribution: { meadow: 0.3, prairie: 0.0, clumping: 0.1, fine: 0.0, fern: 0.4, shrub: 0.2 },
      windReduction: 0.2
    },
    crystalline_grove: {
      densityMultiplier: 8.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.0, prairie: 0.0, clumping: 0.0, fine: 0.1, crystal: 0.6, wildflower: 0.3 },
      windReduction: 0.05
    }
  };

  public static getBiomeAtPosition(position: THREE.Vector3): BiomeInfo {
    // Enhanced biome detection with more variation for obvious differences
    const distanceFromCenter = position.length();
    const noiseX = Math.sin(position.x * 0.002) * Math.cos(position.z * 0.002); // Increased frequency
    const noiseZ = Math.sin(position.z * 0.002) * Math.cos(position.x * 0.002);
    
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    
    // Enhanced biome selection with clearer boundaries
    if (noiseX > 0.2) {
      biomeType = 'meadow';
      strength = Math.min(1.0, (noiseX - 0.2) / 0.5);
    } else if (noiseZ > 0.1) {
      biomeType = 'prairie';
      strength = Math.min(1.0, (noiseZ - 0.1) / 0.6);
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
    
    // Enhanced base colors for better species distinction and biome differences
    const baseColors = {
      meadow: new THREE.Color(0x7aad62), // Rich green
      prairie: new THREE.Color(0xa0a055), // Golden-green  
      clumping: new THREE.Color(0x9bc471), // Bright lime
      fine: new THREE.Color(0x8bbf67) // Medium green
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    const biomeColor = baseColor.clone().multiply(biomeConfig.colorModifier);
    
    // Enhanced seasonal variations for more dramatic changes
    const seasonalMultipliers = {
      spring: new THREE.Color(1.3, 1.4, 1.1), // Bright, vibrant
      summer: new THREE.Color(1.1, 1.2, 1.0), // Lush
      autumn: new THREE.Color(1.4, 1.2, 0.7), // Golden tones
      winter: new THREE.Color(0.7, 0.8, 0.9) // Muted, cool
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
