import * as THREE from 'three';

export interface CollisionObject {
  mesh: THREE.Object3D;
  box: THREE.Box3;
  type: 'environment' | 'player' | 'projectile' | 'enemy';
  material: 'wood' | 'stone' | 'metal' | 'fabric';
  id: string;
}

export interface SlopeInfo {
  walkable: boolean;
  angle: number;
  normal: THREE.Vector3;
}

export interface CollisionResult {
  object: CollisionObject;
  distance: number;
  point: THREE.Vector3;
  slopeInfo: SlopeInfo;
}

export class PhysicsManager {
  private gravity = -9.81;
  private collisionObjects: Map<string, CollisionObject> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private maxWalkableAngle = 60; // More permissive - was 45
  private maxStepHeight = 1.5; // Larger steps allowed - was 0.3
  
  constructor() {
    console.log('🏔️ Enhanced Physics Manager initialized with improved movement system');
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
    console.log(`Added collision object: ${objectId} (${type}, ${material}) at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`);
    return objectId;
  }

  public removeCollisionObject(id: string): void {
    if (this.collisionObjects.delete(id)) {
      console.log(`Removed collision object: ${id}`);
    }
  }

  public getGroundHeight(position: THREE.Vector3): number {
    // Cast ray downward from well above the position
    const rayOrigin = new THREE.Vector3(position.x, position.y + 20, position.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    
    this.raycaster.set(rayOrigin, rayDirection);
    
    const meshes: THREE.Object3D[] = [];
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'environment') {
        // For groups (trees), add all mesh children
        if (collisionObject.mesh instanceof THREE.Group) {
          collisionObject.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
              meshes.push(child);
            }
          });
        } else {
          meshes.push(collisionObject.mesh);
        }
      }
    }
    
    const intersections = this.raycaster.intersectObjects(meshes, true);
    
    if (intersections.length > 0) {
      console.log(`🌍 Ground found at height: ${intersections[0].point.y.toFixed(2)} for position (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
      return intersections[0].point.y;
    }
    
    console.log(`🌍 No ground found, using default level 0 for position (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
    return 0; // Default ground level
  }

  public checkSlopeAngle(position: THREE.Vector3): SlopeInfo {
    const rayOrigin = new THREE.Vector3(position.x, position.y + 10, position.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    
    this.raycaster.set(rayOrigin, rayDirection);
    
    const meshes: THREE.Object3D[] = [];
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'environment') {
        if (collisionObject.mesh instanceof THREE.Group) {
          collisionObject.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
              meshes.push(child);
            }
          });
        } else {
          meshes.push(collisionObject.mesh);
        }
      }
    }
    
    const intersections = this.raycaster.intersectObjects(meshes, true);
    
    if (intersections.length > 0 && intersections[0].face) {
      const normal = intersections[0].face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersections[0].object.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();
      
      const angle = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0)));
      const angleInDegrees = THREE.MathUtils.radToDeg(angle);
      
      return {
        walkable: angleInDegrees <= this.maxWalkableAngle,
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
      
      // Update bounding box
      collisionObject.box.setFromObject(collisionObject.mesh);
      
      // For tree groups, check collision with individual meshes
      if (collisionObject.mesh instanceof THREE.Group) {
        let hasCollision = false;
        collisionObject.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            const childBox = new THREE.Box3().setFromObject(child);
            if (childBox.intersectsSphere(sphere)) {
              hasCollision = true;
            }
          }
        });
        if (hasCollision) {
          console.log(`🌳 Tree collision detected with: ${collisionObject.id}`);
          return collisionObject;
        }
      } else if (collisionObject.box.intersectsSphere(sphere)) {
        console.log(`🏗️ Environment collision detected with: ${collisionObject.id}`);
        return collisionObject;
      }
    }
    
    return null;
  }

  public checkRayCollision(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100, excludeTypes: string[] = []): CollisionResult | null {
    this.raycaster.set(origin, direction.normalize());
    
    const meshes: THREE.Object3D[] = [];
    const meshToCollisionMap = new Map<THREE.Object3D, CollisionObject>();
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) continue;
      
      // For groups (trees), add all mesh children
      if (collisionObject.mesh instanceof THREE.Group) {
        collisionObject.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            meshes.push(child);
            meshToCollisionMap.set(child, collisionObject);
          }
        });
      } else {
        meshes.push(collisionObject.mesh);
        meshToCollisionMap.set(collisionObject.mesh, collisionObject);
      }
    }
    
    const intersections = this.raycaster.intersectObjects(meshes, true);
    
    for (const intersection of intersections) {
      if (intersection.distance <= maxDistance) {
        // Find the collision object that contains this mesh
        let targetObject = intersection.object;
        let collisionObject = meshToCollisionMap.get(targetObject);
        
        // Check parent objects if not found
        while (!collisionObject && targetObject.parent) {
          targetObject = targetObject.parent;
          collisionObject = meshToCollisionMap.get(targetObject);
        }
        
        if (collisionObject) {
          // Calculate slope information at collision point
          let slopeInfo: SlopeInfo = {
            walkable: true,
            angle: 0,
            normal: new THREE.Vector3(0, 1, 0)
          };
          
          if (intersection.face) {
            const normal = intersection.face.normal.clone();
            // Transform normal to world space
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
            normal.applyMatrix3(normalMatrix).normalize();
            
            const angle = Math.acos(Math.abs(normal.dot(new THREE.Vector3(0, 1, 0))));
            const angleInDegrees = THREE.MathUtils.radToDeg(angle);
            
            slopeInfo = {
              walkable: angleInDegrees <= this.maxWalkableAngle,
              angle: angleInDegrees,
              normal: normal
            };
          }
          
          console.log(`🎯 Ray collision with ${collisionObject.material} object at distance ${intersection.distance.toFixed(2)}`);
          return {
            object: collisionObject,
            distance: intersection.distance,
            point: intersection.point,
            slopeInfo: slopeInfo
          };
        }
      }
    }
    
    return null;
  }

  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.3): THREE.Vector3 {
    console.log('🏔️ [PhysicsManager] Checking player movement - simplified approach', {
      from: `(${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)})`,
      to: `(${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`
    });
    
    // First, check for collision at the target position - ONLY block if there's actual collision
    const collision = this.checkSphereCollision(targetPosition, playerRadius, ['projectile', 'enemy']);
    
    if (collision) {
      console.log(`🚫 Movement blocked by collision with ${collision.material} object: ${collision.id}`);
      return currentPosition; // Block movement completely if there's a collision
    }
    
    // No collision detected - now handle terrain following
    const groundHeight = this.getGroundHeight(targetPosition);
    const heightDifference = groundHeight - currentPosition.y;
    
    console.log(`🌍 Ground analysis:`, {
      currentY: currentPosition.y.toFixed(2),
      groundY: groundHeight.toFixed(2),
      heightDiff: heightDifference.toFixed(2),
      maxStep: this.maxStepHeight
    });
    
    // Apply terrain following logic
    if (Math.abs(heightDifference) > 0.1) { // Only adjust if there's meaningful height difference
      if (heightDifference > this.maxStepHeight) {
        // Step too high - maintain current height but allow horizontal movement
        console.log('🏔️ Step too high, maintaining current height');
        targetPosition.y = currentPosition.y;
      } else if (heightDifference < -this.maxStepHeight) {
        // Drop too far - maintain current height
        console.log('🏔️ Drop too far, maintaining current height');
        targetPosition.y = currentPosition.y;
      } else {
        // Normal terrain following
        targetPosition.y = groundHeight + 0.1; // Small offset above ground
        console.log('🏔️ Following terrain');
      }
    } else {
      // Flat ground or minimal height change - maintain current height
      targetPosition.y = currentPosition.y;
      console.log('🏔️ Flat ground, maintaining current height');
    }
    
    console.log(`✅ Movement allowed to: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
    return targetPosition;
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
    // Only slide on walls (steep slopes), not on walkable slopes
    if (collision.slopeInfo.walkable) {
      return targetPos;
    }
    
    // Calculate collision normal from slope info
    const normal = collision.slopeInfo.normal;
    
    // Project movement vector onto plane perpendicular to collision normal
    const movement = new THREE.Vector3().subVectors(targetPos, currentPos);
    const projectedMovement = movement.clone().sub(normal.clone().multiplyScalar(movement.dot(normal)));
    
    const slideTarget = currentPos.clone().add(projectedMovement);
    
    // Check if sliding movement is also blocked
    const slideDirection = projectedMovement.normalize();
    const slideDistance = projectedMovement.length();
    const slideCollision = this.checkRayCollision(currentPos, slideDirection, slideDistance, ['projectile', 'enemy']);
    
    if (slideCollision && !slideCollision.slopeInfo.walkable) {
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
