import * as THREE from 'three';
import { MathUtils } from '../utils/math/MathUtils';
import { EnvironmentalFactors } from './EnvironmentalGrassDistribution';
import { ChunkCoordinate, DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';
import { BiomeManager } from './biomes/BiomeManager';
import { GrassSystem } from './GrassSystem';

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
    
    // OPTIMIZED DENSITY: Increased spacing by 20% to reduce grass density for better FPS
    const baseSpacing = isGroundGrass ? 2.4 : 3.8; // Increased by 20% from 2.0 and 3.2
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
        
        // Use seeded noise for spawn probability - INCREASED for 2x density
        const spawnProbability = this.calculateSeededSpawnProbability(
          worldPos, 
          biomeData.seed, 
          seededRandom
        );
        
        if (seededRandom() < spawnProbability) {
          // Check if position overlaps with any building floor
          if (this.isPositionInBuildingFloor(worldPos)) {
            continue; // Skip this position
          }
          
          positions.push(worldPos);
          
          // Generate seeded scale with ENHANCED BIOME-SPECIFIC variation including position-based height
          const biomeScaleMultiplier = this.getBiomeScaleMultiplier(biomeData.biomeType, isGroundGrass);
          
          // Use position-based height multiplier for meadow biomes
          const positionBasedHeightMultiplier = BiomeManager.getBiomeHeightMultiplier(biomeData.biomeType, worldPos);
          
          const baseScale = isGroundGrass ? 0.7 : 1.4; // Increased base scales
          const scaleVariation = positionBasedHeightMultiplier * biomeScaleMultiplier;
          
          scales.push(new THREE.Vector3(
            baseScale * (0.6 + seededRandom() * 0.8), // More variation
            baseScale * scaleVariation * (0.7 + seededRandom() * 0.6),
            baseScale * (0.6 + seededRandom() * 0.8)
          ));
          
          // Generate seeded rotation
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            seededRandom() * Math.PI * 2
          ));
          
          // Select species based on biome - now with enhanced diversity
          species.push(this.selectSeededSpecies(biomeData.biomeType, seededRandom));
        }
      }
    }

    const grassData: SeededGrassData = { positions, scales, rotations, species };
    cache.set(cacheKey, grassData);
    
    console.log(`🌱 Generated DENSE seeded ${isGroundGrass ? 'ground' : 'tall'} grass for chunk ${chunkKey}: ${positions.length} blades`);
    
    return grassData;
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
    
    // OPTIMIZED PROBABILITY: Reduced by 20% for better FPS
    let probability = 0.68 + combinedNoise * 0.12; // Reduced from 0.85
    
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
  
  private static isPositionInBuildingFloor(position: THREE.Vector3): boolean {
    const buildingManager = GrassSystem.getBuildingManager();
    if (!buildingManager) {
      return false; // No building manager, allow grass everywhere
    }
    
    const buildingBounds = buildingManager.getBuildingFloorBounds();
    
    for (const bounds of buildingBounds) {
      if (position.x >= bounds.minX && position.x <= bounds.maxX &&
          position.z >= bounds.minZ && position.z <= bounds.maxZ) {
        return true; // Position is inside a building floor
      }
    }
    
    return false; // Position is not inside any building floor
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
