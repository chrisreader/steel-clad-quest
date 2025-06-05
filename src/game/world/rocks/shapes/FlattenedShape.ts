
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';

export class FlattenedShape extends BaseRockShape {
  constructor() {
    super('flattened');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Start with sphere and heavily flatten
    const geometry = new THREE.SphereGeometry(size, 16, 10);
    
    // Apply compression deformation
    this.applyCompressionDeformation(geometry, size);
    
    // Add weathering appropriate for flattened rocks
    const weatheringLevel = config.weatheringRange.min + 
      Math.random() * (config.weatheringRange.max - config.weatheringRange.min);
    GeometryUtils.addWeatheringEffects(geometry, weatheringLevel);
    
    // Add vertex noise for natural surface
    GeometryUtils.addVertexNoise(geometry, 0.12);
    
    // Ensure very good grounding for flat rocks
    GeometryUtils.addRealisticGrounding(geometry, 0.15);
    
    // Apply safe natural variation with extreme flattening
    const scaleVariation = {
      x: 0.9 + Math.random() * 0.3,
      y: 0.15 + Math.random() * 0.2, // Very flat (15-35% height)
      z: 0.9 + Math.random() * 0.3
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
  
  private applyCompressionDeformation(geometry: THREE.BufferGeometry, size: number): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      // Create compression patterns - simulate geological pressure
      const compressionFactor = 1 - Math.abs(y / size) * 0.7; // More compression toward edges
      
      // Add natural edge irregularities
      const edgeDistance = Math.sqrt(x*x + z*z) / size;
      const edgeVariation = Math.sin(edgeDistance * Math.PI * 6) * 0.1 * compressionFactor;
      
      // Apply radial compression
      const radialFactor = 1 + edgeVariation;
      
      positionArray[i] = x * radialFactor;
      positionArray[i + 1] = y * compressionFactor;
      positionArray[i + 2] = z * radialFactor;
    }
    
    positions.needsUpdate = true;
  }
}
