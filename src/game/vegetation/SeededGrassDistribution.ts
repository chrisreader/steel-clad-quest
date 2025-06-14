import * as THREE from 'three';
import { MathUtils } from '../utils/math/MathUtils';
import { EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { ChunkCoordinate, DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';
import { BiomeBlendingSystem } from './biomes/BiomeBlendingSystem';
import { FractalNoiseSystem } from './biomes/FractalNoiseSystem';

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

    const chunkSeed = DeterministicBiomeManager.getChunkSeed(chunk);
    const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunk);
    const chunkSize = 64; // DeterministicBiomeManager.CHUNK_SIZE
    
    // Create seeded random generator for this chunk
    const seededRandom = this.createSeededRandom(chunkSeed + (isGroundGrass ? 1000 : 0));
    
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];
    
    // DOUBLED DENSITY: Reduced spacing significantly to achieve 2x density
    const baseSpacing = isGroundGrass ? 2.0 : 3.2; // Reduced from 2.8 and 4.5 for 2x density
    const spacing = baseSpacing; // We'll adjust per-position based on biome now
    
    // Generate grass positions using seeded sampling
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    // Use Poisson-like distribution for more natural spacing
    for (let x = startX; x < startX + chunkSize; x += spacing) {
      for (let z = startZ; z < startZ + chunkSize; z += spacing) {
        // Add some randomness to avoid grid patterns
        const offsetX = (seededRandom() - 0.5) * spacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * spacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // NEW: Get biome influence at this exact position for organic edges
        const biomeInfluences = BiomeBlendingSystem.getBiomeTypesAtPosition(worldPos, chunkSeed);
        
        // NEW: Get blended biome config at this position
        const biomeConfig = isGroundGrass
          ? BiomeBlendingSystem.getBlendedGroundConfig(worldPos, chunkSeed)
          : BiomeBlendingSystem.getBlendedBiomeConfig(worldPos, chunkSeed);
        
        // Adjust density based on blended biome properties
        const localDensity = biomeConfig.densityMultiplier;
        
        // Generate detailed position-specific noise for more natural distribution
        const localNoise = FractalNoiseSystem.getWarpedNoise(worldPos, chunkSeed + 5000, 10);
        
        // Use seeded noise for spawn probability
        const spawnProbability = this.calculateSeededSpawnProbability(
          worldPos, 
          chunkSeed, 
          seededRandom,
          localDensity * (0.9 + localNoise * 0.2)
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Generate seeded scale with blended biome-specific variation
          const heightMultiplier = isGroundGrass
            ? ('heightReduction' in biomeConfig ? biomeConfig.heightReduction : 0.7)
            : ('heightMultiplier' in biomeConfig ? biomeConfig.heightMultiplier : 1.0);
          
          const baseScale = isGroundGrass ? 0.7 : 1.4;
          
          // Add some position-based variation for more natural look
          const positionNoise = FractalNoiseSystem.getFractalNoise(worldPos, chunkSeed + 2000, 2, 0.5, 2, 0.02);
          const scaleVariation = heightMultiplier * (0.8 + positionNoise * 0.4);
          
          scales.push(new THREE.Vector3(
            baseScale * (0.6 + seededRandom() * 0.8), 
            baseScale * scaleVariation * (0.7 + seededRandom() * 0.6),
            baseScale * (0.6 + seededRandom() * 0.8)
          ));
          
          // Generate seeded rotation with wind direction influence
          const windNoise = FractalNoiseSystem.getFractalNoise(worldPos, chunkSeed + 3000, 2, 0.5, 2, 0.001);
          const windDirection = windNoise * Math.PI * 2;
          
          // Slightly align rotation with wind direction for more natural look
          const randomRotation = seededRandom() * Math.PI * 2;
          const finalRotation = randomRotation * 0.7 + windDirection * 0.3;
          
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            finalRotation
          ));
          
          // Select species based on blended biome influences
          species.push(this.selectBlendedSpecies(worldPos, biomeInfluences, chunkSeed, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated organic grass for chunk ${chunkKey}: ${positions.length} blades with realistic biome transitions`);
    
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
    seededRandom: () => number,
    densityFactor: number = 1.0
  ): number {
    // Use position-specific noise for natural distribution patterns
    const detailNoise = FractalNoiseSystem.getFractalNoise(position, seed + 4000, 3, 0.5, 2, 0.05);
    
    // Calculate spawn probability with noise and density factor
    let probability = 0.85 + detailNoise * 0.15;
    probability *= densityFactor; // Apply biome-specific density
    
    // Add some randomness but keep it seeded
    probability *= (0.85 + seededRandom() * 0.3);
    
    return MathUtils.clamp(probability, 0.5 * densityFactor, 0.95 * densityFactor);
  }

  private static selectBlendedSpecies(
    position: THREE.Vector3,
    biomeInfluences: { biome: string, influence: number }[],
    seed: number,
    seededRandom: () => number
  ): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    // If single biome, use standard selection
    if (biomeInfluences.length === 1) {
      return this.selectSeededSpecies(biomeInfluences[0].biome, seededRandom);
    }
    
    // Blend species probabilities from all influencing biomes
    const blendedWeights: { [key: string]: number } = {
      meadow: 0, 
      prairie: 0, 
      clumping: 0, 
      fine: 0
    };
    
    let totalInfluence = 0;
    
    // Calculate weighted species probabilities
    for (const { biome, influence } of biomeInfluences) {
      const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biome as any);
      
      for (const [speciesName, probability] of Object.entries(biomeConfig.speciesDistribution)) {
        blendedWeights[speciesName] = (blendedWeights[speciesName] || 0) + probability * influence;
      }
      
      totalInfluence += influence;
    }
    
    // Normalize weights
    for (const speciesName of Object.keys(blendedWeights)) {
      blendedWeights[speciesName] /= totalInfluence;
    }
    
    // Add some local variation based on position
    const localNoise = FractalNoiseSystem.getFractalNoise(position, seed + 5000, 2, 0.5, 2, 0.02);
    const primarySpecies = biomeInfluences[0].biome === 'meadow' ? 'meadow' : 
                          biomeInfluences[0].biome === 'prairie' ? 'prairie' : 'clumping';
    
    // Boost primary species probability based on noise
    blendedWeights[primarySpecies] += localNoise * 0.2;
    
    // Renormalize
    let sum = 0;
    for (const value of Object.values(blendedWeights)) {
      sum += value;
    }
    
    for (const speciesName of Object.keys(blendedWeights)) {
      blendedWeights[speciesName] /= sum;
    }
    
    // Select species using weighted probabilities
    const random = seededRandom();
    let cumulativeWeight = 0;
    
    for (const [speciesName, weight] of Object.entries(blendedWeights)) {
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        return speciesName;
      }
    }
    
    return 'meadow'; // Default fallback
  }

  /**
   * Legacy method for direct species selection
   */
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
