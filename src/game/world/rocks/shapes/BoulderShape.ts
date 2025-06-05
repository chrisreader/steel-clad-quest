
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';

export class BoulderShape extends BaseRockShape {
  constructor() {
    super('boulder');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Create multiple overlapping spheres for organic boulder shape
    const sphereCount = 3 + Math.floor(Math.random() * 2); // 3-4 spheres
    const geometries: THREE.BufferGeometry[] = [];
    
    // Main sphere
    const mainSphere = new THREE.SphereGeometry(size, 16, 12);
    geometries.push(mainSphere);
    
    // Additional spheres for organic shape
    for (let i = 1; i < sphereCount; i++) {
      const sphereSize = size * (0.6 + Math.random() * 0.4); // 60-100% of main size
      const sphere = new THREE.SphereGeometry(sphereSize, 12, 8);
      
      // Position offset for organic irregularity
      const angle = (i / sphereCount) * Math.PI * 2 + Math.random() * 0.8;
      const distance = size * (0.3 + Math.random() * 0.3);
      
      sphere.translate(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * size * 0.4,
        Math.sin(angle) * distance
      );
      
      geometries.push(sphere);
    }
    
    // Use the main geometry as base and create a group effect
    const finalGeometry = geometries[0];
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.9 + Math.random() * 0.2,
      y: 0.8 + Math.random() * 0.3,
      z: 0.9 + Math.random() * 0.2
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(finalGeometry, scaleVariation));
  }
}
