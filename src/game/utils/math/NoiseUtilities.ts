
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
   * Creates organic boundary distortion
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
    
    // Multiple noise layers for complex organic shapes
    const largeScale = this.organicNoise(x * 2 + centerX * 0.001, y * 2 + centerZ * 0.001, seed, 3, 0.5, 1.0, 0.6);
    const mediumScale = this.organicNoise(x * 8 + centerX * 0.002, y * 8 + centerZ * 0.002, seed + 500, 2, 1.0, 0.5, 0.7);
    const fineScale = this.organicNoise(x * 20 + centerX * 0.005, y * 20 + centerZ * 0.005, seed + 1000, 2, 2.0, 0.3, 0.8);
    
    return (largeScale + mediumScale * 0.6 + fineScale * 0.4) * intensity;
  }
  
  /**
   * Generates variable blend distance along biome edges
   */
  static variableBlendDistance(
    position: THREE.Vector3,
    biomeCenter: THREE.Vector3,
    seed: number,
    minBlend: number = 2,
    maxBlend: number = 8
  ): number {
    const noise = this.organicNoise(
      position.x * 0.1, 
      position.z * 0.1, 
      seed + 2000, 
      3, 
      0.05, 
      1.0, 
      0.5
    );
    
    // Normalize noise to 0-1 range
    const normalizedNoise = (noise + 1) * 0.5;
    
    return minBlend + normalizedNoise * (maxBlend - minBlend);
  }
}
