
import * as THREE from 'three';
import { BiomeType, BiomeInfo, BiomeConfiguration } from '../core/GrassConfig';
import { EnhancedNoiseSystem, EnvironmentalFactors } from './EnhancedNoiseSystem';

export interface BlendedBiomeInfo {
  dominantBiome: BiomeType;
  biomeInfluences: Map<BiomeType, number>;
  transitionStrength: number;
  blendedColor: THREE.Color;
  blendedDensity: number;
  blendedHeight: number;
  blendedSpecies: string[];
}

export class BiomeBlendingSystem {
  private static readonly TRANSITION_ZONE_SIZE = 60; // Units for smooth blending
  private static readonly BIOME_CACHE: Map<string, BlendedBiomeInfo> = new Map();
  
  /**
   * Calculate biome influences at a specific world position
   */
  public static calculateBiomeInfluences(
    worldPosition: THREE.Vector3,
    worldSeed: number
  ): Map<BiomeType, number> {
    const influences = new Map<BiomeType, number>();
    const environmentalFactors = EnhancedNoiseSystem.sampleEnvironmentalFactors(worldPosition, worldSeed);
    
    // Calculate base biome influences using environmental factors
    const normalInfluence = this.calculateNormalBiomeInfluence(environmentalFactors, worldPosition);
    const meadowInfluence = this.calculateMeadowBiomeInfluence(environmentalFactors, worldPosition);
    const prairieInfluence = this.calculatePrairieBiomeInfluence(environmentalFactors, worldPosition);
    
    influences.set('normal', normalInfluence);
    influences.set('meadow', meadowInfluence);
    influences.set('prairie', prairieInfluence);
    
    // Add Voronoi seed influence
    for (const biomeType of ['normal', 'meadow', 'prairie'] as BiomeType[]) {
      const voronoiInfluence = EnhancedNoiseSystem.calculateVoronoiBiomeInfluence(worldPosition, biomeType);
      const currentInfluence = influences.get(biomeType) || 0;
      influences.set(biomeType, Math.min(1.0, currentInfluence + voronoiInfluence * 0.4));
    }
    
    // Add turbulence for irregular boundaries
    for (const [biomeType, influence] of influences.entries()) {
      const turbulentInfluence = EnhancedNoiseSystem.addTurbulence(influence, worldPosition, 0.2);
      influences.set(biomeType, Math.max(0, Math.min(1, turbulentInfluence)));
    }
    
    // Normalize influences so they sum to 1
    this.normalizeInfluences(influences);
    
    return influences;
  }

  private static calculateNormalBiomeInfluence(factors: EnvironmentalFactors, position: THREE.Vector3): number {
    // Normal biome thrives in moderate conditions
    const temperatureScore = 1.0 - Math.abs(factors.temperature) * 0.7;
    const moistureScore = 1.0 - Math.abs(factors.moisture) * 0.5;
    const elevationScore = 1.0 - Math.abs(factors.elevation) * 0.3;
    
    return (temperatureScore + moistureScore + elevationScore) / 3.0;
  }

  private static calculateMeadowBiomeInfluence(factors: EnvironmentalFactors, position: THREE.Vector3): number {
    // Meadow biome prefers high moisture and moderate temperature
    const temperatureScore = factors.temperature > -0.3 ? 1.0 - Math.abs(factors.temperature) * 0.5 : 0.2;
    const moistureScore = factors.moisture > 0.2 ? 1.0 : Math.max(0, factors.moisture + 1.0) * 0.5;
    const elevationScore = 1.0 - Math.abs(factors.elevation) * 0.4;
    
    return (temperatureScore + moistureScore * 1.5 + elevationScore) / 3.5;
  }

  private static calculatePrairieBiomeInfluence(factors: EnvironmentalFactors, position: THREE.Vector3): number {
    // Prairie biome prefers low moisture and warm temperature
    const temperatureScore = factors.temperature > 0 ? 1.0 : Math.max(0, factors.temperature + 1.0) * 0.6;
    const moistureScore = factors.moisture < -0.1 ? 1.0 : Math.max(0, 1.0 - factors.moisture) * 0.7;
    const elevationScore = factors.elevation > -0.2 ? 1.0 : Math.max(0, factors.elevation + 1.0) * 0.5;
    
    return (temperatureScore * 1.3 + moistureScore + elevationScore) / 3.3;
  }

  private static normalizeInfluences(influences: Map<BiomeType, number>): void {
    const total = Array.from(influences.values()).reduce((sum, val) => sum + val, 0);
    
    if (total > 0) {
      for (const [biomeType, influence] of influences.entries()) {
        influences.set(biomeType, influence / total);
      }
    } else {
      // Fallback to normal biome if all influences are zero
      influences.set('normal', 1.0);
      influences.set('meadow', 0.0);
      influences.set('prairie', 0.0);
    }
  }

