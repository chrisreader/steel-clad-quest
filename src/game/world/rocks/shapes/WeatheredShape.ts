
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';

export class WeatheredShape extends BaseRockShape {
  constructor() {
    super('weathered');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Start with icosahedron for organic base
    const geometry = new THREE.IcosahedronGeometry(size, 1);
    
    // Apply heavy weathering effects
    const weatheringLevel = Math.max(0.6, config.weatheringRange.max); // Force high weathering
    GeometryUtils.addWeatheringEffects(geometry, weatheringLevel);
    
    // Apply erosion patterns
    this.applyErosionPatterns(geometry, size);
    
    // Add substantial vertex noise for weathered surface
    GeometryUtils.addVertexNoise(geometry, 0.25);
    
    // Ensure proper grounding with more embedding
    GeometryUtils.addRealisticGrounding(geometry, 0.2);
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.8 + Math.random() * 0.3,
      y: 0.6 + Math.random() * 0.3, // More flattened from weathering
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
      
      // Create erosion channels - more erosion on exposed areas
      const exposureFactor = Math.max(0, y / size); // Top surfaces more eroded
      const channelNoise1 = Math.sin(x * 3) * Math.cos(z * 2.5) * exposureFactor;
      const channelNoise2 = Math.sin(x * 1.5 + z * 1.8) * exposureFactor;
      
      const erosion = (channelNoise1 + channelNoise2) * 0.15 * size;
      
      // Apply erosion inward
      if (distance > 0) {
        vertex.normalize();
        vertex.multiplyScalar(distance - Math.abs(erosion));
      }
      
      positionArray[i] = vertex.x;
      positionArray[i + 1] = vertex.y;
      positionArray[i + 2] = vertex.z;
    }
    
    positions.needsUpdate = true;
  }
}
