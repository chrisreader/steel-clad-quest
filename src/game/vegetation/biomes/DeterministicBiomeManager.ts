import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';
import { BiomeBlendingSystem, BlendedBiomeInfo } from './BiomeBlendingSystem';
import { EnhancedNoiseSystem } from './EnhancedNoiseSystem';

export interface ChunkCoordinate {
  x: number;
  z: number;
}

export interface ChunkBiomeData {
  coordinate: ChunkCoordinate;
  biomeType: BiomeType;
  strength: number;
  seed: number;
  blendedInfo?: BlendedBiomeInfo;
}

export class DeterministicBiomeManager {
  private static readonly CHUNK_SIZE = 64;
  private static worldSeed: number = 12345;
  private static chunkBiomeCache: Map<string, ChunkBiomeData> = new Map();

  // Enhanced biome configurations with organic characteristics
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
    BiomeBlendingSystem.clearCache();
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

    const seed = this.getChunkSeed(chunk);
    const centerPos = this.chunkToWorldPosition(chunk);
    
    // Use enhanced blending system for organic biome boundaries
    const blendedInfo = BiomeBlendingSystem.getBlendedBiomeInfo(centerPos, this.worldSeed, this.BIOME_CONFIGS);
    
    const biomeData: ChunkBiomeData = {
      coordinate: chunk,
      biomeType: blendedInfo.dominantBiome,
      strength: 1.0 - blendedInfo.transitionStrength, // Higher strength = less transition
      seed,
      blendedInfo
    };

    this.chunkBiomeCache.set(chunkKey, biomeData);
    return biomeData;
  }

  /**
   * Get blended biome info for a specific world position (for per-blade sampling)
   */
  public static getBlendedBiomeAtPosition(position: THREE.Vector3): BlendedBiomeInfo {
    return BiomeBlendingSystem.getBlendedBiomeInfo(position, this.worldSeed, this.BIOME_CONFIGS);
  }

  private static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
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
    const blendedInfo = this.getBlendedBiomeAtPosition(position);
    
    return {
      type: blendedInfo.dominantBiome,
      strength: 1.0 - blendedInfo.transitionStrength,
      transitionZone: blendedInfo.transitionStrength > 0.3
    };
  }

  /**
   * Enhanced biome species color with smooth blending
   */
  public static getBiomeSpeciesColor(
    species: string, 
    biomeInfo: BiomeInfo, 
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer',
    position?: THREE.Vector3
  ): THREE.Color {
    // If position is provided, use blended color
    if (position) {
      const blendedInfo = this.getBlendedBiomeAtPosition(position);
      const baseColors = {
        meadow: new THREE.Color(0x7aad62),
        prairie: new THREE.Color(0xa0a055),
        clumping: new THREE.Color(0x9bc471),
        fine: new THREE.Color(0x8bbf67)
      };
      
      const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
      const blendedColor = baseColor.clone().multiply(blendedInfo.blendedColor);
      
      // Apply seasonal variations
      const seasonalMultipliers = {
        spring: new THREE.Color(1.3, 1.4, 1.1),
        summer: new THREE.Color(1.1, 1.2, 1.0),
        autumn: new THREE.Color(1.4, 1.2, 0.7),
        winter: new THREE.Color(0.7, 0.8, 0.9)
      };
      
      return blendedColor.multiply(seasonalMultipliers[season]);
    }

    // Fallback to legacy method
    const biomeConfig = this.getBiomeConfiguration(biomeInfo.type);
    
    const baseColors = {
      meadow: new THREE.Color(0x7aad62),
      prairie: new THREE.Color(0xa0a055),
      clumping: new THREE.Color(0x9bc471),
      fine: new THREE.Color(0x8bbf67)
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    const biomeColor = baseColor.clone().multiply(biomeConfig.colorModifier);
    
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
