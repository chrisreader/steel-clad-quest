
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

    const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunk);
    const chunkSize = 64; // DeterministicBiomeManager.CHUNK_SIZE
    
    // Create seeded random generator for this chunk
    const chunkSeed = DeterministicBiomeManager.getChunkSeed(chunk);
    const seededRandom = this.createSeededRandom(chunkSeed + (isGroundGrass ? 1000 : 0));
    
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];

    // FIXED: Use position-based biome queries instead of chunk-based
    const baseSpacing = isGroundGrass ? 2.0 : 3.2;
    
    // Generate grass positions using seeded sampling
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    for (let x = startX; x < startX + chunkSize; x += baseSpacing) {
      for (let z = startZ; z < startZ + chunkSize; z += baseSpacing) {
        // Add some randomness to avoid grid patterns
        const offsetX = (seededRandom() - 0.5) * baseSpacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * baseSpacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // CRITICAL FIX: Query biome at exact grass blade position
        const biomeData = DeterministicBiomeManager.getBiomeAtPosition(worldPos);
        const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeData.biomeType);
        
        // Apply biome-specific density per position
        const biomeDensity = isGroundGrass 
          ? DeterministicBiomeManager.getGroundConfiguration(biomeData.biomeType).densityMultiplier
          : biomeConfig.densityMultiplier;
        
        // Calculate position-specific spawn probability
        const spawnProbability = this.calculatePositionBasedSpawnProbability(
          worldPos, 
          biomeData,
          biomeDensity,
          chunkSeed, 
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Apply biome-specific scaling per position
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
          
          // Select species based on position-specific biome
          species.push(this.selectBiomeSpecificSpecies(biomeData.biomeType, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    // Debug: Show biome diversity within chunk
    const uniqueBiomes = new Set(species);
    console.log(`🌱 ORGANIC CHUNK ${chunkKey}: ${positions.length} blades, ${uniqueBiomes.size} species types (per-position biome queries)`);
    
    return grassData;
  }

  private static calculatePositionBasedSpawnProbability(
    position: THREE.Vector3,
    biomeData: { biomeType: string; strength: number },
    biomeDensity: number,
    seed: number,
    seededRandom: () => number
  ): number {
    // Enhanced base probability based on biome type
    const biomeBaseProbability = {
      'meadow': 0.95,    // Very dense
      'prairie': 0.65,   // Moderate density  
      'normal': 0.80     // Standard density
    };
    
    const baseProbability = biomeBaseProbability[biomeData.biomeType as keyof typeof biomeBaseProbability] || 0.80;
    
    // Use seeded noise for consistent spawn patterns
    const noiseX = Math.sin(position.x * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // Apply biome density multiplier and strength
    let probability = baseProbability * biomeDensity * biomeData.strength;
    probability += combinedNoise * 0.15;
    
    // Add seeded randomness
    probability *= (0.85 + seededRandom() * 0.3);
    
    return MathUtils.clamp(probability, 0.1, 0.98);
  }

  private static getBiomeScaleMultiplier(biomeType: string, isGroundGrass: boolean): number {
    // Enhanced height differences between biomes
    const heightMultipliers = {
      normal: 1.0,
      meadow: isGroundGrass ? 1.2 : 1.4, // Tall, lush grass
      prairie: isGroundGrass ? 0.7 : 0.8, // Shorter, wind-swept
      wetland: isGroundGrass ? 1.3 : 1.5, // Very tall, dense
      dry: isGroundGrass ? 0.5 : 0.6, // Short, sparse
      forest: isGroundGrass ? 0.9 : 1.1 // Moderate height
    };
    
    return heightMultipliers[biomeType as keyof typeof heightMultipliers] || 1.0;
  }

  private static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
  }

  private static selectBiomeSpecificSpecies(biomeType: string, seededRandom: () => number): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    // DRAMATICALLY ENHANCED species distribution for obvious biome differences
    const weights = {
      normal: [0.4, 0.25, 0.25, 0.1], // Balanced
      meadow: [0.8, 0.05, 0.05, 0.1], // Dominated by meadow species
      prairie: [0.1, 0.7, 0.15, 0.05], // Dominated by prairie species
      wetland: [0.6, 0.1, 0.25, 0.05], // Wet-loving species
      dry: [0.05, 0.8, 0.1, 0.05], // Drought-resistant
      forest: [0.3, 0.2, 0.4, 0.1] // Mixed with clustering
    };
    
    const biomeWeights = weights[biomeType as keyof typeof weights] || weights.normal;
    const random = seededRandom();
    
    let cumulativeWeight = 0;
    for (let i = 0; i < speciesOptions.length; i++) {
      cumulativeWeight += biomeWeights[i];
      if (random <= cumulativeWeight) {
        return speciesOptions[i];
      }
    }
    
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
