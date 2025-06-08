import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';

export class BiomeManager {
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.0,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x6db070),
      speciesDistribution: { meadow: 0.4, prairie: 0.2, clumping: 0.3, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Lush Meadow',
      densityMultiplier: 1.3,
      heightMultiplier: 1.1,
      colorModifier: new THREE.Color(0x7db965),
      speciesDistribution: { meadow: 0.7, prairie: 0.1, clumping: 0.1, fine: 0.1 },
      windExposure: 0.8
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 0.8,
      heightMultiplier: 1.2,
      colorModifier: new THREE.Color(0x8dc46a),
      speciesDistribution: { meadow: 0.2, prairie: 0.6, clumping: 0.1, fine: 0.1 },
      windExposure: 1.3
    }
  };

  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 6.0,
      heightReduction: 0.68,
      speciesDistribution: { meadow: 0.3, prairie: 0.15, clumping: 0.45, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 7.0,
      heightReduction: 0.85,
      speciesDistribution: { meadow: 0.6, prairie: 0.05, clumping: 0.05, fine: 0.3 },
      windReduction: 0.2
    },
    prairie: {
      densityMultiplier: 6.0,
      heightReduction: 0.68,
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.05, fine: 0.15 },
      windReduction: 0.25
    }
  };

  public static getBiomeAtPosition(position: THREE.Vector3): BiomeInfo {
    // Simplified biome detection using position
    const distanceFromCenter = position.length();
    const noiseX = Math.sin(position.x * 0.001) * Math.cos(position.z * 0.001);
    const noiseZ = Math.sin(position.z * 0.001) * Math.cos(position.x * 0.001);
    
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    
    if (noiseX > 0.3) {
      biomeType = 'meadow';
      strength = Math.min(1.0, (noiseX - 0.3) / 0.4);
    } else if (noiseZ > 0.2) {
      biomeType = 'prairie';
      strength = Math.min(1.0, (noiseZ - 0.2) / 0.5);
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
    
    // Enhanced base colors - much brighter
    const baseColors = {
      meadow: new THREE.Color(0x7aad62),
      prairie: new THREE.Color(0x6a9c55),
      clumping: new THREE.Color(0x9bc471),
      fine: new THREE.Color(0x8bbf67)
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    const biomeColor = baseColor.clone().multiply(biomeConfig.colorModifier);
    
    // Apply seasonal variation with enhanced brightness
    const seasonalMultipliers = {
      spring: new THREE.Color(1.2, 1.3, 1.0),
      summer: new THREE.Color(1.1, 1.1, 1.0),
      autumn: new THREE.Color(1.3, 1.1, 0.8),
      winter: new THREE.Color(0.8, 0.9, 1.0)
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
