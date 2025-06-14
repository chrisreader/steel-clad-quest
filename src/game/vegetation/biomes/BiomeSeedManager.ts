
import * as THREE from 'three';
import { BiomeType } from '../core/GrassConfig';
import { BiomeBlendingSystem, EnhancedBiomeData } from './BiomeBlendingSystem';
import { OrganicBiomeShape } from './OrganicBiomeGenerator';

export class BiomeSeedManager {
  private static worldSeed: number = 12345;
  private static organicBiomeCache: Map<string, OrganicBiomeShape[]> = new Map();
  private static readonly REGION_SIZE = 512;

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.organicBiomeCache.clear();
    console.log(`🌱 SHARP BIOME MANAGER: World seed set to ${seed}`);
  }

  public static getBiomeInfluenceAtPosition(position: THREE.Vector3): {
    dominantBiome: BiomeType;
    strength: number;
    influences: Array<{ biomeType: BiomeType; influence: number; distance: number }>;
  } {
    const organicBiomes = this.getOrganicBiomesAt(position);
    const biomeData = BiomeBlendingSystem.calculateEnhancedBiomeInfluence(position, organicBiomes);
    
    return {
      dominantBiome: biomeData.dominantBiome,
      strength: biomeData.totalInfluence,
      influences: biomeData.influences
    };
  }

  public static getOrganicBiomesAt(position: THREE.Vector3): OrganicBiomeShape[] {
    // Get region coordinates
    const regionX = Math.floor(position.x / this.REGION_SIZE);
    const regionZ = Math.floor(position.z / this.REGION_SIZE);
    const regionKey = `${regionX}_${regionZ}`;
    
    if (this.organicBiomeCache.has(regionKey)) {
      return this.organicBiomeCache.get(regionKey)!;
    }

    // Generate organic biomes for this region
    const organicBiomes = BiomeBlendingSystem.generateOrganicBiomeLayout(
      this.worldSeed,
      regionX,
      regionZ,
      this.REGION_SIZE
    );

    this.organicBiomeCache.set(regionKey, organicBiomes);
    return organicBiomes;
  }

  public static clearCache(): void {
    this.organicBiomeCache.clear();
    console.log('🧹 SHARP BIOME MANAGER: Cache cleared');
  }

  public static getCacheSize(): number {
    return this.organicBiomeCache.size;
  }
}
