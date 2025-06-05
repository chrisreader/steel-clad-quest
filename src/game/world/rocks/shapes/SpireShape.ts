
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';

export class SpireShape extends BaseRockShape {
  constructor() {
    super('spire');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    const height = size * (2.5 + Math.random() * 1.5);
    
    // Create tapered cylinder with more organic shape
    const geometry = new THREE.CylinderGeometry(
      size * (0.2 + Math.random() * 0.3), // Top radius: 20-50% of base
      size * (0.8 + Math.random() * 0.4), // Base radius: 80-120% of size
      height,
      12, // More segments for detail
      8   // Height segments for natural tapering
    );
    
    // Apply natural spire deformation
    this.applySpireDeformation(geometry, size, height);
    
    // Add vertex noise for surface detail
    GeometryUtils.addVertexNoise(geometry, 0.12);
    
    // Add some fracture lines
    GeometryUtils.addFractureLines(geometry, 0.3);
    
    // Ensure proper grounding with wider base
    GeometryUtils.addRealisticGrounding(geometry, 0.15);
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.9 + Math.random() * 0.2,
      y: 1.0, // Keep height consistent for spires
      z: 0.9 + Math.random() * 0.2
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
  
  private applySpireDeformation(geometry: THREE.BufferGeometry, size: number, height: number): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      // Normalize height (0 = bottom, 1 = top)
      const heightNorm = (y + height/2) / height;
      
      // Add natural lean and irregularity
      const lean = Math.sin(heightNorm * Math.PI) * size * 0.1;
      const twist = heightNorm * Math.PI * 0.2;
      
      // Apply deformation
      const newX = x + lean * Math.cos(twist);
      const newZ = z + lean * Math.sin(twist);
      
      // Add surface irregularities that increase with height
      const surfaceNoise = (Math.sin(y * 0.5) + Math.cos(x * 0.8) + Math.sin(z * 0.6)) * heightNorm * 0.05;
      
      positionArray[i] = newX + surfaceNoise;
      positionArray[i + 1] = y;
      positionArray[i + 2] = newZ + surfaceNoise;
    }
    
    positions.needsUpdate = true;
  }
}
