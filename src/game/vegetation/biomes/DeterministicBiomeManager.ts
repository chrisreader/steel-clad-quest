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
      densityMultiplier: 1.8,
      heightMultiplier: 1.1,
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
      densityMultiplier: 11.0,
      heightReduction: 0.65,
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
   * NEW: Position-based biome determination for small, realistic patches
   * Creates 5-30 unit biome patches that intermix naturally
   */
  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const cacheKey = `${Math.round(position.x)}_${Math.round(position.z)}`;
    
    if (this.positionBiomeCache.has(cacheKey)) {
      return this.positionBiomeCache.get(cacheKey)!;
    }

    // ULTRA-HIGH FREQUENCY NOISE for small patches (5-30 units)
    
    // Patch cluster noise (20-50 units) - creates groups of similar patches
    const patchClusterNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed, 
      3, 
      0.6, 
      2.0, 
      0.025  // High frequency for small clusters
    );
    
    // Small patch noise (10-25 units) - individual patch definition
    const smallPatchNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 1000, 
      4, 
      0.7, 
      2.2, 
      0.05   // Very high frequency for small patches
    );
    
    // Micro patch noise (5-15 units) - patch edge variation
    const microPatchNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 2000, 
      3, 
      0.8, 
      2.5, 
      0.08   // Ultra high frequency for micro details
    );
    
    // Ultra-micro chaos (2-8 units) - natural irregularity
    const ultraMicroNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 3000, 
      2, 
      0.6, 
      2.0, 
      0.15   // Extremely high frequency
    );
    
    // Disturbance patterns (30-80 units) - creates natural clearings and variations
    const disturbanceNoise = FractalNoiseSystem.getWarpedNoise(
      position, 
      this.worldSeed + 4000, 
      40.0   // Medium warp for disturbance patterns
    );
    
    // ENHANCED: Domain warping for ultra-organic patch shapes
    const warpStrength = 25.0; // Smaller warp for tighter patches
    const warpX = FractalNoiseSystem.getFractalNoise(position, this.worldSeed + 5000, 3, 0.6, 2.0, 0.08) - 0.5;
    const warpZ = FractalNoiseSystem.getFractalNoise(position, this.worldSeed + 6000, 3, 0.6, 2.0, 0.08) - 0.5;
    
    const warpedPos = new THREE.Vector3(
      position.x + warpX * warpStrength,
      position.y,
      position.z + warpZ * warpStrength
    );
    
    // Get additional noise at warped position
    const warpedDetailNoise = FractalNoiseSystem.getFractalNoise(warpedPos, this.worldSeed + 7000, 3, 0.7, 2.0, 0.06);
    
    // COMBINE: Weight ultra-high frequency noise heavily for small patches
    const combinedNoise = patchClusterNoise * 0.2 +     // Large-scale clustering
                         smallPatchNoise * 0.35 +       // Primary patch definition
                         microPatchNoise * 0.25 +       // Patch edge details
                         ultraMicroNoise * 0.15 +       // Natural chaos
                         warpedDetailNoise * 0.05;      // Warped details
    
    // ULTRA-HIGH DENSITY Voronoi for cellular patch patterns (90% influence)
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(
      position, 
      this.worldSeed, 
      0.015  // Very high density for small cells
    );
    
    // Blend with 90% Voronoi influence for strong cellular patterns
    let finalNoise = combinedNoise * 0.1 + voronoiData.value * 0.9;
    
    // Add disturbance patterns for natural clearings
    finalNoise = finalNoise * 0.8 + disturbanceNoise * 0.2;
    
    // REALISTIC PATCH DISTRIBUTION: Create natural clustering
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    let isTransitionZone = false;
    
    // Use triple-threshold system for natural patch distribution
    if (finalNoise > 0.7) {
      biomeType = 'meadow';
      strength = Math.min(1.0, (finalNoise - 0.7) * 3.33);
      isTransitionZone = finalNoise < 0.8;
    } else if (finalNoise < 0.3) {
      biomeType = 'prairie';
      strength = Math.min(1.0, (0.3 - finalNoise) * 3.33);
      isTransitionZone = finalNoise > 0.2;
    } else {
      biomeType = 'normal';
      strength = 1.0 - Math.abs(finalNoise - 0.5) * 2.0;
      isTransitionZone = finalNoise > 0.35 && finalNoise < 0.65;
    }
    
    // SEED DISPERSAL LOGIC: Similar biomes cluster together naturally
    const clusteringNoise = FractalNoiseSystem.getFractalNoise(position, this.worldSeed + 8000, 2, 0.5, 2.0, 0.003);
    
    // Force clustering based on surrounding area tendency
    if (clusteringNoise > 0.6) {
      // Strong meadow clustering areas
      if (biomeType === 'normal' && finalNoise > 0.55) {
        biomeType = 'meadow';
        strength *= 0.8;
        isTransitionZone = true;
      }
    } else if (clusteringNoise < 0.4) {
      // Strong prairie clustering areas
      if (biomeType === 'normal' && finalNoise < 0.45) {
        biomeType = 'prairie';
        strength *= 0.8;
        isTransitionZone = true;
      }
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
