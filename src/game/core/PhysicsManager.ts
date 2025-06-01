import * as THREE from 'three';
import { Octree } from 'three/examples/jsm/math/Octree';

export class PhysicsManager {
  private worldOctree = new Octree();
  private static collisionCache: { [key: string]: 'wood' | 'stone' | 'metal' | 'fabric' | null } = {};
  
  constructor() {
    console.log("📦 [PhysicsManager] Initializing...");
  }
  
  public addMeshToWorld(mesh: THREE.Mesh): void {
    this.worldOctree.fromGraphNode(mesh);
    console.log("📦 [PhysicsManager] Added mesh to world octree");
  }
  
  public clearWorld(): void {
    this.worldOctree = new Octree();
    PhysicsManager.collisionCache = {};
    console.log("📦 [PhysicsManager] Cleared world octree");
  }
  
  public checkRayCollision(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    distance: number,
    exclude: string[] = []
  ): { object: any; distance: number; point: THREE.Vector3 } | null {
    const raycaster = new THREE.Raycaster(origin, direction, 0, distance);
    const results: THREE.Intersection[] = raycaster.intersectObject(this.worldOctree.root as THREE.Object3D, true);
    
    if (results.length > 0) {
      for (const result of results) {
        if (result.object && result.object.userData && exclude.includes(result.object.userData.name)) {
          continue;
        }
        
        return {
          object: result.object,
          distance: result.distance,
          point: result.point
        };
      }
    }
    
    return null;
  }
  
  public checkPlayerMovement(
    currentPosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    playerRadius: number
  ): THREE.Vector3 {
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition).normalize();
    const distance = currentPosition.distanceTo(targetPosition);
    
    let safePosition = targetPosition.clone();
    
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['player']);
    if (collision) {
      safePosition = currentPosition.clone().add(direction.multiplyScalar(collision.distance - playerRadius));
    }
    
    return safePosition;
  }
  
  public getCollisionMaterial(objectId: string): 'wood' | 'stone' | 'metal' | 'fabric' | null {
    if (PhysicsManager.collisionCache[objectId]) {
      return PhysicsManager.collisionCache[objectId];
    }
    
    // Simulate material detection based on object properties
    let material: 'wood' | 'stone' | 'metal' | 'fabric' | null = null;
    
    if (objectId.includes('wood')) {
      material = 'wood';
    } else if (objectId.includes('stone')) {
      material = 'stone';
    } else if (objectId.includes('metal')) {
      material = 'metal';
    } else if (objectId.includes('fabric')) {
      material = 'fabric';
    }
    
    PhysicsManager.collisionCache[objectId] = material;
    return material;
  }
  
  public dispose(): void {
    console.log("📦 [PhysicsManager] Disposing...");
    this.worldOctree = new Octree();
    PhysicsManager.collisionCache = {};
  }
}
