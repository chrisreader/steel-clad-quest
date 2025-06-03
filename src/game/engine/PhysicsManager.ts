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
  private terrainHeightCache: Map<string, { height: number; normal: THREE.Vector3 }> = new Map();
  private terrainSize: number = 100; // Default terrain size
  private terrainProtectionLock: boolean = false; // Terrain protection lock
  private terrainBackup: Map<string, CollisionObject> = new Map(); // Terrain backup
  private terrainFrozen: boolean = false; // Complete terrain freeze during arrow impacts
  
  constructor() {
    console.log('🏔️ Enhanced Physics Manager initialized with complete terrain protection');
  }

  // ENHANCED: Terrain protection during addition with backup
  public addTerrainCollision(terrain: THREE.Mesh, heightData: number[][], terrainSize: number = 100, id?: string): string {
    console.log(`\n🏔️ === PHYSICS TERRAIN REGISTRATION WITH COMPLETE PROTECTION ===`);
    
    const objectId = id || `terrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🏔️ Registering terrain with ID: ${objectId}`);
    
    // Check if terrain is already registered
    for (const [existingId, existingObject] of this.collisionObjects) {
      if (existingObject.mesh === terrain && existingObject.type === 'terrain') {
        console.log(`🏔️ ⚠️ Terrain already registered with ID: ${existingId} - returning existing`);
        return existingId;
      }
    }
    
    if (!terrain) {
      console.error(`🏔️ ❌ ERROR: No terrain mesh provided`);
      return objectId;
    }
    
    if (!heightData || !Array.isArray(heightData)) {
      console.error(`🏔️ ❌ ERROR: Invalid height data provided`);
      return objectId;
    }
    
    const box = new THREE.Box3().setFromObject(terrain);
    this.terrainSize = terrainSize;
    
    const collisionObject: CollisionObject = {
      mesh: terrain,
      box: box,
      type: 'terrain',
      material: 'stone',
      id: objectId,
      heightData: heightData
    };
    
    // PROTECTED: Store terrain with protection flag and backup
    this.collisionObjects.set(objectId, collisionObject);
    this.terrainBackup.set(objectId, { ...collisionObject }); // Create immutable backup
    console.log(`🏔️ ✅ Terrain collision object registered with COMPLETE PROTECTION and BACKUP`);
    console.log(`🏔️ Total collision objects now: ${this.collisionObjects.size}`);
    console.log(`🏔️ === REGISTRATION COMPLETE ===\n`);
    
    return objectId;
  }

  // NEW: Freeze terrain completely during arrow impacts
  public freezeTerrainCollisions(): void {
    this.terrainFrozen = true;
    this.terrainProtectionLock = true;
    console.log('🏔️ ❄️ TERRAIN COMPLETELY FROZEN - no modifications allowed');
    
    // Immediately validate and backup current state
    this.validateAndRestoreTerrainCollisions();
  }

  // NEW: Unfreeze terrain with validation
  public unfreezeTerrainCollisions(): void {
    console.log('🏔️ 🔥 Unfreezing terrain with complete validation...');
    
    // Validate before unfreezing
    this.validateAndRestoreTerrainCollisions();
    
    this.terrainFrozen = false;
    this.terrainProtectionLock = false;
    
    // Double-check after unfreezing
    setTimeout(() => {
      this.validateAndRestoreTerrainCollisions();
    }, 1000);
    
    console.log('🏔️ ✅ Terrain unfrozen with validation complete');
  }

  // ENHANCED: Comprehensive terrain validation with auto-restoration
  public validateTerrainCollisions(): boolean {
    return this.validateAndRestoreTerrainCollisions();
  }

  private validateAndRestoreTerrainCollisions(): boolean {
    console.log('🏔️ 🔍 COMPREHENSIVE terrain validation with auto-restoration...');
    
    let terrainCount = 0;
    let validTerrain = 0;
    let restoredTerrain = 0;
    let corruptedTerrain: string[] = [];
    
    // Check existing terrain for corruption
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain') {
        terrainCount++;
        
        if (collisionObject.heightData && collisionObject.mesh && collisionObject.heightData.length > 0) {
          validTerrain++;
          console.log(`🏔️ ✅ VALID terrain: ${id} (${collisionObject.mesh.name || 'unnamed'})`);
        } else {
          console.error(`🏔️ ❌ CORRUPTED terrain detected: ${id} - missing critical data`);
          corruptedTerrain.push(id);
        }
      }
    }
    
    // Restore missing terrain from backup
    for (const [backupId, backupObject] of this.terrainBackup) {
      if (!this.collisionObjects.has(backupId)) {
        console.log(`🏔️ 🔄 RESTORING missing terrain from backup: ${backupId}`);
        this.collisionObjects.set(backupId, { ...backupObject });
        restoredTerrain++;
        terrainCount++;
        validTerrain++;
      }
    }
    
    // Restore corrupted terrain from backup
    for (const corruptedId of corruptedTerrain) {
      if (this.terrainBackup.has(corruptedId)) {
        console.log(`🏔️ 🔄 RESTORING corrupted terrain from backup: ${corruptedId}`);
        this.collisionObjects.set(corruptedId, { ...this.terrainBackup.get(corruptedId)! });
        validTerrain++;
        restoredTerrain++;
      }
    }
    
    console.log(`🏔️ Terrain validation result: ${validTerrain}/${terrainCount} valid, ${restoredTerrain} restored`);
    return validTerrain === terrainCount && corruptedTerrain.length === 0;
  }

  // PROTECTED: Complete terrain protection - no removal during freeze or protection
  public removeCollisionObject(id: string): void {
    const collisionObject = this.collisionObjects.get(id);
    
    if (collisionObject && collisionObject.type === 'terrain') {
      if (this.terrainFrozen || this.terrainProtectionLock) {
        console.warn(`🏔️ ⚠️ COMPLETELY BLOCKED: Cannot remove terrain ${id} - terrain frozen/protected`);
        return;
      } else {
        console.warn(`🏔️ ⚠️ WARNING: Removing terrain collision ${id} - this should not happen during arrow impacts`);
        // Keep backup intact even when removing from active collisions
      }
    }
    
    // Only remove non-terrain objects or unprotected terrain
    if (this.collisionObjects.delete(id)) {
      console.log(`🔧 Removed collision object: ${id}`);
    }
  }

  // Enable terrain protection
  public enableTerrainProtection(): void {
    this.terrainProtectionLock = true;
    console.log('🏔️ 🔒 Terrain protection ENABLED');
  }

  // Disable terrain protection
  public disableTerrainProtection(): void {
    // Always validate before disabling
    this.validateAndRestoreTerrainCollisions();
    this.terrainProtectionLock = false;
    console.log('🏔️ 🔓 Terrain protection DISABLED with validation');
  }

  // Get collision objects
  public getCollisionObjects(): Map<string, CollisionObject> {
    return this.collisionObjects;
  }

  // Add standard collision object
  public addCollisionObject(mesh: THREE.Object3D, type: 'environment' | 'staircase', material: 'wood' | 'stone' | 'metal' | 'fabric', id?: string): string {
    const objectId = id || `collision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const box = new THREE.Box3().setFromObject(mesh);
    
    const collisionObject: CollisionObject = {
      mesh: mesh,
      box: box,
      type: type,
      material: material,
      id: objectId
    };
    
    this.collisionObjects.set(objectId, collisionObject);
    console.log(`🔧 Added collision object: ${objectId} (${type})`);
    return objectId;
  }

  // Add remove collision object method
  public removeCollisionObject(id: string): void {
    if (this.collisionObjects.delete(id)) {
      console.log(`🔧 Removed collision object: ${id}`);
    }
  }

  // ENHANCED: Smooth terrain raycasting with bilinear interpolation
  public getTerrainHeightAtPosition(position: THREE.Vector3): number {
    const result = this.getTerrainDataAtPosition(position);
    return result.height;
  }

  // ENHANCED: Get terrain data with smooth interpolation and improved caching
  public getTerrainDataAtPosition(position: THREE.Vector3): { height: number; normal: THREE.Vector3 } {
    // Use finer cache granularity for smoother movement
    const cacheKey = `${Math.floor(position.x * 8)},${Math.floor(position.z * 8)}`;
    
    if (this.terrainHeightCache.has(cacheKey)) {
      return this.terrainHeightCache.get(cacheKey)!;
    }
    
    // Sample multiple points for smoother interpolation
    const samples = this.getSmoothTerrainSamples(position);
    
    if (samples.length > 0) {
      // Use bilinear interpolation for smooth height transitions
      const interpolatedResult = this.interpolateTerrainSamples(position, samples);
      this.terrainHeightCache.set(cacheKey, interpolatedResult);
      return interpolatedResult;
    }
    
    // Fallback to ground level
    const fallback = { height: 0, normal: new THREE.Vector3(0, 1, 0) };
    this.terrainHeightCache.set(cacheKey, fallback);
    return fallback;
  }

  // NEW: Sample terrain at multiple nearby points for smooth interpolation
  private getSmoothTerrainSamples(position: THREE.Vector3): Array<{ point: THREE.Vector3; height: number; normal: THREE.Vector3 }> {
    const samples: Array<{ point: THREE.Vector3; height: number; normal: THREE.Vector3 }> = [];
    const sampleRadius = 0.5;
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const samplePos = new THREE.Vector3(
          position.x + dx * sampleRadius,
          position.y + 50,
          position.z + dz * sampleRadius
        );
        
        const terrainSample = this.raycastTerrainAtPosition(samplePos);
        if (terrainSample) {
          samples.push({
            point: new THREE.Vector3(samplePos.x, 0, samplePos.z),
            height: terrainSample.height,
            normal: terrainSample.normal
          });
        }
      }
    }
    
    return samples;
  }

  // NEW: Perform actual raycast at a specific position
  private raycastTerrainAtPosition(rayOrigin: THREE.Vector3): { height: number; normal: THREE.Vector3 } | null {
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain') {
        const terrain = collisionObject.mesh;
        
        this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        const intersections = this.raycaster.intersectObject(terrain, true);
        
        if (intersections.length > 0) {
          const intersection = intersections[0];
          const height = intersection.point.y;
          const normal = intersection.face ? intersection.face.normal.clone() : new THREE.Vector3(0, 1, 0);
          const worldNormal = normal.transformDirection(terrain.matrixWorld).normalize();
          
          return { height, normal: worldNormal };
        }
      }
    }
    return null;
  }

  // NEW: Interpolate between terrain samples for smooth transitions
  private interpolateTerrainSamples(
    position: THREE.Vector3, 
    samples: Array<{ point: THREE.Vector3; height: number; normal: THREE.Vector3 }>
  ): { height: number; normal: THREE.Vector3 } {
    if (samples.length === 1) {
      return { height: samples[0].height, normal: samples[0].normal };
    }
    
    let totalWeight = 0;
    let weightedHeight = 0;
    const weightedNormal = new THREE.Vector3(0, 0, 0);
    
    samples.forEach(sample => {
      const distance = Math.max(0.1, position.distanceTo(sample.point));
      const weight = 1 / distance;
      
      totalWeight += weight;
      weightedHeight += sample.height * weight;
      weightedNormal.add(sample.normal.clone().multiplyScalar(weight));
    });
    
    const finalHeight = weightedHeight / totalWeight;
    const finalNormal = weightedNormal.divideScalar(totalWeight).normalize();
    
    return { height: finalHeight, normal: finalNormal };
  }

  public getSlopeAngleAtPosition(position: THREE.Vector3): number {
    const terrainData = this.getTerrainDataAtPosition(position);
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, terrainData.normal.dot(up)))) * (180 / Math.PI);
    
    console.log(`🏔️ Slope angle at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}): ${slopeAngle.toFixed(1)}°`);
    return slopeAngle;
  }

  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    const terrainData = this.getTerrainDataAtPosition(targetPosition);
    const targetTerrainHeight = terrainData.height;
    
    const currentTerrainData = this.getTerrainDataAtPosition(currentPosition);
    const currentTerrainHeight = currentTerrainData.height;
    
    const maxVerticalChange = 0.15;
    const heightDifference = targetTerrainHeight - currentTerrainHeight;
    const clampedHeightDifference = THREE.MathUtils.clamp(heightDifference, -maxVerticalChange, maxVerticalChange);
    
    const smoothTerrainHeight = currentTerrainHeight + clampedHeightDifference;
    const surfacePosition = targetPosition.clone();
    surfacePosition.y = smoothTerrainHeight + playerRadius;
    
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return surfacePosition;
    
    direction.normalize();
    
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['projectile', 'enemy']);
    
    if (collision && collision.object.type === 'environment') {
      const safeDistance = Math.max(0, collision.distance - playerRadius - 0.1);
      const safePosition = currentPosition.clone().add(direction.multiplyScalar(safeDistance));
      safePosition.y = smoothTerrainHeight + playerRadius;
      
      return safePosition;
    }
    
    return surfacePosition;
  }

  public checkRayCollision(origin: THREE.Vector3, direction: THREE.Vector3, distance: number, excludeTypes: string[] = []): { distance: number; object: CollisionObject; point: THREE.Vector3 } | null {
    this.raycaster.set(origin, direction);
    this.raycaster.far = distance;
    
    let closestCollision: { distance: number; object: CollisionObject; point: THREE.Vector3 } | null = null;
    let minDistance = Infinity;
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) continue;
      
      if (collisionObject.type === 'terrain') {
        const terrainIntersection = this.checkTerrainRayIntersection(origin, direction, distance, collisionObject);
        if (terrainIntersection && terrainIntersection.distance < minDistance) {
          minDistance = terrainIntersection.distance;
          closestCollision = {
            distance: terrainIntersection.distance,
            object: collisionObject,
            point: terrainIntersection.point
          };
        }
      } else if (collisionObject.type === 'environment') {
        const objectPosition = new THREE.Vector3();
        collisionObject.box.getCenter(objectPosition);
        const distanceToObject = origin.distanceTo(objectPosition);
        
        if (distanceToObject < distance && distanceToObject < minDistance) {
          const collisionPoint = origin.clone().add(direction.clone().multiplyScalar(distanceToObject));
          minDistance = distanceToObject;
          closestCollision = {
            distance: distanceToObject,
            object: collisionObject,
            point: collisionPoint
          };
        }
      }
    }
    
    return closestCollision;
  }

  private checkTerrainRayIntersection(
    origin: THREE.Vector3, 
    direction: THREE.Vector3, 
    maxDistance: number, 
    terrainObject: CollisionObject
  ): { distance: number; point: THREE.Vector3 } | null {
    const terrain = terrainObject.mesh;
    
    const intersections = this.raycaster.intersectObject(terrain, true);
    
    if (intersections.length > 0) {
      const intersection = intersections[0];
      const distance = intersection.distance;
      
      if (distance <= maxDistance) {
        console.log(`🏹 Arrow terrain collision detected at distance ${distance.toFixed(2)}`);
        return {
          distance: distance,
          point: intersection.point
        };
      }
    }
    
    return null;
  }

  public getCollisionMaterial(objectId: string): 'wood' | 'stone' | 'metal' | 'fabric' | null {
    const collisionObject = this.collisionObjects.get(objectId);
    return collisionObject ? collisionObject.material : null;
  }

  public clearTerrainCache(): void {
    this.terrainHeightCache.clear();
    console.log('🏔️ Terrain height cache cleared');
  }
}
