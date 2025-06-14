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

  // ENHANCED biome configurations with 8 realistic biomes
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.0,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x6db070),
      speciesDistribution: { meadow: 0.4, prairie: 0.25, clumping: 0.25, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Standard Meadow',
      densityMultiplier: 1.8,
      heightMultiplier: 1.3,
      colorModifier: new THREE.Color(0x4db84d),
      speciesDistribution: { meadow: 0.6, prairie: 0.15, clumping: 0.15, fine: 0.1 },
      windExposure: 0.7
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 0.8,
      heightMultiplier: 0.9,
      colorModifier: new THREE.Color(0xb8b84d),
      speciesDistribution: { meadow: 0.1, prairie: 0.6, clumping: 0.2, fine: 0.1 },
      windExposure: 1.5
    },
    wildflower_meadow: {
      name: 'Wildflower Meadow',
      densityMultiplier: 1.5,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x5eb85e),
      speciesDistribution: { meadow: 0.35, prairie: 0.05, clumping: 0.2, fine: 0.0, wildflower: 0.4 },
      windExposure: 0.8
    },
    dense_thicket: {
      name: 'Dense Thicket',
      densityMultiplier: 4.0,
      heightMultiplier: 2.5,
      colorModifier: new THREE.Color(0x2d5a2d),
      speciesDistribution: { meadow: 0.1, prairie: 0.0, clumping: 0.25, fine: 0.05, thicket: 0.6 },
      windExposure: 0.4
    },
    sparse_steppe: {
      name: 'Sparse Steppe',
      densityMultiplier: 0.3,
      heightMultiplier: 0.6,
      colorModifier: new THREE.Color(0xd4c55a),
      speciesDistribution: { meadow: 0.02, prairie: 0.2, clumping: 0.08, fine: 0.0, golden: 0.7 },
      windExposure: 2.0
    },
    rolling_savanna: {
      name: 'Rolling Savanna',
      densityMultiplier: 1.2,
      heightMultiplier: 0.9,
      colorModifier: new THREE.Color(0xc4a855),
      speciesDistribution: { meadow: 0.15, prairie: 0.5, clumping: 0.05, fine: 0.0, golden: 0.3 },
      windExposure: 1.4
    },
    lush_valley: {
      name: 'Lush Valley',
      densityMultiplier: 3.0,
      heightMultiplier: 1.6,
      colorModifier: new THREE.Color(0x3eb83e),
      speciesDistribution: { meadow: 0.6, prairie: 0.05, clumping: 0.25, fine: 0.0, wildflower: 0.1 },
      windExposure: 0.6
    }
  };

  // Enhanced ground grass configurations for all biomes
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 8.0,
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 12.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.5, prairie: 0.1, clumping: 0.2, fine: 0.2 },
      windReduction: 0.15
    },
    prairie: {
      densityMultiplier: 6.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.1, prairie: 0.6, clumping: 0.2, fine: 0.1 },
      windReduction: 0.3
    },
    wildflower_meadow: {
      densityMultiplier: 10.0,
      heightReduction: 0.7,
      speciesDistribution: { meadow: 0.3, prairie: 0.1, clumping: 0.2, fine: 0.1, wildflower: 0.3 },
      windReduction: 0.2
    },
    dense_thicket: {
      densityMultiplier: 20.0,
      heightReduction: 0.9,
      speciesDistribution: { meadow: 0.2, prairie: 0.0, clumping: 0.3, fine: 0.1, thicket: 0.4 },
      windReduction: 0.1
    },
    sparse_steppe: {
      densityMultiplier: 2.0,
      heightReduction: 0.5,
      speciesDistribution: { meadow: 0.05, prairie: 0.2, clumping: 0.05, fine: 0.0, golden: 0.7 },
      windReduction: 0.5
    },
    rolling_savanna: {
      densityMultiplier: 7.0,
      heightReduction: 0.6,
      speciesDistribution: { meadow: 0.15, prairie: 0.4, clumping: 0.1, fine: 0.05, golden: 0.3 },
      windReduction: 0.3
    },
    lush_valley: {
      densityMultiplier: 18.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.5, prairie: 0.1, clumping: 0.2, fine: 0.1, wildflower: 0.1 },
      windReduction: 0.15
    }
  };

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.chunkBiomeCache.clear();
    BiomeSeedManager.setWorldSeed(seed);
    console.log(`🌍 ENHANCED BIOME SYSTEM: World seed set to ${seed}, 8 biomes available`);
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

  // Enhanced position-based biome determination with equal 12.5% distribution for 8 biomes
  public static getBiomeAtPosition(position: THREE.Vector3): { biomeType: BiomeType; strength: number } {
    const biomeInfluence = BiomeSeedManager.getBiomeInfluenceAtPosition(position);
    
    if (biomeInfluence.influences.length > 0) {
      console.log(`✅ ENHANCED BIOME: ${biomeInfluence.dominantBiome} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) strength: ${biomeInfluence.strength.toFixed(2)}`);
      return {
        biomeType: biomeInfluence.dominantBiome,
        strength: Math.max(0.7, biomeInfluence.strength)
      };
    }
    
    // Fallback with equal distribution for all 8 biomes
    const seed = this.worldSeed + Math.floor(position.x) * 73856093 + Math.floor(position.z) * 19349663;
    const biomeRandom = Math.abs(this.seededNoise(position.x * 0.002, seed)) + 
                       Math.abs(this.seededNoise(position.z * 0.002, seed + 1000));
    
    // Equal 12.5% chance for each of 8 biomes
    const biomeIndex = Math.floor((biomeRandom % 1.0) * 8);
    const biomeTypes: BiomeType[] = [
      'normal', 'meadow', 'prairie', 'wildflower_meadow',
      'dense_thicket', 'sparse_steppe', 'rolling_savanna', 'lush_valley'
    ];
    
    return { 
      biomeType: biomeTypes[biomeIndex], 
      strength: 0.8 + (biomeRandom % 0.2)
    };
  }

  public static getBiomeForChunk(chunk: ChunkCoordinate): ChunkBiomeData {
    const chunkKey = this.getChunkKey(chunk);
    
    if (this.chunkBiomeCache.has(chunkKey)) {
      return this.chunkBiomeCache.get(chunkKey)!;
    }

    const centerPos = this.chunkToWorldPosition(chunk);
    const biomeData = this.getBiomeAtPosition(centerPos);
    const seed = this.getChunkSeed(chunk);
    
    const chunkBiomeData: ChunkBiomeData = {
      coordinate: chunk,
      biomeType: biomeData.biomeType,
      strength: biomeData.strength,
      seed,
      influences: [{ biomeType: biomeData.biomeType, influence: biomeData.strength, distance: 0 }]
    };

    this.chunkBiomeCache.set(chunkKey, chunkBiomeData);
    return chunkBiomeData;
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
    const biomeData = this.getBiomeAtPosition(position);
    
    // Check for transition zones by sampling nearby positions
    const sampleDistance = 8;
    const nearbyPositions = [
      new THREE.Vector3(position.x + sampleDistance, position.y, position.z),
      new THREE.Vector3(position.x - sampleDistance, position.y, position.z),
      new THREE.Vector3(position.x, position.y, position.z + sampleDistance),
      new THREE.Vector3(position.x, position.y, position.z - sampleDistance)
    ];
    
    const nearbyBiomes = nearbyPositions.map(pos => this.getBiomeAtPosition(pos).biomeType);
    const uniqueBiomes = new Set([biomeData.biomeType, ...nearbyBiomes]);
    const isTransitionZone = uniqueBiomes.size > 1;
    
    return {
      type: biomeData.biomeType,
      strength: biomeData.strength,
      transitionZone: isTransitionZone
    };
  }

  public static getBiomeSpeciesColor(
    species: string, 
    biomeInfo: BiomeInfo, 
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer'
  ): THREE.Color {
    const biomeConfig = this.getBiomeConfiguration(biomeInfo.type);
    
    // Enhanced base colors including new species
    const baseColors = {
      meadow: new THREE.Color(0x7aad62),
      prairie: new THREE.Color(0xa0a055),
      clumping: new THREE.Color(0x9bc471),
      fine: new THREE.Color(0x8bbf67),
      wildflower: new THREE.Color(0x8faf72),
      thicket: new THREE.Color(0x5a7a45),
      golden: new THREE.Color(0xb8a555)
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    const biomeColor = baseColor.clone().multiply(biomeConfig.colorModifier);
    
    // Enhanced seasonal variations
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

  public static getDebugBiomeInfo(position: THREE.Vector3): {
    position: THREE.Vector3;
    biomeData: { biomeType: BiomeType; strength: number };
    organicInfluences: Array<{ biomeType: BiomeType; influence: number; distance: number }>;
    organicBiomeCount: number;
  } {
    const biomeData = this.getBiomeAtPosition(position);
    const organicInfluences = BiomeSeedManager.getBiomeInfluenceAtPosition(position);
    const organicBiomes = BiomeSeedManager.getOrganicBiomesAt(position);
    
    console.log(`🔍 ENHANCED BIOME DEBUG at ${position.x}, ${position.z}:`);
    console.log(`  - Biome: ${biomeData.biomeType} (strength: ${biomeData.strength})`);
    console.log(`  - Organic biomes nearby: ${organicBiomes.length}`);
    console.log(`  - Organic influences: ${organicInfluences.influences.length}`);
    
    return {
      position,
      biomeData,
      organicInfluences: organicInfluences.influences,
      organicBiomeCount: organicBiomes.length
    };
  }

  public static clearCache(): void {
    this.chunkBiomeCache.clear();
    BiomeSeedManager.clearCache();
    console.log('🧹 ENHANCED BIOME: All caches cleared, 8 biomes ready for regeneration');
  }

  public static forceRegenerateAllBiomes(): void {
    this.clearCache();
    console.log('🔄 ENHANCED BIOME: Forced complete regeneration with 8 realistic biomes');
  }
}
