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
