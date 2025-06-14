import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration, GroundGrassConfiguration } from '../core/GrassConfig';
import { FractalNoiseSystem } from './FractalNoiseSystem';
import { DeterministicBiomeManager } from './DeterministicBiomeManager';

/**
 * Represents the influence of multiple biomes at a single position
 */
export interface BiomeInfluence {
  // Primary biome at this position
  primaryBiome: BiomeType;
  // Strength of the primary biome (0-1)
  primaryStrength: number;
  // Secondary biome (if in a transition zone)
  secondaryBiome: BiomeType | null;
  // Strength of secondary biome (0-1)
  secondaryStrength: number;
  // Whether this position is in a transition zone
  isTransitionZone: boolean;
  // Width of the transition zone in units (5-25)
  transitionWidth: number;
}

/**
 * Manages biome blending and creates smooth transitions between biomes
 */
export class BiomeBlendingSystem {
  private static biomeInfluenceCache: Map<string, BiomeInfluence> = new Map();
  private static readonly CACHE_PRECISION = 2; // Cache positions rounded to nearest 2 units
  private static readonly MIN_TRANSITION_WIDTH = 5;
  private static readonly MAX_TRANSITION_WIDTH = 25;
  
  /**
   * Calculate biome influence at a specific world position
   * Creates organic, blended biome boundaries with 5-25 unit transition zones
   */
  public static getBiomeInfluenceAtPosition(
    position: THREE.Vector3, 
    worldSeed: number = 12345
  ): BiomeInfluence {
    // Round position for caching
    const cacheKey = this.getCacheKey(position);
    if (this.biomeInfluenceCache.has(cacheKey)) {
      return this.biomeInfluenceCache.get(cacheKey)!;
    }
    
    // Enhanced multi-frequency noise for better biome distribution
    const temperatureNoise = FractalNoiseSystem.getWarpedNoise(position, worldSeed, 15);
    const moistureNoise = FractalNoiseSystem.getWarpedNoise(position, worldSeed + 1000, 15);
    const elevationNoise = FractalNoiseSystem.getFractalNoise(position, worldSeed + 2000, 5, 0.5, 2.0, 0.001);
    
    // Additional noise layer for more variation
    const detailNoise = FractalNoiseSystem.getFractalNoise(position, worldSeed + 3000, 3, 0.5, 2.0, 0.01);
    
    // Combine noise values for primary biome factor
    const combinedFactor = (temperatureNoise * 0.4 + moistureNoise * 0.4 + elevationNoise * 0.1 + detailNoise * 0.1);
    
    // REBALANCED: Equal distribution thresholds (~33% each)
    let primaryBiome: BiomeType = 'normal';
    let primaryStrength = 1.0;
    let secondaryBiome: BiomeType | null = null;
    let secondaryStrength = 0.0;
    
    if (combinedFactor > 0.66) {
      primaryBiome = 'meadow';
      primaryStrength = Math.min(1.0, (combinedFactor - 0.66) * 3.0);
    } else if (combinedFactor < 0.33) {
      primaryBiome = 'prairie';
      primaryStrength = Math.min(1.0, (0.33 - combinedFactor) * 3.0);
    } else {
      primaryBiome = 'normal';
      primaryStrength = 1.0 - Math.abs(combinedFactor - 0.5) * 2.0;
    }
    
    // Determine secondary biome for transitions
    const meadowScore = temperatureNoise;
    const prairieScore = moistureNoise;
    const normalScore = 1.0 - (meadowScore + prairieScore) / 2;
    
    if (primaryBiome === 'meadow') {
      if (prairieScore > normalScore) {
        secondaryBiome = 'prairie';
        secondaryStrength = prairieScore;
      } else {
        secondaryBiome = 'normal';
        secondaryStrength = normalScore;
      }
    } else if (primaryBiome === 'prairie') {
      if (meadowScore > normalScore) {
        secondaryBiome = 'meadow';
        secondaryStrength = meadowScore;
      } else {
        secondaryBiome = 'normal';
        secondaryStrength = normalScore;
      }
    } else {
      if (meadowScore > prairieScore) {
        secondaryBiome = 'meadow';
        secondaryStrength = meadowScore;
      } else {
        secondaryBiome = 'prairie';
        secondaryStrength = prairieScore;
      }
    }
    
    // Voronoi clustering for natural biome patches
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(position, worldSeed, 0.001);
    primaryStrength = primaryStrength * 0.7 + voronoiData.value * 0.3;
    
    // Calculate transition zones
    const edgeDetailNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 3000, 
      3, 
      0.5, 
      2.0, 
      0.05
    );
    
