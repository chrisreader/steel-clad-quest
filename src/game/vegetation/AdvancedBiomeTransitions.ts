
import * as THREE from 'three';
import { BiomeType, BiomeInfo, GrassBiomeManager } from './GrassBiomeManager';

export interface TransitionZone {
  center: THREE.Vector3;
  radius: number;
  primaryBiome: BiomeType;
  secondaryBiome: BiomeType;
  transitionStrength: number; // 0-1
}

export class AdvancedBiomeTransitions {
  private static readonly TRANSITION_SMOOTHNESS = 15; // Distance over which transitions occur
  private static readonly MICRO_BIOME_FREQUENCY = 0.015; // Frequency of micro-biome variations

  /**
   * Calculate smooth biome transitions with realistic blending
   */
  public static getEnhancedBiomeInfo(position: THREE.Vector3): BiomeInfo {
    const baseBiome = GrassBiomeManager.getBiomeAtPosition(position);
    
    // Add micro-biome variations for realism
    const microBiomeVariation = this.calculateMicroBiomeVariation(position);
    
    // Apply elevation-based biome modifications
    const elevationModifier = this.calculateElevationBiomeModifier(position);
    
    // Combine base biome with modifiers
    const enhancedBiome = this.blendBiomeInfluences(
      baseBiome,
      microBiomeVariation,
      elevationModifier
    );

    return enhancedBiome;
  }

  /**
   * Create smooth color transitions between biomes
   */
  public static getTransitionAwareColor(
    position: THREE.Vector3,
    species: string,
    season: 'spring' | 'summer' | 'autumn' | 'winter'
  ): THREE.Color {
    // Get surrounding biome influences
    const influences = this.calculateBiomeInfluences(position);
    
    // Start with the dominant biome color
    let finalColor = GrassBiomeManager.getBiomeSpeciesColor(
      species,
      influences.primary,
      season
    );

    // Blend with secondary influences
    for (const influence of influences.secondary) {
      if (influence.strength > 0.1) {
        const influenceColor = GrassBiomeManager.getBiomeSpeciesColor(
          species,
          influence.biome,
          season
        );
        finalColor.lerp(influenceColor, influence.strength * 0.3);
      }
    }

    return finalColor;
  }

  private static calculateMicroBiomeVariation(position: THREE.Vector3): BiomeInfo {
    // Use high-frequency noise for micro-variations
    const microNoise = Math.sin(position.x * this.MICRO_BIOME_FREQUENCY) * 
                      Math.cos(position.z * this.MICRO_BIOME_FREQUENCY);
    
    const detailNoise = Math.sin(position.x * this.MICRO_BIOME_FREQUENCY * 3) * 
                       Math.cos(position.z * this.MICRO_BIOME_FREQUENCY * 3) * 0.3;
    
    const combinedMicroNoise = microNoise + detailNoise;
    
    // Determine micro-biome based on noise
    let microBiomeType: BiomeType = 'normal';
    let strength = 0.3;
    
    if (combinedMicroNoise > 0.6) {
      microBiomeType = 'meadow';
      strength = Math.min(0.8, (combinedMicroNoise - 0.6) * 2);
    } else if (combinedMicroNoise < -0.6) {
      microBiomeType = 'prairie';
      strength = Math.min(0.8, Math.abs(combinedMicroNoise + 0.6) * 2);
    }
    
    return {
      type: microBiomeType,
      strength: strength,
      transitionZone: true
    };
  }

