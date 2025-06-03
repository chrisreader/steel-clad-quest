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
    console.log('🏔️ Enhanced Physics Manager initialized with true surface following support');
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

  // ENHANCED: Better terrain height calculation for surface following
  public getTerrainHeightAtPosition(position: THREE.Vector3): number {
    const cacheKey = `${Math.floor(position.x * 10)},${Math.floor(position.z * 10)}`;
    
    if (this.terrainHeightCache.has(cacheKey)) {
      return this.terrainHeightCache.get(cacheKey)!;
    }
    
    // Find terrain collision objects
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain' && collisionObject.heightData) {
        const terrain = collisionObject.mesh;
        const heightData = collisionObject.heightData;
        
        // FIXED: Proper coordinate transformation for cone-shaped hill
        const terrainPos = terrain.position;
        const terrainSize = terrain.userData.terrainSize || 30;
        
        // Convert world position to terrain local coordinates
        const localX = position.x - terrainPos.x;
        const localZ = position.z - terrainPos.z;
        
        // For cone geometry, calculate distance from center
        const distanceFromCenter = Math.sqrt(localX * localX + localZ * localZ);
        const radius = terrainSize / 2;
        
        // Check if position is within terrain bounds
        if (distanceFromCenter <= radius) {
          // FIXED: Direct cone height calculation
          const normalizedDistance = Math.min(1, distanceFromCenter / radius);
          
          // For a cone, height decreases linearly from center to edge
          const maxHeight = Math.max(...heightData.flat());
          const height = maxHeight * (1 - normalizedDistance);
          
          // Add terrain base position
          const finalHeight = terrainPos.y + height;
          
          this.terrainHeightCache.set(cacheKey, finalHeight);
          
          console.log(`🏔️ FIXED terrain height at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}): ${finalHeight.toFixed(2)}`);
          console.log(`🏔️ Distance from center: ${distanceFromCenter.toFixed(2)}, radius: ${radius}, height: ${height.toFixed(2)}`);
          
          return finalHeight;
        }
      }
    }
    
    return 0; // Default ground level
  }

  // STEP 3 FIX: Enhanced method with proper coordinate mapping for slope calculation
  public getSlopeAngleAtPosition(position: THREE.Vector3): number {
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain' && collisionObject.heightData) {
        const terrain = collisionObject.mesh;
        const heightData = collisionObject.heightData;
        
        // Use same coordinate transformation as getTerrainHeightAtPosition
        const terrainPos = terrain.position;
        const terrainSize = terrain.userData.terrainSize || 30;
        
        const localX = position.x - terrainPos.x;
        const localZ = position.z - terrainPos.z;
        
        const distanceFromCenter = Math.sqrt(localX * localX + localZ * localZ);
        const radius = terrainSize / 2;
        
        if (distanceFromCenter <= radius) {
          const segments = heightData.length - 1;
          const normalizedDistance = distanceFromCenter / radius;
          const angle = Math.atan2(localZ, localX);
          const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
          
          const mapX = Math.floor(normalizedDistance * segments);
          const mapZ = Math.floor(normalizedAngle * segments);
          
          // Bounds check with margin for gradient calculation
          if (mapX > 0 && mapX < segments && mapZ > 0 && mapZ < segments) {
            // Calculate gradients using finite differences
            const dx = heightData[mapX + 1][mapZ] - heightData[mapX - 1][mapZ];
            const dz = heightData[mapX][mapZ + 1] - heightData[mapX][mapZ - 1];
            
            // Create surface normal vector
            const normal = new THREE.Vector3(-dx / 2, 1, -dz / 2).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            
            // Calculate angle between surface normal and up vector
            const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
            
            console.log(`🏔️ Slope angle at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}): ${slopeAngle.toFixed(1)}°`);
            return slopeAngle;
          }
        }
      }
    }
    
    return 0; // Flat terrain if no heightmap found
  }

  // ENHANCED: Surface-aware player movement
  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    console.log(`🏔️ SURFACE-AWARE movement check from (${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)}) to (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
    
    // Get terrain height at target position
    const terrainHeight = this.getTerrainHeightAtPosition(targetPosition);
    
    // Check if target position is on terrain
    if (terrainHeight > 0) {
      // Force player to follow terrain surface
      const surfacePosition = targetPosition.clone();
      surfacePosition.y = terrainHeight + playerRadius;
      
      console.log(`🏔️ FORCING player to terrain surface: y=${surfacePosition.y.toFixed(2)} (terrain=${terrainHeight.toFixed(2)} + radius=${playerRadius})`);
      return surfacePosition;
    }
    
    // Check for standard environment collisions
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const distance = direction.length();
    
    if (distance === 0) return currentPosition;
    
    direction.normalize();
    
    const collision = this.checkRayCollision(currentPosition, direction, distance, ['projectile', 'enemy']);
    
    if (collision && collision.object.type === 'environment') {
      // Calculate safe position just before collision
      const safeDistance = Math.max(0, collision.distance - playerRadius - 0.1);
      const safePosition = currentPosition.clone().add(direction.multiplyScalar(safeDistance));
      
      console.log(`🏔️ Environment collision detected, safe position: (${safePosition.x.toFixed(2)}, ${safePosition.y.toFixed(2)}, ${safePosition.z.toFixed(2)})`);
      return safePosition;
    }
    
    console.log(`🏔️ Standard movement to: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
    return targetPosition;
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
}
