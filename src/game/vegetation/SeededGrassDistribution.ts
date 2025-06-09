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
    const chunkSize = 64; // DeterministicBiomeManager.CHUNK_SIZE
    
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
    
    // Significantly increased density - reduced spacing for much denser grass
    const baseSpacing = isGroundGrass ? 1.8 : 2.5; // Reduced from 2.8 and 4.5
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
        
        // Use seeded noise for spawn probability - significantly increased
        const spawnProbability = this.calculateSeededSpawnProbability(
          worldPos, 
          biomeData.seed, 
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Generate seeded scale with increased variation
          const baseScale = isGroundGrass ? 0.7 : 1.3; // Increased from 0.6 and 1.2
          const scaleVariation = biomeConfig.heightMultiplier;
          scales.push(new THREE.Vector3(
            baseScale * (0.7 + seededRandom() * 0.6),
            baseScale * scaleVariation * (0.8 + seededRandom() * 0.4),
            baseScale * (0.7 + seededRandom() * 0.6)
          ));
          
          // Generate seeded rotation
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            seededRandom() * Math.PI * 2
          ));
          
          // Select species based on biome
          species.push(this.selectSeededSpecies(biomeData.biomeType, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated seeded ${isGroundGrass ? 'ground' : 'tall'} grass for chunk ${chunkKey}: ${positions.length} blades`);
    
    return grassData;
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
    seededRandom: () => number
  ): number {
    // Use seeded noise for consistent spawn patterns
    const noiseX = Math.sin(position.x * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // Significantly increased base probability
    let probability = 0.9 + combinedNoise * 0.15; // Increased from 0.75
    
    // Add some randomness but keep it seeded
    probability *= (0.85 + seededRandom() * 0.3); // Slightly less variation
    
    return MathUtils.clamp(probability, 0.6, 0.98); // Increased minimum from 0.3 to 0.6
  }

  private static selectSeededSpecies(biomeType: string, seededRandom: () => number): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    const weights = {
      normal: [0.4, 0.2, 0.3, 0.1],
      meadow: [0.7, 0.1, 0.1, 0.1],
      prairie: [0.2, 0.6, 0.1, 0.1]
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
