import * as THREE from 'three';
import { MathUtils } from '../utils/math/MathUtils';
import { EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { ChunkCoordinate, DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';
import { BiomeBlendingSystem } from './biomes/BiomeBlendingSystem';

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
    
    const seededRandom = this.createSeededRandom(biomeData.seed + (isGroundGrass ? 1000 : 0));
    
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];

    // Use blended biome data for smooth transitions
    const blendedBiomeData = BiomeBlendingSystem.getBlendedBiomeData(chunkCenter.x, chunkCenter.z);
    
    const density = isGroundGrass 
      ? blendedBiomeData.blendedDensity * 7.0 // Ground grass multiplier
      : blendedBiomeData.blendedDensity;
    
    // Adjust spacing based on blended density for smooth transitions
    const baseSpacing = isGroundGrass ? 2.0 : 3.2;
    const spacing = baseSpacing / Math.sqrt(density);
    
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    for (let x = startX; x < startX + chunkSize; x += spacing) {
      for (let z = startZ; z < startZ + chunkSize; z += spacing) {
        const offsetX = (seededRandom() - 0.5) * spacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * spacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // Get position-specific biome data for realistic transitions
        const positionBiomeData = BiomeBlendingSystem.getBlendedBiomeData(worldPos.x, worldPos.z);
        
        const spawnProbability = this.calculatePositionSpecificSpawnProbability(
          worldPos, 
          positionBiomeData,
          biomeData.seed, 
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Use blended height for smooth scaling transitions
          const baseScale = isGroundGrass ? 0.7 : 1.4;
          const scaleVariation = positionBiomeData.blendedHeight;
          
          scales.push(new THREE.Vector3(
            baseScale * (0.6 + seededRandom() * 0.8),
            baseScale * scaleVariation * (0.7 + seededRandom() * 0.6),
            baseScale * (0.6 + seededRandom() * 0.8)
          ));
          
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            seededRandom() * Math.PI * 2
          ));
          
          // Select species based on blended biome influences
          species.push(this.selectBlendedSpecies(positionBiomeData, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated realistic blended ${isGroundGrass ? 'ground' : 'tall'} grass for chunk ${chunkKey}: ${positions.length} blades`);
    
    return grassData;
  }

  private static calculatePositionSpecificSpawnProbability(
    position: THREE.Vector3,
    blendedBiomeData: any,
    seed: number,
    seededRandom: () => number
  ): number {
    // Use seeded noise for consistent spawn patterns
    const noiseX = Math.sin(position.x * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // Base probability influenced by blended density
    let probability = 0.75 + combinedNoise * 0.2;
    
    // Adjust based on transition strength (less grass in heavy transition zones)
    const transitionPenalty = blendedBiomeData.transitionStrength * 0.15;
    probability -= transitionPenalty;
    
    // Add randomness
    probability *= (0.85 + seededRandom() * 0.3);
    
    return MathUtils.clamp(probability, 0.4, 0.95);
  }

  private static selectBlendedSpecies(blendedBiomeData: any, seededRandom: () => number): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    // Weight species selection based on biome influences
    let weights = [0.25, 0.25, 0.25, 0.25]; // Default equal weights
    
    for (const influence of blendedBiomeData.influences) {
      const biomeWeights = this.getSpeciesWeightsForBiome(influence.type);
      for (let i = 0; i < weights.length; i++) {
        weights[i] += biomeWeights[i] * influence.strength * 0.8;
      }
    }
    
    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    weights = weights.map(w => w / totalWeight);
    
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

  private static getSpeciesWeightsForBiome(biomeType: string): number[] {
    const weights = {
      normal: [0.4, 0.25, 0.25, 0.1],
      meadow: [0.8, 0.05, 0.05, 0.1],
      prairie: [0.1, 0.7, 0.15, 0.05]
    };
    
    return weights[biomeType as keyof typeof weights] || weights.normal;
  }

  private static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
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
