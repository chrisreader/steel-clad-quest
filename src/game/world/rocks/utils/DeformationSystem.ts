
import * as THREE from 'three';
import { RockShape, RockCategory } from '../types/RockTypes';

export interface DeformationConfig {
  octaves: number;
  frequency: number;
  amplitude: number;
}

export interface DetailRoughnessConfig {
  frequency: number;
  amplitude: number;
}

export interface SurfaceErosionConfig {
  erosionPasses: number;
  smoothness: number;
  intensity: number;
}

export class DeformationSystem {
  private static noiseSeed = Math.random() * 1000;

  /**
   * Apply multi-pass deformation system with noise, detail, and erosion
   */
  public static applyCompleteDeformation(
    geometry: THREE.BufferGeometry,
    rockShape: RockShape,
    rockSize: number,
    category: RockCategory
  ): void {
    // Pass 1: Primary noise deformation
    this.applyNoiseDeformation(geometry, {
      octaves: 4,
      frequency: 2.0,
      amplitude: 0.15 * rockShape.deformationIntensity
    }, rockSize);

    // Pass 2: Detail roughness
    this.applyDetailRoughness(geometry, {
      frequency: 10.0,
      amplitude: 0.05 * rockShape.weatheringLevel
    }, rockSize);

    // Pass 3: Surface erosion (if weathered)
    if (rockShape.weatheringLevel > 0.5) {
      this.applySurfaceErosion(geometry, {
        erosionPasses: 3,
        smoothness: 0.8,
        intensity: rockShape.weatheringLevel
      }, rockSize);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Apply primary noise deformation with multiple octaves
   */
  private static applyNoiseDeformation(
    geometry: THREE.BufferGeometry,
    config: DeformationConfig,
    rockSize: number
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      let totalDisplacement = 0;
      let amplitude = config.amplitude;
      let frequency = config.frequency;
      
      // Multi-octave noise
      for (let octave = 0; octave < config.octaves; octave++) {
        const noise = Math.sin((x + this.noiseSeed) * frequency) * 
                     Math.cos((y + this.noiseSeed) * frequency) * 
                     Math.sin((z + this.noiseSeed) * frequency);
        
        totalDisplacement += noise * amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        positions[i] += normalX * totalDisplacement;
        positions[i + 1] += normalY * totalDisplacement;
        positions[i + 2] += normalZ * totalDisplacement;
      }
    }
  }

  /**
   * Apply fine detail roughness for surface texture
   */
  private static applyDetailRoughness(
    geometry: THREE.BufferGeometry,
    config: DetailRoughnessConfig,
    rockSize: number
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const detailNoise = Math.sin(x * config.frequency) * 
                         Math.cos(y * config.frequency) * 
                         Math.sin(z * config.frequency);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = detailNoise * config.amplitude;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }

  /**
   * Apply surface erosion with multiple smoothing passes
   */
  private static applySurfaceErosion(
    geometry: THREE.BufferGeometry,
    config: SurfaceErosionConfig,
    rockSize: number
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let pass = 0; pass < config.erosionPasses; pass++) {
      const tempPositions = new Float32Array(positions.length);
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Apply erosion noise
        const erosionNoise = Math.sin(x * 6 + this.noiseSeed) * 
                            Math.cos(y * 6 + this.noiseSeed) * 
                            Math.sin(z * 6 + this.noiseSeed);
        
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length > 0) {
          const normalX = x / length;
          const normalY = y / length;
          const normalZ = z / length;
          
          const erosionIntensity = config.intensity * 0.02;
          const displacement = erosionNoise * erosionIntensity;
          
          tempPositions[i] = x + normalX * displacement;
          tempPositions[i + 1] = y + normalY * displacement;
          tempPositions[i + 2] = z + normalZ * displacement;
        } else {
          tempPositions[i] = x;
          tempPositions[i + 1] = y;
          tempPositions[i + 2] = z;
        }
      }
      
      // Apply smoothing
      for (let i = 0; i < positions.length; i++) {
        positions[i] = positions[i] * (1 - config.smoothness) + tempPositions[i] * config.smoothness;
      }
    }
  }
}
