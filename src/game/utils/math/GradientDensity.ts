
import * as THREE from 'three';
import { MathUtils } from './MathUtils';

export interface DensityField {
  sample(position: THREE.Vector2): number;
}

export class GradientDensity {
  /**
   * Calculate smooth density falloff from region edges
   */
  static calculateEdgeFalloff(
    position: THREE.Vector3,
    regionCenter: THREE.Vector3,
    regionSize: number,
    falloffDistance: number = 20
  ): number {
    const halfSize = regionSize * 0.5;
    const localX = Math.abs(position.x - regionCenter.x);
    const localZ = Math.abs(position.z - regionCenter.z);
    
    // Distance to nearest edge
    const distanceToEdgeX = halfSize - localX;
    const distanceToEdgeZ = halfSize - localZ;
    const distanceToEdge = Math.min(distanceToEdgeX, distanceToEdgeZ);
    
    // Smooth falloff using smoothstep
    if (distanceToEdge >= falloffDistance) {
      return 1.0; // Full density
    } else if (distanceToEdge <= 0) {
      return 0.0; // Outside region
    } else {
      return MathUtils.smoothStep(distanceToEdge, 0, falloffDistance);
    }
  }
  
  /**
   * Generate noise-based density field for organic variation
   */
  static generateNoiseDensity(
    position: THREE.Vector3,
    scale1: number = 0.01,
    scale2: number = 0.03,
    scale3: number = 0.08
  ): number {
    // Multi-octave noise for natural variation
    const noise1 = Math.sin(position.x * scale1) * Math.cos(position.z * scale1);
    const noise2 = Math.sin(position.x * scale2) * Math.cos(position.z * scale2) * 0.5;
    const noise3 = Math.sin(position.x * scale3) * Math.cos(position.z * scale3) * 0.25;
    
    const combinedNoise = noise1 + noise2 + noise3;
    
    // Normalize to 0-1 range
    return MathUtils.clamp((combinedNoise + 1.75) / 3.5, 0, 1);
  }
  
  /**
   * Calculate environmental penalties as gradients instead of binary
   */
  static calculateEnvironmentalDensity(
    position: THREE.Vector3,
    environmentalFactors: {
      hasWater: boolean;
      hasTrees: boolean;
      hasRocks: boolean;
      playerTraffic: number;
    }
  ): number {
    let density = 1.0;
    
    // Apply graduated penalties instead of binary exclusions
    if (environmentalFactors.hasWater) {
      const waterPenalty = this.generateNoiseDensity(position, 0.02) * 0.4 + 0.1;
      density *= (1.0 - waterPenalty);
    }
    
    if (environmentalFactors.hasRocks) {
      const rockPenalty = this.generateNoiseDensity(position, 0.025) * 0.25 + 0.05;
      density *= (1.0 - rockPenalty);
    }
    
    if (environmentalFactors.hasTrees) {
      // Trees actually help grass in some areas
      const treeBenefit = this.generateNoiseDensity(position, 0.015) * 0.15;
      density *= (1.0 + treeBenefit);
    }
    
    // Player traffic creates graduated worn areas
    const trafficPenalty = environmentalFactors.playerTraffic * 0.3;
    density *= (1.0 - trafficPenalty);
    
    return MathUtils.clamp(density, 0, 1);
  }
  
  /**
   * Calculate LOD-based density scaling (smooth instead of cutoff)
   */
  static calculateLODDensity(distance: number, lodDistances: number[]): number {
    if (distance < lodDistances[0]) return 1.0;
    if (distance < lodDistances[1]) return MathUtils.smoothStep(distance, lodDistances[0], lodDistances[1]) * 0.3 + 0.7;
    if (distance < lodDistances[2]) return MathUtils.smoothStep(distance, lodDistances[1], lodDistances[2]) * 0.3 + 0.4;
    if (distance < lodDistances[3]) return MathUtils.smoothStep(distance, lodDistances[2], lodDistances[3]) * 0.2 + 0.2;
    
    // Never go to absolute zero - always maintain some sparse coverage
    const veryDistantFactor = MathUtils.clamp(1.0 - (distance - lodDistances[3]) / 100, 0.05, 1.0);
    return veryDistantFactor * 0.15;
  }
}
