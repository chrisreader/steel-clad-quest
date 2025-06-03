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
  private maxStepHeight = 1.5; // Increased for more permissive movement
  private scene: THREE.Scene | null = null;
  private terrainDetectionThreshold = 2.0; // Much higher threshold - less sensitive
  
  constructor() {
    console.log('🏔️ Enhanced Physics Manager initialized with free walking system');
  }

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    console.log('🏔️ [PhysicsManager] Scene reference set for terrain detection');
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

  public getGroundHeight(position: THREE.Vector3, debugContext: string = ''): { height: number; hasGround: boolean } {
    const rayOrigin = new THREE.Vector3(position.x, position.y + 10, position.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    
    this.raycaster.set(rayOrigin, rayDirection);
    
    // Check collision objects first
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
          allMeshes.push(child);
        }
      });
      intersections = this.raycaster.intersectObjects(allMeshes, false);
    }
    
    if (intersections.length > 0) {
      const groundHeight = intersections[0].point.y;
      console.log(`🏔️ [PhysicsManager] Ground found at Y=${groundHeight.toFixed(3)} for ${debugContext}`);
      return { height: groundHeight, hasGround: true };
    }
    
    // Default to spawn level if no ground detected
    const defaultHeight = 1.0;
    console.log(`🏔️ [PhysicsManager] No ground detected for ${debugContext}, using default Y=${defaultHeight}`);
    return { height: defaultHeight, hasGround: false };
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
    console.log('🏔️ [PhysicsManager] === FREE WALKING MOVEMENT CHECK ===');
    console.log('🏔️ [PhysicsManager] Current:', currentPosition.toArray().map(n => n.toFixed(3)));
    console.log('🏔️ [PhysicsManager] Target:', targetPosition.toArray().map(n => n.toFixed(3)));
    
    // Step 1: Calculate horizontal movement
    const horizontalMovement = new THREE.Vector3(
      targetPosition.x - currentPosition.x,
      0,
      targetPosition.z - currentPosition.z
    );
    const horizontalDistance = horizontalMovement.length();
    
    if (horizontalDistance < 0.001) {
      console.log('🏔️ [PhysicsManager] No movement, staying in place');
      return currentPosition;
    }
    
    // Step 2: Check for wall collisions (actual blocking objects)
    const moveDirection = horizontalMovement.clone().normalize();
    const wallCheckHeight = currentPosition.y + 0.5;
    
    const wallCollision = this.checkRayCollision(
      new THREE.Vector3(currentPosition.x, wallCheckHeight, currentPosition.z),
      moveDirection,
      horizontalDistance + playerRadius,
      ['projectile', 'enemy', 'player']
    );
    
    // Only block movement if hitting a steep wall (not walkable)
    if (wallCollision && !wallCollision.slopeInfo.walkable) {
      console.log('🏔️ [PhysicsManager] Wall blocking movement - angle:', wallCollision.slopeInfo.angle.toFixed(1));
      return this.handleWallSliding(currentPosition, targetPosition, wallCollision, playerRadius);
    }
    
    // Step 3: Start with target position
    let finalPosition = targetPosition.clone();
    
    // Step 4: Simple environment collision check (for trees, objects)
    const environmentCollision = this.checkSphereCollision(finalPosition, playerRadius * 0.8, ['projectile', 'enemy', 'player']);
    if (environmentCollision) {
      console.log('🏔️ [PhysicsManager] Environment object collision - blocking');
      return currentPosition;
    }
    
    // Step 5: SIMPLIFIED TERRAIN FOLLOWING - only for significant height changes
    const targetGroundResult = this.getGroundHeight(targetPosition, 'target');
    
    if (targetGroundResult.hasGround) {
      const heightDifference = targetGroundResult.height - currentPosition.y;
      
      // Only follow terrain if height difference is SIGNIFICANT
      if (Math.abs(heightDifference) > this.terrainDetectionThreshold) {
        if (heightDifference > this.maxStepHeight) {
          console.log('🏔️ [PhysicsManager] Step too high - blocking');
          return currentPosition;
        } else if (heightDifference < -5.0) {
          console.log('🏔️ [PhysicsManager] Drop too steep - blocking');
          return currentPosition;
        } else {
          // Follow significant terrain change
          finalPosition.y = targetGroundResult.height + 0.1;
          console.log('🏔️ [PhysicsManager] Following significant terrain to Y:', finalPosition.y.toFixed(3));
        }
      } else {
        // Small height change - FREE WALKING on flat ground
        finalPosition.y = currentPosition.y;
        console.log('🏔️ [PhysicsManager] FREE WALKING - maintaining current height');
      }
    } else {
      // No ground detected - maintain current height for FREE WALKING
      finalPosition.y = currentPosition.y;
      console.log('🏔️ [PhysicsManager] FREE WALKING - no ground, maintaining height');
    }
    
    console.log('🏔️ [PhysicsManager] FREE MOVEMENT APPROVED:', finalPosition.toArray().map(n => n.toFixed(3)));
    console.log('🏔️ [PhysicsManager] === MOVEMENT CHECK COMPLETE ===');
    
    return finalPosition;
  }

  public checkSphereCollision(position: THREE.Vector3, radius: number, excludeTypes: string[] = []): CollisionObject | null {
    const sphere = new THREE.Sphere(position, radius);
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) {
        continue;
      }
      
      // Update bounding box
      collisionObject.box.setFromObject(collisionObject.mesh);
      
      if (collisionObject.box.intersectsSphere(sphere)) {
        console.log('🏔️ [PhysicsManager] Sphere collision with:', collisionObject.id);
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
