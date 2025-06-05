
import * as THREE from 'three';
import { BaseRockShape } from './BaseRockShape';
import { RockGenerationConfig } from '../types/RockTypes';
import { GeometryUtils } from '../utils/GeometryUtils';

export class BoulderShape extends BaseRockShape {
  constructor() {
    super('boulder');
  }
  
  generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry {
    const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
    
    // Start with icosahedron for more organic base shape
    const geometry = new THREE.IcosahedronGeometry(size, 2);
    
    // Apply organic deformation
    this.applyOrganicDeformation(geometry, size);
    
    // Add vertex noise for natural surface
    GeometryUtils.addVertexNoise(geometry, 0.15);
    
    // Add weathering effects
    const weatheringLevel = config.weatheringRange.min + 
      Math.random() * (config.weatheringRange.max - config.weatheringRange.min);
    GeometryUtils.addWeatheringEffects(geometry, weatheringLevel);
    
    // Ensure proper grounding
    GeometryUtils.addRealisticGrounding(geometry, 0.1);
    
    // Apply safe natural variation
    const scaleVariation = {
      x: 0.85 + Math.random() * 0.3,
      y: 0.8 + Math.random() * 0.25,
      z: 0.85 + Math.random() * 0.3
    };
    
    return this.addNaturalRotation(this.createSafeGeometry(geometry, scaleVariation));
  }
  
  private applyOrganicDeformation(geometry: THREE.BufferGeometry, size: number): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    // Create multiple deformation centers for organic boulder shape
    const deformationCenters = [
      { pos: new THREE.Vector3(size * 0.3, size * 0.2, size * 0.1), strength: 0.3 },
      { pos: new THREE.Vector3(-size * 0.2, size * 0.4, -size * 0.3), strength: 0.25 },
      { pos: new THREE.Vector3(size * 0.1, -size * 0.1, size * 0.4), strength: 0.2 }
    ];
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const vertex = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
      
      deformationCenters.forEach(center => {
        const distance = vertex.distanceTo(center.pos);
        const influence = Math.max(0, 1 - (distance / size));
        const deformation = influence * center.strength;
        
        // Pull vertex toward deformation center
        const direction = center.pos.clone().sub(vertex).normalize();
        vertex.add(direction.multiplyScalar(deformation * size * 0.1));
      });
      
      positionArray[i] = vertex.x;
      positionArray[i + 1] = vertex.y;
      positionArray[i + 2] = vertex.z;
    }
    
    positions.needsUpdate = true;
  }
}
