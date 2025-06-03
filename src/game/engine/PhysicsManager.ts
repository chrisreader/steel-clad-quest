
import * as THREE from 'three';

export interface CollisionObject {
  mesh: THREE.Object3D;
  box: THREE.Box3;
  type: 'environment' | 'player' | 'projectile' | 'enemy';
  material: 'wood' | 'stone' | 'metal' | 'fabric';
  id: string;
}

export interface CollisionResult {
  object: CollisionObject;
  distance: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  slopeAngle: number;
  isWalkable: boolean;
}

export class PhysicsManager {
  private gravity = -9.81;
  private collisionObjects: Map<string, CollisionObject> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private readonly MAX_WALKABLE_ANGLE = 45; // degrees
  
  constructor() {
    console.log('Enhanced Physics Manager initialized with slope-aware collision detection');
  }

  public addCollisionObject(object: THREE.Object3D, type: 'environment' | 'player' | 'projectile' | 'enemy', material: 'wood' | 'stone' | 'metal' | 'fabric' = 'stone', id?: string): string {
    const objectId = id || `collision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const box = new THREE.Box3().setFromObject(object);
    
    const collisionObject: CollisionObject = {
      mesh: object,
      box: box,
      type: type,
      material: material,
      id: objectId
    };
    
    this.collisionObjects.set(objectId, collisionObject);
    console.log(`Added collision object: ${objectId} (${type}, ${material})`);
    return objectId;
  }

  public removeCollisionObject(id: string): void {
    if (this.collisionObjects.delete(id)) {
      console.log(`Removed collision object: ${id}`);
    }
  }

  public getGroundHeight(position: THREE.Vector3): number {
    // Cast ray downward from above the position
    const rayOrigin = new THREE.Vector3(position.x, position.y + 10, position.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    
    this.raycaster.set(rayOrigin, rayDirection);
    
    const meshes: THREE.Object3D[] = [];
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'environment') {
        meshes.push(collisionObject.mesh);
      }
    }
    
    const intersections = this.raycaster.intersectObjects(meshes, true);
    
    if (intersections.length > 0) {
      return intersections[0].point.y;
    }
    
    // Default ground level
    return 0;
  }

  public checkSlopeAngle(position: THREE.Vector3): { walkable: boolean; angle: number; normal: THREE.Vector3 } {
    const rayOrigin = new THREE.Vector3(position.x, position.y + 10, position.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    
    this.raycaster.set(rayOrigin, rayDirection);
    
    const meshes: THREE.Object3D[] = [];
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'environment') {
        meshes.push(collisionObject.mesh);
      }
    }
    
    const intersections = this.raycaster.intersectObjects(meshes, true);
    
    if (intersections.length > 0 && intersections[0].face) {
      const normal = intersections[0].face.normal.clone();
      const angle = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0)));
      const angleInDegrees = THREE.MathUtils.radToDeg(angle);
      
      return {
        walkable: angleInDegrees <= this.MAX_WALKABLE_ANGLE,
        angle: angleInDegrees,
        normal: normal
      };
    }
    
    return {
      walkable: true,
      angle: 0,
      normal: new THREE.Vector3(0, 1, 0)
    };
  }

  public getGroundNormal(position: THREE.Vector3): THREE.Vector3 {
    const slopeInfo = this.checkSlopeAngle(position);
    return slopeInfo.normal;
  }

  public checkSphereCollision(position: THREE.Vector3, radius: number, excludeTypes: string[] = []): CollisionObject | null {
    const sphere = new THREE.Sphere(position, radius);
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) continue;
      
      // Update bounding box in case object moved
      collisionObject.box.setFromObject(collisionObject.mesh);
      
      if (collisionObject.box.intersectsSphere(sphere)) {
        return collisionObject;
      }
    }
    
    return null;
  }

  // NEW: Enhanced ray collision with slope information
  public checkRayCollisionWithSlope(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100, excludeTypes: string[] = []): CollisionResult | null {
    this.raycaster.set(origin, direction.normalize());
    
    const meshes: THREE.Object3D[] = [];
    const meshToCollisionMap = new Map<THREE.Object3D, CollisionObject>();
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) continue;
      meshes.push(collisionObject.mesh);
      meshToCollisionMap.set(collisionObject.mesh, collisionObject);
    }
    
    const intersections = this.raycaster.intersectObjects(meshes, true);
    
    for (const intersection of intersections) {
      if (intersection.distance <= maxDistance && intersection.face) {
        // Find the collision object that contains this mesh
        let targetObject = intersection.object;
        let collisionObject = meshToCollisionMap.get(targetObject);
        
        // Check parent objects if not found
        while (!collisionObject && targetObject.parent) {
          targetObject = targetObject.parent;
          collisionObject = meshToCollisionMap.get(targetObject);
        }
        
        if (collisionObject) {
          // Calculate slope angle from face normal
          const normal = intersection.face.normal.clone();
          const angle = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0)));
          const angleInDegrees = THREE.MathUtils.radToDeg(angle);
          
          return {
            object: collisionObject,
            distance: intersection.distance,
            point: intersection.point,
            normal: normal,
            slopeAngle: angleInDegrees,
            isWalkable: angleInDegrees <= this.MAX_WALKABLE_ANGLE
          };
        }
      }
    }
    
    return null;
  }

  public checkRayCollision(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100, excludeTypes: string[] = []): { object: CollisionObject; distance: number; point: THREE.Vector3 } | null {
    // Legacy method - use the new one and extract basic info
    const result = this.checkRayCollisionWithSlope(origin, direction, maxDistance, excludeTypes);
    if (result) {
      return {
        object: result.object,
        distance: result.distance,
        point: result.point
      };
    }
    return null;
  }

  // NEW: Slope-aware player movement check
  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    const horizontalTarget = new THREE.Vector3(targetPosition.x, currentPosition.y, targetPosition.z);
    const direction = new THREE.Vector3().subVectors(horizontalTarget, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return currentPosition;
    
    direction.normalize();
    
    // Check for collision with slope information
    const collision = this.checkRayCollisionWithSlope(currentPosition, direction, distance, ['projectile', 'enemy']);
    
    let safeHorizontalPosition: THREE.Vector3;
    
    if (collision) {
      console.log(`🏔️ [PhysicsManager] Collision detected - Angle: ${collision.slopeAngle.toFixed(1)}°, Walkable: ${collision.isWalkable}`);
      
      if (collision.isWalkable) {
        // Slope is walkable - allow movement to target position
        safeHorizontalPosition = horizontalTarget;
        console.log(`🏔️ [PhysicsManager] Allowing movement on walkable slope (${collision.slopeAngle.toFixed(1)}°)`);
      } else {
        // Slope too steep - calculate safe position before collision
        const safeDistance = Math.max(0, collision.distance - playerRadius - 0.1);
        safeHorizontalPosition = currentPosition.clone().add(direction.multiplyScalar(safeDistance));
        
        // Try sliding along the collision surface for steep slopes
        safeHorizontalPosition = this.handleWallSliding(currentPosition, horizontalTarget, collision, playerRadius);
        console.log(`🏔️ [PhysicsManager] Blocking movement on steep slope (${collision.slopeAngle.toFixed(1)}°)`);
      }
    } else {
      safeHorizontalPosition = horizontalTarget;
    }
    
    // Adjust Y position based on ground height
    const groundHeight = this.getGroundHeight(safeHorizontalPosition);
    const slopeInfo = this.checkSlopeAngle(safeHorizontalPosition);
    
    if (slopeInfo.walkable) {
      // Smooth height transition for walkable slopes
      const heightDifference = groundHeight - currentPosition.y;
      const maxStepHeight = 0.3; // Allow stepping up to 0.3 units
      
      if (heightDifference <= maxStepHeight || heightDifference < 0) {
        // Allow stepping up small amounts or going downhill
        safeHorizontalPosition.y = groundHeight + 0.1; // Small offset to prevent clipping
        
        if (Math.abs(heightDifference) > 0.01) {
          console.log(`🏔️ [PhysicsManager] Height adjustment: ${heightDifference.toFixed(3)} units`);
        }
      } else {
        // Too steep to step up, stay at current height
        safeHorizontalPosition.y = currentPosition.y;
        console.log(`🏔️ [PhysicsManager] Step too high: ${heightDifference.toFixed(3)} units`);
      }
    } else {
      // Slope too steep, don't allow movement
      return currentPosition;
    }
    
    return safeHorizontalPosition;
  }

  public checkEnemyKnockback(currentPosition: THREE.Vector3, knockbackVelocity: THREE.Vector3, deltaTime: number, enemyRadius: number = 0.4): THREE.Vector3 {
    const targetPosition = currentPosition.clone().add(knockbackVelocity.clone().multiplyScalar(deltaTime));
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return currentPosition;
    
    direction.normalize();
    
    // Check for collision along the knockback path
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['projectile', 'enemy']);
    
    if (collision) {
      // Stop knockback at collision point
      const safeDistance = Math.max(0, collision.distance - enemyRadius - 0.1);
      return currentPosition.clone().add(direction.multiplyScalar(safeDistance));
    }
    
    // No collision, knockback is safe
    return targetPosition;
  }

  private handleWallSliding(currentPos: THREE.Vector3, targetPos: THREE.Vector3, collision: CollisionResult, playerRadius: number): THREE.Vector3 {
    // Calculate collision normal
    const normal = collision.normal;
    
    // Project movement vector onto plane perpendicular to collision normal
    const movement = new THREE.Vector3().subVectors(targetPos, currentPos);
    const projectedMovement = movement.clone().sub(normal.clone().multiplyScalar(movement.dot(normal)));
    
    const slideTarget = currentPos.clone().add(projectedMovement);
    
    // Check if sliding movement is also blocked
    const slideDirection = projectedMovement.normalize();
    const slideDistance = projectedMovement.length();
    const slideCollision = this.checkRayCollision(currentPos, slideDirection, slideDistance, ['projectile', 'enemy']);
    
    if (slideCollision) {
      // Can't slide, stay in current position
      return currentPos;
    }
    
    return slideTarget;
  }

  public getCollisionMaterial(objectId: string): 'wood' | 'stone' | 'metal' | 'fabric' | null {
    const collisionObject = this.collisionObjects.get(objectId);
    return collisionObject ? collisionObject.material : null;
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
    // Update collision system - refresh bounding boxes for dynamic objects
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type !== 'environment') {
        collisionObject.box.setFromObject(collisionObject.mesh);
      }
    }
  }

  public getCollisionObjects(): Map<string, CollisionObject> {
    return this.collisionObjects;
  }

  public dispose(): void {
    this.collisionObjects.clear();
    console.log('PhysicsManager disposed');
  }
}
