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
    
    // ENHANCED: Multi-scale noise layers for patchier biome distribution
    // Large patches (100-200 units)
    const largeScaleNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 500, 
      4,
      0.5, 
      2.0, 
      0.004  // Lower frequency for larger patterns
    );
    
    // Medium patches (30-70 units)
    const mediumScaleNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 1000, 
      3, 
      0.5, 
      2.0, 
      0.015  // Medium frequency
    );
    
    // Small patches (10-20 units)
    const smallScaleNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 1500, 
      2, 
      0.5, 
      2.0, 
      0.05  // Higher frequency for micro-variations
    );
    
    // Micro variations (1-5 units)
    const microNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 2000, 
      2, 
      0.5, 
      2.0, 
      0.2  // Very high frequency for tiny details
    );
    
    // ENHANCED: Domain warping for irregular patch shapes
    const warpStrength = 50.0; // Increased from 15.0 for more dramatic warping
    const warpedPos = new THREE.Vector3(
      position.x + (largeScaleNoise - 0.5) * warpStrength,
      position.y,
      position.z + (mediumScaleNoise - 0.5) * warpStrength
    );
    
    // NEW: Environmental factors influence
    // Simulate elevation with noise
    const elevation = FractalNoiseSystem.getFractalNoise(position, worldSeed + 3000, 4, 0.5, 2.0, 0.002);
    // Simulate water proximity
    const waterProximity = FractalNoiseSystem.getWarpedNoise(position, worldSeed + 3500, 30.0);
    // Simulate soil richness
    const soilRichness = FractalNoiseSystem.getFractalNoise(position, worldSeed + 4000, 3, 0.5, 2.0, 0.008);
    
    // Combine noise layers with different weights for natural patchiness
    const baseBiomeNoise = largeScaleNoise * 0.35 +  // Large areas
                           mediumScaleNoise * 0.3 +   // Medium patches
                           smallScaleNoise * 0.25 +   // Small details
                           microNoise * 0.1;          // Micro variations
    
    // ENHANCED: Voronoi influence for cellular patches (increased from 20% to 50%)
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(
      position, 
      worldSeed, 
      0.002  // Smaller cells for more varied patches
    );
    
    // Apply 50% Voronoi influence for distinct cell-based patches
    let combinedNoise = baseBiomeNoise * 0.5 + voronoiData.value * 0.5;
    
    // NEW: Apply environmental influences
    // Meadows prefer lower elevation, wetter areas, and rich soil
    const meadowAffinity = (1.0 - elevation) * 0.5 + waterProximity * 0.3 + soilRichness * 0.2;
    // Prairies prefer higher elevation, drier areas, and moderate soil
    const prairieAffinity = elevation * 0.5 + (1.0 - waterProximity) * 0.3 + (0.5 - Math.abs(soilRichness - 0.5)) * 0.2;
    // Normal grasslands prefer middle elevations and moderate conditions
    const normalAffinity = (1.0 - Math.abs(elevation - 0.5) * 2.0) * 0.4 + 
                           (1.0 - Math.abs(waterProximity - 0.5) * 2.0) * 0.3 + 
                           (1.0 - Math.abs(soilRichness - 0.5) * 2.0) * 0.3;
    
    // Blend environmental affinity with noise (60% noise, 40% environmental factors)
    const environmentalInfluence = 0.4;
    const noiseInfluence = 1.0 - environmentalInfluence;
    
    // Adjusted thresholds based on environmental factors
    let primaryBiome: BiomeType = 'normal';
    let primaryStrength = 1.0;
    let secondaryBiome: BiomeType | null = null;
    let secondaryStrength = 0.0;
    
    // Apply environmental influence to biome selection
    // Use the highest affinity score to bias biome selection
    const maxAffinity = Math.max(meadowAffinity, prairieAffinity, normalAffinity);
    
    if (maxAffinity === meadowAffinity) {
      // Bias toward meadow
      combinedNoise = combinedNoise * noiseInfluence + 0.8 * environmentalInfluence;
    } else if (maxAffinity === prairieAffinity) {
      // Bias toward prairie
      combinedNoise = combinedNoise * noiseInfluence + 0.2 * environmentalInfluence;
    } else {
      // Bias toward normal
      combinedNoise = combinedNoise * noiseInfluence + 0.5 * environmentalInfluence;
    }
    
    // REBALANCED: Equal distribution thresholds (~33% each)
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
    
    // ENHANCED: Stronger secondary biome influence for better transitions
    if (primaryBiome === 'meadow') {
      // Meadows more likely to transition to normal than prairie
      secondaryBiome = combinedNoise < 0.75 ? 'normal' : 'prairie';
      secondaryStrength = 1.0 - primaryStrength;
    } else if (primaryBiome === 'prairie') {
      // Prairies more likely to transition to normal than meadow
      secondaryBiome = combinedNoise > 0.25 ? 'normal' : 'meadow';
      secondaryStrength = 1.0 - primaryStrength;
    } else {
      // Normal areas can transition to either meadow or prairie
      secondaryBiome = combinedNoise > 0.5 ? 'meadow' : 'prairie';
      secondaryStrength = 1.0 - primaryStrength;
    }
    
    // ENHANCED: Variable transition widths for more natural boundaries
    // Use noise to vary transition width between min and max
    const edgeDetailNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 5000, 
      3, 
      0.5, 
      2.0, 
      0.05
    );
    
    // Calculate wider transition zones (5-25 units) for more gradual blending
    const transitionWidth = this.MIN_TRANSITION_WIDTH + 
      edgeDetailNoise * (this.MAX_TRANSITION_WIDTH - this.MIN_TRANSITION_WIDTH);
    
    // Calculate distance to nearest biome boundary
    const distanceToBoundary = Math.abs(primaryStrength - 0.5) * 2.0 * transitionWidth;
    const isTransitionZone = distanceToBoundary < transitionWidth;
    
    // ENHANCED: Smoother transitions using improved smoothstep function
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
