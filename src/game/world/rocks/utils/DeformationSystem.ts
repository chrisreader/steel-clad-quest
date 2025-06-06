
import * as THREE from 'three';
import { RockShape, RockCategory } from '../types/RockTypes';

export class DeformationSystem {
  /**
   * Apply multi-pass deformation system for realistic rock shapes
   */
  public static applyCompleteDeformationPipeline(
    geometry: THREE.BufferGeometry,
    shape: RockShape,
    size: number,
    category: RockCategory
  ): void {
    // Pass 1: Base noise deformation
    this.applyNoiseDeformation(geometry, {
      octaves: 4,
      frequency: 2.0,
      amplitude: 0.15 * shape.deformationIntensity
    });

    // Pass 2: Shape-specific modifier
    this.applyShapeModifier(geometry, shape.shapeModifier, size, shape);

    // Pass 3: Detail roughness
    this.applyDetailRoughness(geometry, {
      frequency: 10.0,
      amplitude: 0.05 * shape.weatheringLevel
    });

    // Pass 4: Surface erosion for weathered rocks
    if (shape.weatheringLevel > 0.5) {
      this.applySurfaceErosion(geometry, {
        erosionPasses: 3,
        smoothness: 0.8,
        intensity: shape.weatheringLevel
      });
    }

    // Final validation
    this.validateAndRepairGeometry(geometry);
  }

  /**
   * Apply base noise deformation with multiple octaves
   */
  private static applyNoiseDeformation(
    geometry: THREE.BufferGeometry,
    options: { octaves: number; frequency: number; amplitude: number }
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      let noise = 0;
      let frequency = options.frequency;
      let amplitude = options.amplitude;

      // Multi-octave noise
      for (let octave = 0; octave < options.octaves; octave++) {
        noise += Math.sin(x * frequency) * Math.cos(y * frequency) * Math.sin(z * frequency) * amplitude;
        frequency *= 2;
        amplitude *= 0.5;
      }

      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;

        positions[i] += normalX * noise;
        positions[i + 1] += normalY * noise;
        positions[i + 2] += normalZ * noise;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Apply shape-specific modifiers
   */
  private static applyShapeModifier(
    geometry: THREE.BufferGeometry,
    modifier: 'none' | 'stretch' | 'flatten' | 'fracture' | 'erode',
    size: number,
    shape: RockShape
  ): void {
    switch (modifier) {
      case 'stretch':
        this.applyStretchModifier(geometry, size, shape);
        break;
      case 'flatten':
        this.applyFlattenModifier(geometry, size);
        break;
      case 'fracture':
        this.applyFractureModifier(geometry, size, shape.deformationIntensity);
        break;
      case 'erode':
        this.applyErodeModifier(geometry, size, shape.weatheringLevel);
        break;
      default:
        break;
    }
  }

  /**
   * Stretch modifier - vertical elongation with tapering (for spires)
   */
  private static applyStretchModifier(geometry: THREE.BufferGeometry, size: number, shape: RockShape): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const maxHeight = size * 2.5; // Dramatic vertical stretching

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Vertical stretching with height-based tapering
      const stretchFactor = 1.8 + Math.abs(y) / size * 0.5;
      const newY = Math.sign(y) * Math.min(Math.abs(y * stretchFactor), maxHeight);

      // Tapering - reduce X/Z as height increases
      const heightRatio = Math.abs(newY) / maxHeight;
      const taperFactor = Math.max(0.3, 1.0 - heightRatio * 0.7);

      positions[i] = x * taperFactor;
      positions[i + 1] = newY;
      positions[i + 2] = z * taperFactor;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Flatten modifier - compress Y, expand X/Z (for slabs)
   */
  private static applyFlattenModifier(geometry: THREE.BufferGeometry, size: number): void {
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= 1.4 + Math.random() * 0.3;     // Expand X
      positions[i + 1] *= 0.25 + Math.random() * 0.15; // Compress Y
      positions[i + 2] *= 1.4 + Math.random() * 0.3;   // Expand Z
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Fracture modifier - jagged angular displacement (for angular/jagged)
   */
  private static applyFractureModifier(geometry: THREE.BufferGeometry, size: number, intensity: number): void {
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Create angular facets
      const facetX = Math.floor(x / size * 6) * intensity * 0.3;
      const facetY = Math.floor(y / size * 6) * intensity * 0.3;
      const facetZ = Math.floor(z / size * 6) * intensity * 0.3;

      // Sharp angular displacement
      const sharpness = Math.sin(x * 8) * Math.cos(z * 8) * intensity * 0.2;

      positions[i] += facetX + sharpness;
      positions[i + 1] += facetY;
      positions[i + 2] += facetZ + sharpness;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Erode modifier - smooth round distortion (for weathered/boulders)
   */
  private static applyErodeModifier(geometry: THREE.BufferGeometry, size: number, weatheringLevel: number): void {
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Smooth erosion patterns
      const erosion1 = Math.sin(x / size * 3) * Math.cos(y / size * 3) * weatheringLevel * 0.15;
      const erosion2 = Math.sin(z / size * 4) * Math.cos(x / size * 2) * weatheringLevel * 0.1;
      const erosion3 = Math.cos(y / size * 5) * Math.sin(z / size * 3) * weatheringLevel * 0.08;

      const totalErosion = erosion1 + erosion2 + erosion3;

      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;

        positions[i] += normalX * totalErosion;
        positions[i + 1] += normalY * totalErosion;
        positions[i + 2] += normalZ * totalErosion;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Apply detail roughness for surface texture
   */
  private static applyDetailRoughness(
    geometry: THREE.BufferGeometry,
    options: { frequency: number; amplitude: number }
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const detailNoise = Math.sin(x * options.frequency) * 
                         Math.cos(y * options.frequency) * 
                         Math.sin(z * options.frequency) * options.amplitude;

      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;

        positions[i] += normalX * detailNoise;
        positions[i + 1] += normalY * detailNoise;
        positions[i + 2] += normalZ * detailNoise;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Apply surface erosion for highly weathered rocks
   */
  private static applySurfaceErosion(
    geometry: THREE.BufferGeometry,
    options: { erosionPasses: number; smoothness: number; intensity: number }
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;

    for (let pass = 0; pass < options.erosionPasses; pass++) {
      const tempPositions = new Float32Array(positions.length);

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Smooth erosion by averaging with nearby vertices
        let avgX = x, avgY = y, avgZ = z;
        let count = 1;

        // Find nearby vertices for smoothing
        for (let j = 0; j < positions.length; j += 3) {
          if (i !== j) {
            const dx = positions[i] - positions[j];
            const dy = positions[i + 1] - positions[j + 1];
            const dz = positions[i + 2] - positions[j + 2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < 0.3) {
              avgX += positions[j];
              avgY += positions[j + 1];
              avgZ += positions[j + 2];
              count++;
            }
          }
        }

        // Apply smoothing with intensity control
        const smoothFactor = options.smoothness * options.intensity;
        tempPositions[i] = x * (1 - smoothFactor) + (avgX / count) * smoothFactor;
        tempPositions[i + 1] = y * (1 - smoothFactor) + (avgY / count) * smoothFactor;
        tempPositions[i + 2] = z * (1 - smoothFactor) + (avgZ / count) * smoothFactor;
      }

      // Copy smoothed positions back
      for (let i = 0; i < positions.length; i++) {
        positions[i] = tempPositions[i];
      }
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Validate and repair geometry after deformation
   */
  private static validateAndRepairGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;

    // Fix any NaN or infinite values
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
}
