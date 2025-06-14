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
   * ENHANCED: Pure chaotic patch distribution with multi-frequency noise mixing
   * Removed all environmental factors for completely random, dynamic biome patches
   */
  public static getBiomeForChunk(chunk: ChunkCoordinate): ChunkBiomeData {
    const chunkKey = this.getChunkKey(chunk);
    
    if (this.chunkBiomeCache.has(chunkKey)) {
      return this.chunkBiomeCache.get(chunkKey)!;
    }

    const seed = this.getChunkSeed(chunk);
    const centerPos = this.chunkToWorldPosition(chunk);
    
    // ENHANCED: Multi-frequency chaos for maximum patch variety
    // Large scale regions (100-200 units)
    const largeScaleNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed, 4, 0.5, 2.0, 0.002);
    
    // Medium scale patches (30-70 units) - INCREASED WEIGHT
    const mediumScaleNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed + 1000, 4, 0.6, 2.2, 0.008);
    
    // Small scale variations (10-30 units) - INCREASED WEIGHT  
    const smallScaleNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed + 2000, 3, 0.7, 2.5, 0.025);
    
    // Micro variations (1-10 units) - NEW LAYER
    const microNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed + 3000, 3, 0.5, 2.0, 0.08);
    
    // Ultra-micro chaos (0.5-3 units) - NEW LAYER for maximum randomness
    const ultraMicroNoise = FractalNoiseSystem.getFractalNoise(centerPos, seed + 4000, 2, 0.4, 2.0, 0.15);
    
    // Combine noise layers with enhanced weights for chaotic patchiness
    const combinedNoise = largeScaleNoise * 0.2 +       // Large regions (reduced)
                         mediumScaleNoise * 0.3 +       // Medium patches (increased)
                         smallScaleNoise * 0.3 +        // Small variations (increased)
                         microNoise * 0.15 +            // Micro details (increased)
                         ultraMicroNoise * 0.05;        // Ultra chaos
    
    // ENHANCED: Domain warping for maximum irregular patch shapes
    const warpStrength = 80; // Increased from 50 for more chaos
    const warpX = FractalNoiseSystem.getFractalNoise(centerPos, seed + 5000, 4, 0.6, 2.0, 0.006) - 0.5;
    const warpZ = FractalNoiseSystem.getFractalNoise(centerPos, seed + 6000, 4, 0.6, 2.0, 0.006) - 0.5;
    
    const warpedPos = new THREE.Vector3(
      centerPos.x + warpX * warpStrength,
      centerPos.y,
      centerPos.z + warpZ * warpStrength
    );
    
    // Get noise at warped position for completely organic shapes
    const warpedNoise = FractalNoiseSystem.getFractalNoise(warpedPos, seed + 7000, 4, 0.6, 2.0, 0.012);
    
    // ENHANCED: Pure random distribution with chaos layers
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    let baseNoise = combinedNoise * 0.5 + warpedNoise * 0.5;
    
    // Add additional chaos layers for maximum unpredictability
    const chaosNoise1 = FractalNoiseSystem.getWarpedNoise(centerPos, seed + 8000, 25.0);
    const chaosNoise2 = FractalNoiseSystem.getWarpedNoise(centerPos, seed + 9000, 15.0);
    
    // Blend all chaos sources
    baseNoise = baseNoise * 0.7 + chaosNoise1 * 0.2 + chaosNoise2 * 0.1;
    
    // Pure random thresholds for equal distribution (no environmental bias)
    if (baseNoise > 0.66) {
      biomeType = 'meadow';
      strength = Math.min(1.0, (baseNoise - 0.66) * 3.0);
    } else if (baseNoise < 0.33) {
      biomeType = 'prairie';
      strength = Math.min(1.0, (0.33 - baseNoise) * 3.0);
    } else {
      biomeType = 'normal';
      strength = 1.0 - Math.abs(baseNoise - 0.5) * 2.0;
    }
    
    // ENHANCED: Much stronger Voronoi influence for cellular chaos patterns
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(centerPos, seed, 0.003); // Higher density
    const voronoiInfluence = voronoiData.value * 0.7; // 70% influence (up from 50%)
    
    // Force maximum biome variety based on Voronoi cell ID
    const cellBiomeType = this.getCellForcedBiome(voronoiData.cellId);
    
    // Much higher chance to switch biome type for maximum chaos
    if (voronoiInfluence > 0.3 && cellBiomeType !== biomeType) {
      // 80% chance to switch (up from 60%)
      if (Math.random() < 0.8) {
        biomeType = cellBiomeType;
        // Adjust strength for natural transitions
        strength *= 0.9;
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
