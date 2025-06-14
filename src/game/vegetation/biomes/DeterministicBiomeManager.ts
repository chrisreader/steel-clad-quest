import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';
import { BiomeBlendingSystem } from './BiomeBlendingSystem';

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

  // Enhanced biome configurations with realistic blending support
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

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.chunkBiomeCache.clear();
    // Initialize the blending system with new seed-based center
    BiomeBlendingSystem.initialize(seed % 1000, (seed * 17) % 1000);
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
    
    // Use the new blending system for realistic biome boundaries
    const biomeInfo = BiomeBlendingSystem.getBiomeInfo(centerPos.x, centerPos.z);
    
    const biomeData: ChunkBiomeData = {
      coordinate: chunk,
      biomeType: biomeInfo.type,
      strength: biomeInfo.strength,
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
    // Use the blending system for smooth biome transitions at grass level
    return BiomeBlendingSystem.getBiomeInfo(position.x, position.z);
  }

  // Enhanced biome species color with realistic blending
  public static getBiomeSpeciesColor(
    species: string, 
    biomeInfo: BiomeInfo, 
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer'
  ): THREE.Color {
    // Get blended color data for smooth transitions
    const blendedData = BiomeBlendingSystem.getBlendedBiomeData(0, 0); // This will be position-specific in practice
    
    const baseColors = {
      meadow: new THREE.Color(0x7aad62), // Rich green
      prairie: new THREE.Color(0xa0a055), // Golden-green
      clumping: new THREE.Color(0x9bc471), // Bright lime
      fine: new THREE.Color(0x8bbf67) // Medium green
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    
    // Use blended color from the blending system
    const biomeColor = baseColor.clone().multiply(blendedData.blendedColor);
    
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
