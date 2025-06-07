
import * as THREE from 'three';

export class AshBed {
  static create(): THREE.Mesh {
    const ashMaterial = new THREE.MeshLambertMaterial({
      color: 0x808080, // Light gray ash
      transparent: true,
      opacity: 0.8
    });

    const ashGeometry = new THREE.CylinderGeometry(1.0, 1.0, 0.02, 16);
    const ashBed = new THREE.Mesh(ashGeometry, ashMaterial);
    ashBed.position.set(0, 0.12, 0);
    ashBed.castShadow = false;
    ashBed.receiveShadow = true;

    console.log('🏗️ Ash bed created');
    return ashBed;
  }
}