  private static calculateElevationBiomeModifier(position: THREE.Vector3): BiomeInfo {
    // Calculate relative elevation using terrain-like noise
    const elevationNoise = Math.sin(position.x * 0.002) * Math.cos(position.z * 0.002);
    const roughness = Math.sin(position.x * 0.01) * Math.cos(position.z * 0.01) * 0.3;
    
    const elevation = elevationNoise + roughness;
    
    // Higher elevations favor prairie (more wind-exposed)
    // Lower elevations favor meadow (more sheltered, moist)
    if (elevation > 0.3) {
      return {
        type: 'prairie',
        strength: Math.min(0.7, (elevation - 0.3) * 1.5),
        transitionZone: true
      };
    } else if (elevation < -0.3) {
      return {
        type: 'meadow',
        strength: Math.min(0.7, Math.abs(elevation + 0.3) * 1.5),
        transitionZone: true
      };
    }
    
    return {
      type: 'normal',
      strength: 0.5,
      transitionZone: false
    };
  }

  private static blendBiomeInfluences(
    baseBiome: BiomeInfo,
    microVariation: BiomeInfo,
    elevationModifier: BiomeInfo
  ): BiomeInfo {
    // Start with base biome
    let resultType = baseBiome.type;
    let resultStrength = baseBiome.strength;
    let isTransition = baseBiome.transitionZone;

    // Apply micro-variation influence
    if (microVariation.strength > 0.4 && Math.random() < 0.3) {
      resultType = microVariation.type;
      resultStrength = microVariation.strength * 0.7;
      isTransition = true;
    }

    // Apply elevation influence
    if (elevationModifier.strength > 0.5) {
      if (elevationModifier.type !== resultType) {
        // Blend between current and elevation-preferred biome
        const blendFactor = elevationModifier.strength * 0.6;
        if (Math.random() < blendFactor) {
          resultType = elevationModifier.type;
          resultStrength = Math.max(0.4, resultStrength * (1 - blendFactor) + elevationModifier.strength * blendFactor);
          isTransition = true;
        }
      }
    }

    return {
      type: resultType,
      strength: Math.max(0.3, Math.min(1.0, resultStrength)),
      transitionZone: isTransition
    };
  }

  private static calculateBiomeInfluences(position: THREE.Vector3): {
    primary: BiomeInfo;
    secondary: Array<{ biome: BiomeInfo; strength: number }>;
  } {
    const primary = this.getEnhancedBiomeInfo(position);
    const secondary: Array<{ biome: BiomeInfo; strength: number }> = [];

    // Sample surrounding positions for biome influences
    const samplePositions = [
      position.clone().add(new THREE.Vector3(this.TRANSITION_SMOOTHNESS, 0, 0)),
      position.clone().add(new THREE.Vector3(-this.TRANSITION_SMOOTHNESS, 0, 0)),
      position.clone().add(new THREE.Vector3(0, 0, this.TRANSITION_SMOOTHNESS)),
      position.clone().add(new THREE.Vector3(0, 0, -this.TRANSITION_SMOOTHNESS)),
    ];

    for (const samplePos of samplePositions) {
      const sampleBiome = GrassBiomeManager.getBiomeAtPosition(samplePos);
      if (sampleBiome.type !== primary.type) {
        const distance = position.distanceTo(samplePos);
        const influence = Math.max(0, 1 - distance / (this.TRANSITION_SMOOTHNESS * 2));
        
        secondary.push({
          biome: sampleBiome,
          strength: influence * 0.4 // Limit secondary influence
        });
      }
    }

    return { primary, secondary };
  }

  /**
   * Create buffer zones between major biome transitions
   */
  public static createBufferZone(
    centerBiome: BiomeType,
    neighborBiome: BiomeType,
    transitionPosition: THREE.Vector3,
    distance: number
  ): BiomeInfo {
    // Create a hybrid biome in buffer zones
    const transitionFactor = Math.max(0, 1 - distance / this.TRANSITION_SMOOTHNESS);
    
    if (transitionFactor > 0.3) {
      // Strong transition - create hybrid characteristics
      return {
        type: centerBiome, // Keep primary type
        strength: 0.6 + transitionFactor * 0.3, // Moderate strength
        transitionZone: true
      };
    }
    
    // Weak transition - minimal blending
    return {
      type: centerBiome,
      strength: 0.8,
      transitionZone: false
    };
  }
}
