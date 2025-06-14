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

  // EXTREMELY DRAMATIC biome configurations for unmistakable visual differences
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.0, // Standard density
      heightMultiplier: 1.0, // Standard height
      colorModifier: new THREE.Color(0x6db070), // Standard green
      speciesDistribution: { meadow: 0.4, prairie: 0.25, clumping: 0.25, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Dense Meadow',
      densityMultiplier: 4.0, // 4x density - extremely dense
      heightMultiplier: 2.2, // Much taller grass
      colorModifier: new THREE.Color(0x1a5f1a), // Very dark, rich green
      speciesDistribution: { meadow: 0.95, prairie: 0.01, clumping: 0.02, fine: 0.02 }, // Almost pure meadow
      windExposure: 0.2
    },
    prairie: {
      name: 'Sparse Prairie',
      densityMultiplier: 0.4, // Very sparse - 40% of normal
      heightMultiplier: 0.4, // Much shorter
      colorModifier: new THREE.Color(0xd4af37), // Golden/yellow color
      speciesDistribution: { meadow: 0.02, prairie: 0.95, clumping: 0.02, fine: 0.01 }, // Almost pure prairie
      windExposure: 3.0
    }
  };

  // EXTREME ground grass configurations
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 8.0,
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 20.0, // Extremely dense ground coverage
      heightReduction: 0.3, // Less reduction (taller ground grass)
      speciesDistribution: { meadow: 0.9, prairie: 0.03, clumping: 0.04, fine: 0.03 },
      windReduction: 0.05
    },
    prairie: {
      densityMultiplier: 3.0, // Very sparse ground grass
      heightReduction: 0.9, // Very short
      speciesDistribution: { meadow: 0.03, prairie: 0.9, clumping: 0.04, fine: 0.03 },
      windReduction: 0.6
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
   * ULTRA-SIMPLIFIED: Create MASSIVE, DISTINCT biome patches with sharp boundaries
   * Each patch should be 50-150 units and completely different from neighbors
   */
  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const cacheKey = `${Math.round(position.x / 2) * 2}_${Math.round(position.z / 2) * 2}`;
    
    if (this.positionBiomeCache.has(cacheKey)) {
      return this.positionBiomeCache.get(cacheKey)!;
    }

    // ULTRA-SIMPLE: Use large-scale Voronoi for distinct patches
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(
      position, 
      this.worldSeed, 
      0.004  // Very large cells for 100+ unit patches
    );
    
    // Force equal distribution of biomes using cell ID
    const biomeIndex = Math.abs(voronoiData.cellId) % 3;
    let biomeType: BiomeType = 'normal';
    
    if (biomeIndex === 0) {
      biomeType = 'meadow';
    } else if (biomeIndex === 1) {
      biomeType = 'prairie';
    } else {
      biomeType = 'normal';
    }
    
    // Add some randomness to break up perfect patterns
    const randomNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 7777, 
      1, 
      1.0, 
      1.0, 
      0.001
    );
    
    // Occasionally override with random biome for variety
    if (randomNoise > 0.9) {
      const randomBiomes: BiomeType[] = ['normal', 'meadow', 'prairie'];
      biomeType = randomBiomes[Math.floor(randomNoise * 100) % 3];
    }
    
    // Only create transition zones at the very edges of Voronoi cells
    const isTransitionZone = voronoiData.distance < 0.1; // Very small transition zones
    
    const biomeInfo: BiomeInfo = {
      type: biomeType,
      strength: 1.0,
      transitionZone: isTransitionZone
    };

    this.positionBiomeCache.set(cacheKey, biomeInfo);
    
    return biomeInfo;
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
      meadow: new THREE.Color(0x2d5016), // Very dark green for meadow
      prairie: new THREE.Color(0xb8860b), // Dark golden for prairie
      clumping: new THREE.Color(0x4a5c2a), // Olive green
      fine: new THREE.Color(0x556b2f) // Dark olive
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
