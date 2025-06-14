
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
   * Creates an organic, irregular biome shape
   */
  static createOrganicBiome(
    center: THREE.Vector3,
    biomeType: BiomeType,
    baseRadius: number,
    seed: number,
    strength: number = 1.0
  ): OrganicBiomeShape {
    // Generate 8-16 control points around the perimeter for organic shapes
    const controlPointCount = 8 + Math.floor(NoiseUtilities.seededNoise(seed, 0, 0) * 8);
    const controlPoints: THREE.Vector3[] = [];
    const shapeComplexity = 0.2 + Math.abs(NoiseUtilities.seededNoise(seed, 1000, 0)) * 0.4;
    
    for (let i = 0; i < controlPointCount; i++) {
      const angle = (i / controlPointCount) * Math.PI * 2;
      
      // Add organic distortion to radius
      const radiusVariation = 1.0 + NoiseUtilities.boundaryDistortion(
        angle, center.x, center.z, seed, shapeComplexity
      );
      
      const distortedRadius = baseRadius * radiusVariation;
      
      const x = center.x + Math.cos(angle) * distortedRadius;
      const z = center.z + Math.sin(angle) * distortedRadius;
      
      controlPoints.push(new THREE.Vector3(x, 0, z));
    }
    
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
   * Calculate distance from point to organic biome boundary
   */
  static getDistanceToOrganicBoundary(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): number {
    const toCenter = position.clone().sub(biomeShape.center);
    const angle = Math.atan2(toCenter.z, toCenter.x);
    const distanceToCenter = toCenter.length();
    
    // Find the closest boundary point using the organic shape
    const boundaryRadius = this.getBoundaryRadiusAtAngle(angle, biomeShape);
    
    return distanceToCenter - boundaryRadius;
  }
  
  /**
   * Get the boundary radius at a specific angle for organic shape
   */
  static getBoundaryRadiusAtAngle(angle: number, biomeShape: OrganicBiomeShape): number {
    // Normalize angle to 0-2π
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    
    // Add organic distortion to the radius
    const organicDistortion = NoiseUtilities.boundaryDistortion(
      normalizedAngle,
      biomeShape.center.x,
      biomeShape.center.z,
      biomeShape.seed,
      biomeShape.shapeComplexity
    );
    
    return biomeShape.baseRadius * (1.0 + organicDistortion);
  }
  
  /**
   * Check if a position is inside the organic biome
   */
  static isInsideOrganicBiome(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): boolean {
    return this.getDistanceToOrganicBoundary(position, biomeShape) <= 0;
  }
  
  /**
   * Calculate organic influence at position with variable blending
   */
  static calculateOrganicInfluence(
    position: THREE.Vector3,
    biomeShape: OrganicBiomeShape
  ): number {
    const distanceToBoundary = this.getDistanceToOrganicBoundary(position, biomeShape);
    
    // Variable blend distance based on position
    const blendDistance = NoiseUtilities.variableBlendDistance(
      position,
      biomeShape.center,
      biomeShape.seed,
      2, // minBlend
      8  // maxBlend
    );
    
    if (distanceToBoundary <= 0) {
      // Inside the biome - full strength with some organic variation
      const innerVariation = 1.0 + NoiseUtilities.organicNoise(
        position.x * 0.02,
        position.z * 0.02,
        biomeShape.seed + 3000,
        2,
        1.0,
        0.1,
        0.5
      );
      return Math.min(1.0, biomeShape.strength * innerVariation);
    } else if (distanceToBoundary <= blendDistance) {
      // In the transition zone - organic falloff
      const falloffRatio = 1.0 - (distanceToBoundary / blendDistance);
      
      // Add organic variation to the falloff
      const falloffNoise = NoiseUtilities.organicNoise(
        position.x * 0.05,
        position.z * 0.05,
        biomeShape.seed + 4000,
        3,
        2.0,
        0.2,
        0.6
      );
      
      const organicFalloff = falloffRatio + falloffNoise * 0.3;
      return Math.max(0, Math.min(1.0, organicFalloff * biomeShape.strength));
    }
    
    return 0; // Outside influence range
  }
}
