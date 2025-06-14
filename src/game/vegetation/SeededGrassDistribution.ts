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
    
    // Get chunk seed for consistent randomization
    const chunkSeed = DeterministicBiomeManager.getChunkSeed(chunk);
    const seededRandom = this.createSeededRandom(chunkSeed + (isGroundGrass ? 1000 : 0));
    
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];

    // Base spacing for grass distribution
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
        
        // SHARP BOUNDARY: Query biome at each individual grass position
        const biomeData = DeterministicBiomeManager.getBiomeAtPosition(worldPos);
        const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeData.biomeType);
        const groundConfig = DeterministicBiomeManager.getGroundConfiguration(biomeData.biomeType);
        
        // Use PURE biome-based density (no strength blending)
        const density = isGroundGrass 
          ? groundConfig.densityMultiplier
          : biomeConfig.densityMultiplier;
        
        // SHARP BOUNDARY: Pure biome-based spawn probability (no noise blending)
        const spawnProbability = this.calculateSharpBiomeSpawnProbability(
          biomeData.biomeType,
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // PURE biome-based scale (no strength blending)
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
          
          // PURE biome-based species selection
          species.push(this.selectBiomeSpecificSpecies(biomeData.biomeType, isGroundGrass, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 SHARP BOUNDARIES: Generated ${isGroundGrass ? 'ground' : 'tall'} grass for chunk ${chunkKey}: ${positions.length} blades with pure biome properties`);
    
    return grassData;
  }

  /**
   * SHARP BOUNDARY: Pure biome-based spawn probability with no noise blending
   */
  private static calculateSharpBiomeSpawnProbability(
    biomeType: string,
    seededRandom: () => number
  ): number {
    // PURE biome-based probability - no position noise or strength blending
    const biomeProbabilities = {
      meadow: 0.95,    // High grass density in meadow
      prairie: 0.75,   // Lower grass density in prairie  
      normal: 0.85     // Baseline density
    };
    
    let probability = biomeProbabilities[biomeType as keyof typeof biomeProbabilities] || 0.85;
    
    // Add minimal seeded randomness but keep it biome-pure
    probability *= (0.9 + seededRandom() * 0.2);
    
    return MathUtils.clamp(probability, 0.5, 0.98);
  }

  private static getBiomeScaleMultiplier(biomeType: string, isGroundGrass: boolean): number {
    // PURE biome-based height differences with no blending
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

  private static selectBiomeSpecificSpecies(biomeType: string, isGroundGrass: boolean, seededRandom: () => number): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    // Get PURE biome-specific species distribution (no blending)
    const config = isGroundGrass 
      ? DeterministicBiomeManager.getGroundConfiguration(biomeType as any)
      : DeterministicBiomeManager.getBiomeConfiguration(biomeType as any);
    
    const weights = Object.values(config.speciesDistribution);
    const random = seededRandom();
    
    let cumulativeWeight = 0;
    for (let i = 0; i < speciesOptions.length; i++) {
      cumulativeWeight += weights[i];
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
