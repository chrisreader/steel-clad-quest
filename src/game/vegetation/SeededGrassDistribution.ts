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
    
    const baseSpacing = isGroundGrass ? 1.5 : 2.8;
    
    // Generate grass positions using seeded sampling
    const startX = chunkCenter.x - chunkSize / 2;
    const startZ = chunkCenter.z - chunkSize / 2;
    
    // Get biome info for this chunk to use in logging
    const chunkBiomeInfo = DeterministicBiomeManager.getBiomeInfo(chunkCenter);
    
    for (let x = startX; x < startX + chunkSize; x += baseSpacing) {
      for (let z = startZ; z < startZ + chunkSize; z += baseSpacing) {
        const offsetX = (seededRandom() - 0.5) * baseSpacing * 0.8;
        const offsetZ = (seededRandom() - 0.5) * baseSpacing * 0.8;
        
        const worldPos = new THREE.Vector3(x + offsetX, 0, z + offsetZ);
        
        // Get PURE biome at this position - NO BLENDING unless at edge
        const biomeInfo = DeterministicBiomeManager.getBiomeInfo(worldPos);
        
        // Use PURE biome config for dramatic differences
        const biomeConfig = isGroundGrass
          ? DeterministicBiomeManager.getGroundConfiguration(biomeInfo.type)
          : DeterministicBiomeManager.getBiomeConfiguration(biomeInfo.type);
        
        // Apply EXTREME density differences
        const densityMultiplier = biomeConfig.densityMultiplier;
        
        // Calculate spawn probability with DRAMATIC biome differences
        const spawnProbability = this.calculateBiomeSpawnProbability(
          worldPos, 
          chunkSeed, 
          seededRandom,
          densityMultiplier,
          biomeInfo.type
        );
        
        if (seededRandom() < spawnProbability) {
          positions.push(worldPos);
          
          // Use EXTREME height differences
          const heightMultiplier = isGroundGrass
            ? (1.0 - ('heightReduction' in biomeConfig ? biomeConfig.heightReduction : 0.7))
            : ('heightMultiplier' in biomeConfig ? biomeConfig.heightMultiplier : 1.0);
          
          // Apply biome-specific scaling
          let baseScale = isGroundGrass ? 0.6 : 1.2;
          
          // EXTREME scaling differences based on biome
          if (biomeInfo.type === 'meadow') {
            baseScale *= isGroundGrass ? 1.8 : 2.2; // Much larger in meadow
          } else if (biomeInfo.type === 'prairie') {
            baseScale *= isGroundGrass ? 0.4 : 0.4; // Much smaller in prairie
          }
          
          const scaleVariation = heightMultiplier * (0.8 + seededRandom() * 0.4);
          
          scales.push(new THREE.Vector3(
            baseScale * (0.7 + seededRandom() * 0.6), 
            baseScale * scaleVariation * (0.8 + seededRandom() * 0.4),
            baseScale * (0.7 + seededRandom() * 0.6)
          ));
          
          // Generate rotation
          const randomRotation = seededRandom() * Math.PI * 2;
          
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            randomRotation
          ));
          
          // Select PURE biome species
          species.push(this.selectPureBiomeSpecies(biomeInfo, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated EXTREME ${chunkBiomeInfo.type} biome grass for chunk ${chunkKey}: ${positions.length} blades (density: ${DeterministicBiomeManager.getBiomeConfiguration(chunkBiomeInfo.type).densityMultiplier}x)`);
    
    return grassData;
  }

  private static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
  }

  /**
   * Calculate spawn probability with EXTREME biome differences
   */
  private static calculateBiomeSpawnProbability(
    position: THREE.Vector3,
    seed: number,
    seededRandom: () => number,
    densityMultiplier: number,
    biomeType: string
  ): number {
    // Base probability varies dramatically by biome
    let baseProbability = 0.3; // Default
    
    if (biomeType === 'meadow') {
      baseProbability = 0.95; // Very high density
    } else if (biomeType === 'prairie') {
      baseProbability = 0.15; // Very low density
    } else {
      baseProbability = 0.5; // Normal density
    }
    
    // Apply density multiplier
    let probability = baseProbability * (densityMultiplier / 2.0);
    
    // Add some natural variation
    const naturalNoise = FractalNoiseSystem.getFractalNoise(position, seed + 4000, 2, 0.5, 2, 0.03);
    probability *= (0.8 + naturalNoise * 0.4);
    
    return MathUtils.clamp(probability, 0.05, 0.98);
  }

  /**
   * Select species based on PURE biome properties for clear distinction
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
