
import * as THREE from 'three';
import { RockShapeType, RockGenerationConfig } from '../types/RockTypes';

export abstract class BaseRockShape {
  protected shapeType: RockShapeType;
  
  constructor(shapeType: RockShapeType) {
    this.shapeType = shapeType;
  }
  
  abstract generateGeometry(config: RockGenerationConfig): THREE.BufferGeometry;
  
  protected createSafeGeometry(
    baseGeometry: THREE.BufferGeometry, 
    scaleVariation: { x: number; y: number; z: number }
  ): THREE.BufferGeometry {
    // Apply safe scaling within bounds to prevent deformation issues
    const safeScale = {
      x: Math.max(0.7, Math.min(1.3, scaleVariation.x)),
      y: Math.max(0.6, Math.min(1.2, scaleVariation.y)),
      z: Math.max(0.7, Math.min(1.3, scaleVariation.z))
    };
    
    baseGeometry.scale(safeScale.x, safeScale.y, safeScale.z);
    baseGeometry.computeVertexNormals();
    baseGeometry.computeBoundingSphere();
    
    return baseGeometry;
  }
  
  protected addNaturalRotation(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const rotation = new THREE.Euler(
      (Math.random() - 0.5) * 0.3, // Small random rotations
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );
    
    geometry.rotateX(rotation.x);
    geometry.rotateY(rotation.y);
    geometry.rotateZ(rotation.z);
    
    return geometry;
  }
}
