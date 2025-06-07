
import * as THREE from 'three';

export interface SimpleRockShape {
  geometry: THREE.BufferGeometry;
  scale: number;
  rotation: THREE.Euler;
}

export class SimpleRockGenerator {
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
        Math.random() * Math.PI * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.3
      )
    };
  }

  private static createSimpleBoulder(size: number): THREE.BufferGeometry {
    // Use a simple sphere without deformation for reliability
    const geometry = new THREE.SphereGeometry(size, 8, 6);
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createSimpleAngular(size: number): THREE.BufferGeometry {
    // Use a simple box for angular rocks
    const geometry = new THREE.BoxGeometry(size, size * 0.8, size);
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createSimpleFlat(size: number): THREE.BufferGeometry {
    // Use a flattened cylinder
    const geometry = new THREE.CylinderGeometry(size, size * 0.9, size * 0.4, 6);
    geometry.computeVertexNormals();
    return geometry;
  }
}
