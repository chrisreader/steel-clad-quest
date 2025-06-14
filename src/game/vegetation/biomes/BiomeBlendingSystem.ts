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
  // Width of the transition zone in units (2-8 for small patches)
  transitionWidth: number;
}

/**
 * Manages biome blending and creates smooth transitions between small biome patches
 */
export class BiomeBlendingSystem {
  private static biomeInfluenceCache: Map<string, BiomeInfluence> = new Map();
  private static readonly CACHE_PRECISION = 1; // Cache every unit for small patches
  private static readonly MIN_TRANSITION_WIDTH = 2;  // Smaller transitions for small patches
  private static readonly MAX_TRANSITION_WIDTH = 8;  // Maximum 8 units for small patch system
  
  /**
   * Calculate biome influence using the new position-based small patch system
   * Creates 2-8 unit transition zones between small biome patches
   */
  public static getBiomeInfluenceAtPosition(
    position: THREE.Vector3, 
    worldSeed: number = 12345
  ): BiomeInfluence {
    // Use higher precision caching for small patches
    const cacheKey = this.getCacheKey(position);
    if (this.biomeInfluenceCache.has(cacheKey)) {
      return this.biomeInfluenceCache.get(cacheKey)!;
    }
    
    // Get primary biome info from the new position-based system
    const primaryBiomeInfo = DeterministicBiomeManager.getBiomeInfo(position);
    
    // Sample nearby positions to detect transitions
    const sampleRadius = 4; // Sample within 4 units for small patch detection
    const samplePositions = [
      new THREE.Vector3(position.x + sampleRadius, position.y, position.z),
      new THREE.Vector3(position.x - sampleRadius, position.y, position.z),
      new THREE.Vector3(position.x, position.y, position.z + sampleRadius),
      new THREE.Vector3(position.x, position.y, position.z - sampleRadius),
      new THREE.Vector3(position.x + sampleRadius * 0.7, position.y, position.z + sampleRadius * 0.7),
      new THREE.Vector3(position.x - sampleRadius * 0.7, position.y, position.z - sampleRadius * 0.7),
    ];
    
    // Check for different biomes in nearby positions
    const nearbyBiomes = new Map<BiomeType, number>();
    nearbyBiomes.set(primaryBiomeInfo.type, 1);
    
    for (const samplePos of samplePositions) {
      const sampleBiome = DeterministicBiomeManager.getBiomeInfo(samplePos);
      nearbyBiomes.set(sampleBiome.type, (nearbyBiomes.get(sampleBiome.type) || 0) + 1);
    }
    
    // Find secondary biome if it exists
    let secondaryBiome: BiomeType | null = null;
    let secondaryCount = 0;
    
    for (const [biomeType, count] of nearbyBiomes.entries()) {
      if (biomeType !== primaryBiomeInfo.type && count > secondaryCount) {
        secondaryBiome = biomeType;
        secondaryCount = count;
      }
    }
    
    // Determine if we're in a transition zone based on nearby biome diversity
    const totalSamples = samplePositions.length + 1;
    const primaryCount = nearbyBiomes.get(primaryBiomeInfo.type) || 0;
    const primaryRatio = primaryCount / totalSamples;
    
    const isTransitionZone = primaryRatio < 0.8 && secondaryBiome !== null;
    
    // Calculate transition width with small-patch appropriate noise
    const edgeDetailNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 5000, 
      3, 
      0.6, 
      2.0, 
      0.2  // Very high frequency for small patch edges
    );
    
    const transitionWidth = this.MIN_TRANSITION_WIDTH + 
      edgeDetailNoise * (this.MAX_TRANSITION_WIDTH - this.MIN_TRANSITION_WIDTH);
    
    // Calculate strengths based on transition zone
    let primaryStrength = primaryBiomeInfo.strength;
    let secondaryStrength = 0;
    
    if (isTransitionZone && secondaryBiome) {
      // Use the primary ratio to determine blend strength
      const blendFactor = 1.0 - primaryRatio;
      const smoothBlend = this.smoothStep(blendFactor);
      
      // Add micro-chaos for natural transition edges
      const microChaos = FractalNoiseSystem.getFractalNoise(position, worldSeed + 6000, 2, 0.4, 2.0, 0.3);
      const chaoticBlend = smoothBlend * 0.85 + microChaos * 0.15;
      
      primaryStrength = Math.max(0.4, 1.0 - chaoticBlend * 0.6);
      secondaryStrength = Math.min(0.6, chaoticBlend * 0.6);
    }
    
    const result: BiomeInfluence = {
      primaryBiome: primaryBiomeInfo.type,
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
   * Get cache key for a position (high precision for small patches)
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
