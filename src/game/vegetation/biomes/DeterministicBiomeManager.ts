
import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';

export interface ChunkCoordinate {
  x: number;
  z: number;
}

export interface ChunkBiomeData {
  coordinate: ChunkCoordinate;
  biomeType: BiomeType;
  strength: number;
  seed: number;
}

export class DeterministicBiomeManager {
  private static readonly CHUNK_SIZE = 64;
  private static worldSeed: number = 12345; // Can be set from game config
  private static chunkBiomeCache: Map<string, ChunkBiomeData> = new Map();

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

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.chunkBiomeCache.clear();
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
    
    // Use seeded noise for deterministic biome generation
    const seededRandom = this.createSeededRandom(seed);
    const noiseX = this.seededNoise(centerPos.x * 0.001, seed);
    const noiseZ = this.seededNoise(centerPos.z * 0.001, seed + 1000);
    
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    
    if (noiseX > 0.3) {
      biomeType = 'meadow';
      strength = Math.min(1.0, (noiseX - 0.3) / 0.4);
    } else if (noiseZ > 0.2) {
      biomeType = 'prairie';
      strength = Math.min(1.0, (noiseZ - 0.2) / 0.5);
    }

    const biomeData: ChunkBiomeData = {
      coordinate: chunk,
      biomeType,
      strength,
      seed
    };

    this.chunkBiomeCache.set(chunkKey, biomeData);
    return biomeData;
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
    const chunk = this.worldPositionToChunk(position);
    const biomeData = this.getBiomeForChunk(chunk);
    
    return {
      type: biomeData.biomeType,
      strength: biomeData.strength,
      transitionZone: biomeData.strength < 0.8
    };
  }

  // Maintain compatibility with existing biome manager methods
  public static getBiomeSpeciesColor(
    species: string, 
    biomeInfo: BiomeInfo, 
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer'
  ): THREE.Color {
    const biomeConfig = this.getBiomeConfiguration(biomeInfo.type);
    
    const baseColors = {
      meadow: new THREE.Color(0x7aad62),
      prairie: new THREE.Color(0x6a9c55),
      clumping: new THREE.Color(0x9bc471),
      fine: new THREE.Color(0x8bbf67)
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    const biomeColor = baseColor.clone().multiply(biomeConfig.colorModifier);
    
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
