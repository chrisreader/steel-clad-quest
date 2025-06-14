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
    
    const seededRandom = this.createSeededRandom(biomeData.seed + (isGroundGrass ? 1000 : 0));
    
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];

    // Base density from chunk's dominant biome
    const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeData.biomeType);
    const density = isGroundGrass 
      ? DeterministicBiomeManager.getGroundConfiguration(biomeData.biomeType).densityMultiplier
      : biomeConfig.densityMultiplier;
    
    const baseSpacing = isGroundGrass ? 2.0 : 3.2;
    const spacing = baseSpacing / Math.sqrt(density);
    
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    for (let x = startX; x < startX + chunkSize; x += spacing) {
      for (let z = startZ; z < startZ + chunkSize; z += spacing) {
        const offsetX = (seededRandom() - 0.5) * spacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * spacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // ENHANCED: Sample biome at exact grass position for smooth transitions
        const blendedBiomeInfo = DeterministicBiomeManager.getBlendedBiomeAtPosition(worldPos);
        
        // Calculate spawn probability using blended biome data
        const spawnProbability = this.calculateBlendedSpawnProbability(
          worldPos, 
          blendedBiomeInfo,
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Use blended height multiplier for smooth scale transitions
          const baseScale = isGroundGrass ? 0.7 : 1.4;
          const scaleVariation = blendedBiomeInfo.blendedHeight;
          
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
          species.push(this.selectBlendedSpecies(blendedBiomeInfo, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated organic ${isGroundGrass ? 'ground' : 'tall'} grass for chunk ${chunkKey}: ${positions.length} blades with realistic biome edges`);
    
    return grassData;
  }

  /**
   * Calculate spawn probability using blended biome information
   */
  private static calculateBlendedSpawnProbability(
    position: THREE.Vector3,
    blendedBiomeInfo: any, // BlendedBiomeInfo type
    seededRandom: () => number
  ): number {
    // Use blended density for spawn probability
    const baseProbability = Math.min(0.9, blendedBiomeInfo.blendedDensity * 0.45);
    
    // Add position-based noise for organic variation
    const noiseX = Math.sin(position.x * 0.05) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    let probability = baseProbability + combinedNoise * 0.15;
    
    // Add transition zone variation - more variation in transition areas
    if (blendedBiomeInfo.transitionStrength > 0.3) {
      const transitionVariation = blendedBiomeInfo.transitionStrength * 0.2;
      probability += (seededRandom() - 0.5) * transitionVariation;
    }
    
    return MathUtils.clamp(probability, 0.3, 0.95);
  }

  /**
   * Select species based on blended biome influences
   */
  private static selectBlendedSpecies(blendedBiomeInfo: any, seededRandom: () => number): string {
    const availableSpecies = blendedBiomeInfo.blendedSpecies;
    
    if (availableSpecies.length === 0) {
      return 'meadow';
    }
    
    // In transition zones, randomly select from available species
    if (blendedBiomeInfo.transitionStrength > 0.4) {
      return availableSpecies[Math.floor(seededRandom() * availableSpecies.length)];
    }
    
    // In dominant biome areas, weight toward the most appropriate species
    const speciesWeights: { [key: string]: number } = {};
    
    for (const [biomeType, influence] of blendedBiomeInfo.biomeInfluences.entries()) {
      const config = DeterministicBiomeManager.getBiomeConfiguration(biomeType);
      
      for (const [species, weight] of Object.entries(config.speciesDistribution)) {
        if (!speciesWeights[species]) {
          speciesWeights[species] = 0;
        }
        speciesWeights[species] += weight * influence;
      }
    }
    
    // Select species based on weighted probability
    const random = seededRandom();
    let cumulativeWeight = 0;
    const totalWeight = Object.values(speciesWeights).reduce((sum, weight) => sum + weight, 0);
    
    for (const [species, weight] of Object.entries(speciesWeights)) {
      cumulativeWeight += weight / totalWeight;
      if (random <= cumulativeWeight) {
        return species;
      }
    }
    
    return 'meadow';
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

  private static calculateSeededSpawnProbability(
    position: THREE.Vector3,
    seed: number,
    seededRandom: () => number
  ): number {
    // Use seeded noise for consistent spawn patterns
    const noiseX = Math.sin(position.x * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const noiseZ = Math.cos(position.z * 0.05 + seed * 0.001) * 0.5 + 0.5;
    const combinedNoise = (noiseX + noiseZ) / 2;
    
    // INCREASED base probability for 2x density - increased from 0.75
    let probability = 0.85 + combinedNoise * 0.15;
    
    // Add some randomness but keep it seeded
    probability *= (0.85 + seededRandom() * 0.3);
    
    return MathUtils.clamp(probability, 0.5, 0.95); // Increased minimum from 0.3 to 0.5
  }

  private static selectSeededSpecies(biomeType: string, seededRandom: () => number): string {
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
