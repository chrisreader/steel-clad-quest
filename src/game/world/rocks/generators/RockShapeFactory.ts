
import * as THREE from 'three';
import { RockShape } from '../types/RockTypes';
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
   * Applies shape modifications to the rock geometry
   */
  static applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    switch (rockShape.shapeModifier) {
      case 'stretch':
        if (rockShape.type === 'spire') {
          this.applySpireSpecificStretching(geometry, rockSize, rockShape);
        } else {
          this.applyStretchModification(positions, rockSize);
        }
        break;
        
      case 'flatten':
        this.applyFlattenModification(positions, rockSize);
        break;
        
      case 'fracture':
        this.applyFractureModification(positions, rockSize);
        break;
        
      case 'erode':
        this.applyErosionModification(positions, rockSize);
        break;
        
      default:
        break;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Applies spire-specific stretching
   */
  static applySpireSpecificStretching(geometry: THREE.BufferGeometry, rockSize: number, rockShape: RockShape): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertex = new THREE.Vector3();
    
    // Calculate maximum safe displacement to prevent mesh gaps
    const maxVerticalStretch = rockSize * 2.0;
    const maxRadialTaper = 0.4;
    
    for (let i = 0; i < positions.length; i += 3) {
      vertex.set(positions[i], positions[i + 1], positions[i + 2]);
      const originalY = vertex.y;
      const originalRadius = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      
      // Apply controlled vertical stretching with limits
      const stretchFactor = Math.min(1.8, 1.0 + Math.abs(originalY) / rockSize);
      vertex.y = Math.sign(originalY) * Math.min(Math.abs(originalY * stretchFactor), maxVerticalStretch);
      
      // Apply gradual tapering based on height to create cone effect
      const heightRatio = Math.abs(vertex.y) / maxVerticalStretch;
      const taperFactor = Math.max(maxRadialTaper, 1.0 - heightRatio * 0.6);
      
      // Ensure we don't taper too aggressively near the tip
      const safeTaperFactor = Math.max(0.3, taperFactor);
      
      if (originalRadius > 0) {
        vertex.x *= safeTaperFactor;
        vertex.z *= safeTaperFactor;
      }
      
      positions[i] = vertex.x;
      positions[i + 1] = vertex.y;
      positions[i + 2] = vertex.z;
    }
    
    // Apply spire-specific geometry validation
    this.validateSpireGeometry(geometry, rockSize);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Validates and fixes spire geometry
   */
  static validateSpireGeometry(geometry: THREE.BufferGeometry, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const indices = geometry.index;
    
    if (!indices) return;
    
    let repairedVertices = 0;
    const vertex1 = new THREE.Vector3();
    const vertex2 = new THREE.Vector3();
    const vertex3 = new THREE.Vector3();
    
    // Check each triangle for degenerate cases
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i) * 3;
      const b = indices.getX(i + 1) * 3;
      const c = indices.getX(i + 2) * 3;
      
      vertex1.set(positions[a], positions[a + 1], positions[a + 2]);
      vertex2.set(positions[b], positions[b + 1], positions[b + 2]);
      vertex3.set(positions[c], positions[c + 1], positions[c + 2]);
      
      // Calculate triangle area
      const edge1 = vertex2.clone().sub(vertex1);
      const edge2 = vertex3.clone().sub(vertex1);
      const area = edge1.cross(edge2).length() * 0.5;
      
      // If triangle is too small (degenerate), repair vertices
      if (area < 0.001) {
        // Move vertices slightly apart to create valid triangle
        const center = vertex1.clone().add(vertex2).add(vertex3).divideScalar(3);
        const offset = rockSize * 0.01;
        
        vertex1.lerp(center, 0.1).add(new THREE.Vector3(offset, 0, 0));
        vertex2.lerp(center, 0.1).add(new THREE.Vector3(0, offset, 0));
        vertex3.lerp(center, 0.1).add(new THREE.Vector3(0, 0, offset));
        
        positions[a] = vertex1.x;
        positions[a + 1] = vertex1.y;
        positions[a + 2] = vertex1.z;
        
        positions[b] = vertex2.x;
        positions[b + 1] = vertex2.y;
        positions[b + 2] = vertex2.z;
        
        positions[c] = vertex3.x;
        positions[c + 1] = vertex3.y;
        positions[c + 2] = vertex3.z;
        
        repairedVertices += 3;
      }
    }
  }
  
  /**
   * Applies stretch modification to rock vertices
   */
  static applyStretchModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      
      positions[i + 1] = y * (1.5 + Math.random() * 0.5);
      
      const height = Math.abs(positions[i + 1]);
      const taperFactor = Math.max(0.3, 1 - height / (rockSize * 2));
      positions[i] *= taperFactor;
      positions[i + 2] *= taperFactor;
    }
  }
  
  /**
   * Applies flatten modification to rock vertices
   */
  static applyFlattenModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] *= 0.3 + Math.random() * 0.2;
      positions[i] *= 1.3 + Math.random() * 0.4;
      positions[i + 2] *= 1.3 + Math.random() * 0.4;
    }
  }
  
  /**
   * Applies fracture modification to rock vertices
   */
  static applyFractureModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const facetNoise = Math.floor(x * 3) + Math.floor(y * 3) + Math.floor(z * 3);
      const facetIntensity = (facetNoise % 3) * 0.1;
      
      positions[i] += Math.sign(x) * facetIntensity;
      positions[i + 1] += Math.sign(y) * facetIntensity;
      positions[i + 2] += Math.sign(z) * facetIntensity;
    }
  }
  
  /**
   * Applies erosion modification to rock vertices
   */
  static applyErosionModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const erosion1 = Math.sin(x * 2) * Math.cos(y * 2) * 0.15;
      const erosion2 = Math.sin(z * 3) * Math.cos(x * 1.5) * 0.1;
      
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
   * Applies character deformation to rock geometry
   */
  static applyCharacterDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape
  ): void {
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
