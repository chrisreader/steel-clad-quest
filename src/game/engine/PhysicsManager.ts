
import * as THREE from 'three';

export class PhysicsManager {
  private gravity = -9.81;
  private colliders: THREE.Box3[] = [];

  constructor() {
    console.log('Physics Manager initialized');
  }

  public addCollider(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    this.colliders.push(box);
  }

  public checkCollision(position: THREE.Vector3, radius: number): boolean {
    const sphere = new THREE.Sphere(position, radius);
    
    for (const collider of this.colliders) {
      if (collider.intersectsSphere(sphere)) {
        return true;
      }
    }
    
    return false;
  }

  public applyGravity(object: any, deltaTime: number): void {
    if (object.position.y > 0) {
      object.velocity.y += this.gravity * deltaTime;
      object.position.y += object.velocity.y * deltaTime;
      
      if (object.position.y <= 0) {
        object.position.y = 0;
        object.velocity.y = 0;
      }
    }
  }

  public update(deltaTime: number): void {
    // Update physics simulation
  }
}
