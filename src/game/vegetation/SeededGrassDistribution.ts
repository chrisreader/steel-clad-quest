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
        
        // CRITICAL CHANGE: Query biome at each individual grass position
        const biomeData = DeterministicBiomeManager.getBiomeAtPosition(worldPos);
        const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeData.biomeType);
        const groundConfig = DeterministicBiomeManager.getGroundConfiguration(biomeData.biomeType);
        
        // Use position-specific density from the biome at this location
        const density = isGroundGrass 
          ? groundConfig.densityMultiplier
          : biomeConfig.densityMultiplier;
        
        // Adjust spacing based on biome-specific density
        const dynamicSpacing = baseSpacing / Math.sqrt(density);
        
        // Calculate spawn probability based on position and biome
        const spawnProbability = this.calculatePositionBasedSpawnProbability(
          worldPos, 
          biomeData,
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Generate biome-specific scale using position-based biome data
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
          species.push(this.selectBiomeSpecificSpecies(biomeData.biomeType, isGroundGrass, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated ORGANIC seeded ${isGroundGrass ? 'ground' : 'tall'} grass for chunk ${chunkKey}: ${positions.length} blades across multiple biomes`);
    
    return grassData;
  }

  private static calculatePositionBasedSpawnProbability(
    position: THREE.Vector3,
    biomeData: { biomeType: string; strength: number },
    seededRandom: () => number
  ): number {
    // Use seeded noise for consistent spawn patterns
    const noiseX = Math.sin(position.x * 0.05 + biomeData.strength * 100) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05 + biomeData.strength * 100) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // Base probability influenced by biome strength and type
    let probability = 0.7 + combinedNoise * 0.2;
    
    // Biome-specific probability modifiers
    const biomeModifiers = {
      meadow: 1.2,    // Higher grass density
      prairie: 0.8,   // Lower grass density
      normal: 1.0     // Baseline
    };
    
    const modifier = biomeModifiers[biomeData.biomeType as keyof typeof biomeModifiers] || 1.0;
    probability *= modifier;
    
    // Add randomness but keep it seeded
    probability *= (0.8 + seededRandom() * 0.4);
    
    return MathUtils.clamp(probability, 0.3, 0.95);
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

  private static selectBiomeSpecificSpecies(biomeType: string, isGroundGrass: boolean, seededRandom: () => number): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    // Get biome-specific species distribution
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
