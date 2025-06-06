
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';

export class AngularShape extends BaseRockShape {
  constructor() {
    super('angular');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Start with dodecahedron for angular base
    const geometry = new THREE.DodecahedronGeometry(size, 0);
    
    // Apply angular fracturing
    this.applyAngularFracturing(geometry, size);
    
    // Add prominent fracture lines
    GeometryUtils.addFractureLines(geometry, 0.8);
    
    // Light vertex noise to maintain sharp edges
    GeometryUtils.addVertexNoise(geometry, 0.08);
    
    // Ensure proper grounding
    GeometryUtils.addRealisticGrounding(geometry, 0.05);
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.4,
      y: 0.7 + Math.random() * 0.5,
      z: 0.8 + Math.random() * 0.4
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
  
  private applyAngularFracturing(geometry: THREE.BufferGeometry, size: number): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    // Create fracture planes for realistic angular breaks
    const fracturePlanes = [
      { normal: new THREE.Vector3(1, 0.5, 0.2).normalize(), offset: size * 0.2 },
      { normal: new THREE.Vector3(-0.3, 1, 0.8).normalize(), offset: size * 0.15 },
      { normal: new THREE.Vector3(0.7, -0.4, 1).normalize(), offset: size * 0.1 },
      { normal: new THREE.Vector3(-0.8, 0.3, -0.6).normalize(), offset: size * 0.25 }
    ];
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const vertex = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
      
      fracturePlanes.forEach(plane => {
        const distance = vertex.dot(plane.normal) - plane.offset;
        
        // Create sharp breaks along fracture planes
        if (distance > 0 && distance < size * 0.3) {
          const breakIntensity = Math.sin(distance / (size * 0.1) * Math.PI) * 0.15;
          vertex.add(plane.normal.clone().multiplyScalar(-breakIntensity * size));
        }
      });
      
      positionArray[i] = vertex.x;
      positionArray[i + 1] = vertex.y;
      positionArray[i + 2] = vertex.z;
    }
    
    positions.needsUpdate = true;
  }
}
