import * as THREE from 'three';
import { BiomeType } from '../core/GrassConfig';
import { NoiseUtilities } from '../../utils/math/NoiseUtilities';

export interface OrganicBiomeShape {
  center: THREE.Vector3;
  biomeType: BiomeType;
  baseRadius: number;
  strength: number;
  seed: number;
  controlPoints: THREE.Vector3[];
  shapeComplexity: number;
}

export class OrganicBiomeGenerator {
  /**
   * Creates organic biome shapes
   */
  static createOrganicBiome(
    center: THREE.Vector3,
    biomeType: BiomeType,
    baseRadius: number,
    seed: number,
    strength: number = 1.0
  ): OrganicBiomeShape {
    // Generate 12-24 control points for highly irregular shapes
    const controlPointCount = 12 + Math.floor(NoiseUtilities.seededNoise(seed, 0, 0) * 12);
    const controlPoints: THREE.Vector3[] = [];
    
    // Enhanced shape complexity (0.4-0.8 for extreme variation)
    const shapeComplexity = 0.4 + Math.abs(NoiseUtilities.seededNoise(seed, 1000, 0)) * 0.4;
    
    for (let i = 0; i < controlPointCount; i++) {
      const angle = (i / controlPointCount) * Math.PI * 2;
      
      // Multi-layer boundary distortion for fractal-like edges
      const primaryDistortion = NoiseUtilities.boundaryDistortion(
        angle, center.x, center.z, seed, shapeComplexity
      );
      
      // Add secondary fractal layer
      const secondaryDistortion = NoiseUtilities.organicNoise(
        Math.cos(angle) * 5 + center.x * 0.01,
        Math.sin(angle) * 5 + center.z * 0.01,
        seed + 2000,
        4,
        0.5,
        0.4,
        0.7
      );
      
      // Add fine detail layer for "erosion patterns"
      const fineDistortion = NoiseUtilities.organicNoise(
        Math.cos(angle) * 20 + center.x * 0.05,
        Math.sin(angle) * 20 + center.z * 0.05,
        seed + 3000,
        3,
        2.0,
        0.2,
        0.8
      );
      
      // Combine all distortion layers
      const totalDistortion = primaryDistortion + secondaryDistortion * 0.6 + fineDistortion * 0.3;
      const radiusVariation = 1.0 + totalDistortion;
      
      // Clamp to prevent negative radius but allow extreme variation
      const clampedVariation = Math.max(0.2, Math.min(2.5, radiusVariation));
      const distortedRadius = baseRadius * clampedVariation;
      
      const x = center.x + Math.cos(angle) * distortedRadius;
      const z = center.z + Math.sin(angle) * distortedRadius;
      
      controlPoints.push(new THREE.Vector3(x, 0, z));
    }
    
    console.log(`🔥 DISTINCT BIOME: Created ${biomeType} with ${controlPointCount} control points and complexity ${shapeComplexity.toFixed(2)}`);
    
    return {
      center,
      biomeType,
      baseRadius,
      strength,
      seed,
      controlPoints,
      shapeComplexity
    };
  }
  
  /**
   * Distance calculation with fractal boundary detection
   */
  static getDistanceToOrganicBoundary(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): number {
    const toCenter = position.clone().sub(biomeShape.center);
    const angle = Math.atan2(toCenter.z, toCenter.x);
    const distanceToCenter = toCenter.length();
    
    // Calculate boundary radius with enhanced fractal distortion
    const boundaryRadius = this.getEnhancedBoundaryRadius(angle, position, biomeShape);
    
    return distanceToCenter - boundaryRadius;
  }
  
  /**
   * Enhanced boundary radius calculation with multi-scale fractal distortion
   */
  static getEnhancedBoundaryRadius(
    angle: number, 
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): number {
    // Normalize angle to 0-2π
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    
    // Primary organic distortion
    const primaryDistortion = NoiseUtilities.boundaryDistortion(
      normalizedAngle,
      biomeShape.center.x,
      biomeShape.center.z,
      biomeShape.seed,
      biomeShape.shapeComplexity
    );
    
    // Secondary position-based distortion for "erosion patterns"
    const erosionNoise = NoiseUtilities.organicNoise(
      position.x * 0.1,
      position.z * 0.1,
      biomeShape.seed + 4000,
      3,
      0.2,
      0.3,
      0.6
    );
    
    // Fine-scale "boundary wobble" for natural irregularity
    const wobbleNoise = NoiseUtilities.organicNoise(
      position.x * 0.3,
      position.z * 0.3,
      biomeShape.seed + 5000,
      2,
      0.8,
      0.15,
      0.7
    );
    
    // Combine all distortions
    const totalDistortion = primaryDistortion + erosionNoise * 0.4 + wobbleNoise * 0.2;
    
    return biomeShape.baseRadius * (1.0 + totalDistortion);
  }
  
  /**
   * Check if position is inside the fractal biome shape
   */
  static isInsideOrganicBiome(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): boolean {
    return this.getDistanceToOrganicBoundary(position, biomeShape) <= 0;
  }
  
  /**
   * Calculate organic influence with MUCH sharper boundaries and smaller blend distances
   */
  static calculateOrganicInfluence(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): number {
    const distanceToBoundary = this.getDistanceToOrganicBoundary(position, biomeShape);
    
    // MUCH smaller blend distances for sharper biome boundaries
    const baseBlendDistance = NoiseUtilities.variableBlendDistance(
      position,
      biomeShape.center,
      biomeShape.seed,
      1, // minBlend - reduced from 3
      3  // maxBlend - reduced from 15
    );
    
    // Minimal blend variation for consistent sharp edges
    const blendVariation = NoiseUtilities.organicNoise(
      position.x * 0.2,
      position.z * 0.2,
      biomeShape.seed + 6000,
      2,
      0.4,
      0.1, // Reduced variation
      0.6
    );
    
    const actualBlendDistance = baseBlendDistance * (1.0 + blendVariation * 0.1); // Much less variation
    
    if (distanceToBoundary <= 0) {
      // Inside the biome - VERY strong, consistent influence
      const innerVariation = 1.0 + NoiseUtilities.organicNoise(
        position.x * 0.05,
        position.z * 0.05,
        biomeShape.seed + 7000,
        2, // Reduced octaves
        0.8,
        0.05, // Much less variation
        0.5
      );
      return Math.min(1.0, biomeShape.strength * innerVariation);
    } else if (distanceToBoundary <= actualBlendDistance) {
      // In the transition zone - MUCH sharper falloff
      const falloffRatio = 1.0 - (distanceToBoundary / actualBlendDistance);
      
      // Minimal organic variation in falloff for cleaner boundaries
      const falloffNoise = NoiseUtilities.organicNoise(
        position.x * 0.15,
        position.z * 0.15,
        biomeShape.seed + 8000,
        2, // Reduced octaves
        1.0,
        0.05, // Much less noise
        0.65
      );
      
      // Sharp falloff calculation with minimal organic distortion
      const organicFalloff = falloffRatio + falloffNoise * 0.1; // Much less noise influence
      return Math.max(0, Math.min(1.0, organicFalloff * biomeShape.strength));
    }
    
    return 0; // Outside influence range
  }
}
