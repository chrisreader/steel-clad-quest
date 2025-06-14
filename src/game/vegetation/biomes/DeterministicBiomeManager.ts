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
  private static worldSeed: number = DeterministicBiomeManager.generateRandomSeed(); // Dynamic random seed
  private static chunkBiomeCache: Map<string, ChunkBiomeData> = new Map();

  // REBALANCED biome configurations with MUCH DENSER prairie grass
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
      densityMultiplier: 1.8, // Increased from 1.2 for much denser prairie
      heightMultiplier: 1.1, // Increased from 0.8 for taller prairie grass
      colorModifier: new THREE.Color(0xb8b84d),
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.15, fine: 0.05 },
      windExposure: 1.5
    }
  };

  // ENHANCED ground grass configurations with MUCH DENSER prairie
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
      densityMultiplier: 11.0, // Increased from 8.0 for much denser prairie ground coverage
      heightReduction: 0.65, // Reduced from 0.6 for taller prairie ground grass
      speciesDistribution: { meadow: 0.05, prairie: 0.75, clumping: 0.1, fine: 0.1 },
      windReduction: 0.3
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
   * ENHANCED: Equal biome distribution with multi-frequency noise mixing
   */
  public static getBiomeForChunk(chunk: ChunkCoordinate): ChunkBiomeData {
    const chunkKey = this.getChunkKey(chunk);
    
    if (this.chunkBiomeCache.has(chunkKey)) {
      return this.chunkBiomeCache.get(chunkKey)!;
    }

    const seed = this.getChunkSeed(chunk);
    const centerPos = this.chunkToWorldPosition(chunk);
    
    // ENHANCED: Multi-frequency noise for better distribution
    const largeScaleNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed, 4, 0.5, 2.0, 0.001);
    const mediumScaleNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed + 1000, 3, 0.5, 2.0, 0.005);
    const smallScaleNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed + 2000, 2, 0.5, 2.0, 0.02);
    
    // Combine noise layers for more varied patterns
    const combinedNoise = largeScaleNoise * 0.6 + mediumScaleNoise * 0.3 + smallScaleNoise * 0.1;
    
    // REBALANCED: Equal distribution (~33% each biome)
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    
    if (combinedNoise > 0.66) {
      // 33% chance for meadow
      biomeType = 'meadow';
      strength = Math.min(1.0, (combinedNoise - 0.66) / 0.34);
    } else if (combinedNoise < 0.33) {
      // 33% chance for prairie
      biomeType = 'prairie';
      strength = Math.min(1.0, (0.33 - combinedNoise) / 0.33);
    } else {
      // 33% chance for normal (middle range)
      biomeType = 'normal';
      strength = 1.0 - Math.abs(combinedNoise - 0.5) * 2.0; // Strongest at center (0.5)
    }
    
    // Add Voronoi balancing to prevent large uniform areas
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(centerPos, seed, 0.0008);
    const voronoiInfluence = voronoiData.value * 0.2; // 20% influence
    
    // Use Voronoi cell ID to force biome variety
    const cellBiomeType = this.getCellForcedBiome(voronoiData.cellId);
    if (voronoiInfluence > 0.15 && cellBiomeType !== biomeType) {
      // Force some variation based on Voronoi cells
      strength *= 0.7; // Reduce primary strength
      if (Math.random() < 0.3) { // 30% chance to switch
        biomeType = cellBiomeType;
      }
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

  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const biomeInfluence = BiomeBlendingSystem.getBiomeInfluenceAtPosition(position, this.worldSeed);
    
    return {
      type: biomeInfluence.primaryBiome,
      strength: biomeInfluence.primaryStrength,
      transitionZone: biomeInfluence.isTransitionZone
    };
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
