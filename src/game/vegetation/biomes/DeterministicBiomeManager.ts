import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';
import { FractalNoiseSystem } from './FractalNoiseSystem';
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
  private static worldSeed: number = DeterministicBiomeManager.generateRandomSeed();
  private static chunkBiomeCache: Map<string, ChunkBiomeData> = new Map();
  private static positionBiomeCache: Map<string, BiomeInfo> = new Map();

  // ENHANCED biome configurations with DRAMATIC differences for clear distinction
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.5,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x6db070), // Standard green
      speciesDistribution: { meadow: 0.4, prairie: 0.25, clumping: 0.25, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Lush Meadow',
      densityMultiplier: 2.5, // Much higher density
      heightMultiplier: 1.6, // Much taller
      colorModifier: new THREE.Color(0x2d8f2d), // Rich, dark green
      speciesDistribution: { meadow: 0.9, prairie: 0.02, clumping: 0.03, fine: 0.05 }, // Almost pure meadow
      windExposure: 0.4
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 1.0, // Lower density
      heightMultiplier: 0.6, // Much shorter
      colorModifier: new THREE.Color(0xd4af37), // Golden color
      speciesDistribution: { meadow: 0.05, prairie: 0.85, clumping: 0.05, fine: 0.05 }, // Almost pure prairie
      windExposure: 2.0
    }
  };

  // ENHANCED ground grass configurations with dramatic differences
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 10.0,
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 15.0, // Much denser
      heightReduction: 0.5, // Less reduction (taller)
      speciesDistribution: { meadow: 0.8, prairie: 0.05, clumping: 0.05, fine: 0.1 },
      windReduction: 0.1
    },
    prairie: {
      densityMultiplier: 8.0, // Less dense
      heightReduction: 0.8, // More reduction (shorter)
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.1, fine: 0.05 },
      windReduction: 0.4
    }
  };

  /**
   * Generate a random seed for world generation
   */
  private static generateRandomSeed(): number {
    return Math.floor(Math.random() * 2147483647) + Date.now() % 1000000;
  }

  /**
   * Initialize with a new random seed (call on game start)
   */
  public static initializeWithRandomSeed(): void {
    const newSeed = this.generateRandomSeed();
    console.log(`🌱 Initializing biomes with random seed: ${newSeed}`);
    this.setWorldSeed(newSeed);
  }

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.chunkBiomeCache.clear();
    this.positionBiomeCache.clear();
    BiomeBlendingSystem.clearCache();
    console.log(`🌱 World seed set to: ${seed} - biome caches cleared`);
  }

  public static getWorldSeed(): number {
    return this.worldSeed;
  }

  public static getChunkSize(): number {
    return this.CHUNK_SIZE;
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

  /**
   * LEGACY: Keep for compatibility but use position-based biome determination
   */
  public static getBiomeForChunk(chunk: ChunkCoordinate): ChunkBiomeData {
    const chunkKey = this.getChunkKey(chunk);
    
    if (this.chunkBiomeCache.has(chunkKey)) {
      return this.chunkBiomeCache.get(chunkKey)!;
    }

    const seed = this.getChunkSeed(chunk);
    const centerPos = this.chunkToWorldPosition(chunk);
    
    // Use position-based biome info for the chunk center
    const biomeInfo = this.getBiomeInfo(centerPos);

    const biomeData: ChunkBiomeData = {
      coordinate: chunk,
      biomeType: biomeInfo.type,
      strength: biomeInfo.strength,
      seed
    };

    this.chunkBiomeCache.set(chunkKey, biomeData);
    return biomeData;
  }

  /**
   * SIMPLIFIED: Position-based biome determination for DISTINCT patches
   * Creates 30-80 unit biome patches that are clearly different from each other
   */
  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const cacheKey = `${Math.round(position.x)}_${Math.round(position.z)}`;
    
    if (this.positionBiomeCache.has(cacheKey)) {
      return this.positionBiomeCache.get(cacheKey)!;
    }

    // SIMPLIFIED: Use clearer, more distinct noise patterns
    
    // Primary patch noise (30-80 units) - creates main biome regions
    const primaryNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed, 
      3, 
      0.6, 
      2.0, 
      0.015  // Larger patches for clear distinction
    );
    
    // Secondary variation (20-40 units) - adds some variety within regions
    const secondaryNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 1000, 
      2, 
      0.5, 
      2.0, 
      0.025
    );
    
    // CELLULAR PATTERN: Use Voronoi for distinct patch boundaries
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(
      position, 
      this.worldSeed, 
      0.008  // Larger cells for bigger patches
    );
    
    // SIMPLIFIED COMBINATION: 70% cellular, 30% noise for organic edges
    const combinedNoise = voronoiData.value * 0.7 + primaryNoise * 0.3;
    
    // Add minor secondary variation
    const finalNoise = combinedNoise * 0.8 + secondaryNoise * 0.2;
    
    // CLEAR THRESHOLDS: Create distinct biome regions
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    let isTransitionZone = false;
    
    // Use SHARP thresholds for clear boundaries
    if (finalNoise > 0.65) {
      biomeType = 'meadow';
      strength = 1.0;
      // Only transition at very edge
      isTransitionZone = finalNoise < 0.7;
    } else if (finalNoise < 0.35) {
      biomeType = 'prairie';
      strength = 1.0;
      // Only transition at very edge
      isTransitionZone = finalNoise > 0.3;
    } else {
      biomeType = 'normal';
      strength = 1.0;
      // Small transition zones at boundaries
      isTransitionZone = finalNoise > 0.6 || finalNoise < 0.4;
    }
    
    // FORCE BIOME VARIETY: Use cell ID to ensure all biomes appear
    const cellBiome = this.getCellForcedBiome(voronoiData.cellId);
    
    // Occasionally force the cell biome to ensure variety
    const forceNoise = FractalNoiseSystem.getFractalNoise(position, this.worldSeed + 5000, 1, 1.0, 1.0, 0.003);
    if (forceNoise > 0.85) {
      biomeType = cellBiome;
      strength = 1.0;
      isTransitionZone = false;
    }

    const biomeInfo: BiomeInfo = {
      type: biomeType,
      strength,
      transitionZone: isTransitionZone
    };

    this.positionBiomeCache.set(cacheKey, biomeInfo);
    return biomeInfo;
  }

  /**
   * Force biome variety using cell IDs to ensure equal representation
   */
  private static getCellForcedBiome(cellId: number): BiomeType {
    const biomes: BiomeType[] = ['normal', 'meadow', 'prairie'];
    return biomes[Math.abs(cellId) % 3];
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
    if (biomeInfo.transitionZone) {
      const tempPosition = new THREE.Vector3(0, 0, 0);
      return BiomeBlendingSystem.getBlendedBiomeColor(species, tempPosition, season, this.worldSeed);
    }
    
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
  
  public static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
  }
}
