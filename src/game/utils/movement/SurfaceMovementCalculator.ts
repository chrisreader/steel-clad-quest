
import * as THREE from 'three';
import { SurfaceData } from '../terrain/TerrainSurfaceDetector';

export interface MovementResult {
  newPosition: THREE.Vector3;
  actualVelocity: THREE.Vector3;
  isBlocked: boolean;
  surfaceData: SurfaceData;
  debugInfo?: string;
}

export class SurfaceMovementCalculator {
  private gravity: number = -9.81;
  private friction: number = 0.8;
  private minMovementThreshold: number = 0.001;
  private stuckFrameCount: number = 0;
  private lastPosition: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    console.log('🏃 SurfaceMovementCalculator initialized with enhanced safety checks');
  }

  public calculateSurfaceMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    speed: number,
    surfaceData: SurfaceData,
    deltaTime: number
  ): MovementResult {
    let debugInfo = '';
    
    // Check if player is stuck (same position for multiple frames)
    const positionDelta = currentPosition.distanceTo(this.lastPosition);
    if (positionDelta < this.minMovementThreshold) {
      this.stuckFrameCount++;
    } else {
      this.stuckFrameCount = 0;
    }
    this.lastPosition.copy(currentPosition);

    // Recovery mode if stuck for too long
    if (this.stuckFrameCount > 30) {
      debugInfo += 'RECOVERY_MODE ';
      console.log('🏃 🚨 RECOVERY MODE: Player stuck, using fallback movement');
      
      // Use simplified flat movement as fallback
      const fallbackMovement = inputDirection.clone().multiplyScalar(speed * deltaTime * 0.5);
      const newPosition = currentPosition.clone().add(fallbackMovement);
      newPosition.y = Math.max(surfaceData.height + 0.4, currentPosition.y);
      
      this.stuckFrameCount = 0; // Reset counter
      
      return {
        newPosition,
        actualVelocity: fallbackMovement.divideScalar(deltaTime),
        isBlocked: false,
        surfaceData,
        debugInfo: debugInfo + 'FALLBACK_MOVEMENT'
      };
    }

    console.log(`🏃 Calculating surface movement: slope=${surfaceData.slopeAngle.toFixed(1)}°, walkable=${surfaceData.isWalkable}, stuck=${this.stuckFrameCount}`);

    // If surface is not walkable, use gradual blocking instead of hard block
    if (!surfaceData.isWalkable) {
      debugInfo += 'STEEP_SLOPE ';
      console.log('🏃 Steep slope detected - reducing movement speed');
      
      // Allow some movement on steep slopes but heavily reduced
      const reducedSpeed = speed * 0.1;
      const limitedMovement = inputDirection.clone().multiplyScalar(reducedSpeed * deltaTime);
      const newPosition = currentPosition.clone().add(limitedMovement);
      newPosition.y = surfaceData.height + 0.4;
      
      return {
        newPosition,
        actualVelocity: limitedMovement.divideScalar(deltaTime),
        isBlocked: false,
        surfaceData,
        debugInfo: debugInfo + 'REDUCED_SPEED'
      };
    }

    // Enhanced vector projection with safety checks
    const surfaceNormal = surfaceData.normal;
    const projectedDirection = this.safeProjectVectorOntoPlane(inputDirection, surfaceNormal);
    
    // Check if projection resulted in valid vector
    if (projectedDirection.length() < this.minMovementThreshold) {
      debugInfo += 'INVALID_PROJECTION ';
      console.log('🏃 ⚠️ Invalid projection, using original direction');
      
      // Use original direction with terrain height adjustment
      const safeMovement = inputDirection.clone().multiplyScalar(speed * deltaTime);
      const newPosition = currentPosition.clone().add(safeMovement);
      newPosition.y = surfaceData.height + 0.4;
      
      return {
        newPosition,
        actualVelocity: safeMovement.divideScalar(deltaTime),
        isBlocked: false,
        surfaceData,
        debugInfo: debugInfo + 'ORIGINAL_DIRECTION'
      };
    }
    
    // Adjust speed based on slope with smoother transitions
    const slopeSpeedMultiplier = this.calculateSmoothSlopeSpeedMultiplier(surfaceData.slopeAngle, projectedDirection, surfaceNormal);
    const adjustedSpeed = speed * slopeSpeedMultiplier;
    
    // Calculate movement vector with minimum threshold
    const movementVector = projectedDirection.clone().multiplyScalar(adjustedSpeed * deltaTime);
    
    // Ensure minimum movement to prevent getting stuck
    if (movementVector.length() < this.minMovementThreshold) {
      debugInfo += 'MIN_MOVEMENT ';
      movementVector.normalize().multiplyScalar(this.minMovementThreshold);
    }
    
    // Apply movement with terrain following
    const newPosition = currentPosition.clone().add(movementVector);
    newPosition.y = surfaceData.height + 0.4; // Player radius offset

    console.log(`🏃 Surface movement: speed=${adjustedSpeed.toFixed(2)}, direction=(${projectedDirection.x.toFixed(2)}, ${projectedDirection.z.toFixed(2)}), debug=${debugInfo}`);

    return {
      newPosition,
      actualVelocity: movementVector.divideScalar(deltaTime),
      isBlocked: false,
      surfaceData,
      debugInfo
    };
  }

  private safeProjectVectorOntoPlane(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    // Safety check for zero vectors
    if (vector.length() < this.minMovementThreshold || normal.length() < 0.1) {
      console.log('🏃 ⚠️ Invalid vector or normal for projection');
      return vector.clone().normalize();
    }

    // Enhanced projection with bounds checking
    const normalizedNormal = normal.clone().normalize();
    const dotProduct = vector.dot(normalizedNormal);
    
    // Avoid extreme projections
    if (Math.abs(dotProduct) > 0.99) {
      console.log('🏃 ⚠️ Extreme projection detected, using modified approach');
      // Use a slightly modified normal to avoid complete elimination
      const modifiedNormal = normalizedNormal.clone().multiplyScalar(0.8);
      const projection = modifiedNormal.multiplyScalar(vector.dot(modifiedNormal));
      return vector.clone().sub(projection).normalize();
    }

    // Standard projection
    const projection = normalizedNormal.multiplyScalar(dotProduct);
    const result = vector.clone().sub(projection);
    
    // Ensure result has minimum length
    if (result.length() < this.minMovementThreshold) {
      return vector.clone().normalize();
    }
    
    return result.normalize();
  }

  private calculateSmoothSlopeSpeedMultiplier(slopeAngle: number, direction: THREE.Vector3, normal: THREE.Vector3): number {
    // Smoother slope speed calculation with less aggressive penalties
    const up = new THREE.Vector3(0, 1, 0);
    const slopeDirection = new THREE.Vector3().crossVectors(normal, up).normalize();
    const isUphill = direction.dot(slopeDirection) > 0;

    // More gradual speed adjustments
    const slopeFactor = Math.min(slopeAngle / 60, 1); // Cap at 60 degrees instead of 45
    
    if (isUphill) {
      // Less aggressive uphill penalty
      return Math.max(0.5, 1 - slopeFactor * 0.3);
    } else {
      // Smaller downhill bonus
      return Math.min(1.2, 1 + slopeFactor * 0.1);
    }
  }

  public resetStuckCounter(): void {
    this.stuckFrameCount = 0;
  }
}