    const transitionWidth = this.MIN_TRANSITION_WIDTH + 
      edgeDetailNoise * (this.MAX_TRANSITION_WIDTH - this.MIN_TRANSITION_WIDTH);
    
    const distanceToBoundary = Math.abs(primaryStrength - 0.5) * 2.0 * transitionWidth;
    const isTransitionZone = distanceToBoundary < transitionWidth;
    
    if (isTransitionZone) {
      const blendFactor = Math.max(0, Math.min(1, distanceToBoundary / transitionWidth));
      const smoothBlend = this.smoothStep(blendFactor);
      
      primaryStrength = 0.5 + smoothBlend * 0.5;
      secondaryStrength = 1.0 - primaryStrength;
    } else {
      primaryStrength = Math.min(1.0, primaryStrength * 1.2);
      secondaryStrength = 0;
    }
    
    const result: BiomeInfluence = {
      primaryBiome,
      primaryStrength,
      secondaryBiome,
      secondaryStrength,
      isTransitionZone,
      transitionWidth
    };
    
    this.biomeInfluenceCache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * Get biome types and their relative influences at a position
   * Returns array of objects with biome type and influence strength
   */
  public static getBiomeTypesAtPosition(
    position: THREE.Vector3,
    worldSeed: number = 12345
  ): { biome: BiomeType; influence: number }[] {
    const biomeInfluence = this.getBiomeInfluenceAtPosition(position, worldSeed);
    
    const result: { biome: BiomeType; influence: number }[] = [
      { biome: biomeInfluence.primaryBiome, influence: biomeInfluence.primaryStrength }
    ];
    
    if (biomeInfluence.isTransitionZone && biomeInfluence.secondaryBiome) {
      result.push({ 
        biome: biomeInfluence.secondaryBiome, 
        influence: biomeInfluence.secondaryStrength 
      });
    }
    
    return result;
  }
  
  /**
   * Calculate blended biome configuration for a position
   * Returns weighted average of configs based on biome influences
   */
  public static getBlendedBiomeConfig(
    position: THREE.Vector3,
    worldSeed: number = 12345
  ): BiomeConfiguration {
    const biomeInfluences = this.getBiomeTypesAtPosition(position, worldSeed);
    
    // Start with default config
    const baseConfig = DeterministicBiomeManager.getBiomeConfiguration('normal');
    let result: BiomeConfiguration = { ...baseConfig };
    
    // If only one biome, return its config
    if (biomeInfluences.length === 1) {
      return DeterministicBiomeManager.getBiomeConfiguration(biomeInfluences[0].biome);
    }
    
    // Blend configurations
    let totalColor = new THREE.Color(0, 0, 0);
    let totalDensity = 0;
    let totalHeight = 0;
    let totalWind = 0;
    const speciesDistribution: { meadow: number; prairie: number; clumping: number; fine: number } = {
      meadow: 0,
      prairie: 0,
      clumping: 0,
      fine: 0
    };
    let totalInfluence = 0;
    
    for (const { biome, influence } of biomeInfluences) {
      const config = DeterministicBiomeManager.getBiomeConfiguration(biome);
      totalColor.add(config.colorModifier.clone().multiplyScalar(influence));
      totalDensity += config.densityMultiplier * influence;
      totalHeight += config.heightMultiplier * influence;
      totalWind += config.windExposure * influence;
      
      speciesDistribution.meadow += config.speciesDistribution.meadow * influence;
      speciesDistribution.prairie += config.speciesDistribution.prairie * influence;
      speciesDistribution.clumping += config.speciesDistribution.clumping * influence;
      speciesDistribution.fine += config.speciesDistribution.fine * influence;
      
      totalInfluence += influence;
    }
    
    const normFactor = 1 / totalInfluence;
    
    speciesDistribution.meadow *= normFactor;
    speciesDistribution.prairie *= normFactor;
    speciesDistribution.clumping *= normFactor;
    speciesDistribution.fine *= normFactor;
    
    result = {
      name: 'Blended Biome',
      densityMultiplier: totalDensity * normFactor,
      heightMultiplier: totalHeight * normFactor,
      colorModifier: totalColor.multiplyScalar(normFactor),
      speciesDistribution,
      windExposure: totalWind * normFactor
    };
    
    return result;
  }
  
