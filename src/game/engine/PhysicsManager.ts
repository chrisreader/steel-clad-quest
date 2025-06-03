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
  private raycaster: THREE.Raycaster = new THREE.Raycaster(); // For terrain height detection ONLY
  private arrowRaycaster: THREE.Raycaster = new THREE.Raycaster(); // For arrow collisions ONLY
  private environmentRaycaster: THREE.Raycaster = new THREE.Raycaster(); // CRITICAL FIX: For environment collisions ONLY
  private terrainHeightCache: Map<string, { height: number; normal: THREE.Vector3 }> = new Map();
  private terrainSize: number = 100; // Default terrain size
  
  constructor() {
    console.log('🏔️ Enhanced Physics Manager initialized with smooth terrain following and THREE dedicated raycasters');
    console.log('🏔️ Raycaster separation: main(terrain), arrow(projectiles), environment(walls/trees)');
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
    const sampleRadius = 0.5; // Sample points within 0.5 units
    
    // Sample in a 3x3 grid around the position
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

  // PRESERVED: Use the main raycaster ONLY for terrain detection (no corruption from environment checks)
  private raycastTerrainAtPosition(rayOrigin: THREE.Vector3): { height: number; normal: THREE.Vector3 } | null {
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'terrain') {
        const terrain = collisionObject.mesh;
        
        // PRESERVED: Main raycaster remains dedicated to terrain detection
        console.log(`🏔️ Using MAIN raycaster for terrain height detection (preserved from environment corruption)`);
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
    
    // Weight samples by distance (inverse distance weighting)
    let totalWeight = 0;
    let weightedHeight = 0;
    const weightedNormal = new THREE.Vector3(0, 0, 0);
    
    samples.forEach(sample => {
      const distance = Math.max(0.1, position.distanceTo(sample.point)); // Avoid division by zero
      const weight = 1 / distance;
      
      totalWeight += weight;
      weightedHeight += sample.height * weight;
      weightedNormal.add(sample.normal.clone().multiplyScalar(weight));
    });
    
    const finalHeight = weightedHeight / totalWeight;
    const finalNormal = weightedNormal.divideScalar(totalWeight).normalize();
    
    return { height: finalHeight, normal: finalNormal };
  }

  // SIMPLIFIED: Use raycasting result for slope calculation
  public getSlopeAngleAtPosition(position: THREE.Vector3): number {
    const terrainData = this.getTerrainDataAtPosition(position);
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, terrainData.normal.dot(up)))) * (180 / Math.PI);
    
    console.log(`🏔️ Slope angle at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}): ${slopeAngle.toFixed(1)}°`);
    return slopeAngle;
  }

  // ENHANCED: Player movement with environment collision detection
  public checkPlayerMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3, playerRadius: number = 0.5): THREE.Vector3 {
    // Get smooth terrain data at target position
    const terrainData = this.getTerrainDataAtPosition(targetPosition);
    const targetTerrainHeight = terrainData.height;
    
    // Get current terrain height for smooth interpolation
    const currentTerrainData = this.getTerrainDataAtPosition(currentPosition);
    const currentTerrainHeight = currentTerrainData.height;
    
    // Calculate smooth height transition (limit vertical change per frame)
    const maxVerticalChange = 0.15; // Maximum height change per frame
    const heightDifference = targetTerrainHeight - currentTerrainHeight;
    const clampedHeightDifference = THREE.MathUtils.clamp(heightDifference, -maxVerticalChange, maxVerticalChange);
    
    // Apply smooth height following
    let smoothTerrainHeight = currentTerrainHeight + clampedHeightDifference;
    let surfacePosition = targetPosition.clone();
    surfacePosition.y = smoothTerrainHeight + playerRadius;
    
    console.log(`🏔️ SMOOTH movement: current=${currentTerrainHeight.toFixed(2)}, target=${targetTerrainHeight.toFixed(2)}, smooth=${smoothTerrainHeight.toFixed(2)}`);
    
    // IMPROVED: Check for environment object collisions with better logic
    const movementDirection = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const movementDistance = movementDirection.length();
    
    if (movementDistance > 0.01) { // Only check collision if there's significant movement
      movementDirection.normalize();
      
      // CRITICAL FIX: Use dedicated environment raycaster to prevent terrain raycaster corruption
      const environmentCollision = this.checkEnvironmentCollisionRaycast(currentPosition, targetPosition, playerRadius);
      
      if (environmentCollision) {
        console.log(`🚧 Environment collision detected with ${environmentCollision.object.type} object`);
        
        // Instead of completely blocking movement, try to slide along the collision surface
        const slidePosition = this.calculateSlideMovement(currentPosition, targetPosition, environmentCollision, playerRadius);
        const slideTerrainData = this.getTerrainDataAtPosition(slidePosition);
        slidePosition.y = slideTerrainData.height + playerRadius;
        console.log(`🚧 Sliding along collision surface to: (${slidePosition.x.toFixed(2)}, ${slidePosition.y.toFixed(2)}, ${slidePosition.z.toFixed(2)})`);
        return slidePosition;
      }
    }
    
    return surfacePosition;
  }

  // CRITICAL FIX: Use dedicated environment raycaster to prevent terrain raycaster corruption
  private checkEnvironmentCollisionRaycast(
    currentPosition: THREE.Vector3, 
    targetPosition: THREE.Vector3, 
    playerRadius: number
  ): { object: CollisionObject; point: THREE.Vector3; normal: THREE.Vector3 } | null {
    
    const movementDirection = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const movementDistance = movementDirection.length();
    
    if (movementDistance < 0.01) return null;
    
    movementDirection.normalize();
    
    // CRITICAL FIX: Use dedicated environment raycaster instead of main raycaster
    console.log(`🚧 CRITICAL FIX: Using dedicated ENVIRONMENT raycaster (preserving main raycaster for terrain)`);
    this.environmentRaycaster.set(currentPosition, movementDirection);
    this.environmentRaycaster.far = movementDistance + playerRadius;
    
    // Check collision with all environment objects
    for (const [id, collisionObject] of this.collisionObjects) {
      if (collisionObject.type === 'environment' || collisionObject.type === 'staircase') {
        const intersections = this.environmentRaycaster.intersectObject(collisionObject.mesh, true);
        
        if (intersections.length > 0) {
          const intersection = intersections[0];
          const distanceToCollision = intersection.distance;
          
          // Only consider it a collision if it's closer than the player radius
          if (distanceToCollision <= playerRadius + 0.1) { // Small buffer
            console.log(`🚧 Environment raycast collision with ${collisionObject.type} at distance ${distanceToCollision.toFixed(2)}`);
            console.log(`🚧 Main raycaster preserved for terrain detection - no corruption!`);
            
            return {
              object: collisionObject,
              point: intersection.point,
              normal: intersection.face ? intersection.face.normal.clone().transformDirection(collisionObject.mesh.matrixWorld) : new THREE.Vector3(0, 1, 0)
            };
          }
        }
      }
    }
    
    console.log(`🚧 Environment collision check complete - terrain raycaster remains uncorrupted`);
    return null;
  }

  // NEW: Calculate slide movement along collision surfaces
  private calculateSlideMovement(
    currentPosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    collision: { object: CollisionObject; point: THREE.Vector3; normal: THREE.Vector3 },
    playerRadius: number
  ): THREE.Vector3 {
    const movementDirection = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    
    // Project the movement direction onto the collision surface (slide along the wall)
    const slideDirection = movementDirection.clone().projectOnPlane(collision.normal).normalize();
    
    // Calculate how much we can move along the slide direction
    const originalDistance = movementDirection.length();
    const slideDistance = originalDistance * 0.8; // Reduce movement slightly when sliding
    
    // Calculate the slide position
    const slidePosition = currentPosition.clone().add(slideDirection.multiplyScalar(slideDistance));
    
    return slidePosition;
  }

  // CRITICAL FIX: Use dedicated arrow raycaster for ALL collision detection to prevent corruption
  public checkRayCollision(origin: THREE.Vector3, direction: THREE.Vector3, distance: number, excludeTypes: string[] = []): { distance: number; object: CollisionObject; point: THREE.Vector3 } | null {
    // CRITICAL FIX: Use the dedicated arrow raycaster instead of the shared raycaster
    console.log(`🏹 CRITICAL FIX: Using dedicated arrow raycaster for collision detection (preserving main raycaster)`);
    this.arrowRaycaster.set(origin, direction);
    this.arrowRaycaster.far = distance;
    
    let closestCollision: { distance: number; object: CollisionObject; point: THREE.Vector3 } | null = null;
    let minDistance = Infinity;
    
    for (const [id, collisionObject] of this.collisionObjects) {
      if (excludeTypes.includes(collisionObject.type)) continue;
      
      // Handle terrain objects specially for arrow collision
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
      } else if (collisionObject.type === 'environment' || collisionObject.type === 'staircase') {
        // FIXED: Use proper ray-mesh intersection for environment objects instead of flawed distance checking
        const environmentIntersection = this.checkEnvironmentRayIntersection(origin, direction, distance, collisionObject);
        if (environmentIntersection && environmentIntersection.distance < minDistance) {
          minDistance = environmentIntersection.distance;
          closestCollision = {
            distance: environmentIntersection.distance,
            object: collisionObject,
            point: environmentIntersection.point
          };
        }
      }
    }
    
    console.log(`🏹 Arrow collision check complete - main raycaster preserved for player terrain detection`);
    return closestCollision;
  }

  // CRITICAL FIX: Use dedicated arrow raycaster to prevent corruption of main raycaster
  private checkTerrainRayIntersection(
    origin: THREE.Vector3, 
    direction: THREE.Vector3, 
    maxDistance: number, 
    terrainObject: CollisionObject
  ): { distance: number; point: THREE.Vector3 } | null {
    const terrain = terrainObject.mesh;
    
    // CRITICAL FIX: Use dedicated arrow raycaster instead of shared raycaster
    console.log(`🏹 Using dedicated arrow raycaster for terrain collision (preserving main raycaster)`);
    this.arrowRaycaster.set(origin, direction);
    this.arrowRaycaster.far = maxDistance;
    
    const intersections = this.arrowRaycaster.intersectObject(terrain, true);
    
    if (intersections.length > 0) {
      const intersection = intersections[0];
      const distance = intersection.distance;
      
      if (distance <= maxDistance) {
        console.log(`🏹 Arrow terrain collision detected at distance ${distance.toFixed(2)} (main raycaster preserved)`);
        return {
          distance: distance,
          point: intersection.point
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
