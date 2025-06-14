import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';

export class BiomeManager {
  // DRAMATICALLY ENHANCED biome configurations with obvious visual differences for all 11 biomes
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
      densityMultiplier: 2.5,
      heightMultiplier: 1.6,
      colorModifier: new THREE.Color(0x2d8f2d),
      speciesDistribution: { meadow: 0.9, prairie: 0.02, clumping: 0.03, fine: 0.05 },
      windExposure: 0.4
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 1.0,
      heightMultiplier: 0.6,
      colorModifier: new THREE.Color(0xd4af37),
      speciesDistribution: { meadow: 0.05, prairie: 0.85, clumping: 0.05, fine: 0.05 },
      windExposure: 2.0
    },
    wildflower: {
      name: 'Wildflower Meadow',
      densityMultiplier: 2.0,
      heightMultiplier: 1.2,
      colorModifier: new THREE.Color(0x8fbc8f),
      speciesDistribution: { meadow: 0.6, prairie: 0.1, clumping: 0.2, fine: 0.1 },
      windExposure: 0.8
    },
    thicket: {
      name: 'Dense Thicket',
      densityMultiplier: 4.0,
      heightMultiplier: 2.2,
      colorModifier: new THREE.Color(0x1a4a1a),
      speciesDistribution: { meadow: 0.3, prairie: 0.05, clumping: 0.6, fine: 0.05 },
      windExposure: 0.2
    },
    steppe: {
      name: 'Sparse Steppe',
      densityMultiplier: 0.3,
      heightMultiplier: 0.4,
      colorModifier: new THREE.Color(0xb8860b),
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.05, fine: 0.1 },
      windExposure: 3.0
    },
    savanna: {
      name: 'Rolling Savanna',
      densityMultiplier: 1.2,
      heightMultiplier: 0.8,
      colorModifier: new THREE.Color(0xcdaa3d),
      speciesDistribution: { meadow: 0.2, prairie: 0.6, clumping: 0.15, fine: 0.05 },
      windExposure: 1.8
    },
    valley: {
      name: 'Lush Valley',
      densityMultiplier: 3.0,
      heightMultiplier: 1.4,
      colorModifier: new THREE.Color(0x32cd32),
      speciesDistribution: { meadow: 0.7, prairie: 0.1, clumping: 0.15, fine: 0.05 },
      windExposure: 0.6
    },
    windswept: {
      name: 'Windswept Plain',
      densityMultiplier: 0.8,
      heightMultiplier: 0.5,
      colorModifier: new THREE.Color(0x9acd32),
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.05, fine: 0.15 },
      windExposure: 2.5
    },
    clearing: {
      name: 'Ancient Clearing',
      densityMultiplier: 1.6,
      heightMultiplier: 1.1,
      colorModifier: new THREE.Color(0x556b2f),
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.3, fine: 0.2 },
      windExposure: 1.2
    },
    crystalline: {
      name: 'Crystalline Grove',
      densityMultiplier: 1.8,
      heightMultiplier: 1.3,
      colorModifier: new THREE.Color(0x4682b4),
      speciesDistribution: { meadow: 0.5, prairie: 0.1, clumping: 0.2, fine: 0.2 },
      windExposure: 0.7
    }
  };

  // ENHANCED ground grass configurations with much higher density for all 11 biomes
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 10.0,
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 15.0,
      heightReduction: 0.5,
      speciesDistribution: { meadow: 0.8, prairie: 0.05, clumping: 0.05, fine: 0.1 },
      windReduction: 0.1
    },
    prairie: {
      densityMultiplier: 8.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.1, fine: 0.05 },
      windReduction: 0.4
    },
    wildflower: {
      densityMultiplier: 12.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.6, prairie: 0.1, clumping: 0.2, fine: 0.1 },
      windReduction: 0.15
    },
    thicket: {
      densityMultiplier: 20.0,
      heightReduction: 0.4,
      speciesDistribution: { meadow: 0.3, prairie: 0.05, clumping: 0.6, fine: 0.05 },
      windReduction: 0.05
    },
    steppe: {
      densityMultiplier: 4.0,
      heightReduction: 0.9,
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.05, fine: 0.1 },
      windReduction: 0.6
    },
    savanna: {
      densityMultiplier: 9.0,
      heightReduction: 0.7,
      speciesDistribution: { meadow: 0.2, prairie: 0.6, clumping: 0.15, fine: 0.05 },
      windReduction: 0.3
    },
    valley: {
      densityMultiplier: 16.0,
      heightReduction: 0.45,
      speciesDistribution: { meadow: 0.7, prairie: 0.1, clumping: 0.15, fine: 0.05 },
      windReduction: 0.12
    },
    windswept: {
      densityMultiplier: 6.0,
      heightReduction: 0.85,
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.05, fine: 0.15 },
      windReduction: 0.5
    },
    clearing: {
      densityMultiplier: 11.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.3, fine: 0.2 },
      windReduction: 0.2
    },
    crystalline: {
      densityMultiplier: 13.0,
      heightReduction: 0.55,
      speciesDistribution: { meadow: 0.5, prairie: 0.1, clumping: 0.2, fine: 0.2 },
      windReduction: 0.18
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
