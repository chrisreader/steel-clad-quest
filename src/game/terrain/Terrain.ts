
import * as THREE from 'three';

export class Terrain {
  public mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshLambertMaterial;
  
  constructor(scene: THREE.Scene) {
    // Create a simple flat terrain for now
    this.geometry = new THREE.PlaneGeometry(100, 100);
    this.material = new THREE.MeshLambertMaterial({ color: 0x4a5d23 });
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    
    scene.add(this.mesh);
  }
  
  public getHeightAt(x: number, z: number): number {
    // Simple flat terrain - always return 0
    return 0;
  }
  
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
