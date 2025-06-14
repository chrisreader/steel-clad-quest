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
  // Width of the transition zone in units (1-3 for sharp boundaries)
  transitionWidth: number;
}

/**
 * ENHANCED: Manages biome blending for 11 distinct grassland biomes
 * Maintains sharp boundaries while allowing natural transitions
 */
export class BiomeBlendingSystem {
  private static biomeInfluenceCache: Map<string, BiomeInfluence> = new Map();
  private static readonly CACHE_PRECISION = 2;
  private static readonly MIN_TRANSITION_WIDTH = 1;
  private static readonly MAX_TRANSITION_WIDTH = 4; // Slightly larger for 11 biomes
  
  /**
   * ENHANCED: Calculate biome influence with support for 11 biome types
   * Creates sharp boundaries while allowing natural clustering
   */
  public static getBiomeInfluenceAtPosition(
    position: THREE.Vector3, 
    worldSeed: number = 12345
  ): BiomeInfluence {
    const cacheKey = this.getCacheKey(position);
    if (this.biomeInfluenceCache.has(cacheKey)) {
      return this.biomeInfluenceCache.get(cacheKey)!;
    }
    
    // Get primary biome info
    const primaryBiomeInfo = DeterministicBiomeManager.getBiomeInfo(position);
    
    // Check immediate neighbors for transitions
    const sampleRadius = 4; // Slightly larger for more biome variety
    const samplePositions = [
      new THREE.Vector3(position.x + sampleRadius, position.y, position.z),
      new THREE.Vector3(position.x - sampleRadius, position.y, position.z),
      new THREE.Vector3(position.x, position.y, position.z + sampleRadius),
      new THREE.Vector3(position.x, position.y, position.z - sampleRadius),
      // Add diagonal samples for better transition detection
      new THREE.Vector3(position.x + sampleRadius * 0.7, position.y, position.z + sampleRadius * 0.7),
      new THREE.Vector3(position.x - sampleRadius * 0.7, position.y, position.z - sampleRadius * 0.7),
    ];
    
    // Check for different biomes in immediate area
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
    
    // TRANSITION DETECTION: More lenient for 11 biomes
    const totalSamples = samplePositions.length + 1;
    const primaryCount = nearbyBiomes.get(primaryBiomeInfo.type) || 0;
    const primaryRatio = primaryCount / totalSamples;
    
    const isTransitionZone = primaryRatio < 0.65 && secondaryBiome !== null && secondaryCount >= 2;
    
    // Calculate transition width
    const edgeNoise = FractalNoiseSystem.getFractalNoise(
      position, 
      worldSeed + 5000, 
      2, 
      0.5, 
      2.0, 
      0.1
    );
    
    const transitionWidth = this.MIN_TRANSITION_WIDTH + 
      edgeNoise * (this.MAX_TRANSITION_WIDTH - this.MIN_TRANSITION_WIDTH);
    
    // MINIMAL BLENDING: Preserve distinct biome characteristics
    let primaryStrength = 1.0;
    let secondaryStrength = 0;
    
    if (isTransitionZone && secondaryBiome) {
      const blendFactor = Math.max(0, 1.0 - primaryRatio);
      const limitedBlend = Math.min(0.35, blendFactor); // Slightly higher for smoother transitions
      
      primaryStrength = Math.max(0.65, 1.0 - limitedBlend);
      secondaryStrength = Math.min(0.35, limitedBlend);
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
   * ENHANCED: Calculate biome configuration - prefer pure biome configs for 11 distinct types
   */
  public static getBlendedBiomeConfig(
    position: THREE.Vector3,
    worldSeed: number = 12345
  ): BiomeConfiguration {
    const biomeInfluences = this.getBiomeTypesAtPosition(position, worldSeed);
    
    // If only one biome or primary dominates, return pure config
    if (biomeInfluences.length === 1 || biomeInfluences[0].influence > 0.8) {
      return DeterministicBiomeManager.getBiomeConfiguration(biomeInfluences[0].biome);
    }
    
    // MINIMAL blending - only for immediate edge cases
    const baseConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeInfluences[0].biome);
    let result: BiomeConfiguration = { ...baseConfig };
    
    if (biomeInfluences.length > 1) {
      const secondaryConfig = DeterministicBiomeManager.getBiomeConfiguration(biomeInfluences[1].biome);
      const blendFactor = biomeInfluences[1].influence;
      
      // Very light blending
      result.densityMultiplier = baseConfig.densityMultiplier * (1 - blendFactor * 0.5) + 
                                secondaryConfig.densityMultiplier * (blendFactor * 0.5);
      result.heightMultiplier = baseConfig.heightMultiplier * (1 - blendFactor * 0.5) + 
                               secondaryConfig.heightMultiplier * (blendFactor * 0.5);
      result.colorModifier = baseConfig.colorModifier.clone().lerp(secondaryConfig.colorModifier, blendFactor * 0.5);
    }
    
    return result;
  }
  
  /**
   * ENHANCED: Calculate ground grass configuration - prefer pure biome configs for 11 types
   */
  public static getBlendedGroundConfig(
    position: THREE.Vector3,
    worldSeed: number = 12345
  ): GroundGrassConfiguration {
    const biomeInfluences = this.getBiomeTypesAtPosition(position, worldSeed);
    
    // If only one biome or primary dominates, return pure config
    if (biomeInfluences.length === 1 || biomeInfluences[0].influence > 0.8) {
      return DeterministicBiomeManager.getGroundConfiguration(biomeInfluences[0].biome);
    }
    
    // MINIMAL blending for edges only
    const baseConfig = DeterministicBiomeManager.getGroundConfiguration(biomeInfluences[0].biome);
    let result: GroundGrassConfiguration = { ...baseConfig };
    
    if (biomeInfluences.length > 1) {
      const secondaryConfig = DeterministicBiomeManager.getGroundConfiguration(biomeInfluences[1].biome);
      const blendFactor = biomeInfluences[1].influence;
      
      // Very light blending
      result.densityMultiplier = baseConfig.densityMultiplier * (1 - blendFactor * 0.5) + 
                                secondaryConfig.densityMultiplier * (blendFactor * 0.5);
      result.heightReduction = baseConfig.heightReduction * (1 - blendFactor * 0.5) + 
                              secondaryConfig.heightReduction * (blendFactor * 0.5);
    }
    
    return result;
  }
  
  /**
   * ENHANCED: Get biome color for 11 distinct biome types
   */
  public static getBlendedBiomeColor(
    species: string,
    position: THREE.Vector3,
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer',
    worldSeed: number = 12345
  ): THREE.Color {
    const biomeInfluences = this.getBiomeTypesAtPosition(position, worldSeed);
    
    // Use pure biome color in most cases
    if (biomeInfluences.length === 1 || biomeInfluences[0].influence > 0.8) {
      const biomeInfo = {
        type: biomeInfluences[0].biome,
        strength: 1.0,
        transitionZone: false
      };
      return DeterministicBiomeManager.getBiomeSpeciesColor(species, biomeInfo, season);
    }
    
    // Light blending only at edges
    const primaryColor = DeterministicBiomeManager.getBiomeSpeciesColor(species, {
      type: biomeInfluences[0].biome,
      strength: 1.0,
      transitionZone: false
    }, season);
    
    if (biomeInfluences.length > 1) {
      const secondaryColor = DeterministicBiomeManager.getBiomeSpeciesColor(species, {
        type: biomeInfluences[1].biome,
        strength: 1.0,
        transitionZone: false
      }, season);
      
      // Very light blending
      return primaryColor.clone().lerp(secondaryColor, biomeInfluences[1].influence * 0.5);
    }
    
    return primaryColor;
  }
  
  /**
   * Get cache key for a position (lower precision for performance)
   */
  private static getCacheKey(position: THREE.Vector3): string {
    const x = Math.round(position.x / this.CACHE_PRECISION) * this.CACHE_PRECISION;
    const z = Math.round(position.z / this.CACHE_PRECISION) * this.CACHE_PRECISION;
    return `${x}_${z}`;
  }
  
  /**
   * Smooth step function for transitions
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
