
import * as THREE from 'three';

export class PhysicsManager {
  private collisionBoxes: THREE.Box3[] = [];
  private collisionPlanes: THREE.Plane[] = [];

  constructor() {
    console.log("🔧 [PhysicsManager] Initialized");
  }

  public addCollisionBox(box: THREE.Box3): void {
    this.collisionBoxes.push(box);
  }

  public addCollisionPlane(plane: THREE.Plane): void {
    this.collisionPlanes.push(plane);
  }

  public checkCollision(position: THREE.Vector3, radius: number): boolean {
    const testBox = new THREE.Box3().setFromCenterAndSize(
      position,
      new THREE.Vector3(radius * 2, radius * 2, radius * 2)
    );

    for (const box of this.collisionBoxes) {
      if (testBox.intersectsBox(box)) {
        return true;
      }
    }

    for (const plane of this.collisionPlanes) {
      if (plane.distanceToPoint(position) < radius) {
        return true;
      }
    }

    return false;
  }

  public checkRayCollision(
    origin: THREE.Vector3, 
    direction: THREE.Vector3, 
    distance: number, 
    excludeTypes: string[] = []
  ): { object: any; distance: number; point: THREE.Vector3 } | null {
    // Simple implementation - can be enhanced with actual raycasting
    return null;
  }

  public getCollisionMaterial(objectId: string): 'wood' | 'stone' | 'metal' | 'fabric' | null {
    // Simple implementation - return default material
    return 'wood';
  }

  public checkPlayerMovement(position: THREE.Vector3, direction: THREE.Vector3, deltaTime: number): THREE.Vector3 {
    // Simple implementation - return the intended movement
    return direction.clone().multiplyScalar(deltaTime);
  }

  public dispose(): void {
    this.collisionBoxes = [];
    this.collisionPlanes = [];
  }
}
