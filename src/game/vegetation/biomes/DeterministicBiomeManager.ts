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

  // DRAMATICALLY ENHANCED biome configurations with obvious visual differences
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Grassland',
      densityMultiplier: 1.0,
      heightMultiplier: 1.0,
      colorModifier: new THREE.Color(0x6db070), // Green
      speciesDistribution: { meadow: 0.4, prairie: 0.25, clumping: 0.25, fine: 0.1 },
      windExposure: 1.0
    },
    meadow: {
      name: 'Lush Meadow',
      densityMultiplier: 2.8,
      heightMultiplier: 1.8,
      colorModifier: new THREE.Color(0x2eb82e), // Bright green
      speciesDistribution: { meadow: 0.85, prairie: 0.05, clumping: 0.05, fine: 0.05 },
      windExposure: 0.5
    },
    prairie: {
      name: 'Open Prairie',
      densityMultiplier: 0.6,
      heightMultiplier: 0.6,
      colorModifier: new THREE.Color(0xe6e632), // Bright yellow-green
      speciesDistribution: { meadow: 0.05, prairie: 0.8, clumping: 0.1, fine: 0.05 },
      windExposure: 1.8
    }
  };

  // ENHANCED ground grass configurations with much higher density
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
    }
  };

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.chunkBiomeCache.clear();
    BiomeSeedManager.setWorldSeed(seed);
    console.log(`🌍 SHARP BIOME SYSTEM: World seed set to ${seed}, cache cleared`);
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
   * SHARP BOUNDARY: Position-based biome determination with no blending
   */
  public static getBiomeAtPosition(position: THREE.Vector3): { biomeType: BiomeType; strength: number } {
    const biomeInfluence = BiomeSeedManager.getBiomeInfluenceAtPosition(position);
    
    // SHARP BOUNDARIES: Use organic biome directly with FULL strength (no gradual strength)
    if (biomeInfluence.influences.length > 0) {
      console.log(`✅ SHARP POSITION BIOME: ${biomeInfluence.dominantBiome} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) - SHARP BOUNDARY`);
      return {
        biomeType: biomeInfluence.dominantBiome,
        strength: 1.0 // Always full strength for sharp boundaries
      };
    }
    
    // Fallback with sharp boundaries - no gradual noise
    const seed = this.worldSeed + Math.floor(position.x / 32) * 73856093 + Math.floor(position.z / 32) * 19349663;
    const noiseValue = this.seededNoise(position.x * 0.01, seed);
    
    // SHARP thresholds - no gradual transitions
    if (noiseValue > 0.3) {
      return { biomeType: 'meadow', strength: 1.0 };
    } else if (noiseValue > -0.3) {
      return { biomeType: 'prairie', strength: 1.0 };
    }
    
    return { biomeType: 'normal', strength: 1.0 };
  }

  public static getBiomeForChunk(chunk: ChunkCoordinate): ChunkBiomeData {
    const chunkKey = this.getChunkKey(chunk);
    
    if (this.chunkBiomeCache.has(chunkKey)) {
      return this.chunkBiomeCache.get(chunkKey)!;
    }

    // Use position-based biome for chunk center
    const centerPos = this.chunkToWorldPosition(chunk);
    const biomeData = this.getBiomeAtPosition(centerPos);
    const seed = this.getChunkSeed(chunk);
    
    const chunkBiomeData: ChunkBiomeData = {
      coordinate: chunk,
      biomeType: biomeData.biomeType,
      strength: 1.0, // Always full strength for sharp boundaries
      seed,
      influences: [{ biomeType: biomeData.biomeType, influence: 1.0, distance: 0 }]
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

  /**
   * SHARP BOUNDARY: Position-based biome info with no transition zones
   */
  public static getBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const biomeData = this.getBiomeAtPosition(position);
    
    // SHARP BOUNDARIES: No transition zones - always distinct biomes
    return {
      type: biomeData.biomeType,
      strength: 1.0, // Always full strength
      transitionZone: false // Never transition zones for sharp boundaries
    };
  }

  /**
   * SHARP BOUNDARY: Enhanced biome species color with no blending
   */
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
      fine: new THREE.Color(0x8bbf67)
    };
    
    const baseColor = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    
    // SHARP BOUNDARY: Pure biome color with no strength blending
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
    
    console.log(`🔍 SHARP BOUNDARY DEBUG at ${position.x}, ${position.z}:`);
    console.log(`  - Biome: ${biomeData.biomeType} (SHARP - strength: ${biomeData.strength})`);
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
    console.log('🧹 SHARP BOUNDARIES: All caches cleared, forcing regeneration');
  }

  public static forceRegenerateAllBiomes(): void {
    this.clearCache();
    console.log('🔄 SHARP BOUNDARIES: Forced complete regeneration');
  }
}
