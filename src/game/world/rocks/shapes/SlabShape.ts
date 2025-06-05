
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';

export class SlabShape extends BaseRockShape {
  constructor() {
    super('slab');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Create realistic layered slab
    const width = size * (1.8 + Math.random() * 1.2); // 1.8-3x base size
    const height = size * (0.2 + Math.random() * 0.25); // 20-45% height
    const depth = size * (1.4 + Math.random() * 0.8); // 1.4-2.2x base size
    
    const geometry = new THREE.BoxGeometry(width, height, depth, 6, 2, 4);
    
    // Apply layered rock deformation
    this.applyLayeredDeformation(geometry, width, height, depth);
    
    // Add subtle fracture lines along layers
    GeometryUtils.addFractureLines(geometry, 0.4);
    
    // Light vertex noise to maintain slab character
    GeometryUtils.addVertexNoise(geometry, 0.1);
    
    // Ensure proper grounding
    GeometryUtils.addRealisticGrounding(geometry, 0.08);
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.9 + Math.random() * 0.2,
      y: 1.0, // Keep height consistent for slabs
      z: 0.9 + Math.random() * 0.2
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
  
  private applyLayeredDeformation(geometry: THREE.BufferGeometry, width: number, height: number, depth: number): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      // Create sedimentary layers
      const layerCount = 3 + Math.floor(Math.random() * 3); // 3-5 layers
      const layerThickness = height / layerCount;
      const currentLayer = Math.floor((y + height/2) / layerThickness);
      
      // Add layer separation and natural variation
      const layerOffset = Math.sin(currentLayer * 2) * 0.02 * height;
      const layerTilt = Math.sin(x / width * Math.PI) * 0.05 * height;
      
      // Surface weathering along layer boundaries
      const layerBoundaryDistance = Math.abs((y + height/2) % layerThickness - layerThickness/2);
      const boundaryWeathering = Math.max(0, 1 - layerBoundaryDistance / (layerThickness * 0.3)) * 0.03 * height;
      
      positionArray[i] = x;
      positionArray[i + 1] = y + layerOffset + layerTilt - boundaryWeathering;
      positionArray[i + 2] = z;
    }
    
    positions.needsUpdate = true;
  }
}
