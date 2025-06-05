
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';

export class JaggedShape extends BaseRockShape {
  constructor() {
    super('jagged');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Use icosahedron for jagged appearance
    const geometry = new THREE.IcosahedronGeometry(size, 0); // Low detail for sharp edges
    
    // Apply safe natural variation for jagged characteristics
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.4,
      y: 0.8 + Math.random() * 0.6,
      z: 0.8 + Math.random() * 0.4
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
}
