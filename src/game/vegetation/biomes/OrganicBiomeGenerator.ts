
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
   * Creates simplified organic biome shapes for clear exploration
   */
  static createOrganicBiome(
    center: THREE.Vector3,
    biomeType: BiomeType,
    baseRadius: number,
    seed: number,
    strength: number = 0.9
  ): OrganicBiomeShape {
    // Generate 8-12 control points for balanced organic shapes
    const controlPointCount = 8 + Math.floor(NoiseUtilities.seededNoise(seed, 0, 0) * 4);
    const controlPoints: THREE.Vector3[] = [];
    
    // Moderate shape complexity for natural but not extreme variation
    const shapeComplexity = 0.2 + Math.abs(NoiseUtilities.seededNoise(seed, 1000, 0)) * 0.2;
    
    for (let i = 0; i < controlPointCount; i++) {
      const angle = (i / controlPointCount) * Math.PI * 2;
      
      // Single layer boundary distortion for clean organic edges
      const distortion = NoiseUtilities.boundaryDistortion(
        angle, center.x, center.z, seed, shapeComplexity
      );
      
      const radiusVariation = 1.0 + distortion;
      const clampedVariation = Math.max(0.6, Math.min(1.4, radiusVariation));
      const distortedRadius = baseRadius * clampedVariation;
      
      const x = center.x + Math.cos(angle) * distortedRadius;
      const z = center.z + Math.sin(angle) * distortedRadius;
      
      controlPoints.push(new THREE.Vector3(x, 0, z));
    }
    
    console.log(`🔥 SIMPLIFIED BIOME: Created ${biomeType} with ${controlPointCount} control points, radius ${baseRadius.toFixed(1)}, complexity ${shapeComplexity.toFixed(2)}`);
    
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
   * Simplified distance calculation with clean boundaries
   */
  static getDistanceToOrganicBoundary(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): number {
    const toCenter = position.clone().sub(biomeShape.center);
    const angle = Math.atan2(toCenter.z, toCenter.x);
    const distanceToCenter = toCenter.length();
    
    const boundaryRadius = this.getSimplifiedBoundaryRadius(angle, biomeShape);
    
    return distanceToCenter - boundaryRadius;
  }
  
  /**
   * Simplified boundary radius calculation
   */
  static getSimplifiedBoundaryRadius(
    angle: number,
    biomeShape: OrganicBiomeShape
  ): number {
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    
    // Single organic distortion layer for clean but natural boundaries
    const distortion = NoiseUtilities.boundaryDistortion(
      normalizedAngle,
      biomeShape.center.x,
      biomeShape.center.z,
      biomeShape.seed,
      biomeShape.shapeComplexity
    );
    
    return biomeShape.baseRadius * (1.0 + distortion);
  }
  
  /**
   * Check if position is inside the organic biome shape
   */
  static isInsideOrganicBiome(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): boolean {
    return this.getDistanceToOrganicBoundary(position, biomeShape) <= 0;
  }
  
  /**
   * Calculate simplified organic influence with clean boundaries
   */
  static calculateOrganicInfluence(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): number {
    const distanceToBoundary = this.getDistanceToOrganicBoundary(position, biomeShape);
    
    // Small, clean blend distance for sharp transitions
    const blendDistance = 2 + Math.abs(NoiseUtilities.seededNoise(
      position.x * 0.1 + position.z * 0.1,
      biomeShape.seed
    )) * 3; // 2-5 units blend distance
    
    if (distanceToBoundary <= 0) {
      // Inside the biome - strong, consistent influence
      return Math.min(1.0, biomeShape.strength);
    } else if (distanceToBoundary <= blendDistance) {
      // In the small transition zone - simple linear falloff
      const falloffRatio = 1.0 - (distanceToBoundary / blendDistance);
      return Math.max(0, falloffRatio * biomeShape.strength);
    }
    
    return 0; // Outside influence range
  }
}
