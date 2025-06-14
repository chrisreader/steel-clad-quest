
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
    
    // Generate multiple noise values for different biome factors
    const temperatureNoise = FractalNoiseSystem.getWarpedNoise(position, worldSeed, 15);
    const moistureNoise = FractalNoiseSystem.getWarpedNoise(position, worldSeed + 1000, 15);
    const elevationNoise = FractalNoiseSystem.getFractalNoise(position, worldSeed + 2000, 5, 0.5, 2.0, 0.001);
    
    // Generate Voronoi cells for biome clustering
    const voronoiData = FractalNoiseSystem.getVoronoiNoise(position, worldSeed, 0.001);
    
    // Determine biome types based on the combined factors
    // Use temperature as the primary factor
    let primaryBiome: BiomeType = 'normal';
    let primaryStrength = 1.0;
    let secondaryBiome: BiomeType | null = null;
    let secondaryStrength = 0.0;
    
    // Biome determination based on noise values
    if (temperatureNoise > 0.55) {
      primaryBiome = 'meadow';
      primaryStrength = Math.min(1.0, (temperatureNoise - 0.55) * 4.0);
    } else if (moistureNoise > 0.5) {
      primaryBiome = 'prairie';
      primaryStrength = Math.min(1.0, (moistureNoise - 0.5) * 4.0);
    }
    
    // Calculate the closest competing biome for transitions
    const meadowScore = temperatureNoise;
    const prairieScore = moistureNoise;
    const normalScore = 1.0 - (meadowScore + prairieScore) / 2;
    
    // Determine which biomes are competing in this area
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
    
    // Adjust strength based on Voronoi cells for more clustered biomes
    primaryStrength = primaryStrength * 0.7 + voronoiData.value * 0.3;
    
    // Determine if we're in a transition zone and calculate width
    // Higher noise frequency near boundaries for more detailed edges
    const edgeDetailNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 3000, 
      3, 
      0.5, 
      2.0, 
      0.05
    );
    
    // Calculate transition zone width (5-25 units)
    const transitionWidth = this.MIN_TRANSITION_WIDTH + 
      edgeDetailNoise * (this.MAX_TRANSITION_WIDTH - this.MIN_TRANSITION_WIDTH);
    
    // Determine if we're in a transition zone by checking proximity to boundary
    const distanceToBoundary = Math.abs(primaryStrength - 0.5) * 2.0 * transitionWidth;
    const isTransitionZone = distanceToBoundary < transitionWidth;
    
    // Adjust strengths in transition zone for smooth blending
    if (isTransitionZone) {
      // Calculate blend factor (0-1) based on distance to boundary
      const blendFactor = Math.max(0, Math.min(1, distanceToBoundary / transitionWidth));
      
      // Smooth curve for more natural blending
      const smoothBlend = this.smoothStep(blendFactor);
      
      // Adjust primary and secondary strengths
      primaryStrength = 0.5 + smoothBlend * 0.5;
      secondaryStrength = 1.0 - primaryStrength;
    } else {
      // Outside transition zone, primary biome dominates
      primaryStrength = Math.min(1.0, primaryStrength * 1.2);
      secondaryStrength = 0;
    }
    
    // Create result
    const result: BiomeInfluence = {
      primaryBiome,
      primaryStrength,
      secondaryBiome,
      secondaryStrength,
      isTransitionZone,
      transitionWidth
    };
    
    // Cache result
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
    const speciesDistribution: Record<string, number> = {};
    let totalInfluence = 0;
    
    // Calculate weighted sums
    for (const { biome, influence } of biomeInfluences) {
      const config = DeterministicBiomeManager.getBiomeConfiguration(biome);
      totalColor.add(config.colorModifier.clone().multiplyScalar(influence));
      totalDensity += config.densityMultiplier * influence;
      totalHeight += config.heightMultiplier * influence;
      totalWind += config.windExposure * influence;
      
      // Blend species distributions
      for (const [species, probability] of Object.entries(config.speciesDistribution)) {
        speciesDistribution[species] = (speciesDistribution[species] || 0) + probability * influence;
      }
      
      totalInfluence += influence;
    }
    
    // Normalize the result
    const normFactor = 1 / totalInfluence;
    
    // Build blended config
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
    const speciesDistribution: Record<string, number> = {};
    let totalInfluence = 0;
    
    // Calculate weighted sums
    for (const { biome, influence } of biomeInfluences) {
      const config = DeterministicBiomeManager.getGroundConfiguration(biome);
      totalDensity += config.densityMultiplier * influence;
      totalHeightReduction += config.heightReduction * influence;
      totalWindReduction += config.windReduction * influence;
      
      // Blend species distributions
      for (const [species, probability] of Object.entries(config.speciesDistribution)) {
        speciesDistribution[species] = (speciesDistribution[species] || 0) + probability * influence;
      }
      
      totalInfluence += influence;
    }
    
    // Normalize
    const normFactor = 1 / totalInfluence;
    
    // Build blended config
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
    
    // If only one biome, use standard calculation
    if (biomeInfluences.length === 1) {
      const biomeInfo = {
        type: biomeInfluences[0].biome,
        strength: 1.0,
        transitionZone: false
      };
      return DeterministicBiomeManager.getBiomeSpeciesColor(species, biomeInfo, season);
    }
    
    // Start with black and blend colors
    const resultColor = new THREE.Color(0, 0, 0);
    let totalInfluence = 0;
    
    // Blend all contributing biome colors
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
    
    // Normalize
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
    // Improved smooth step: 6t^5 - 15t^4 + 10t^3
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  /**
   * Clear the biome influence cache
   */
  public static clearCache(): void {
    this.biomeInfluenceCache.clear();
  }
}
