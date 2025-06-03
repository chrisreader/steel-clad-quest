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
  
  constructor() {
    console.log('🏔️ Enhanced Physics Manager initialized with true terrain raycasting');
  }

  // Enhanced method: Add terrain with height data for better collision with debugging
  public addTerrainCollision(terrain: THREE.Mesh, heightData: number[][], terrainSize: number = 100, id?: string): string {
    console.log(`\n🏔️ === PHYSICS TERRAIN REGISTRATION ===`);
    
    const objectId = id || `terrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🏔️ Registering terrain with ID: ${objectId}`);
    console.log(`🏔️ Terrain mesh: ${!!terrain}, HeightData: ${!!heightData}, Size: ${terrainSize}`);
    
    if (!terrain) {
      console.error(`🏔️ ❌ ERROR: No terrain mesh provided`);
      return objectId;
    }
    
    if (!heightData || !Array.isArray(heightData)) {
      console.error(`🏔️ ❌ ERROR: Invalid height data provided`);
      return objectId;
    }
    
    console.log(`🏔️ Height data validation:`);
    console.log(`  - Is array: ${Array.isArray(heightData)}`);
    console.log(`  - Length: ${heightData.length}`);
    console.log(`  - First row length: ${heightData[0]?.length}`);
    console.log(`  - Sample height [0][0]: ${heightData[0]?.[0]}`);
    
    const box = new THREE.Box3().setFromObject(terrain);
    console.log(`🏔️ Terrain bounding box:`, box);
    console.log(`🏔️ Terrain position: (${terrain.position.x}, ${terrain.position.y}, ${terrain.position.z})`);
    
    // Store terrain size for proper coordinate mapping
    this.terrainSize = terrainSize;
    console.log(`🏔️ Terrain size set to: ${this.terrainSize}`);
    
    const collisionObject: CollisionObject = {
      mesh: terrain,
      box: box,
      type: 'terrain',
      material: 'stone',
      id: objectId,
      heightData: heightData
    };
    
    this.collisionObjects.set(objectId, collisionObject);
    console.log(`🏔️ ✅ Terrain collision object registered successfully`);
    console.log(`🏔️ Total collision objects now: ${this.collisionObjects.size}`);
    console.log(`🏔️ === REGISTRATION COMPLETE ===\n`);
    
    return objectId;
  }

  // Add the missing getCollisionObjects method
  public getCollisionObjects(): Map<string, CollisionObject> {
    return this.collisionObjects;
  }

  // Add standard collision object method
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

  // ENHANCED: True terrain raycasting for accurate height detection
  public getTerrainHeightAtPosition(position: THREE.Vector3): number {
    const result = this.getTerrainDataAtPosition(position);
    return result.height;
  }

  // NEW: Get both height and normal using true raycasting
  public getTerrainDataAtPosition(position: THREE.Vector3): { height: number; normal: THREE.Vector3 } {
    const cacheKey = `${Math.floor(position.x * 4)},${Math.floor(position.z * 4)}`;
    
    if (this.terrainHeightCache.has(cacheKey)) {
      return this.terrainHeightCache.get(cacheKey)!;
    }
    
    // Find terrain collision objects and use raycasting
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain') {
        const terrain = collisionObject.mesh;
        
        // Cast ray downward from above the position
        const rayOrigin = new THREE.Vector3(position.x, position.y + 50, position.z);
        const rayDirection = new THREE.Vector3(0, -1, 0);
        
        this.raycaster.set(rayOrigin, rayDirection);
        
        // Get intersections with terrain mesh
        const intersections = this.raycaster.intersectObject(terrain, true);
        
        if (intersections.length > 0) {
          const intersection = intersections[0];
          const height = intersection.point.y;
          const normal = intersection.face ? intersection.face.normal.clone() : new THREE.Vector3(0, 1, 0);
          
          // Transform normal to world space
          const worldNormal = normal.transformDirection(terrain.matrixWorld).normalize();
          
          const result = { height, normal: worldNormal };
          this.terrainHeightCache.set(cacheKey, result);
          
          console.log(`🏔️ RAYCAST HIT: position=(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), height=${height.toFixed(2)}, normal=(${worldNormal.x.toFixed(2)}, ${worldNormal.y.toFixed(2)}, ${worldNormal.z.toFixed(2)})`);
          
          return result;
        } else {
          console.log(`🏔️ RAYCAST MISS: position=(${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
        }
      }
    }
    
    // Fallback to ground level
    const fallback = { height: 0, normal: new THREE.Vector3(0, 1, 0) };
    this.terrainHeightCache.set(cacheKey, fallback);
    return fallback;
  }

  // SIMPLIFIED: Use raycasting result for slope calculation
  public getSlopeAngleAtPosition(position: THREE.Vector3): number {
    const terrainData = this.getTerrainDataAtPosition(position);
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, terrainData.normal.dot(up)))) * (180 / Math.PI);
    
    console.log(`🏔️ Slope angle at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}): ${slopeAngle.toFixed(1)}°`);
    return slopeAngle;
  }

  // ENHANCED: Surface-aware player movement with proper height following
  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    console.log(`🏔️ SURFACE-AWARE movement check from (${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)}) to (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
    
    // Get terrain height at target position using raycasting
    const terrainData = this.getTerrainDataAtPosition(targetPosition);
    const terrainHeight = terrainData.height;
    
    // Force player to follow terrain surface with consistent offset
    const surfacePosition = targetPosition.clone();
    surfacePosition.y = terrainHeight + playerRadius; // Maintain consistent height above terrain
    
    console.log(`🏔️ RAYCAST-BASED position: y=${surfacePosition.y.toFixed(2)} (terrain=${terrainHeight.toFixed(2)} + radius=${playerRadius})`);
    
    // Check for standard environment collisions
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return surfacePosition;
    
    direction.normalize();
    
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['projectile', 'enemy']);
    
    if (collision && collision.object.type === 'environment') {
      // Calculate safe position just before collision
      const safeDistance = Math.max(0, collision.distance - playerRadius - 0.1);
      const safePosition = currentPosition.clone().add(direction.multiplyScalar(safeDistance));
      safePosition.y = terrainHeight + playerRadius; // Still follow terrain
      
      console.log(`🏔️ Environment collision detected, safe position: (${safePosition.x.toFixed(2)}, ${safePosition.y.toFixed(2)}, ${safePosition.z.toFixed(2)})`);
      return safePosition;
    }
    
    return surfacePosition;
  }

  // FIXED: Enhanced method with proper collision point calculation
  public checkRayCollision(origin: THREE.Vector3, direction: THREE.Vector3, distance: number, excludeTypes: string[] = []): { distance: number; object: CollisionObject; point: THREE.Vector3 } | null {
    this.raycaster.set(origin, direction);
    this.raycaster.far = distance;
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) continue;
      
      // Simple distance check for basic collision
      const objectPosition = new THREE.Vector3();
      collisionObject.box.getCenter(objectPosition);
      const distanceToObject = origin.distanceTo(objectPosition);
      
      if (distanceToObject < distance && collisionObject.type === 'environment') {
        // Calculate collision point
        const collisionPoint = origin.clone().add(direction.clone().multiplyScalar(distanceToObject));
        
        return {
          distance: distanceToObject,
          object: collisionObject,
          point: collisionPoint
        };
      }
    }
    
    return null;
  }

  // NEW: Add missing getCollisionMaterial method
  public getCollisionMaterial(objectId: string): 'wood' | 'stone' | 'metal' | 'fabric' | null {
    const collisionObject = this.collisionObjects.get(objectId);
    return collisionObject ? collisionObject.material : null;
  }

  // NEW: Clear cache periodically to prevent memory issues
  public clearTerrainCache(): void {
    this.terrainHeightCache.clear();
    console.log('🏔️ Terrain height cache cleared');
  }
}
