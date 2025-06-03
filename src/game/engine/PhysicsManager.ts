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
  private maxWalkableAngle = 45; // degrees
  private maxStepHeight = 0.8; // Increased for better movement
  private scene: THREE.Scene | null = null;
  
  constructor() {
    console.log('🏔️ Enhanced Physics Manager initialized with terrain following system');
  }

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    console.log('🏔️ [PhysicsManager] Scene reference set for direct terrain detection');
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
    console.log(`🏔️ [PhysicsManager] Added collision object: ${objectId} (${type}, ${material}) at position:`, object.position);
    return objectId;
  }

  public removeCollisionObject(id: string): void {
    if (this.collisionObjects.delete(id)) {
      console.log(`Removed collision object: ${id}`);
    }
  }

  public getGroundHeight(position: THREE.Vector3, debugContext: string = ''): number {
    // Enhanced ground height detection that includes both collision objects AND direct scene geometry
    const rayHeights = [position.y + 20, position.y + 10, position.y + 5];
    let groundHeight = 0; // Default to world ground level
    let foundGround = false;
    
    for (const rayHeight of rayHeights) {
      const rayOrigin = new THREE.Vector3(position.x, rayHeight, position.z);
      const rayDirection = new THREE.Vector3(0, -1, 0);
      
      this.raycaster.set(rayOrigin, rayDirection);
      
      // First check collision objects (registered environment objects)
      const meshes: THREE.Object3D[] = [];
      for (const [id, collisionObject] of this.collisionObjects) {
        if (collisionObject.type === 'environment') {
          meshes.push(collisionObject.mesh);
        }
      }
      
      let intersections = this.raycaster.intersectObjects(meshes, true);
      
      // If no collision object hit, check direct scene geometry for terrain
      if (intersections.length === 0 && this.scene) {
        const allMeshes: THREE.Mesh[] = [];
        this.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry && child.material) {
            // Include terrain meshes, ground planes, and other solid geometry
            allMeshes.push(child);
          }
        });
        intersections = this.raycaster.intersectObjects(allMeshes, false);
      }
      
      if (intersections.length > 0) {
        const hitHeight = intersections[0].point.y;
        if (!foundGround || hitHeight > groundHeight) {
          groundHeight = hitHeight;
          foundGround = true;
          console.log(`🏔️ [PhysicsManager] Ground detected at height ${hitHeight.toFixed(3)} for ${debugContext}`);
        }
      }
    }
    
    if (!foundGround) {
      console.log(`🏔️ [PhysicsManager] No ground detected for ${debugContext}, using default height 0`);
    }
    
    return groundHeight;
  }

  public checkSlopeAngle(position: THREE.Vector3): SlopeInfo {
    const rayHeights = [position.y + 10, position.y + 5, position.y + 2];
    
    for (const rayHeight of rayHeights) {
      const rayOrigin = new THREE.Vector3(position.x, rayHeight, position.z);
      const rayDirection = new THREE.Vector3(0, -1, 0);
      
      this.raycaster.set(rayOrigin, rayDirection);
      
      // Check both collision objects and direct scene geometry
      const meshes: THREE.Object3D[] = [];
      for (const [id, collisionObject] of this.collisionObjects) {
        if (collisionObject.type === 'environment') {
          meshes.push(collisionObject.mesh);
        }
      }
      
      let intersections = this.raycaster.intersectObjects(meshes, true);
      
      // If no collision object hit, check direct scene geometry
      if (intersections.length === 0 && this.scene) {
        const allMeshes: THREE.Mesh[] = [];
        this.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry && child.material) {
            allMeshes.push(child);
          }
        });
        intersections = this.raycaster.intersectObjects(allMeshes, false);
      }
      
      if (intersections.length > 0 && intersections[0].face) {
        const intersection = intersections[0];
        const normal = intersection.face.normal.clone();
        
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
        normal.applyMatrix3(normalMatrix).normalize();
        
        const angle = Math.acos(Math.abs(normal.dot(new THREE.Vector3(0, 1, 0))));
        const angleInDegrees = THREE.MathUtils.radToDeg(angle);
        
        return {
          walkable: angleInDegrees <= this.maxWalkableAngle,
          angle: angleInDegrees,
          normal: normal
        };
      }
    }
    
    // DEFAULT: Assume flat walkable ground if no surface detected
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

  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    console.log('🏔️ [PhysicsManager] === TERRAIN FOLLOWING MOVEMENT CHECK ===');
    console.log('🏔️ [PhysicsManager] Current pos:', currentPosition.toArray().map(n => n.toFixed(3)));
    console.log('🏔️ [PhysicsManager] Target pos:', targetPosition.toArray().map(n => n.toFixed(3)));
    
    // Step 1: Calculate horizontal movement direction
    const horizontalMovement = new THREE.Vector3(
      targetPosition.x - currentPosition.x,
      0,
      targetPosition.z - currentPosition.z
    );
    const horizontalDistance = horizontalMovement.length();
    
    if (horizontalDistance < 0.001) {
      console.log('🏔️ [PhysicsManager] No horizontal movement, staying in place');
      return currentPosition;
    }
    
    // Step 2: Check for blocking walls along the movement path
    const moveDirection = horizontalMovement.clone().normalize();
    const wallCheckHeight = currentPosition.y + 0.5;
    
    const wallCollision = this.checkRayCollision(
      new THREE.Vector3(currentPosition.x, wallCheckHeight, currentPosition.z),
      moveDirection,
      horizontalDistance + playerRadius,
      ['projectile', 'enemy']
    );
    
    if (wallCollision && !wallCollision.slopeInfo.walkable) {
      console.log('🏔️ [PhysicsManager] Steep wall detected - handling wall sliding');
      return this.handleWallSliding(currentPosition, targetPosition, wallCollision, playerRadius);
    }
    
    // Step 3: Get ground height at target position with proper terrain detection
    const targetGroundHeight = this.getGroundHeight(targetPosition, 'target position');
    const currentGroundHeight = this.getGroundHeight(currentPosition, 'current position');
    const heightDifference = targetGroundHeight - currentPosition.y;
    
    console.log('🏔️ [PhysicsManager] Ground analysis:', {
      currentY: currentPosition.y.toFixed(3),
      currentGroundY: currentGroundHeight.toFixed(3),
      targetGroundY: targetGroundHeight.toFixed(3),
      heightDiff: heightDifference.toFixed(3)
    });
    
    // Step 4: PROPER TERRAIN FOLLOWING LOGIC
    let finalPosition = targetPosition.clone();
    
    // Check if the step is too high (real terrain blocking)
    if (heightDifference > this.maxStepHeight) {
      console.log('🏔️ [PhysicsManager] Step too high - blocking movement');
      return currentPosition;
    } else if (heightDifference < -3.0) {
      console.log('🏔️ [PhysicsManager] Drop too steep - blocking movement');
      return currentPosition;
    } else {
      // Follow terrain height with small offset to avoid ground clipping
      finalPosition.y = targetGroundHeight + 0.1;
      console.log('🏔️ [PhysicsManager] Following terrain to Y:', finalPosition.y.toFixed(3));
    }
    
    // Step 5: Final collision check for dynamic objects
    const finalCollision = this.checkSphereCollision(finalPosition, playerRadius, ['environment']);
    if (finalCollision) {
      console.log('🏔️ [PhysicsManager] Dynamic object collision - staying at current position');
      return currentPosition;
    }
    
    console.log('🏔️ [PhysicsManager] Movement approved:', finalPosition.toArray().map(n => n.toFixed(3)));
    console.log('🏔️ [PhysicsManager] === MOVEMENT CHECK COMPLETE ===');
    
    return finalPosition;
  }

  public checkSphereCollision(position: THREE.Vector3, radius: number, excludeTypes: string[] = []): CollisionObject | null {
    const sphere = new THREE.Sphere(position, radius);
    
    console.log(`🏔️ [PhysicsManager] Sphere collision check at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) radius=${radius}`);
    console.log(`🏔️ [PhysicsManager] Excluding types: [${excludeTypes.join(', ')}]`);
    
    let checkedObjects = 0;
    let excludedObjects = 0;
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) {
        excludedObjects++;
        continue;
      }
      
      checkedObjects++;
      
      // Update bounding box in case object moved
      collisionObject.box.setFromObject(collisionObject.mesh);
      
      if (collisionObject.box.intersectsSphere(sphere)) {
        console.log('🏔️ [PhysicsManager] Sphere collision detected with:', collisionObject.id, `(${collisionObject.type})`);
        return collisionObject;
      }
    }
    
    console.log(`🏔️ [PhysicsManager] Sphere collision check complete: checked ${checkedObjects}, excluded ${excludedObjects}, no collisions`);
    return null;
  }

  public checkRayCollision(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100, excludeTypes: string[] = []): CollisionResult | null {
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
      if (intersection.distance <= maxDistance) {
        let targetObject = intersection.object;
        let collisionObject = meshToCollisionMap.get(targetObject);
        
        while (!collisionObject && targetObject.parent) {
          targetObject = targetObject.parent;
          collisionObject = meshToCollisionMap.get(targetObject);
        }
        
        if (collisionObject) {
          let slopeInfo: SlopeInfo = {
            walkable: true,
            angle: 0,
            normal: new THREE.Vector3(0, 1, 0)
          };
          
          if (intersection.face) {
            const normal = intersection.face.normal.clone();
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

  public checkEnemyKnockback(currentPosition: THREE.Vector3, knockbackVelocity: THREE.Vector3, deltaTime: number, enemyRadius: number = 0.4): THREE.Vector3 {
    const targetPosition = currentPosition.clone().add(knockbackVelocity.clone().multiplyScalar(deltaTime));
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return currentPosition;
    
    direction.normalize();
    
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['projectile', 'enemy']);
    
    if (collision) {
      const safeDistance = Math.max(0, collision.distance - enemyRadius - 0.1);
      return currentPosition.clone().add(direction.multiplyScalar(safeDistance));
    }
    
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
    this.scene = null;
    console.log('PhysicsManager disposed');
  }
}
