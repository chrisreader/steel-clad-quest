
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';

export class AngularShape extends BaseRockShape {
  constructor() {
    super('angular');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Use octahedron for angular appearance
    const geometry = new THREE.OctahedronGeometry(size, Math.floor(Math.random() * 2)); // 0-1 detail level
    
    // Apply safe natural variation for angular characteristics
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.4,
      y: 0.7 + Math.random() * 0.5,
      z: 0.8 + Math.random() * 0.4
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
}
