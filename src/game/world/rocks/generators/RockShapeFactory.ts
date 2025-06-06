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
   * Applies enhanced shape modifications with proper intensity
   */
  static applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    switch (rockShape.shapeModifier) {
      case 'stretch':
        if (rockShape.type === 'spire') {
          this.applyEnhancedSpireStretching(geometry, rockSize, rockShape);
        } else {
          this.applyStretchModification(positions, rockSize, rockShape.deformationIntensity);
        }
        break;
        
      case 'flatten':
        this.applyEnhancedFlattenModification(positions, rockSize, rockShape.deformationIntensity);
        break;
        
      case 'fracture':
        this.applyEnhancedFractureModification(positions, rockSize, rockShape.deformationIntensity);
        break;
        
      case 'erode':
        this.applyEnhancedErosionModification(positions, rockSize, rockShape.weatheringLevel);
        break;
        
      default:
        break;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Enhanced spire stretching with proper intensity control
   */
  static applyEnhancedSpireStretching(geometry: THREE.BufferGeometry, rockSize: number, rockShape: RockShape): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertex = new THREE.Vector3();
    
    // Use deformation intensity for stretching control
    const stretchIntensity = 1.0 + rockShape.deformationIntensity * 2.0; // 1.0 to 2.4
    const maxVerticalStretch = rockSize * stretchIntensity;
    const maxRadialTaper = 0.2 + rockShape.deformationIntensity * 0.3; // 0.2 to 0.5
    
    for (let i = 0; i < positions.length; i += 3) {
      vertex.set(positions[i], positions[i + 1], positions[i + 2]);
      const originalY = vertex.y;
      const originalRadius = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      
      // Apply controlled vertical stretching
      const stretchFactor = Math.min(stretchIntensity, 1.0 + Math.abs(originalY) / rockSize);
      vertex.y = Math.sign(originalY) * Math.min(Math.abs(originalY * stretchFactor), maxVerticalStretch);
      
      // Apply gradual tapering based on height
      const heightRatio = Math.abs(vertex.y) / maxVerticalStretch;
      const taperFactor = Math.max(maxRadialTaper, 1.0 - heightRatio * 0.8);
      
      if (originalRadius > 0) {
        vertex.x *= taperFactor;
        vertex.z *= taperFactor;
      }
      
      positions[i] = vertex.x;
      positions[i + 1] = vertex.y;
      positions[i + 2] = vertex.z;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Enhanced stretch modification with intensity control
   */
  static applyStretchModification(positions: Float32Array, rockSize: number, intensity: number): void {
    const stretchFactor = 1.0 + intensity; // Use intensity directly
    
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      
      positions[i + 1] = y * stretchFactor;
      
      const height = Math.abs(positions[i + 1]);
      const taperFactor = Math.max(0.3, 1 - height / (rockSize * stretchFactor));
      positions[i] *= taperFactor;
      positions[i + 2] *= taperFactor;
    }
  }
  
  /**
   * Enhanced flatten modification with intensity control
   */
  static applyEnhancedFlattenModification(positions: Float32Array, rockSize: number, intensity: number): void {
    const flattenFactor = 0.1 + intensity * 0.3; // 0.1 to 0.4
    const expandFactor = 1.0 + intensity * 0.8; // 1.0 to 1.8
    
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] *= flattenFactor;
      positions[i] *= expandFactor;
      positions[i + 2] *= expandFactor;
    }
  }
  
  /**
   * Enhanced fracture modification with intensity control
   */
  static applyEnhancedFractureModification(positions: Float32Array, rockSize: number, intensity: number): void {
    const fractureIntensity = intensity * 0.2; // Scale intensity appropriately
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const facetNoise = Math.floor(x * 3) + Math.floor(y * 3) + Math.floor(z * 3);
      const facetDisplacement = (facetNoise % 3) * fractureIntensity;
      
      positions[i] += Math.sign(x) * facetDisplacement;
      positions[i + 1] += Math.sign(y) * facetDisplacement;
      positions[i + 2] += Math.sign(z) * facetDisplacement;
    }
  }
  
  /**
   * Enhanced erosion modification with weathering control
   */
  static applyEnhancedErosionModification(positions: Float32Array, rockSize: number, weatheringLevel: number): void {
    const erosionIntensity = weatheringLevel * 0.15; // Use weathering level for erosion
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const erosion1 = Math.sin(x * 2) * Math.cos(y * 2) * erosionIntensity;
      const erosion2 = Math.sin(z * 3) * Math.cos(x * 1.5) * erosionIntensity * 0.7;
      
      const totalErosion = erosion1 + erosion2;
      
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
  }
  
  /**
   * Apply complete character deformation using the new DeformationSystem
   */
  static applyCharacterDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape,
    category: RockCategory = 'medium'
  ): void {
    // Use the new multi-pass deformation system
    DeformationSystem.applyCompleteDeformation(geometry, rockShape, rockSize, category);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
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
