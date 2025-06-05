
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';

export class FlattenedShape extends BaseRockShape {
  constructor() {
    super('flattened');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Create very flat sphere
    const geometry = new THREE.SphereGeometry(size, 10, 6);
    
    // Apply safe natural variation for flattened characteristics
    const scaleVariation = {
      x: 0.9 + Math.random() * 0.3,
      y: 0.2 + Math.random() * 0.3, // Very flat (20-50% height)
      z: 0.9 + Math.random() * 0.3
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
}
