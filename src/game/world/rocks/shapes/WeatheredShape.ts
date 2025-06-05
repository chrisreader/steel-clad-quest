
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';
import { SmoothingUtils } from '../utils/SmoothingUtils';

export class WeatheredShape extends BaseRockShape {
  constructor() {
    super('weathered');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Use adaptive subdivision for smooth weathered appearance
    const subdivisionLevel = SmoothingUtils.getSubdivisionLevel(size);
    
    // Start with icosahedron with adaptive subdivision
    const geometry = new THREE.IcosahedronGeometry(size, subdivisionLevel);
    
    // Apply erosion patterns first
    this.applyErosionPatterns(geometry, size);
    
    // Apply multi-layer noise for weathered surface texture
    SmoothingUtils.addMultiLayerNoise(geometry, 0.12);
    
    // Heavy weathering effects
    const weatheringLevel = Math.max(0.6, config.weatheringRange.max);
    GeometryUtils.addWeatheringEffects(geometry, weatheringLevel);
    
    // Apply extensive smoothing for weathered appearance
    SmoothingUtils.applyLaplacianSmoothing(geometry, 0.4);
    
    if (size > 0.8) {
      SmoothingUtils.applyCatmullClarkSmoothing(geometry, 2);
    }
    
    // Add substantial vertex noise for weathered surface
    GeometryUtils.addVertexNoise(geometry, 0.08);
    
    // Ensure proper grounding with more embedding
    GeometryUtils.addRealisticGrounding(geometry, 0.2);
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.3,
      y: 0.6 + Math.random() * 0.3,
      z: 0.8 + Math.random() * 0.3
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
  
  private applyErosionPatterns(geometry: THREE.BufferGeometry, size: number): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      const vertex = new THREE.Vector3(x, y, z);
      const distance = vertex.length();
      
      // Create smooth erosion channels
      const exposureFactor = Math.max(0, y / size);
      const channelNoise1 = Math.sin(x * 2) * Math.cos(z * 1.8) * exposureFactor;
      const channelNoise2 = Math.sin(x * 1.2 + z * 1.3) * exposureFactor;
      
      // Smooth the erosion using cubic interpolation
      const rawErosion = (channelNoise1 + channelNoise2) * 0.1 * size;
      const smoothErosion = rawErosion * Math.abs(rawErosion) * (3 - 2 * Math.abs(rawErosion));
      
      // Apply erosion inward
      if (distance > 0) {
        vertex.normalize();
        vertex.multiplyScalar(distance - Math.abs(smoothErosion));
      }
      
      positionArray[i] = vertex.x;
      positionArray[i + 1] = vertex.y;
      positionArray[i + 2] = vertex.z;
    }
    
    positions.needsUpdate = true;
  }
}
