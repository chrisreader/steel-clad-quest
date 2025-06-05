
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';

export class SlabShape extends BaseRockShape {
  constructor() {
    super('slab');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Create flattened box with rounded edges
    const width = size * (1.5 + Math.random() * 0.8); // 1.5-2.3x height
    const height = size * (0.3 + Math.random() * 0.3); // 30-60% of base size
    const depth = size * (1.2 + Math.random() * 0.6); // 1.2-1.8x height
    
    const geometry = new THREE.BoxGeometry(width, height, depth, 2, 1, 2);
    
    // Apply safe natural variation for slab characteristics
    const scaleVariation = {
      x: 0.9 + Math.random() * 0.2,
      y: 1.0, // Keep height consistent for slab
      z: 0.9 + Math.random() * 0.2
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
}
