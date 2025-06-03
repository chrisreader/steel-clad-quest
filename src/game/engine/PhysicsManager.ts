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
  private terrainSize: number = 100; // Default terrain size
  
  constructor() {
    console.log('🏔️ Enhanced Physics Manager initialized with terrain height support and staircase navigation');
  }

  // Enhanced method: Add terrain with height data for better collision
  public addTerrainCollision(terrain: THREE.Mesh, heightData: number[][], terrainSize: number = 100, id?: string): string {
    const objectId = id || `terrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const box = new THREE.Box3().setFromObject(terrain);
    
    // Store terrain size for proper coordinate mapping
    this.terrainSize = terrainSize;
    
    const collisionObject: CollisionObject = {
      mesh: terrain,
      box: box,
      type: 'terrain',
      material: 'stone',
      id: objectId,
      heightData: heightData
    };
    
    this.collisionObjects.set(objectId, collisionObject);
    console.log(`🏔️ Added terrain collision object: ${objectId} with height data (size: ${terrainSize})`);
    return objectId;
  }

  // Enhanced method: Get terrain height at world position with proper coordinate mapping
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
        
        // Convert to heightmap indices with proper bounds
        const segments = heightData.length - 1;
        
        // Map from local coordinates to heightmap indices
        const x = Math.floor(((localPos.x + this.terrainSize / 2) / this.terrainSize) * segments);
        const z = Math.floor(((localPos.z + this.terrainSize / 2) / this.terrainSize) * segments);
        
        // Bounds check with clamping
        const clampedX = Math.max(0, Math.min(segments, x));
        const clampedZ = Math.max(0, Math.min(segments, z));
        
        if (clampedX >= 0 && clampedX < heightData.length && clampedZ >= 0 && clampedZ < heightData[0].length) {
          const height = heightData[clampedX][clampedZ] + terrain.position.y;
          this.terrainHeightCache.set(cacheKey, height);
          return height;
        }
      }
    }
    
    return 0; // Default ground level
  }

  // Enhanced method: Calculate slope angle at position using heightmap
  public getSlopeAngleAtPosition(position: THREE.Vector3): number {
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain' && collisionObject.heightData) {
        const terrain = collisionObject.mesh;
        const heightData = collisionObject.heightData;
        const localPos = position.clone();
        terrain.worldToLocal(localPos);
        
        const segments = heightData.length - 1;
        const x = Math.floor(((localPos.x + this.terrainSize / 2) / this.terrainSize) * segments);
        const z = Math.floor(((localPos.z + this.terrainSize / 2) / this.terrainSize) * segments);
        
        // Bounds check with margin for gradient calculation
        if (x > 0 && x < segments && z > 0 && z < segments) {
          // Calculate gradients using finite differences
          const dx = heightData[x + 1][z] - heightData[x - 1][z];
          const dz = heightData[x][z + 1] - heightData[x][z - 1];
          
          // Create surface normal vector
          const normal = new THREE.Vector3(-dx / 2, 1, -dz / 2).normalize();
          const up = new THREE.Vector3(0, 1, 0);
          
          // Calculate angle between surface normal and up vector
          const angle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
          return angle;
        }
      }
    }
    
    return 0; // Flat terrain if no heightmap found
  }

  // FIXED: Only register staircase steps, not parent staircase group
  public addCollisionObject(object: THREE.Object3D, type: 'environment' | 'player' | 'projectile' | 'enemy' | 'terrain' | 'staircase' | 'staircase_step', material: 'wood' | 'stone' | 'metal' | 'fabric' = 'stone', id?: string): string {
    const objectId = id || `collision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // FIXED: Only register individual steps for staircases
    if (object instanceof THREE.Group && object.name === 'staircase') {
      console.log(`🪜 Adding staircase with ${object.children.length} steps`);
      
      // Register only individual steps, skip parent group
      object.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh && child.name === 'staircase_step') {
          const childId = `${objectId}_step_${index}`;
          const box = new THREE.Box3().setFromObject(child);
          
          const stepCollisionObject: CollisionObject = {
            mesh: child,
            box: box,
            type: 'staircase_step',
            material: material,
            id: childId
          };
          
          this.collisionObjects.set(childId, stepCollisionObject);
          console.log(`🪜 Added staircase step ${index}: ${childId}`);
        }
      });
      
      // Return without registering parent group
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
      console.log(`🔧 Added collision object: ${objectId} (${type}, ${material})`);
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

  // ENHANCED: Better staircase step climbing with downward raycasting and wider detection
  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return currentPosition;
    
    direction.normalize();
    
    // STEP 1: Enhanced staircase step climbing
    const stepPosition = this.checkStaircaseStepClimbing(currentPosition, targetPosition, playerRadius);
    if (stepPosition && !stepPosition.equals(targetPosition)) {
      console.log(`🪜 STAIR CLIMBING: Adjusted position from y=${targetPosition.y.toFixed(2)} to y=${stepPosition.y.toFixed(2)}`);
      return stepPosition;
    }
    
    // STEP 2: Check slope angle at target position
    const slopeAngle = this.getSlopeAngleAtPosition(targetPosition);
    if (slopeAngle > 45) {
      console.log(`🏔️ Movement blocked by steep slope: ${slopeAngle.toFixed(1)}° (max 45°)`);
      return currentPosition;
    }
    
    // STEP 3: Check for standard environment collisions (trees, walls, etc.)
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['projectile', 'enemy']);
    
    if (collision && collision.object.type === 'environment') {
      // Calculate safe position just before collision
      const safeDistance = Math.max(0, collision.distance - playerRadius - 0.1);
      const safePosition = currentPosition.clone().add(direction.multiplyScalar(safeDistance));
      
      // Try sliding along the collision surface
      return this.handleWallSliding(currentPosition, targetPosition, collision, playerRadius);
    }
    
    // STEP 4: Follow terrain height with slope projection
    const terrainHeight = this.getTerrainHeightAtPosition(targetPosition);
    const adjustedTarget = targetPosition.clone();
    
    // ENHANCED: Slope projection for natural movement
    if (slopeAngle <= 45 && slopeAngle > 0) {
      // Calculate terrain normal for slope projection
      const dx = this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x + 1, 0, targetPosition.z)) - 
                this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x - 1, 0, targetPosition.z));
      const dz = this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x, 0, targetPosition.z + 1)) - 
                this.getTerrainHeightAtPosition(new THREE.Vector3(targetPosition.x, 0, targetPosition.z - 1));
      
      const normal = new THREE.Vector3(-dx / 2, 1, -dz / 2).normalize();
      const movement = new THREE.Vector3().subVectors(targetPosition, currentPosition);
      const projectedMovement = movement.clone().sub(normal.clone().multiplyScalar(movement.dot(normal)));
      
      adjustedTarget.copy(currentPosition).add(projectedMovement);
      adjustedTarget.y = terrainHeight + playerRadius;
      
      console.log(`🏔️ Slope projection: angle=${slopeAngle.toFixed(1)}°, normal=(${normal.x.toFixed(2)}, ${normal.y.toFixed(2)}, ${normal.z.toFixed(2)})`);
    } else {
      // Ensure player stays above terrain
      adjustedTarget.y = Math.max(adjustedTarget.y, terrainHeight + playerRadius);
    }
    
    return adjustedTarget;
  }

  // ENHANCED: Staircase step climbing with downward raycasting and wider distance
  private checkStaircaseStepClimbing(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number): THREE.Vector3 | null {
    // Downward raycast to detect steps under player
    const downRay = this.checkRayCollision(currentPosition, new THREE.Vector3(0, -1, 0), 1.0, ['projectile', 'enemy']);
    if (downRay && downRay.object.type === 'staircase_step') {
      const stepCenter = new THREE.Vector3();
      downRay.object.box.getCenter(stepCenter);
      const adjustedTarget = targetPosition.clone();
      adjustedTarget.y = stepCenter.y + playerRadius;
      console.log(`🪜 DOWN RAY STEP: y=${adjustedTarget.y.toFixed(2)}`);
      return adjustedTarget;
    }
    
    // Forward check for next step
    let closestStep: CollisionObject | null = null;
    let minDistance = Infinity;
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition).normalize();
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'staircase_step') {
        const stepCenter = new THREE.Vector3();
        collisionObject.box.getCenter(stepCenter);
        
        // Calculate distance to step in movement direction
        const toStep = new THREE.Vector3().subVectors(stepCenter, currentPosition);
        const distance = toStep.dot(direction);
        
        // FIXED: Increased distance from 1.2 to 1.5 for better detection
        if (distance > 0 && distance < 1.5 && distance < minDistance) {
          const heightDiff = stepCenter.y - currentPosition.y;
          
          // Check if step height is climbable (within step height limit)
          if (heightDiff <= 0.6 + playerRadius && heightDiff >= -0.1) {
            closestStep = collisionObject;
            minDistance = distance;
          }
        }
      }
    }
    
    if (closestStep) {
      const stepCenter = new THREE.Vector3();
      closestStep.box.getCenter(stepCenter);
      
      const adjustedTarget = targetPosition.clone();
      // Set player height to step height plus radius
      adjustedTarget.y = stepCenter.y + playerRadius;
      
      console.log(`🪜 FORWARD STEP: y=${adjustedTarget.y.toFixed(2)}`);
      return adjustedTarget;
    }
    
    return null;
  }

  // Enhanced staircase navigation method (kept for compatibility)
  public checkStaircaseNavigation(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    const stepPosition = this.checkStaircaseStepClimbing(currentPosition, targetPosition, playerRadius);
    return stepPosition || targetPosition;
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
