import * as THREE from 'three';

export class LineOfSightDetector {
  private raycaster: THREE.Raycaster;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Check if a position is visible from the player's camera position
   */
  public isPositionVisible(
    playerPosition: THREE.Vector3, 
    targetPosition: THREE.Vector3,
    camera?: THREE.Camera
  ): boolean {
    // Calculate direction from player to target
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, playerPosition)
      .normalize();
    
    const distance = playerPosition.distanceTo(targetPosition);
    
    // Set up raycaster from player position
    this.raycaster.set(playerPosition, direction);
    this.raycaster.far = distance;
    
    // Check for intersections with scene objects
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Filter out small objects and ground plane
    const significantIntersects = intersects.filter(intersect => {
      const object = intersect.object;
      
      // Skip if it's the ground or very small objects
      if (object.name?.includes('ground') || 
          object.name?.includes('grass') ||
          object.position.y < 0.1) {
        return false;
      }
      
      // Check if it's a significant object (tree, rock, building)
      return this.isSignificantObstacle(object);
    });
    
    // If we hit something significant before reaching the target, it's not visible
    return significantIntersects.length === 0;
  }

  /**
   * Find spawn positions behind obstacles relative to player view
   */
  public findBehindObstaclePositions(
    playerPosition: THREE.Vector3,
    minDistance: number,
    maxDistance: number,
    attempts: number = 10
  ): THREE.Vector3[] {
    const validPositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < attempts; i++) {
      // Generate random position within range
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      const candidatePosition = new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        playerPosition.y,
        playerPosition.z + Math.sin(angle) * distance
      );
      
      // Check if position is behind an obstacle
      if (!this.isPositionVisible(playerPosition, candidatePosition)) {
        // Ensure there's ground at this position (basic check)
        candidatePosition.y = 0;
        validPositions.push(candidatePosition);
      }
    }
    
    return validPositions;
  }

  /**
   * Get positions in the player's blind spot (behind them)
   */
  public getBlindSpotPositions(
    playerPosition: THREE.Vector3,
    playerRotation: number,
    minDistance: number,
    maxDistance: number,
    count: number = 5
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    
    // Define blind spot as 120-240 degrees behind player
    const blindSpotStart = playerRotation + Math.PI * 0.66; // 120 degrees
    const blindSpotEnd = playerRotation + Math.PI * 1.33;   // 240 degrees
    const blindSpotRange = blindSpotEnd - blindSpotStart;
    
    for (let i = 0; i < count; i++) {
      const angle = blindSpotStart + (Math.random() * blindSpotRange);
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      const position = new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        0,
        playerPosition.z + Math.sin(angle) * distance
      );
      
      positions.push(position);
    }
    
    return positions;
  }

  /**
   * Check if an object is a significant obstacle for spawning
   */
  private isSignificantObstacle(object: THREE.Object3D): boolean {
    // Check by name or type
    if (object.name?.includes('tree') || 
        object.name?.includes('rock') || 
        object.name?.includes('building') ||
        object.name?.includes('wall')) {
      return true;
    }
    
    // Check by size - objects with significant bounding box
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    
    // Consider objects larger than 2x2x2 units as significant
    return size.x > 2 && size.y > 2 && size.z > 2;
  }

  /**
   * Get the best spawn position considering visibility and obstacles
   */
  public getBestSpawnPosition(
    playerPosition: THREE.Vector3,
    playerRotation: number,
    minDistance: number,
    maxDistance: number
  ): THREE.Vector3 {
    // First try blind spot positions
    const blindSpotPositions = this.getBlindSpotPositions(
      playerPosition, 
      playerRotation, 
      minDistance, 
      maxDistance, 
      3
    );
    
    for (const position of blindSpotPositions) {
      if (!this.isPositionVisible(playerPosition, position)) {
        return position;
      }
    }
    
    // Then try behind obstacle positions
    const behindObstaclePositions = this.findBehindObstaclePositions(
      playerPosition, 
      minDistance, 
      maxDistance, 
      5
    );
    
    if (behindObstaclePositions.length > 0) {
      return behindObstaclePositions[0];
    }
    
    // Fallback to farthest position from player
    const angle = Math.random() * Math.PI * 2;
    return new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * maxDistance,
      0,
      playerPosition.z + Math.sin(angle) * maxDistance
    );
  }
}