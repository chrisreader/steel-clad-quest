
import * as THREE from 'three';

export class NoiseUtilities {
  /**
   * Multi-octave Perlin-like noise for organic shapes
   */
  static organicNoise(
    x: number, 
    y: number, 
    seed: number = 0, 
    octaves: number = 4,
    frequency: number = 0.01,
    amplitude: number = 1.0,
    persistence: number = 0.5
  ): number {
    let value = 0;
    let currentAmplitude = amplitude;
    let currentFrequency = frequency;
    
    for (let i = 0; i < octaves; i++) {
      const noiseValue = this.seededNoise(x * currentFrequency, y * currentFrequency, seed + i * 1000);
      value += noiseValue * currentAmplitude;
      currentAmplitude *= persistence;
      currentFrequency *= 2.0;
    }
    
    return value;
  }
  
  /**
   * Seeded noise function for consistent results
   */
  static seededNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1; // -1 to 1 range
  }
  
  /**
   * Enhanced organic boundary distortion with fractal complexity
   */
  static boundaryDistortion(
    angle: number,
    centerX: number,
    centerZ: number,
    seed: number,
    intensity: number = 0.3
  ): number {
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    
    // Large scale features for major shape variation
    const largeScale = this.organicNoise(x * 1.5 + centerX * 0.0008, y * 1.5 + centerZ * 0.0008, seed, 4, 0.3, 1.0, 0.6);
    
    // Medium scale for organic irregularity
    const mediumScale = this.organicNoise(x * 6 + centerX * 0.003, y * 6 + centerZ * 0.003, seed + 500, 3, 0.8, 0.7, 0.65);
    
    // Fine scale for detailed texture
    const fineScale = this.organicNoise(x * 25 + centerX * 0.015, y * 25 + centerZ * 0.015, seed + 1000, 3, 3.0, 0.4, 0.75);
    
    // Ultra-fine scale for micro-details (fractal-like)
    const microScale = this.organicNoise(x * 80 + centerX * 0.05, y * 80 + centerZ * 0.05, seed + 1500, 2, 8.0, 0.2, 0.8);
    
    // Combine all scales with weighted influence
    const combined = largeScale + mediumScale * 0.7 + fineScale * 0.5 + microScale * 0.3;
    
    return combined * intensity;
  }
  
  /**
   * Enhanced variable blend distance with fractal variation
   */
  static variableBlendDistance(
    position: THREE.Vector3,
    biomeCenter: THREE.Vector3,
    seed: number,
    minBlend: number = 3,
    maxBlend: number = 15
  ): number {
    // Primary blend variation
    const primaryNoise = this.organicNoise(
      position.x * 0.08, 
      position.z * 0.08, 
      seed + 2000, 
      4, 
      0.1, 
      1.0, 
      0.6
    );
    
    // Secondary variation for more complexity
    const secondaryNoise = this.organicNoise(
      position.x * 0.25,
      position.z * 0.25,
      seed + 2500,
      3,
      0.3,
      0.6,
      0.7
    );
    
    // Distance-based modulation for larger variations near edges
    const distanceToCenter = position.distanceTo(biomeCenter);
    const distanceModulation = 1.0 + Math.sin(distanceToCenter * 0.01) * 0.3;
    
    // Combine all variations
    const combinedNoise = (primaryNoise + secondaryNoise * 0.5) * distanceModulation;
    const normalizedNoise = (combinedNoise + 1) * 0.5; // 0-1 range
    
    return minBlend + normalizedNoise * (maxBlend - minBlend);
  }
}