  /**
   * Get blended biome information for a world position
   */
  public static getBlendedBiomeInfo(
    worldPosition: THREE.Vector3,
    worldSeed: number,
    biomeConfigs: Record<BiomeType, BiomeConfiguration>
  ): BlendedBiomeInfo {
    const posKey = `${Math.floor(worldPosition.x / 4)}_${Math.floor(worldPosition.z / 4)}`;
    
    if (this.BIOME_CACHE.has(posKey)) {
      return this.BIOME_CACHE.get(posKey)!;
    }

    const biomeInfluences = this.calculateBiomeInfluences(worldPosition, worldSeed);
    
    // Find dominant biome
    let dominantBiome: BiomeType = 'normal';
    let maxInfluence = 0;
    let secondMaxInfluence = 0;
    
    for (const [biomeType, influence] of biomeInfluences.entries()) {
      if (influence > maxInfluence) {
        secondMaxInfluence = maxInfluence;
        maxInfluence = influence;
        dominantBiome = biomeType;
      } else if (influence > secondMaxInfluence) {
        secondMaxInfluence = influence;
      }
    }

    // Calculate transition strength (higher when influences are similar)
    const transitionStrength = 1.0 - (maxInfluence - secondMaxInfluence);

    // Blend properties
    const blendedColor = this.blendColors(biomeInfluences, biomeConfigs);
    const blendedDensity = this.blendDensities(biomeInfluences, biomeConfigs);
    const blendedHeight = this.blendHeights(biomeInfluences, biomeConfigs);
    const blendedSpecies = this.blendSpecies(biomeInfluences, biomeConfigs);

    const result: BlendedBiomeInfo = {
      dominantBiome,
      biomeInfluences,
      transitionStrength,
      blendedColor,
      blendedDensity,
      blendedHeight,
      blendedSpecies
    };

    this.BIOME_CACHE.set(posKey, result);
    return result;
  }

  private static blendColors(
    influences: Map<BiomeType, number>,
    configs: Record<BiomeType, BiomeConfiguration>
  ): THREE.Color {
    const blendedColor = new THREE.Color(0, 0, 0);
    
    for (const [biomeType, influence] of influences.entries()) {
      const config = configs[biomeType];
      if (config && influence > 0) {
        const weightedColor = config.colorModifier.clone().multiplyScalar(influence);
        blendedColor.add(weightedColor);
      }
    }
    
    return blendedColor;
  }

  private static blendDensities(
    influences: Map<BiomeType, number>,
    configs: Record<BiomeType, BiomeConfiguration>
  ): number {
    let blendedDensity = 0;
    
    for (const [biomeType, influence] of influences.entries()) {
      const config = configs[biomeType];
      if (config && influence > 0) {
        blendedDensity += config.densityMultiplier * influence;
      }
    }
    
    return blendedDensity;
  }

  private static blendHeights(
    influences: Map<BiomeType, number>,
    configs: Record<BiomeType, BiomeConfiguration>
  ): number {
    let blendedHeight = 0;
    
    for (const [biomeType, influence] of influences.entries()) {
      const config = configs[biomeType];
      if (config && influence > 0) {
        blendedHeight += config.heightMultiplier * influence;
      }
    }
    
    return blendedHeight;
  }

  private static blendSpecies(
    influences: Map<BiomeType, number>,
    configs: Record<BiomeType, BiomeConfiguration>
  ): string[] {
    const allSpecies = ['meadow', 'prairie', 'clumping', 'fine'];
    const blendedSpecies: string[] = [];
    
    // Calculate blended species distribution
    const blendedDistribution: { [species: string]: number } = {};
    
    for (const species of allSpecies) {
      blendedDistribution[species] = 0;
      
      for (const [biomeType, influence] of influences.entries()) {
        const config = configs[biomeType];
        if (config && influence > 0) {
          const speciesWeight = config.speciesDistribution[species as keyof typeof config.speciesDistribution] || 0;
          blendedDistribution[species] += speciesWeight * influence;
        }
      }
    }
    
    // Convert to species array based on probability
    for (const [species, probability] of Object.entries(blendedDistribution)) {
      if (probability > 0.1) { // Only include species with significant presence
        blendedSpecies.push(species);
      }
    }
    
    return blendedSpecies.length > 0 ? blendedSpecies : ['meadow'];
  }

  public static clearCache(): void {
    this.BIOME_CACHE.clear();
  }
}
