
import * as THREE from 'three';
import { RockShape } from './RockVariations';

export class RockGeometryPool {
  private static instance: RockGeometryPool;
  private geometries: Map<string, THREE.BufferGeometry> = new Map();

  public static getInstance(): RockGeometryPool {
    if (!RockGeometryPool.instance) {
      RockGeometryPool.instance = new RockGeometryPool();
    }
    return RockGeometryPool.instance;
  }

  private constructor() {
    this.initializeBaseGeometries();
  }

  private initializeBaseGeometries(): void {
    // Create base geometries that will be reused and transformed
    const sizes = [0.5, 1.0, 2.0, 4.0]; // Base sizes for different categories
    
    sizes.forEach(size => {
      // Icosahedron variants
      this.geometries.set(`icosahedron_${size}`, new THREE.IcosahedronGeometry(size, 2));
      // Sphere variants  
      this.geometries.set(`sphere_${size}`, new THREE.SphereGeometry(size, 16, 12));
      // Dodecahedron variants
      this.geometries.set(`dodecahedron_${size}`, new THREE.DodecahedronGeometry(size, 1));
    });
  }

  public createRockGeometry(rockShape: RockShape, size: number): THREE.BufferGeometry {
    // Find closest base size
    const baseSize = this.getClosestBaseSize(size);
    const geometryKey = `${rockShape.baseGeometry}_${baseSize}`;
    const baseGeometry = this.geometries.get(geometryKey);
    
    if (!baseGeometry) {
      // Fallback to icosahedron
      return new THREE.IcosahedronGeometry(size, 2);
    }

    // Clone and modify the base geometry
    const geometry = baseGeometry.clone();
    
    // Scale to actual size
    const scaleFactor = size / baseSize;
    geometry.scale(scaleFactor, scaleFactor, scaleFactor);
    
    // Apply shape modifications efficiently
    this.applyOptimizedDeformation(geometry, rockShape, size);
    
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    
    return geometry;
  }

  private getClosestBaseSize(targetSize: number): number {
    const baseSizes = [0.5, 1.0, 2.0, 4.0];
    return baseSizes.reduce((prev, curr) => 
      Math.abs(curr - targetSize) < Math.abs(prev - targetSize) ? curr : prev
    );
  }

  private applyOptimizedDeformation(geometry: THREE.BufferGeometry, rockShape: RockShape, size: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Single optimized deformation pass
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Apply shape modifier efficiently
      switch (rockShape.shapeModifier) {
        case 'stretch':
          positions[i + 1] *= 1.5; // Vertical stretch
          const taperFactor = Math.max(0.5, 1 - Math.abs(y) / (size * 1.5));
          positions[i] *= taperFactor;
          positions[i + 2] *= taperFactor;
          break;
          
        case 'flatten':
          positions[i + 1] *= 0.3; // Flatten
          positions[i] *= 1.4; // Widen
          positions[i + 2] *= 1.4;
          break;
          
        case 'fracture':
          // Simple angular modification
          const facetNoise = Math.floor(x * 2) + Math.floor(y * 2) + Math.floor(z * 2);
          const facetIntensity = (facetNoise % 2) * 0.1;
          positions[i] += Math.sign(x) * facetIntensity;
          positions[i + 1] += Math.sign(y) * facetIntensity;
          positions[i + 2] += Math.sign(z) * facetIntensity;
          break;
          
        case 'erode':
          // Smooth erosion
          const erosion = Math.sin(x * 1.5) * Math.cos(y * 1.5) * 0.1;
          const length = Math.sqrt(x * x + y * y + z * z);
          if (length > 0) {
            const factor = 1 + erosion / length;
            positions[i] *= factor;
            positions[i + 1] *= factor;
            positions[i + 2] *= factor;
          }
          break;
      }
      
      // Add subtle organic variation
      if (rockShape.deformationIntensity > 0) {
        const noise = Math.sin(x * 3) * Math.cos(z * 3) * rockShape.deformationIntensity * 0.1;
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length > 0) {
          const factor = 1 + noise / length;
          positions[i] *= factor;
          positions[i + 1] *= factor;
          positions[i + 2] *= factor;
        }
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    this.geometries.forEach(geometry => geometry.dispose());
    this.geometries.clear();
  }
}
