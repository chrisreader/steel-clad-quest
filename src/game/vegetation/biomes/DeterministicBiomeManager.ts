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

  // EXPANDED: 11 distinct grassland biomes with dramatic visual differences
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
      densityMultiplier: 2.5,
      heightMultiplier: 1.6,
      colorModifier: new THREE.Color(0x2d8f2d),
      speciesDistribution: { meadow: 0.9, prairie: 0.02, clumping: 0.03, fine: 0.05 },
      windExposure: 0.4
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 1.0,
      heightMultiplier: 0.6,
      colorModifier: new THREE.Color(0xd4af37),
      speciesDistribution: { meadow: 0.05, prairie: 0.85, clumping: 0.05, fine: 0.05 },
      windExposure: 2.0
    },
    wildflower: {
      name: 'Wildflower Meadow',
      densityMultiplier: 2.0,
      heightMultiplier: 1.2,
      colorModifier: new THREE.Color(0x8fbc8f),
      speciesDistribution: { meadow: 0.6, prairie: 0.1, clumping: 0.2, fine: 0.1 },
      windExposure: 0.8
    },
    thicket: {
      name: 'Dense Thicket',
      densityMultiplier: 4.0,
      heightMultiplier: 2.2,
      colorModifier: new THREE.Color(0x1a4a1a),
      speciesDistribution: { meadow: 0.3, prairie: 0.05, clumping: 0.6, fine: 0.05 },
      windExposure: 0.2
    },
    steppe: {
      name: 'Sparse Steppe',
      densityMultiplier: 0.3,
      heightMultiplier: 0.4,
      colorModifier: new THREE.Color(0xb8860b),
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.05, fine: 0.1 },
      windExposure: 3.0
    },
    savanna: {
      name: 'Rolling Savanna',
      densityMultiplier: 1.2,
      heightMultiplier: 0.8,
      colorModifier: new THREE.Color(0xcdaa3d),
      speciesDistribution: { meadow: 0.2, prairie: 0.6, clumping: 0.15, fine: 0.05 },
      windExposure: 1.8
    },
    valley: {
      name: 'Lush Valley',
      densityMultiplier: 3.0,
      heightMultiplier: 1.4,
      colorModifier: new THREE.Color(0x32cd32),
      speciesDistribution: { meadow: 0.7, prairie: 0.1, clumping: 0.15, fine: 0.05 },
      windExposure: 0.6
    },
    windswept: {
      name: 'Windswept Plain',
      densityMultiplier: 0.8,
      heightMultiplier: 0.5,
      colorModifier: new THREE.Color(0x9acd32),
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.05, fine: 0.15 },
      windExposure: 2.5
    },
    clearing: {
      name: 'Ancient Clearing',
      densityMultiplier: 1.6,
      heightMultiplier: 1.1,
      colorModifier: new THREE.Color(0x556b2f),
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.3, fine: 0.2 },
      windExposure: 1.2
    },
    crystalline: {
      name: 'Crystalline Grove',
      densityMultiplier: 1.8,
      heightMultiplier: 1.3,
      colorModifier: new THREE.Color(0x4682b4),
      speciesDistribution: { meadow: 0.5, prairie: 0.1, clumping: 0.2, fine: 0.2 },
      windExposure: 0.7
    }
  };

  // EXPANDED: Ground grass configurations for all 11 biomes
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 10.0,
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 15.0,
      heightReduction: 0.5,
      speciesDistribution: { meadow: 0.8, prairie: 0.05, clumping: 0.05, fine: 0.1 },
      windReduction: 0.1
    },
    prairie: {
      densityMultiplier: 8.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.1, fine: 0.05 },
      windReduction: 0.4
    },
    wildflower: {
      densityMultiplier: 12.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.6, prairie: 0.1, clumping: 0.2, fine: 0.1 },
      windReduction: 0.15
    },
    thicket: {
      densityMultiplier: 20.0,
      heightReduction: 0.4,
      speciesDistribution: { meadow: 0.3, prairie: 0.05, clumping: 0.6, fine: 0.05 },
      windReduction: 0.05
    },
    steppe: {
      densityMultiplier: 4.0,
      heightReduction: 0.9,
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.05, fine: 0.1 },
      windReduction: 0.6
    },
    savanna: {
      densityMultiplier: 9.0,
      heightReduction: 0.7,
      speciesDistribution: { meadow: 0.2, prairie: 0.6, clumping: 0.15, fine: 0.05 },
      windReduction: 0.3
    },
    valley: {
      densityMultiplier: 16.0,
      heightReduction: 0.45,
      speciesDistribution: { meadow: 0.7, prairie: 0.1, clumping: 0.15, fine: 0.05 },
      windReduction: 0.12
    },
    windswept: {
      densityMultiplier: 6.0,
      heightReduction: 0.85,
      speciesDistribution: { meadow: 0.1, prairie: 0.7, clumping: 0.05, fine: 0.15 },
      windReduction: 0.5
    },
    clearing: {
      densityMultiplier: 11.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.3, fine: 0.2 },
      windReduction: 0.2
    },
    crystalline: {
      densityMultiplier: 13.0,
      heightReduction: 0.55,
      speciesDistribution: { meadow: 0.5, prairie: 0.1, clumping: 0.2, fine: 0.2 },
      windReduction: 0.18
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
   * ENHANCED: Multi-layered biome distribution for 11 distinct, sprawling biomes
   * Creates varied patch sizes from 20-150 units with natural clustering
   */
  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const cacheKey = `${Math.round(position.x)}_${Math.round(position.z)}`;
    
    if (this.positionBiomeCache.has(cacheKey)) {
      return this.positionBiomeCache.get(cacheKey)!;
    }

    // MULTI-LAYER APPROACH: Combine different scales for varied, interesting patterns
    
    // Large-scale regional patterns (80-150 units)
    const regionalNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed, 
      3, 
      0.6, 
      2.0, 
      0.008
    );
    
    // Medium-scale patch patterns (30-60 units)
    const patchNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 2000, 
      4, 
      0.5, 
      2.0, 
      0.02
    );
    
    // Small-scale variation (10-20 units)
    const detailNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 4000, 
      2, 
      0.4, 
      2.0, 
      0.06
    );
    
    // Voronoi for natural clustering
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(
      position, 
      this.worldSeed + 6000, 
      0.012
    );
    
    // RARE BIOME DETECTION: Some biomes appear less frequently
    const rareBiomeNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      this.worldSeed + 8000, 
      2, 
      0.5, 
      2.0, 
      0.004
    );
    
    // COMBINE NOISE LAYERS: Weight different scales appropriately
    const combinedNoise = regionalNoise * 0.4 + patchNoise * 0.35 + voronoiData.value * 0.25;
    const finalNoise = combinedNoise * 0.85 + detailNoise * 0.15;
    
    // BIOME SELECTION: Map noise values to 11 distinct biomes
    let biomeType: BiomeType = 'normal';
    let strength = 1.0;
    let isTransitionZone = false;
    
    // RARE BIOMES: Special discovery areas (5% chance)
    if (rareBiomeNoise > 0.92) {
      if (rareBiomeNoise > 0.96) {
        biomeType = 'crystalline'; // Rarest biome
      } else {
        biomeType = 'clearing'; // Rare biome
      }
      strength = 1.0;
      isTransitionZone = false;
    } else {
      // REGULAR BIOME DISTRIBUTION: Divide remaining 95% among other biomes
      if (finalNoise > 0.85) {
        biomeType = 'thicket';
        strength = 1.0;
        isTransitionZone = finalNoise < 0.9;
      } else if (finalNoise > 0.75) {
        biomeType = 'valley';
        strength = 1.0;
        isTransitionZone = finalNoise < 0.8;
      } else if (finalNoise > 0.65) {
        biomeType = 'meadow';
        strength = 1.0;
        isTransitionZone = finalNoise < 0.7;
      } else if (finalNoise > 0.55) {
        biomeType = 'wildflower';
        strength = 1.0;
        isTransitionZone = finalNoise < 0.6;
      } else if (finalNoise > 0.45) {
        biomeType = 'normal';
        strength = 1.0;
        isTransitionZone = finalNoise > 0.5 || finalNoise < 0.5;
      } else if (finalNoise > 0.35) {
        biomeType = 'savanna';
        strength = 1.0;
        isTransitionZone = finalNoise < 0.4;
      } else if (finalNoise > 0.25) {
        biomeType = 'prairie';
        strength = 1.0;
        isTransitionZone = finalNoise < 0.3;
      } else if (finalNoise > 0.15) {
        biomeType = 'windswept';
        strength = 1.0;
        isTransitionZone = finalNoise < 0.2;
      } else {
        biomeType = 'steppe';
        strength = 1.0;
        isTransitionZone = finalNoise > 0.1;
      }
    }
    
    // BIOME CLUSTERING: Encourage similar biomes to appear near each other
    const clusterNoise = FractalNoiseSystem.getFractalNoise(position, this.worldSeed + 10000, 1, 1.0, 1.0, 0.015);
    if (clusterNoise > 0.7) {
      // Bias toward lush biomes in fertile clusters
      if (['normal', 'prairie', 'windswept'].includes(biomeType)) {
        biomeType = Math.random() > 0.5 ? 'meadow' : 'valley';
      }
    } else if (clusterNoise < 0.3) {
      // Bias toward dry biomes in arid clusters
      if (['normal', 'meadow', 'valley'].includes(biomeType)) {
        biomeType = Math.random() > 0.5 ? 'steppe' : 'savanna';
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
