import * as THREE from 'three';

export interface CollisionObject {
  mesh: THREE.Object3D;
  box: THREE.Box3;
  type: 'environment' | 'player' | 'projectile' | 'enemy' | 'terrain' | 'staircase' | 'staircase_step';
  material: 'wood' | 'stone' | 'metal' | 'fabric';
  id: string;
  heightData?: number[][]; // For terrain collision
}

export class PhysicsManager {
  private gravity = -9.81;
  private collisionObjects: Map<string, CollisionObject> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private terrainHeightCache: Map<string, number> = new Map();
  
  constructor() {
    console.log('Enhanced Physics Manager initialized with terrain height support');
  }

  // New method: Add terrain with height data for better collision
  public addTerrainCollision(terrain: THREE.Mesh, heightData: number[][], id?: string): string {
    const objectId = id || `terrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const box = new THREE.Box3().setFromObject(terrain);
    
    const collisionObject: CollisionObject = {
      mesh: terrain,
      box: box,
      type: 'terrain',
      material: 'stone',
      id: objectId,
      heightData: heightData
    };
    
    this.collisionObjects.set(objectId, collisionObject);
    console.log(`Added terrain collision object: ${objectId} with height data`);
    return objectId;
  }

  // New method: Get terrain height at world position
  public getTerrainHeightAtPosition(position: THREE.Vector3): number {
    const cacheKey = `${Math.floor(position.x)},${Math.floor(position.z)}`;
    
    if (this.terrainHeightCache.has(cacheKey)) {
      return this.terrainHeightCache.get(cacheKey)!;
    }
    
    // Find terrain collision objects
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain' && collisionObject.heightData) {
        const terrain = collisionObject.mesh;
        const heightData = collisionObject.heightData;
        
        // Convert world position to terrain local coordinates
        const localPos = position.clone();
        terrain.worldToLocal(localPos);
        
        // Convert to heightmap indices
        const terrainSize = 100; // Assuming 100x100 terrain size
        const segments = heightData.length - 1;
        
        const x = Math.floor(((localPos.x + terrainSize / 2) / terrainSize) * segments);
        const z = Math.floor(((localPos.z + terrainSize / 2) / terrainSize) * segments);
        
        // Bounds check
        if (x >= 0 && x < heightData.length && z >= 0 && z < heightData[0].length) {
          const height = heightData[x][z] + terrain.position.y;
          this.terrainHeightCache.set(cacheKey, height);
          return height;
        }
      }
    }
    
    return 0; // Default ground level
  }

  public addCollisionObject(object: THREE.Object3D, type: 'environment' | 'player' | 'projectile' | 'enemy' | 'terrain' | 'staircase' | 'staircase_step', material: 'wood' | 'stone' | 'metal' | 'fabric' = 'stone', id?: string): string {
    const objectId = id || `collision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Handle staircase groups by registering each step individually
    if (object instanceof THREE.Group && object.name === 'staircase') {
      object.children.forEach((child, index) => {
        const childId = `${objectId}_step_${index}`;
        const box = new THREE.Box3().setFromObject(child);
        
        const collisionObject: CollisionObject = {
          mesh: child,
          box: box,
          type: 'staircase_step',
          material: 'stone',
          id: childId
        };
        
        this.collisionObjects.set(childId, collisionObject);
        console.log(`Added staircase step: ${childId}`);
      });
      return objectId;
    } else {
      // Existing logic for other objects
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
  }

  public removeCollisionObject(id: string): void {
    if (this.collisionObjects.delete(id)) {
      console.log(`Removed collision object: ${id}`);
    }
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

  public checkRayCollision(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100, excludeTypes: string[] = []): { object: CollisionObject; distance: number; point: THREE.Vector3 } | null {
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
        // Find the collision object that contains this mesh
        let targetObject = intersection.object;
        let collisionObject = meshToCollisionMap.get(targetObject);
        
        // Check parent objects if not found
        while (!collisionObject && targetObject.parent) {
          targetObject = targetObject.parent;
          collisionObject = meshToCollisionMap.get(targetObject);
        }
        
        if (collisionObject) {
          return {
            object: collisionObject,
            distance: intersection.distance,
            point: intersection.point
          };
        }
      }
    }
    
    return null;
  }

  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return currentPosition;
    
    direction.normalize();
    
    // Check slope angle at target position
    const angle = this.getSlopeAngleAtPosition(targetPosition);
    if (angle > 45) {
      console.log(`Movement blocked by steep slope: ${angle.toFixed(1)} degrees`);
      return currentPosition;
    }
    
