import * as THREE from 'three';
import { BiomeType } from '../core/GrassConfig';
import { OrganicBiomeShape, OrganicBiomeGenerator } from './OrganicBiomeGenerator';
import { BiomeBlendingSystem, EnhancedBiomeData } from './BiomeBlendingSystem';

export interface BiomeSeedPoint {
  position: THREE.Vector3;
  biomeType: BiomeType;
  radius: number;
  strength: number;
  id: string;
}

export interface BiomeInfluenceData {
  dominantBiome: BiomeType;
  strength: number;
  influences: Array<{ biomeType: BiomeType; influence: number; distance: number }>;
}

export class BiomeSeedManager {
  private static worldSeed: number = 12345;
  private static organicBiomes: Map<string, OrganicBiomeShape[]> = new Map();
  private static generatedRegions: Set<string> = new Set();
  private static readonly REGION_SIZE = 512;

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.organicBiomes.clear();
    this.generatedRegions.clear();
    console.log(`🌍 Enhanced organic biome system initialized with seed: ${seed} (8 biome types)`);
  }

  private static getRegionKey(position: THREE.Vector3): string {
    const regionX = Math.floor(position.x / this.REGION_SIZE);
    const regionZ = Math.floor(position.z / this.REGION_SIZE);
    return `${regionX}_${regionZ}`;
  }

  private static generateOrganicBiomesForRegion(regionX: number, regionZ: number): void {
    const regionKey = `${regionX}_${regionZ}`;
    if (this.generatedRegions.has(regionKey)) return;

    // Generate organic biomes for this region with all 8 biome types
    const organicBiomes = BiomeBlendingSystem.generateOrganicBiomeLayout(
      this.worldSeed,
      regionX,
      regionZ,
      this.REGION_SIZE
    );

    this.organicBiomes.set(regionKey, organicBiomes);
    this.generatedRegions.add(regionKey);
    
    console.log(`🌿 Generated ${organicBiomes.length} enhanced organic biomes for region ${regionKey}`);
  }

  public static getBiomeInfluenceAtPosition(position: THREE.Vector3): BiomeInfluenceData {
    // Ensure organic biomes are generated for this area and surrounding regions
    const currentRegionX = Math.floor(position.x / this.REGION_SIZE);
    const currentRegionZ = Math.floor(position.z / this.REGION_SIZE);
    
    // Generate biomes for 3x3 grid around current region
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.generateOrganicBiomesForRegion(currentRegionX + dx, currentRegionZ + dz);
      }
    }

    // Collect all relevant organic biomes
    const relevantBiomes: OrganicBiomeShape[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const regionKey = `${currentRegionX + dx}_${currentRegionZ + dz}`;
        const regionBiomes = this.organicBiomes.get(regionKey);
        if (regionBiomes) {
          relevantBiomes.push(...regionBiomes);
        }
      }
    }

    // Calculate enhanced biome influence using the new system
    const enhancedData = BiomeBlendingSystem.calculateEnhancedBiomeInfluence(
      position,
      relevantBiomes
    );

    // Convert to legacy format for compatibility
    return {
      dominantBiome: enhancedData.dominantBiome,
      strength: enhancedData.totalInfluence,
      influences: enhancedData.influences.map(inf => ({
        biomeType: inf.biomeType,
        influence: inf.influence,
        distance: inf.distance
      })).slice(0, 3)
    };
  }

  public static getAllSeedPoints(): BiomeSeedPoint[] {
    const seedPoints: BiomeSeedPoint[] = [];
    
    for (const [regionKey, biomes] of this.organicBiomes) {
      biomes.forEach((biome, index) => {
        seedPoints.push({
          position: biome.center,
          biomeType: biome.biomeType,
          radius: biome.baseRadius,
          strength: biome.strength,
          id: `${regionKey}_organic_${index}`
        });
      });
    }
    
    return seedPoints;
  }

  public static getSeedPointsInRadius(center: THREE.Vector3, radius: number): BiomeSeedPoint[] {
    return this.getAllSeedPoints().filter(seed => 
      seed.position.distanceTo(center) <= radius
    );
  }

  public static clearCache(): void {
    this.organicBiomes.clear();
    this.generatedRegions.clear();
    console.log('🧹 Enhanced organic biome cache cleared');
  }

  public static getDebugInfo(): {
    totalSeeds: number;
    generatedRegions: number;
    biomeCounts: Record<BiomeType, number>;
  } {
    const biomeCounts: Record<BiomeType, number> = {
      normal: 0,
      meadow: 0,
      prairie: 0,
      wildflower_meadow: 0,
      dense_thicket: 0,
      sparse_steppe: 0,
      rolling_savanna: 0,
      lush_valley: 0
    };

    for (const biomes of this.organicBiomes.values()) {
      for (const biome of biomes) {
        biomeCounts[biome.biomeType]++;
      }
    }

    return {
      totalSeeds: this.getAllSeedPoints().length,
      generatedRegions: this.generatedRegions.size,
      biomeCounts
    };
  }

  public static getOrganicBiomesAt(position: THREE.Vector3): OrganicBiomeShape[] {
    const regionKey = this.getRegionKey(position);
    return this.organicBiomes.get(regionKey) || [];
  }

  public static getEnhancedBiomeData(position: THREE.Vector3): EnhancedBiomeData {
    const currentRegionX = Math.floor(position.x / this.REGION_SIZE);
    const currentRegionZ = Math.floor(position.z / this.REGION_SIZE);
    
    // Ensure biomes are generated
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.generateOrganicBiomesForRegion(currentRegionX + dx, currentRegionZ + dz);
      }
    }

    // Collect relevant biomes
    const relevantBiomes: OrganicBiomeShape[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const regionKey = `${currentRegionX + dx}_${currentRegionZ + dz}`;
        const regionBiomes = this.organicBiomes.get(regionKey);
        if (regionBiomes) {
          relevantBiomes.push(...regionBiomes);
        }
      }
    }

    return BiomeBlendingSystem.calculateEnhancedBiomeInfluence(position, relevantBiomes);
  }
}
