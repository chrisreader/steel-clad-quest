
import * as THREE from 'three';

export interface SimpleRockShape {
  geometry: THREE.BufferGeometry;
  scale: number;
  rotation: THREE.Euler;
}

export class SimpleRockGenerator {
  private static noise = Math.random;

  static generateSimpleRock(
    type: 'boulder' | 'angular' | 'flat',
    size: number = 1
  ): SimpleRockShape {
    let geometry: THREE.BufferGeometry;
    
    switch (type) {
      case 'boulder':
        geometry = this.createSimpleBoulder(size);
        break;
      case 'angular':
        geometry = this.createSimpleAngular(size);
        break;
      case 'flat':
        geometry = this.createSimpleFlat(size);
        break;
      default:
        geometry = this.createSimpleBoulder(size);
    }

    return {
      geometry,
      scale: 0.8 + Math.random() * 0.4,
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 0.5,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.5
      )
    };
  }

  private static createSimpleBoulder(size: number): THREE.BufferGeometry {
    // Use a sphere with slight deformation for natural look
    const geometry = new THREE.SphereGeometry(size, 12, 8);
    this.applyLightDeformation(geometry, 0.1);
    return geometry;
  }

  private static createSimpleAngular(size: number): THREE.BufferGeometry {
    // Use a dodecahedron for angular look
    const geometry = new THREE.DodecahedronGeometry(size, 0);
    this.applyLightDeformation(geometry, 0.05);
    return geometry;
  }

  private static createSimpleFlat(size: number): THREE.BufferGeometry {
    // Use a flattened cylinder
    const geometry = new THREE.CylinderGeometry(size, size * 0.9, size * 0.6, 8);
    this.applyLightDeformation(geometry, 0.08);
    return geometry;
  }

  private static applyLightDeformation(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Apply very light, controlled deformation
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Use simple random displacement instead of complex noise
      const displacement = (Math.random() - 0.5) * intensity;
      const direction = vertex.clone().normalize();
      
      vertex.add(direction.multiplyScalar(displacement));
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
