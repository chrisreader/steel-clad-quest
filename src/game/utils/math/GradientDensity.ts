
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
   * NEW: Generate organic environmental noise instead of geometric patterns
   */
  static generateOrganicEnvironmentalNoise(
    position: THREE.Vector3,
    noiseType: 'water' | 'trees' | 'rocks'
  ): number {
    let baseScale: number;
    let octave1Scale: number;
    let octave2Scale: number;
    let threshold: number;
    
    switch (noiseType) {
      case 'water':
        baseScale = 0.008;
        octave1Scale = 0.025;
        octave2Scale = 0.06;
        threshold = 0.4;
        break;
      case 'trees':
        baseScale = 0.012;
        octave1Scale = 0.035;
        octave2Scale = 0.08;
        threshold = 0.3;
        break;
      case 'rocks':
        baseScale = 0.015;
        octave1Scale = 0.045;
        octave2Scale = 0.12;
        threshold = 0.5;
        break;
    }
    
    // Generate organic noise pattern
    const noise1 = Math.sin(position.x * baseScale + Math.PI * 0.33) * Math.cos(position.z * baseScale + Math.PI * 0.67);
    const noise2 = Math.sin(position.x * octave1Scale + Math.PI * 1.23) * Math.cos(position.z * octave1Scale + Math.PI * 2.34);
    const noise3 = Math.sin(position.x * octave2Scale + Math.PI * 3.45) * Math.cos(position.z * octave2Scale + Math.PI * 4.56);
    
    const combinedNoise = noise1 + noise2 * 0.5 + noise3 * 0.25;
    const normalizedNoise = (combinedNoise + 1.75) / 3.5;
    
    return normalizedNoise > threshold ? 1.0 : 0.0;
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
      const waterPenalty = this.generateNoiseDensity(position, 0.02) * 0.3 + 0.05; // Reduced penalty
      density *= (1.0 - waterPenalty);
    }
    
    if (environmentalFactors.hasRocks) {
      const rockPenalty = this.generateNoiseDensity(position, 0.025) * 0.2 + 0.03; // Reduced penalty
      density *= (1.0 - rockPenalty);
    }
    
    if (environmentalFactors.hasTrees) {
      // Trees actually help grass in some areas - increase benefit
      const treeBenefit = this.generateNoiseDensity(position, 0.015) * 0.2 + 0.05;
      density *= (1.0 + treeBenefit);
    }
    
    // Player traffic creates graduated worn areas - reduce impact
    const trafficPenalty = environmentalFactors.playerTraffic * 0.2;
    density *= (1.0 - trafficPenalty);
    
    return MathUtils.clamp(density, 0.1, 1.2); // Ensure minimum coverage
  }
  
  /**
   * Calculate LOD-based density scaling with higher minimum coverage
   */
  static calculateLODDensity(distance: number, lodDistances: number[]): number {
    if (distance < lodDistances[0]) return 1.0;
    if (distance < lodDistances[1]) return MathUtils.smoothStep(distance, lodDistances[0], lodDistances[1]) * 0.3 + 0.7;
    if (distance < lodDistances[2]) return MathUtils.smoothStep(distance, lodDistances[1], lodDistances[2]) * 0.3 + 0.4;
    if (distance < lodDistances[3]) return MathUtils.smoothStep(distance, lodDistances[2], lodDistances[3]) * 0.2 + 0.2;
    
    // Increased minimum coverage from 0.15 to 0.25 to ensure visible grass
    const veryDistantFactor = MathUtils.clamp(1.0 - (distance - lodDistances[3]) / 100, 0.25, 1.0);
    return veryDistantFactor * 0.25;
  }
  
  /**
   * NEW: Calculate cross-region blending weight for seamless transitions
   */
  static calculateCrossRegionBlending(
    position: THREE.Vector3,
    currentRegionCenter: THREE.Vector3,
    currentRegionSize: number,
    neighboringRegions: Array<{ center: THREE.Vector3; size: number }>
  ): number {
    let maxBlendWeight = 1.0;
    
    for (const neighbor of neighboringRegions) {
      const distanceToNeighbor = position.distanceTo(neighbor.center);
      const neighborInfluenceRadius = neighbor.size * 0.6;
      
      if (distanceToNeighbor < neighborInfluenceRadius) {
        const blendStrength = 1.0 - (distanceToNeighbor / neighborInfluenceRadius);
        maxBlendWeight = Math.max(maxBlendWeight, 1.0 + blendStrength * 0.3);
      }
    }
    
    return Math.min(maxBlendWeight, 1.5); // Cap at 150% to prevent over-density
  }
}
