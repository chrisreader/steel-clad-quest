
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
    
    // Normalize to 0-1 range with higher baseline
    return MathUtils.clamp((combinedNoise + 1.75) / 3.5, 0, 1);
  }
  
  /**
   * Calculate environmental density with high baseline for all rings
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
    // Start with very high baseline density (95% minimum) for lush environments
    let density = 0.95;
    
    // Trees provide benefits everywhere - enhance this
    if (environmentalFactors.hasTrees) {
      const treeBenefit = this.generateNoiseDensity(position, 0.015) * 0.2;
      density *= (1.0 + treeBenefit);
    }
    
    // Water areas get slight density boost instead of penalty
    if (environmentalFactors.hasWater) {
      const waterBenefit = this.generateNoiseDensity(position, 0.012) * 0.1;
      density *= (1.0 + waterBenefit);
    }
    
    // Rocks provide shelter - slight benefit
    if (environmentalFactors.hasRocks) {
      const rockBenefit = this.generateNoiseDensity(position, 0.018) * 0.05;
      density *= (1.0 + rockBenefit);
    }
    
    // Ensure very high minimum density (90% for all areas)
    return MathUtils.clamp(density, 0.9, 1.3);
  }
  
  /**
   * Calculate LOD-based density scaling with higher minimums for Ring 3 coverage
   */
  static calculateLODDensity(distance: number, lodDistances: number[]): number {
    if (distance < lodDistances[0]) return 1.0; // Full density up to 150 units
    if (distance < lodDistances[1]) return MathUtils.smoothStep(distance, lodDistances[0], lodDistances[1]) * 0.2 + 0.8; // 80-100% for Ring 2
    if (distance < lodDistances[2]) return MathUtils.smoothStep(distance, lodDistances[1], lodDistances[2]) * 0.2 + 0.6; // 60-80% for Ring 3 inner
    if (distance < lodDistances[3]) return MathUtils.smoothStep(distance, lodDistances[2], lodDistances[3]) * 0.2 + 0.4; // 40-60% for Ring 3 outer
    
    // Even at maximum distance, maintain reasonable coverage (25% minimum)
    const veryDistantFactor = MathUtils.clamp(1.0 - (distance - lodDistances[3]) / 100, 0.25, 1.0);
    return veryDistantFactor * 0.3; // 25-30% at extreme distances
  }
}
