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

  // ENHANCED biome configurations with new realistic biomes
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    // Original biomes
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.0,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x6db070),
      speciesDistribution: { meadow: 0.4, prairie: 0.25, clumping: 0.25, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Lush Meadow',
      densityMultiplier: 2.8,
      heightMultiplier: 1.8,
      colorModifier: new THREE.Color(0x2eb82e),
      speciesDistribution: { meadow: 0.85, prairie: 0.05, clumping: 0.05, fine: 0.05 },
      windExposure: 0.5
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 0.6,
      heightMultiplier: 0.6,
      colorModifier: new THREE.Color(0xe6e632),
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.1, fine: 0.05 },
      windExposure: 1.8
    },
    
    // NEW ENHANCED BIOMES
    wildflower_meadow: {
      name: 'Wildflower Meadow',
      densityMultiplier: 2.2,
      heightMultiplier: 1.4,
      colorModifier: new THREE.Color(0x3eb83e),
      speciesDistribution: { 
        meadow: 0.3, wildflower: 0.4, fine: 0.2, clumping: 0.1 
      },
      windExposure: 0.7,
      rarity: 0.15,
      specialFeatures: { 
        hasFlowers: true, 
        hasParticleEffects: true 
      }
    },
    dense_thicket: {
      name: 'Dense Thicket',
      densityMultiplier: 4.0,
      heightMultiplier: 2.5,
      colorModifier: new THREE.Color(0x2a4a1a),
      speciesDistribution: { 
        thicket: 0.6, reed: 0.2, shrub: 0.15, fern: 0.05 
      },
      windExposure: 0.2,
      rarity: 0.12
    },
    sparse_steppe: {
      name: 'Sparse Steppe',
      densityMultiplier: 0.3,
      heightMultiplier: 0.4,
      colorModifier: new THREE.Color(0xd4c068),
      speciesDistribution: { 
        prairie: 0.7, fine: 0.25, meadow: 0.05 
      },
      windExposure: 2.5,
      rarity: 0.18,
      specialFeatures: { 
        windBentGrass: true 
      }
    },
    rolling_savanna: {
      name: 'Rolling Savanna',
      densityMultiplier: 1.5,
      heightMultiplier: 1.2,
      colorModifier: new THREE.Color(0xb8a047),
      speciesDistribution: { 
        prairie: 0.5, meadow: 0.3, clumping: 0.15, fine: 0.05 
      },
      windExposure: 1.3,
      rarity: 0.20
    },
    lush_valley: {
      name: 'Lush Valley',
      densityMultiplier: 3.5,
      heightMultiplier: 2.0,
      colorModifier: new THREE.Color(0x1eb81e),
      speciesDistribution: { 
        meadow: 0.4, fern: 0.3, wildflower: 0.2, reed: 0.1 
      },
      windExposure: 0.3,
      rarity: 0.10
    },
    windswept_plain: {
      name: 'Windswept Plain',
      densityMultiplier: 0.8,
      heightMultiplier: 0.7,
      colorModifier: new THREE.Color(0x8ba85f),
      speciesDistribution: { 
        prairie: 0.6, fine: 0.3, clumping: 0.1 
      },
      windExposure: 2.2,
      rarity: 0.16,
      specialFeatures: { 
        windBentGrass: true 
      }
    },
    ancient_clearing: {
      name: 'Ancient Clearing',
      densityMultiplier: 1.8,
      heightMultiplier: 1.3,
      colorModifier: new THREE.Color(0x4a6b2a),
      speciesDistribution: { 
        fern: 0.35, meadow: 0.25, shrub: 0.25, clumping: 0.15 
      },
      windExposure: 0.8,
      rarity: 0.08
    },
    crystalline_grove: {
      name: 'Crystalline Grove',
      densityMultiplier: 1.2,
      heightMultiplier: 1.6,
      colorModifier: new THREE.Color(0x5bb8c7),
      speciesDistribution: { 
        crystal: 0.7, wildflower: 0.2, fine: 0.1 
      },
      windExposure: 0.1,
      rarity: 0.02,
      specialFeatures: { 
        hasMagicalGlow: true, 
        hasParticleEffects: true 
      }
    }
  };

  // ENHANCED ground grass configurations
  private static readonly GROUND_CONFIGS: Record<BiomeType, GroundGrassConfiguration> = {
    normal: {
      densityMultiplier: 8.0,
      heightReduction: 0.65,
      speciesDistribution: { meadow: 0.3, prairie: 0.2, clumping: 0.4, fine: 0.1 },
      windReduction: 0.2
    },
    meadow: {
      densityMultiplier: 18.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.7, prairie: 0.05, clumping: 0.05, fine: 0.2 },
      windReduction: 0.1
    },
    prairie: {
      densityMultiplier: 4.0,
      heightReduction: 0.5,
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.1, fine: 0.05 },
      windReduction: 0.4
    },
    wildflower_meadow: {
      densityMultiplier: 15.0,
      heightReduction: 0.7,
      speciesDistribution: { meadow: 0.4, wildflower: 0.3, fine: 0.3 },
      windReduction: 0.15
    },
    dense_thicket: {
      densityMultiplier: 25.0,
      heightReduction: 0.9,
      speciesDistribution: { fern: 0.5, shrub: 0.3, clumping: 0.2 },
      windReduction: 0.05
    },
    sparse_steppe: {
      densityMultiplier: 2.0,
      heightReduction: 0.3,
      speciesDistribution: { prairie: 0.8, fine: 0.2 },
      windReduction: 0.8
    },
    rolling_savanna: {
      densityMultiplier: 10.0,
      heightReduction: 0.6,
      speciesDistribution: { prairie: 0.6, meadow: 0.3, clumping: 0.1 },
      windReduction: 0.3
    },
    lush_valley: {
      densityMultiplier: 22.0,
      heightReduction: 0.8,
      speciesDistribution: { meadow: 0.5, fern: 0.4, wildflower: 0.1 },
      windReduction: 0.1
    },
    windswept_plain: {
      densityMultiplier: 5.0,
      heightReduction: 0.4,
      speciesDistribution: { prairie: 0.7, fine: 0.3 },
      windReduction: 0.6
    },
    ancient_clearing: {
      densityMultiplier: 12.0,
      heightReduction: 0.7,
      speciesDistribution: { fern: 0.4, meadow: 0.3, shrub: 0.2, clumping: 0.1 },
      windReduction: 0.2
    },
    crystalline_grove: {
      densityMultiplier: 8.0,
      heightReduction: 0.8,
      speciesDistribution: { crystal: 0.6, wildflower: 0.3, fine: 0.1 },
      windReduction: 0.05
    }
  };

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.chunkBiomeCache.clear();
    BiomeSeedManager.setWorldSeed(seed);
    console.log(`🌍 ORGANIC BIOME SYSTEM: World seed set to ${seed}, cache cleared`);
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

  // NEW: Position-based biome determination (bypasses chunks)
  public static getBiomeAtPosition(position: THREE.Vector3): { biomeType: BiomeType; strength: number } {
    const biomeInfluence = BiomeSeedManager.getBiomeInfluenceAtPosition(position);
    
    // Use organic biome directly with enhanced minimum strength
    if (biomeInfluence.influences.length > 0) {
      console.log(`✅ POSITION BIOME: ${biomeInfluence.dominantBiome} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) strength: ${biomeInfluence.strength.toFixed(2)}`);
      return {
        biomeType: biomeInfluence.dominantBiome,
        strength: Math.max(0.7, biomeInfluence.strength) // Higher minimum strength
      };
    }
    
    // Enhanced fallback with better biome distribution
    const seed = this.worldSeed + Math.floor(position.x) * 73856093 + Math.floor(position.z) * 19349663;
    const noiseX = this.seededNoise(position.x * 0.002, seed);
    const noiseZ = this.seededNoise(position.z * 0.002, seed + 1000);
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // Distribute new biomes based on noise patterns
    if (combinedNoise > 0.7) {
      return { biomeType: 'lush_valley', strength: 0.8 };
    } else if (combinedNoise > 0.5) {
      return { biomeType: 'wildflower_meadow', strength: 0.8 };
    } else if (combinedNoise > 0.3) {
      return { biomeType: 'rolling_savanna', strength: 0.8 };
    } else if (combinedNoise > 0.1) {
      return { biomeType: 'meadow', strength: 0.8 };
    } else if (combinedNoise > -0.1) {
      return { biomeType: 'prairie', strength: 0.8 };
    } else if (combinedNoise > -0.3) {
      return { biomeType: 'windswept_plain', strength: 0.8 };
    } else if (combinedNoise > -0.5) {
      return { biomeType: 'sparse_steppe', strength: 0.8 };
    } else if (combinedNoise > -0.7) {
      return { biomeType: 'dense_thicket', strength: 0.8 };
    } else if (combinedNoise > -0.85) {
      return { biomeType: 'ancient_clearing', strength: 0.8 };
    } else {
      // Very rare crystalline grove
      return { biomeType: 'crystalline_grove', strength: 0.9 };
    }
  }

  public static getBiomeForChunk(chunk: ChunkCoordinate): ChunkBiomeData {
    const chunkKey = this.getChunkKey(chunk);
    
    if (this.chunkBiomeCache.has(chunkKey)) {
      return this.chunkBiomeCache.get(chunkKey)!;
    }

    // Use position-based biome for chunk center (for legacy compatibility)
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

  // UPDATED: Position-based biome info (main method for grass generation)
  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const biomeData = this.getBiomeAtPosition(position);
    
    // Check for transition zones by sampling nearby positions
    const sampleDistance = 8; // Sample 8 units away
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

  // Enhanced biome species color with support for new species
  public static getBiomeSpeciesColor(
    species: string, 
    biomeInfo: BiomeInfo, 
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer'
  ): THREE.Color {
    const biomeConfig = this.getBiomeConfiguration(biomeInfo.type);
    
    // Enhanced base colors for better species distinction
    const baseColors = {
      meadow: new THREE.Color(0x7aad62),
      prairie: new THREE.Color(0xa0a055),
      clumping: new THREE.Color(0x9bc471),
      fine: new THREE.Color(0x8bbf67),
      wildflower: new THREE.Color(0x65a350),
      reed: new THREE.Color(0x6b7c4a),
      fern: new THREE.Color(0x4a6b3a),
      crystal: new THREE.Color(0x7bb8c7),
      shrub: new THREE.Color(0x5a7a3a),
      thicket: new THREE.Color(0x3d5a2a)
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    const biomeColor = baseColor.clone().multiply(biomeConfig.colorModifier);
    
    // Enhanced seasonal variations for more dramatic changes
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

  // Updated debug methods for position-based system
  public static getDebugBiomeInfo(position: THREE.Vector3): {
    position: THREE.Vector3;
    biomeData: { biomeType: BiomeType; strength: number };
    organicInfluences: Array<{ biomeType: BiomeType; influence: number; distance: number }>;
    organicBiomeCount: number;
  } {
    const biomeData = this.getBiomeAtPosition(position);
    const organicInfluences = BiomeSeedManager.getBiomeInfluenceAtPosition(position);
    const organicBiomes = BiomeSeedManager.getOrganicBiomesAt(position);
    
    console.log(`🔍 POSITION-BASED DEBUG at ${position.x}, ${position.z}:`);
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
    console.log('🧹 POSITION-BASED BIOME: All caches cleared, forcing regeneration');
  }

  public static forceRegenerateAllBiomes(): void {
    this.clearCache();
    console.log('🔄 POSITION-BASED BIOME: Forced complete regeneration');
  }
}
