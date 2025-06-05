
import * * THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';
import { SmoothingUtils } from '../utils/SmoothingUtils';

export class FlattenedShape extends BaseRockShape {
  constructor() {
    super('flattened');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Use adaptive subdivision for smooth flattened appearance
    const subdivisionLevel = SmoothingUtils.getSubdivisionLevel(size);
    
    // Start with sphere and heavily flatten
    const geometry = new THREE.SphereGeometry(size, Math.max(16, subdivisionLevel * 4), Math.max(10, subdivisionLevel * 2));
    
    // Apply compression deformation
    this.applyCompressionDeformation(geometry, size);
    
    // Apply smoothing to eliminate faceting on large flat surfaces
    SmoothingUtils.applyLaplacianSmoothing(geometry, 0.5);
    
    if (size > 1.0) {
      SmoothingUtils.applyCatmullClarkSmoothing(geometry, 1);
    }
    
    // Add multi-layer noise for natural surface variation
    SmoothingUtils.addMultiLayerNoise(geometry, 0.06);
    
    // Add weathering appropriate for flattened rocks
    const weatheringLevel = config.weatheringRange.min + 
      Math.random() * (config.weatheringRange.max - config.weatheringRange.min);
    GeometryUtils.addWeatheringEffects(geometry, weatheringLevel);
    
    // Add vertex noise for natural surface
    GeometryUtils.addVertexNoise(geometry, 0.05);
    
    // Ensure very good grounding for flat rocks
    GeometryUtils.addRealisticGrounding(geometry, 0.15);
    
    // Apply safe natural variation with extreme flattening
    const scaleVariation = {
      x: 0.9 + Math.random() * 0.3,
      y: 0.15 + Math.random() * 0.2,
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
      
      // Create smooth compression patterns
      const compressionFactor = 1 - Math.abs(y / size) * 0.6;
      
      // Add natural edge irregularities with smooth transitions
      const edgeDistance = Math.sqrt(x*x + z*z) / size;
      const edgeVariation = Math.sin(edgeDistance * Math.PI * 4) * 0.08 * compressionFactor;
      
      // Apply smooth radial compression
      const radialFactor = 1 + edgeVariation;
      
      positionArray[i] = x * radialFactor;
      positionArray[i + 1] = y * compressionFactor;
      positionArray[i + 2] = z * radialFactor;
    }
    
    positions.needsUpdate = true;
  }
}