    // First check for standard collisions
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['projectile', 'enemy', 'staircase_step']);
    
    if (collision) {
      // Calculate safe position just before collision
      const safeDistance = Math.max(0, collision.distance - playerRadius - 0.1);
      const safePosition = currentPosition.clone().add(direction.multiplyScalar(safeDistance));
      
      // Try sliding along the collision surface
      return this.handleWallSliding(currentPosition, targetPosition, collision, playerRadius);
    }
    
    // Check terrain height at target position
    const terrainHeight = this.getTerrainHeightAtPosition(targetPosition);
    const adjustedTarget = targetPosition.clone();
    
    // For slopes, project movement along slope normal
    if (angle > 0 && angle <= 45) {
      const dx = this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x + 1, 0, targetPosition.z)) - 
                this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x - 1, 0, targetPosition.z));
      const dz = this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x, 0, targetPosition.z + 1)) - 
                this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x, 0, targetPosition.z - 1));
      const normal = new THREE.Vector3(-dx / 2, 1, -dz / 2).normalize();
      const movement = targetPosition.clone().sub(currentPosition);
      const projectedMovement = movement.clone().sub(normal.clone().multiplyScalar(movement.dot(normal)));
      adjustedTarget.copy(currentPosition).add(projectedMovement);
    }
    
    // Ensure player stays above terrain
    if (adjustedTarget.y < terrainHeight + playerRadius) {
      adjustedTarget.y = terrainHeight + playerRadius;
    }
    
    return adjustedTarget;
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

  public checkStaircaseNavigation(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    let closestStep: CollisionObject | null = null;
    let minDistance = Infinity;
    const direction = targetPosition.clone().sub(currentPosition).normalize();
    
    // Find the closest step ahead of the player
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'staircase_step') {
        const stepCenter = collisionObject.box.getCenter(new THREE.Vector3());
        const toStep = stepCenter.clone().sub(currentPosition);
        const distance = toStep.dot(direction);
        
        // Check if step is ahead and within reach
        if (distance > 0 && distance < 1.2 && distance < minDistance) {
          const heightDiff = stepCenter.y - currentPosition.y;
          
          // Check if step height is manageable (≤ 0.6)
          if (heightDiff <= 0.6 + playerRadius && heightDiff > -0.1) {
            closestStep = collisionObject;
            minDistance = distance;
          }
        }
      }
    }
    
    if (closestStep) {
      const stepCenter = closestStep.box.getCenter(new THREE.Vector3());
      const adjustedTarget = targetPosition.clone();
      adjustedTarget.y = stepCenter.y + playerRadius;
      
      console.log(`Stepping up staircase: y=${adjustedTarget.y.toFixed(2)}, step height=${stepCenter.y.toFixed(2)}`);
      return adjustedTarget;
    }
    
    return targetPosition;
  }

  private handleWallSliding(currentPos: THREE.Vector3, targetPos: THREE.Vector3, collision: { object: CollisionObject; distance: number; point: THREE.Vector3 }, playerRadius: number): THREE.Vector3 {
    // Calculate collision normal (simplified - assumes axis-aligned boxes)
    const collisionBox = collision.object.box;
    const collisionCenter = collisionBox.getCenter(new THREE.Vector3());
    const normal = new THREE.Vector3().subVectors(collision.point, collisionCenter).normalize();
    
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

  public getSlopeAngleAtPosition(position: THREE.Vector3): number {
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain' && collisionObject.heightData) {
        const terrain = collisionObject.mesh;
        const heightData = collisionObject.heightData;
        
        // Convert world position to terrain local coordinates
        const localPos = position.clone();
        terrain.worldToLocal(localPos);
        
        // Convert to heightmap indices
        const terrainSize = 100;
        const segments = heightData.length - 1;
        
        const x = Math.floor(((localPos.x + terrainSize / 2) / terrainSize) * segments);
        const z = Math.floor(((localPos.z + terrainSize / 2) / terrainSize) * segments);
        
        // Bounds check and gradient calculation
        if (x > 0 && x < segments && z > 0 && z < segments) {
          const dx = heightData[x + 1][z] - heightData[x - 1][z];
          const dz = heightData[x][z + 1] - heightData[x][z - 1];
          const normal = new THREE.Vector3(-dx / 2, 1, -dz / 2).normalize();
          const up = new THREE.Vector3(0, 1, 0);
          const angle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
          return angle;
        }
      }
    }
    
    return 0; // Default flat terrain
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
