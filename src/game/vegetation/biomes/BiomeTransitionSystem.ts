
import * as THREE from 'three';
import { BiomeType } from '../core/GrassConfig';

export interface BiomeInfluence {
  biomeType: BiomeType;
  strength: number;
  distance: number;
}

export interface TransitionZoneInfo {
  primaryBiome: BiomeType;
  secondaryBiome: BiomeType | null;
  blendFactor: number; // 0 = pure primary, 1 = pure secondary
  transitionWidth: number;
}

export class BiomeTransitionSystem {
  private static readonly TRANSITION_WIDTH = 32; // Units for smooth transitions
  private static readonly NOISE_SCALES = [0.001, 0.003, 0.008]; // Multi-octave noise
  private static readonly NOISE_WEIGHTS = [0.6, 0.3, 0.1];

  /**
   * Generate organic biome boundaries using multi-scale fractal noise
   */
  public static generateOrganicBiomeBoundary(position: THREE.Vector3, seed: number): number {
    let noiseValue = 0;
    
    for (let i = 0; i < this.NOISE_SCALES.length; i++) {
      const scale = this.NOISE_SCALES[i];
      const weight = this.NOISE_WEIGHTS[i];
      
      // Generate fractal noise with rotation for more organic patterns
      const angle = seed * 0.01 + i * Math.PI / 3;
      const rotatedX = position.x * Math.cos(angle) - position.z * Math.sin(angle);
      const rotatedZ = position.x * Math.sin(angle) + position.z * Math.cos(angle);
      
      const noise = this.seededNoise(rotatedX * scale, rotatedZ * scale, seed + i * 1000);
      noiseValue += noise * weight;
    }
    
    return noiseValue;
  }

  /**
   * Calculate smooth biome transition with multiple influence zones
   */
  public static calculateBiomeTransition(position: THREE.Vector3, seed: number): TransitionZoneInfo {
    // Generate organic noise patterns for each biome type
    const meadowNoise = this.generateOrganicBiomeBoundary(position, seed);
    const prairieNoise = this.generateOrganicBiomeBoundary(position, seed + 5000);
    
    // Add elevation and moisture influences
    const elevation = Math.sin(position.x * 0.0008) * Math.cos(position.z * 0.0008);
    const moisture = Math.sin(position.x * 0.0015 + seed * 0.001) * Math.cos(position.z * 0.0015);
    
    // Calculate biome influences with environmental factors
    const meadowInfluence = meadowNoise + moisture * 0.3 + elevation * 0.2;
    const prairieInfluence = prairieNoise - elevation * 0.3 + (1 - moisture) * 0.2;
    
    // Determine primary and secondary biomes
    let primaryBiome: BiomeType = 'normal';
    let secondaryBiome: BiomeType | null = null;
    let transitionFactor = 0;
    
    if (meadowInfluence > 0.15) {
      primaryBiome = 'meadow';
      if (prairieInfluence > -0.1) {
        secondaryBiome = 'prairie';
        transitionFactor = Math.min(1, (prairieInfluence + 0.1) / 0.25);
      }
    } else if (prairieInfluence > 0.1) {
      primaryBiome = 'prairie';
      if (meadowInfluence > -0.05) {
        secondaryBiome = 'meadow';
        transitionFactor = Math.min(1, (meadowInfluence + 0.05) / 0.2);
      }
    } else {
      // Normal biome with potential transitions
      if (meadowInfluence > -0.1) {
        secondaryBiome = 'meadow';
        transitionFactor = Math.min(1, (meadowInfluence + 0.1) / 0.25);
      } else if (prairieInfluence > -0.05) {
        secondaryBiome = 'prairie';
        transitionFactor = Math.min(1, (prairieInfluence + 0.05) / 0.15);
      }
    }
    
    return {
      primaryBiome,
      secondaryBiome,
      blendFactor: transitionFactor,
      transitionWidth: this.TRANSITION_WIDTH
    };
  }

  /**
   * Get biome influences within a radius for flower placement
   */
  public static getBiomeInfluences(position: THREE.Vector3, radius: number, seed: number): BiomeInfluence[] {
    const influences: BiomeInfluence[] = [];
    const samplePoints = 8; // Sample around the position
    
    for (let i = 0; i < samplePoints; i++) {
      const angle = (i / samplePoints) * Math.PI * 2;
      const samplePos = new THREE.Vector3(
        position.x + Math.cos(angle) * radius,
        position.y,
        position.z + Math.sin(angle) * radius
      );
      
      const transition = this.calculateBiomeTransition(samplePos, seed);
      
      // Add primary biome influence
      influences.push({
        biomeType: transition.primaryBiome,
        strength: 1 - transition.blendFactor,
        distance: 0
      });
      
      // Add secondary biome influence if exists
      if (transition.secondaryBiome) {
        influences.push({
          biomeType: transition.secondaryBiome,
          strength: transition.blendFactor,
          distance: 0
        });
      }
    }
    
    return influences;
  }

  private static seededNoise(x: number, z: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }
}
