
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';

export class WeatheredShape extends BaseRockShape {
  constructor() {
    super('weathered');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Start with sphere and add weathering indentations via multiple spheres
    const mainGeometry = new THREE.SphereGeometry(size, 12, 8);
    
    // Apply safe natural variation for weathered characteristics
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.3,
      y: 0.7 + Math.random() * 0.4, // More flattened from weathering
      z: 0.8 + Math.random() * 0.3
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(mainGeometry, scaleVariation));
  }
}
