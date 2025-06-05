
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';

export class SpireShape extends BaseRockShape {
  constructor() {
    super('spire');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    const height = size * (2.5 + Math.random() * 1.5); // 2.5-4x width
    
    // Create elongated cylinder with tapered top
    const baseRadius = size;
    const topRadius = size * (0.3 + Math.random() * 0.4); // 30-70% of base
    
    const geometry = new THREE.CylinderGeometry(topRadius, baseRadius, height, 8, 4);
    
    // Apply safe natural variation for spire characteristics
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.3,
      y: 1.0, // Keep height consistent
      z: 0.8 + Math.random() * 0.3
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
}
