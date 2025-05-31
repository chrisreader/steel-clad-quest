
import * as THREE from 'three';

export abstract class Entity {
  protected scene: THREE.Scene;
  protected position: THREE.Vector3;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(0, 0, 0);
  }
  
  public abstract update(deltaTime: number, ...args: any[]): void;
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
  }
  
  protected addToScene(): void {
    // Override in subclasses to add meshes to scene
  }
  
  public dispose(): void {
    // Override in subclasses to clean up resources
  }
}