  /**
   * Calculate blended ground grass configuration for a position
   */
  public static getBlendedGroundConfig(
    position: THREE.Vector3,
    worldSeed: number = 12345
  ): GroundGrassConfiguration {
    const biomeInfluences = this.getBiomeTypesAtPosition(position, worldSeed);
    
    // Start with default config
    const baseConfig = DeterministicBiomeManager.getGroundConfiguration('normal');
    let result: GroundGrassConfiguration = { ...baseConfig };
    
    // If only one biome, return its config
    if (biomeInfluences.length === 1) {
      return DeterministicBiomeManager.getGroundConfiguration(biomeInfluences[0].biome);
    }
    
    // Blend configurations
    let totalDensity = 0;
    let totalHeightReduction = 0;
    let totalWindReduction = 0;
    const speciesDistribution: { meadow: number; prairie: number; clumping: number; fine: number } = {
      meadow: 0,
      prairie: 0,
      clumping: 0,
      fine: 0
    };
    let totalInfluence = 0;
    
    for (const { biome, influence } of biomeInfluences) {
      const config = DeterministicBiomeManager.getGroundConfiguration(biome);
      totalDensity += config.densityMultiplier * influence;
      totalHeightReduction += config.heightReduction * influence;
      totalWindReduction += config.windReduction * influence;
      
      speciesDistribution.meadow += config.speciesDistribution.meadow * influence;
      speciesDistribution.prairie += config.speciesDistribution.prairie * influence;
      speciesDistribution.clumping += config.speciesDistribution.clumping * influence;
      speciesDistribution.fine += config.speciesDistribution.fine * influence;
      
      totalInfluence += influence;
    }
    
    const normFactor = 1 / totalInfluence;
    
    speciesDistribution.meadow *= normFactor;
    speciesDistribution.prairie *= normFactor;
    speciesDistribution.clumping *= normFactor;
    speciesDistribution.fine *= normFactor;
    
    result = {
      densityMultiplier: totalDensity * normFactor,
      heightReduction: totalHeightReduction * normFactor,
      speciesDistribution,
      windReduction: totalWindReduction * normFactor
    };
    
    return result;
  }
  
  /**
   * Get a smoothly blended biome color for a grass species at a position
   */
  public static getBlendedBiomeColor(
    species: string,
    position: THREE.Vector3,
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer',
    worldSeed: number = 12345
  ): THREE.Color {
    const biomeInfluences = this.getBiomeTypesAtPosition(position, worldSeed);
    
    if (biomeInfluences.length === 1) {
      const biomeInfo = {
        type: biomeInfluences[0].biome,
        strength: 1.0,
        transitionZone: false
      };
      return DeterministicBiomeManager.getBiomeSpeciesColor(species, biomeInfo, season);
    }
    
    const resultColor = new THREE.Color(0, 0, 0);
    let totalInfluence = 0;
    
    for (const { biome, influence } of biomeInfluences) {
      const biomeInfo = {
        type: biome,
        strength: influence,
        transitionZone: true
      };
      
      const color = DeterministicBiomeManager.getBiomeSpeciesColor(species, biomeInfo, season);
      resultColor.add(color.clone().multiplyScalar(influence));
      totalInfluence += influence;
    }
    
    return resultColor.multiplyScalar(1 / totalInfluence);
  }
  
  /**
   * Get cache key for a position (round to lower precision)
   */
  private static getCacheKey(position: THREE.Vector3): string {
    const x = Math.round(position.x / this.CACHE_PRECISION) * this.CACHE_PRECISION;
    const z = Math.round(position.z / this.CACHE_PRECISION) * this.CACHE_PRECISION;
    return `${x}_${z}`;
  }
  
  /**
   * Smooth step function for nicer transitions
   */
  private static smoothStep(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  /**
   * Clear the biome influence cache
   */
  public static clearCache(): void {
    this.biomeInfluenceCache.clear();
  }
}
