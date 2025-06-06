import * as THREE from 'three';
import { RockShape, RockCategory } from '../types/RockTypes';
import { DeformationSystem } from '../utils/DeformationSystem';
import { Noise } from 'noisejs';

export class RockShapeFactory {
  private static noise: Noise;

  static initialize(): void {
    this.noise = new Noise(Math.random());
  }

  /**
   * Creates a base geometry for the rock based on the specified shape
   */
  static createCharacterBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(rockSize, 3);
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(rockSize, 24, 18);
        break;
        
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(rockSize, 2);
        break;
        
      case 'custom':
        geometry = this.createOrganicBoulderGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 3);
    }
    
    return geometry;
  }
  
  /**
   * Creates an organic boulder geometry
   */
  static createOrganicBoulderGeometry(rockSize: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(rockSize, 20, 16);
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      const noise1 = Math.sin(x * 1.5) * Math.cos(y * 1.5) * Math.sin(z * 1.5);
      const noise2 = Math.sin(x * 3) * Math.cos(z * 3) * 0.5;
      const noise3 = Math.cos(y * 4) * Math.sin(x * 2) * 0.3;
      const noise4 = Math.sin(x * 6) * Math.cos(y * 6) * Math.sin(z * 6) * 0.15;
      
      const organicFactor = 1 + (noise1 * 0.25 + noise2 * 0.15 + noise3 * 0.1 + noise4 * 0.05);
      
      if (distance > 0) {
        const normalizedX = x / distance;
        const normalizedY = y / distance;
        const normalizedZ = z / distance;
        
        const newDistance = distance * organicFactor;
        positions[i] = normalizedX * newDistance;
        positions[i + 1] = normalizedY * newDistance;
        positions[i + 2] = normalizedZ * newDistance;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  /**
   * Applies shape modifications using the new deformation system
   */
  static applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    // Use the new deformation system instead of inline modifications
    DeformationSystem.applyCompleteDeformationPipeline(geometry, rockShape, rockSize, 'medium');
  }
  
  /**
   * Applies character deformation using the enhanced system
   */
  static applyCharacterDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape
  ): void {
    // Apply additional character deformation on top of shape modifications
    this.applyOrganicNoiseDeformation(geometry, intensity, rockSize);
    this.applyDetailDeformation(geometry, intensity * 0.5, rockSize * 0.4);
    
    if (rockShape.weatheringLevel > 0.7) {
      this.applySurfaceRoughness(geometry, intensity * 0.3, rockSize * 0.2);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Applies organic noise deformation to rock geometry
   */
  static applyOrganicNoiseDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const noise1 = Math.sin(x / scale) * Math.cos(y / scale) * Math.sin(z / scale);
      const noise2 = Math.sin(x / scale * 2) * Math.cos(z / scale * 2) * 0.5;
      const noise3 = Math.cos(y / scale * 3) * Math.sin(x / scale * 3) * 0.25;
      
      const combinedNoise = noise1 + noise2 + noise3;
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = combinedNoise * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * Applies detail deformation to rock geometry
   */
  static applyDetailDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const detailNoise = Math.sin(x / scale * 8) * Math.cos(y / scale * 8) * Math.sin(z / scale * 8);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = detailNoise * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * Applies surface roughness to rock geometry
   */
  static applySurfaceRoughness(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const roughness = Math.sin(x / scale * 12) * Math.cos(y / scale * 12) * Math.sin(z / scale * 12);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = roughness * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * Validates and enhances rock geometry
   */
  static validateAndEnhanceGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
        console.warn('🔧 Fixed invalid vertex position');
      }
    }
    
    this.smoothExtremeVertices(geometry);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  
  /**
   * Smooths extreme vertices in rock geometry
   */
  static smoothExtremeVertices(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const tempPositions = new Float32Array(positions.length);
    
    for (let i = 0; i < positions.length; i++) {
      tempPositions[i] = positions[i];
    }
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const currentLength = Math.sqrt(x * x + y * y + z * z);
      
      let avgLength = 0;
      let count = 0;
      
      for (let j = 0; j < positions.length; j += 3) {
        if (j !== i) {
          const dx = positions[j] - x;
          const dy = positions[j + 1] - y;
          const dz = positions[j + 2] - z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < currentLength * 0.5) {
            const neighborLength = Math.sqrt(
              positions[j] * positions[j] + 
              positions[j + 1] * positions[j + 1] + 
              positions[j + 2] * positions[j + 2]
            );
            avgLength += neighborLength;
            count++;
          }
        }
      }
      
      if (count > 0) {
        avgLength /= count;
        
        if (Math.abs(currentLength - avgLength) > avgLength * 0.3) {
          const smoothFactor = 0.7;
          const targetLength = currentLength * (1 - smoothFactor) + avgLength * smoothFactor;
          
          if (currentLength > 0) {
            const scale = targetLength / currentLength;
            tempPositions[i] = x * scale;
            tempPositions[i + 1] = y * scale;
            tempPositions[i + 2] = z * scale;
          }
        }
      }
    }
    
    for (let i = 0; i < positions.length; i++) {
      positions[i] = tempPositions[i];
    }
    
    geometry.attributes.position.needsUpdate = true;
  }
}

// Initialize noise on import
RockShapeFactory.initialize();
