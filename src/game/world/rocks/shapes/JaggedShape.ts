
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';

export class JaggedShape extends BaseRockShape {
  constructor() {
    super('jagged');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Start with crystal-like base
    const geometry = new THREE.OctahedronGeometry(size, 0);
    
    // Apply crystalline deformation
    this.applyCrystallineDeformation(geometry, size);
    
    // Add prominent sharp edges and facets
    GeometryUtils.addFractureLines(geometry, 1.2);
    
    // Minimal vertex noise to maintain sharp character
    GeometryUtils.addVertexNoise(geometry, 0.05);
    
    // Ensure proper grounding
    GeometryUtils.addRealisticGrounding(geometry, 0.05);
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.4,
      y: 0.8 + Math.random() * 0.6,
      z: 0.8 + Math.random() * 0.4
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
  
  private applyCrystallineDeformation(geometry: THREE.BufferGeometry, size: number): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    // Create crystal growth patterns
    const growthDirections = [
      new THREE.Vector3(1, 0.3, 0.2).normalize(),
      new THREE.Vector3(-0.4, 1, 0.6).normalize(),
      new THREE.Vector3(0.7, -0.2, 1).normalize(),
      new THREE.Vector3(-0.5, 0.8, -0.9).normalize()
    ];
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const vertex = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
      const originalLength = vertex.length();
      
      // Apply crystal growth along preferred directions
      growthDirections.forEach((direction, index) => {
        const alignment = Math.max(0, vertex.normalize().dot(direction));
        const growth = Math.pow(alignment, 2) * size * (0.1 + index * 0.05);
        vertex.multiplyScalar(originalLength + growth);
      });
      
      // Add sharp crystal faces
      const faceNoise = Math.sin(vertex.x * 8) + Math.cos(vertex.y * 6) + Math.sin(vertex.z * 7);
      const faceSharpening = faceNoise > 1.5 ? size * 0.1 : 0;
      
      if (originalLength > 0) {
        vertex.normalize();
        vertex.multiplyScalar(originalLength + faceSharpening);
      }
      
      positionArray[i] = vertex.x;
      positionArray[i + 1] = vertex.y;
      positionArray[i + 2] = vertex.z;
    }
    
    positions.needsUpdate = true;
  }
}
