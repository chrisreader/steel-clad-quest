import * as THREE from 'three';
import { MathUtils } from '../utils/math/MathUtils';
import { EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { ChunkCoordinate, DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';

export interface SeededGrassData {
  positions: THREE.Vector3[];
  scales: THREE.Vector3[];
  rotations: THREE.Quaternion[];
  species: string[];
}

export class SeededGrassDistribution {
  private static grassCache: Map<string, SeededGrassData> = new Map();
  private static groundGrassCache: Map<string, SeededGrassData> = new Map();

  public static generateGrassForChunk(
    chunk: ChunkCoordinate,
    isGroundGrass: boolean = false
  ): SeededGrassData {
    const chunkKey = DeterministicBiomeManager.getChunkKey(chunk);
    const cacheKey = `${chunkKey}_${isGroundGrass ? 'ground' : 'tall'}`;
    
    const cache = isGroundGrass ? this.groundGrassCache : this.grassCache;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    const biomeData = DeterministicBiomeManager.getBiomeForChunk(chunk);
    const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunk);
    const chunkSize = 64;
    
    // Create seeded random generator for this chunk
    const seededRandom = this.createSeededRandom(biomeData.seed + (isGroundGrass ? 1000 : 0));
    
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];

    const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeData.biomeType);
    const density = isGroundGrass 
      ? DeterministicBiomeManager.getGroundConfiguration(biomeData.biomeType).densityMultiplier
      : biomeConfig.densityMultiplier;
    
    // Enhanced spacing based on biome characteristics
    let baseSpacing = isGroundGrass ? 2.0 : 3.2;
    
    // Special spacing adjustments for new biomes
    switch (biomeData.biomeType) {
      case 'dense_thicket':
        baseSpacing *= 0.5; // Much denser
        break;
      case 'sparse_steppe':
        baseSpacing *= 2.0; // Much sparser
        break;
      case 'lush_valley':
        baseSpacing *= 0.7; // Denser
        break;
    }
    
    const spacing = baseSpacing / Math.sqrt(density);
    
    // Generate grass positions using seeded sampling
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    for (let x = startX; x < startX + chunkSize; x += spacing) {
      for (let z = startZ; z < startZ + chunkSize; z += spacing) {
        // Add some randomness to avoid grid patterns
        const offsetX = (seededRandom() - 0.5) * spacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * spacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // Use seeded noise for spawn probability
        const spawnProbability = this.calculateSeededSpawnProbability(
          worldPos, 
          biomeData.seed, 
          seededRandom,
          biomeData.biomeType
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Generate seeded scale with biome-specific variation
          const biomeScaleMultiplier = this.getBiomeScaleMultiplier(biomeData.biomeType, isGroundGrass);
          const baseScale = isGroundGrass ? 0.7 : 1.4;
          const scaleVariation = biomeConfig.heightMultiplier * biomeScaleMultiplier;
          
          scales.push(new THREE.Vector3(
            baseScale * (0.6 + seededRandom() * 0.8),
            baseScale * scaleVariation * (0.7 + seededRandom() * 0.6),
            baseScale * (0.6 + seededRandom() * 0.8)
          ));
          
          // Generate seeded rotation
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            seededRandom() * Math.PI * 2
          ));
          
          // Select species based on biome
          species.push(this.selectSeededSpecies(biomeData.biomeType, seededRandom, isGroundGrass));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated ENHANCED seeded ${isGroundGrass ? 'ground' : 'tall'} grass for ${biomeData.biomeType} chunk ${chunkKey}: ${positions.length} blades`);
    
    return grassData;
  }

  private static getBiomeScaleMultiplier(biomeType: string, isGroundGrass: boolean): number {
    // Enhanced height differences between all 8 biomes
    const heightMultipliers: Record<string, number> = {
      normal: 1.0,
      meadow: isGroundGrass ? 1.2 : 1.4,
      prairie: isGroundGrass ? 0.7 : 0.8,
      wildflower_meadow: isGroundGrass ? 1.1 : 1.2,
      dense_thicket: isGroundGrass ? 1.5 : 2.0,
      sparse_steppe: isGroundGrass ? 0.4 : 0.5,
      rolling_savanna: isGroundGrass ? 0.8 : 0.9,
      lush_valley: isGroundGrass ? 1.4 : 1.8
    };
    
    return heightMultipliers[biomeType] || 1.0;
  }

  private static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
  }

  private static calculateSeededSpawnProbability(
    position: THREE.Vector3,
    seed: number,
    seededRandom: () => number,
    biomeType: string
  ): number {
    // Use seeded noise for consistent spawn patterns
    const noiseX = Math.sin(position.x * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // Base probability adjusted per biome
    let baseProbability = 0.85;
    switch (biomeType) {
      case 'dense_thicket':
        baseProbability = 0.95; // Very dense
        break;
      case 'sparse_steppe':
        baseProbability = 0.3; // Very sparse
        break;
      case 'lush_valley':
        baseProbability = 0.9; // Very lush
        break;
    }
    
    let probability = baseProbability + combinedNoise * 0.15;
    
    // Add some randomness but keep it seeded
    probability *= (0.85 + seededRandom() * 0.3);
    
    return MathUtils.clamp(probability, 0.1, 0.98);
  }

  private static selectSeededSpecies(biomeType: string, seededRandom: () => number, isGroundGrass: boolean): string {
    // Get species distribution from biome configuration
    const biomeConfig = isGroundGrass 
      ? DeterministicBiomeManager.getGroundConfiguration(biomeType as any)
      : DeterministicBiomeManager.getBiomeConfiguration(biomeType as any);
    
    const random = seededRandom();
    let cumulativeWeight = 0;
    
    for (const [species, probability] of Object.entries(biomeConfig.speciesDistribution)) {
      if (probability > 0) {
        cumulativeWeight += probability;
        if (random <= cumulativeWeight) {
          return species;
        }
      }
    }
    
    // Fallback to meadow
    return 'meadow';
  }

  public static clearCache(): void {
    this.grassCache.clear();
    this.groundGrassCache.clear();
  }

  public static getCacheSize(): { tall: number; ground: number } {
    return {
      tall: this.grassCache.size,
      ground: this.groundGrassCache.size
    };
  }
}
