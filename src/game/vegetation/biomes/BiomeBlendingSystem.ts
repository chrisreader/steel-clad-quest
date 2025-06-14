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
   * Calculate pure chaotic biome influence at a specific world position
   * Creates completely random, organic boundaries with 5-25 unit transition zones
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
    
    // ENHANCED: Multi-scale pure chaos layers for maximum patch variety
    // Large patches (80-150 units) - reduced weight
    const largeScaleNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 500, 
      4,
      0.5, 
      2.0, 
      0.005  // Slightly higher frequency
    );
    
    // Medium patches (20-60 units) - INCREASED weight
    const mediumScaleNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 1000, 
      4, 
      0.6, 
      2.2, 
      0.02   // Higher frequency for smaller patches
    );
    
    // Small patches (5-15 units) - INCREASED weight
    const smallScaleNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 1500, 
      3, 
      0.7, 
      2.5, 
      0.06   // Much higher frequency
    );
    
    // Micro variations (1-5 units) - NEW chaos layer
    const microNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 2000, 
      3, 
      0.5, 
      2.0, 
      0.15   // Very high frequency for chaos
    );
    
    // Ultra-micro chaos (0.5-2 units) - NEW ultra chaos layer
    const ultraMicroNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 2500, 
      2, 
      0.4, 
      2.0, 
      0.3    // Extremely high frequency
    );
    
    // ENHANCED: Much stronger domain warping for maximum irregular shapes
    const warpStrength = 100.0; // Increased from 50.0 for extreme chaos
    const warpedPos = new THREE.Vector3(
      position.x + (largeScaleNoise - 0.5) * warpStrength,
      position.y,
      position.z + (mediumScaleNoise - 0.5) * warpStrength
    );
    
    // Additional warping layers for ultra-organic shapes
    const secondaryWarp = FractalNoiseSystem.getFractalNoise(warpedPos, worldSeed + 3000, 3, 0.6, 2.0, 0.008);
    const finalWarpedPos = new THREE.Vector3(
      warpedPos.x + (secondaryWarp - 0.5) * 30.0,
      warpedPos.y,
      warpedPos.z + (smallScaleNoise - 0.5) * 30.0
    );
    
    // Combine all chaos layers with enhanced weights for maximum randomness
    const baseBiomeNoise = largeScaleNoise * 0.15 +    // Large areas (reduced)
                           mediumScaleNoise * 0.35 +   // Medium patches (increased)
                           smallScaleNoise * 0.3 +     // Small details (increased)
                           microNoise * 0.15 +         // Micro chaos (new)
                           ultraMicroNoise * 0.05;     // Ultra chaos (new)
    
    // ENHANCED: Much stronger Voronoi influence for cellular chaos (70% instead of 50%)
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(
      position, 
      worldSeed, 
      0.004  // Higher density for smaller, more chaotic cells
    );
    
    // Apply 70% Voronoi influence for maximum cellular chaos
    let combinedNoise = baseBiomeNoise * 0.3 + voronoiData.value * 0.7;
    
    // Add final chaos layers from warped positions
    const warpedChaoNoise = FractalNoiseSystem.getFractalNoise(finalWarpedPos, worldSeed + 4000, 3, 0.5, 2.0, 0.02);
    combinedNoise = combinedNoise * 0.8 + warpedChaoNoise * 0.2;
    
    // Pure random biome selection (no environmental factors)
    let primaryBiome: BiomeType = 'normal';
    let primaryStrength = 1.0;
    let secondaryBiome: BiomeType | null = null;
    let secondaryStrength = 0.0;
    
    // Equal distribution thresholds (~33% each) with pure randomness
    if (combinedNoise > 0.66) {
      primaryBiome = 'meadow';
      primaryStrength = Math.min(1.0, (combinedNoise - 0.66) * 3.0);
    } else if (combinedNoise < 0.33) {
      primaryBiome = 'prairie';
      primaryStrength = Math.min(1.0, (0.33 - combinedNoise) * 3.0);
    } else {
      primaryBiome = 'normal';
      primaryStrength = 1.0 - Math.abs(combinedNoise - 0.5) * 2.0;
    }
    
    // ENHANCED: Stronger secondary biome influence for chaotic transitions
    if (primaryBiome === 'meadow') {
      // Random transitions to any other biome
      secondaryBiome = combinedNoise < 0.75 ? 'normal' : 'prairie';
      secondaryStrength = 1.0 - primaryStrength;
    } else if (primaryBiome === 'prairie') {
      // Random transitions to any other biome
      secondaryBiome = combinedNoise > 0.25 ? 'normal' : 'meadow';
      secondaryStrength = 1.0 - primaryStrength;
    } else {
      // Normal areas can transition to either randomly
      secondaryBiome = combinedNoise > 0.5 ? 'meadow' : 'prairie';
      secondaryStrength = 1.0 - primaryStrength;
    }
    
    // ENHANCED: Variable transition widths with chaos for organic boundaries
    const edgeDetailNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 5000, 
      4, 
      0.6, 
      2.0, 
      0.08  // Higher frequency for more chaotic edges
    );
    
    // Calculate chaotic transition zones (5-25 units) 
    const transitionWidth = this.MIN_TRANSITION_WIDTH + 
      edgeDetailNoise * (this.MAX_TRANSITION_WIDTH - this.MIN_TRANSITION_WIDTH);
    
    // Calculate distance to nearest biome boundary with chaos
    const distanceToBoundary = Math.abs(primaryStrength - 0.5) * 2.0 * transitionWidth;
    const isTransitionZone = distanceToBoundary < transitionWidth;
    
    // ENHANCED: Chaotic transitions using improved smoothstep function
    if (isTransitionZone) {
      const blendFactor = Math.max(0, Math.min(1, distanceToBoundary / transitionWidth));
      const smoothBlend = this.smoothStep(blendFactor);
      
      // Add some chaos to the blend for more organic transitions
      const blendChaos = FractalNoiseSystem.getFractalNoise(position, worldSeed + 6000, 2, 0.4, 2.0, 0.1);
      const chaoticBlend = smoothBlend * 0.8 + blendChaos * 0.2;
      
      primaryStrength = 0.5 + Math.max(0, Math.min(0.5, chaoticBlend * 0.5));
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
