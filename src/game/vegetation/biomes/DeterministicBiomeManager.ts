
import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';
import { BiomeSeedManager } from './BiomeSeedManager';

export interface ChunkCoordinate {
  x: number;
  z: number;
}

export interface ChunkBiomeData {
  coordinate: ChunkCoordinate;
  biomeType: BiomeType;
  strength: number;
  seed: number;
  influences: Array<{ biomeType: BiomeType; influence: number; distance: number }>;
}

export class DeterministicBiomeManager {
  private static readonly CHUNK_SIZE = 64;
  private static worldSeed: number = 12345;
  private static chunkBiomeCache: Map<string, ChunkBiomeData> = new Map();

  // DRAMATICALLY ENHANCED biome configurations with obvious visual differences
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
    }
  };

  // ENHANCED ground grass configurations with much higher density
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
    }
  };

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.chunkBiomeCache.clear();
    BiomeSeedManager.setWorldSeed(seed);
  }

  public static worldPositionToChunk(position: THREE.Vector3): ChunkCoordinate {
    return {
      x: Math.floor(position.x / this.CHUNK_SIZE),
      z: Math.floor(position.z / this.CHUNK_SIZE)
    };
  }

  public static chunkToWorldPosition(chunk: ChunkCoordinate): THREE.Vector3 {
    return new THREE.Vector3(
      chunk.x * this.CHUNK_SIZE + this.CHUNK_SIZE / 2,
      0,
      chunk.z * this.CHUNK_SIZE + this.CHUNK_SIZE / 2
    );
  }

  public static getChunkKey(chunk: ChunkCoordinate): string {
    return `${chunk.x}_${chunk.z}`;
  }

  public static getChunkSeed(chunk: ChunkCoordinate): number {
    return this.worldSeed + chunk.x * 73856093 + chunk.z * 19349663;
  }

  public static getBiomeForChunk(chunk: ChunkCoordinate): ChunkBiomeData {
    const chunkKey = this.getChunkKey(chunk);
    
    if (this.chunkBiomeCache.has(chunkKey)) {
      return this.chunkBiomeCache.get(chunkKey)!;
    }

    const centerPos = this.chunkToWorldPosition(chunk);
    const seed = this.getChunkSeed(chunk);
    
    // Use the new seed-based biome system
    const biomeInfluence = BiomeSeedManager.getBiomeInfluenceAtPosition(centerPos);
    
    // If no strong influences, fall back to original noise-based system for variety
    let biomeType = biomeInfluence.dominantBiome;
    let strength = biomeInfluence.strength;
    
    if (strength < 0.3) {
      // Fallback to noise-based generation for areas without strong seed influence
      const noiseX = this.seededNoise(centerPos.x * 0.001, seed);
      const noiseZ = this.seededNoise(centerPos.z * 0.001, seed + 1000);
      
      if (noiseX > 0.3) {
        biomeType = 'meadow';
        strength = Math.min(1.0, (noiseX - 0.3) * 2);
      } else if (noiseZ > 0.2) {
        biomeType = 'prairie';
        strength = Math.min(1.0, (noiseZ - 0.2) * 2.5);
      } else {
        biomeType = 'normal';
        strength = 0.8;
      }
    }

    const biomeData: ChunkBiomeData = {
      coordinate: chunk,
      biomeType,
      strength: Math.max(0.5, strength), // Ensure minimum strength
      seed,
      influences: biomeInfluence.influences
    };

    this.chunkBiomeCache.set(chunkKey, biomeData);
    
    // Debug logging for new biome system
    if (biomeInfluence.influences.length > 0) {
      console.log(`🌍 Realistic biome generated at chunk ${chunkKey}: ${biomeType} (strength: ${strength.toFixed(2)}, influences: ${biomeInfluence.influences.length})`);
    }
    
    return biomeData;
  }

  private static seededNoise(x: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  public static getBiomeConfiguration(biomeType: BiomeType): BiomeConfiguration {
    return this.BIOME_CONFIGS[biomeType];
  }

  public static getGroundConfiguration(biomeType: BiomeType): GroundGrassConfiguration {
    return this.GROUND_CONFIGS[biomeType];
  }

  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const chunk = this.worldPositionToChunk(position);
    const biomeData = this.getBiomeForChunk(chunk);
    
    // Enhanced transition detection based on multiple influences
    const hasMultipleInfluences = biomeData.influences.length > 1;
    const topTwoInfluences = biomeData.influences.slice(0, 2);
    const influenceDifference = topTwoInfluences.length === 2 ? 
      topTwoInfluences[0].influence - topTwoInfluences[1].influence : 1.0;
    
    const isTransitionZone = hasMultipleInfluences && influenceDifference < 0.4;
    
    return {
      type: biomeData.biomeType,
      strength: biomeData.strength,
      transitionZone: isTransitionZone
    };
  }

  // Enhanced biome species color with more dramatic differences
  public static getBiomeSpeciesColor(
    species: string, 
    biomeInfo: BiomeInfo, 
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer'
  ): THREE.Color {
    const biomeConfig = this.getBiomeConfiguration(biomeInfo.type);
    
    // Enhanced base colors for better species distinction
    const baseColors = {
      meadow: new THREE.Color(0x7aad62),
      prairie: new THREE.Color(0xa0a055),
      clumping: new THREE.Color(0x9bc471),
      fine: new THREE.Color(0x8bbf67)
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

  // New debug methods for the realistic biome system
  public static getDebugBiomeInfo(position: THREE.Vector3): {
    chunk: ChunkCoordinate;
    biomeData: ChunkBiomeData;
    seedInfluences: Array<{ biomeType: BiomeType; influence: number; distance: number }>;
  } {
    const chunk = this.worldPositionToChunk(position);
    const biomeData = this.getBiomeForChunk(chunk);
    const seedInfluences = BiomeSeedManager.getBiomeInfluenceAtPosition(position);
    
    return {
      chunk,
      biomeData,
      seedInfluences: seedInfluences.influences
    };
  }

  public static clearCache(): void {
    this.chunkBiomeCache.clear();
    BiomeSeedManager.clearCache();
  }
}
