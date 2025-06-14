
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
    
    // Realistic spacing for natural appearance
    const baseSpacing = isGroundGrass ? 2.0 : 3.2;
    const spacing = baseSpacing / Math.sqrt(density);
    
    // Generate grass positions using seeded sampling
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    for (let x = startX; x < startX + chunkSize; x += spacing) {
      for (let z = startZ; z < startZ + chunkSize; z += spacing) {
        // Add natural clustering variation
        const offsetX = (seededRandom() - 0.5) * spacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * spacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // Use seeded noise for natural spawn probability
        const spawnProbability = this.calculateSeededSpawnProbability(
          worldPos, 
          biomeData.seed, 
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // REDUCED realistic scale with biome-specific variation
          const biomeScaleMultiplier = this.getBiomeScaleMultiplier(biomeData.biomeType, isGroundGrass);
          const baseScale = isGroundGrass ? 0.5 : 0.8; // Reduced from 0.7 and 1.4
          const scaleVariation = biomeConfig.heightMultiplier * biomeScaleMultiplier;
          
          // Natural height variation within realistic range
          const heightVariation = 0.6 + seededRandom() * 0.8; // 0.6-1.4x variation
          
          scales.push(new THREE.Vector3(
            baseScale * (0.6 + seededRandom() * 0.8),
            baseScale * scaleVariation * heightVariation,
            baseScale * (0.6 + seededRandom() * 0.8)
          ));
          
          // Generate seeded rotation
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            seededRandom() * Math.PI * 2
          ));
          
          // Enhanced species diversity for realistic meadows
          species.push(this.selectSeededSpecies(biomeData.biomeType, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated realistic ${isGroundGrass ? 'ground' : 'tall'} grass for chunk ${chunkKey}: ${positions.length} blades`);
    
    return grassData;
  }

  private static getBiomeScaleMultiplier(biomeType: string, isGroundGrass: boolean): number {
    // More realistic height differences between biomes
    const heightMultipliers = {
      normal: 1.0,
      meadow: isGroundGrass ? 1.0 : 1.1, // Slightly taller but realistic
      prairie: isGroundGrass ? 0.7 : 0.8, // Shorter, wind-swept
      wetland: isGroundGrass ? 1.2 : 1.3, // Taller in wet areas
      dry: isGroundGrass ? 0.5 : 0.6, // Short, sparse
      forest: isGroundGrass ? 0.8 : 0.9 // Moderate height in shade
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

  private static calculateSeededSpawnProbability(
    position: THREE.Vector3,
    seed: number,
    seededRandom: () => number
  ): number {
    // Natural clustering with seeded noise
    const noiseX = Math.sin(position.x * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // More natural probability distribution
    let probability = 0.75 + combinedNoise * 0.2;
    
    // Add natural randomness
    probability *= (0.8 + seededRandom() * 0.4);
    
    return MathUtils.clamp(probability, 0.4, 0.9);
  }

  private static selectSeededSpecies(biomeType: string, seededRandom: () => number): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    // ENHANCED species distribution for realistic meadows
    const weights = {
      normal: [0.4, 0.25, 0.25, 0.1], // Balanced mix
      meadow: [0.6, 0.05, 0.1, 0.25], // More diverse with fine grasses
      prairie: [0.1, 0.7, 0.15, 0.05], // Dominated by prairie species
      wetland: [0.5, 0.1, 0.3, 0.1], // Wet-loving species
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
