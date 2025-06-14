import * as THREE from 'three';
import { MathUtils } from '../utils/math/MathUtils';
import { EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { ChunkCoordinate, DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';
import { BiomeBlendingSystem } from './biomes/BiomeBlendingSystem';
import { FractalNoiseSystem } from './biomes/FractalNoiseSystem';
import { BiomeInfo } from './core/GrassConfig';

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
    const chunkSize = 64;
    
    // Create seeded random generator for this chunk
    const seededRandom = this.createSeededRandom(chunkSeed + (isGroundGrass ? 1000 : 0));
    
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];
    
    const baseSpacing = isGroundGrass ? 2.0 : 3.2;
    const spacing = baseSpacing;
    
    // Generate grass positions using seeded sampling
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    // Get biome info for this chunk to use in logging
    const chunkBiomeInfo = DeterministicBiomeManager.getBiomeInfo(chunkCenter);
    
    for (let x = startX; x < startX + chunkSize; x += spacing) {
      for (let z = startZ; z < startZ + chunkSize; z += spacing) {
        const offsetX = (seededRandom() - 0.5) * spacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * spacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // SIMPLIFIED: Get biome at this position - prefer pure biome properties
        const biomeInfo = DeterministicBiomeManager.getBiomeInfo(worldPos);
        
        // Use PURE biome config unless in immediate transition zone
        const biomeConfig = biomeInfo.transitionZone 
          ? (isGroundGrass 
             ? BiomeBlendingSystem.getBlendedGroundConfig(worldPos, chunkSeed)
             : BiomeBlendingSystem.getBlendedBiomeConfig(worldPos, chunkSeed))
          : (isGroundGrass
             ? DeterministicBiomeManager.getGroundConfiguration(biomeInfo.type)
             : DeterministicBiomeManager.getBiomeConfiguration(biomeInfo.type));
        
        // Apply PURE biome density for clear distinction
        const localDensity = biomeConfig.densityMultiplier;
        
        // Generate position noise for natural distribution
        const localNoise = FractalNoiseSystem.getWarpedNoise(worldPos, chunkSeed + 5000, 10);
        
        const spawnProbability = this.calculateSeededSpawnProbability(
          worldPos, 
          chunkSeed, 
          seededRandom,
          localDensity * (0.9 + localNoise * 0.2)
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Use PURE biome height properties for dramatic differences
          const heightMultiplier = isGroundGrass
            ? ('heightReduction' in biomeConfig ? biomeConfig.heightReduction : 0.7)
            : ('heightMultiplier' in biomeConfig ? biomeConfig.heightMultiplier : 1.0);
          
          const baseScale = isGroundGrass ? 0.7 : 1.4;
          
          // Add position-based variation
          const positionNoise = FractalNoiseSystem.getFractalNoise(worldPos, chunkSeed + 2000, 2, 0.5, 2, 0.02);
          const scaleVariation = heightMultiplier * (0.8 + positionNoise * 0.4);
          
          scales.push(new THREE.Vector3(
            baseScale * (0.6 + seededRandom() * 0.8), 
            baseScale * scaleVariation * (0.7 + seededRandom() * 0.6),
            baseScale * (0.6 + seededRandom() * 0.8)
          ));
          
          // Generate rotation with wind influence
          const windNoise = FractalNoiseSystem.getFractalNoise(worldPos, chunkSeed + 3000, 2, 0.5, 2, 0.001);
          const windDirection = windNoise * Math.PI * 2;
          
          const randomRotation = seededRandom() * Math.PI * 2;
          const finalRotation = randomRotation * 0.7 + windDirection * 0.3;
          
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            finalRotation
          ));
          
          // Select species based on PURE biome properties
          species.push(this.selectPureBiomeSpecies(biomeInfo, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated distinct biome grass for chunk ${chunkKey}: ${positions.length} blades with pure ${chunkBiomeInfo.type} characteristics`);
    
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
    const detailNoise = FractalNoiseSystem.getFractalNoise(position, seed + 4000, 3, 0.5, 2, 0.05);
    
    let probability = 0.85 + detailNoise * 0.15;
    probability *= densityFactor;
    probability *= (0.85 + seededRandom() * 0.3);
    
    return MathUtils.clamp(probability, 0.5 * densityFactor, 0.95 * densityFactor);
  }

  /**
   * SIMPLIFIED: Select species based on PURE biome properties for clear distinction
   */
  private static selectPureBiomeSpecies(
    biomeInfo: BiomeInfo,
    seededRandom: () => number
  ): string {
    const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeInfo.type);
    
    // Use pure biome species distribution for clear differences
    const random = seededRandom();
    let cumulativeWeight = 0;
    
    for (const [speciesName, probability] of Object.entries(biomeConfig.speciesDistribution)) {
      cumulativeWeight += probability;
      if (random <= cumulativeWeight) {
        return speciesName;
      }
    }
    
    return 'meadow'; // Default fallback
  }

  private static selectBlendedSpecies(
    position: THREE.Vector3,
    biomeInfluences: { biome: string, influence: number }[],
    seed: number,
    seededRandom: () => number
  ): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    if (biomeInfluences.length === 1) {
      return this.selectSeededSpecies(biomeInfluences[0].biome, seededRandom);
    }
    
    const blendedWeights: { [key: string]: number } = {
      meadow: 0, 
      prairie: 0, 
      clumping: 0, 
      fine: 0
    };
    
    let totalInfluence = 0;
    
    for (const { biome, influence } of biomeInfluences) {
      const biomeConfig = DeterministicBiomeManager.getBiomeConfiguration(biome as any);
      
      for (const [speciesName, probability] of Object.entries(biomeConfig.speciesDistribution)) {
        blendedWeights[speciesName] = (blendedWeights[speciesName] || 0) + probability * influence;
      }
      
      totalInfluence += influence;
    }
    
    for (const speciesName of Object.keys(blendedWeights)) {
      blendedWeights[speciesName] /= totalInfluence;
    }
    
    const localNoise = FractalNoiseSystem.getFractalNoise(position, seed + 5000, 2, 0.5, 2, 0.02);
    const primarySpecies = biomeInfluences[0].biome === 'meadow' ? 'meadow' : 
                          biomeInfluences[0].biome === 'prairie' ? 'prairie' : 'clumping';
    
    blendedWeights[primarySpecies] += localNoise * 0.2;
    
    let sum = 0;
    for (const value of Object.values(blendedWeights)) {
      sum += value;
    }
    
    for (const speciesName of Object.keys(blendedWeights)) {
      blendedWeights[speciesName] /= sum;
    }
    
    const random = seededRandom();
    let cumulativeWeight = 0;
    
    for (const [speciesName, weight] of Object.entries(blendedWeights)) {
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        return speciesName;
      }
    }
    
    return 'meadow';
  }

  private static selectSeededSpecies(biomeType: string, seededRandom: () => number): string {
    const speciesOptions = ['meadow', 'prairie', 'clumping', 'fine'];
    
    const weights = {
      normal: [0.4, 0.25, 0.25, 0.1],
      meadow: [0.8, 0.05, 0.05, 0.1],
      prairie: [0.1, 0.7, 0.15, 0.05],
      wetland: [0.6, 0.1, 0.25, 0.05],
      dry: [0.05, 0.8, 0.1, 0.05],
      forest: [0.3, 0.2, 0.4, 0.1]
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
