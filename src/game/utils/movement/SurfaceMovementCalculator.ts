
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
  private friction: number = 0.8;
  private minMovementThreshold: number = 0.001;

  constructor() {
    console.log('🏃 SurfaceMovementCalculator initialized with raycast-based terrain following');
  }

  public calculateSurfaceMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    speed: number,
    surfaceData: SurfaceData,
    deltaTime: number
  ): MovementResult {
    let debugInfo = '';
    
    console.log(`🏃 Calculating movement: slope=${surfaceData.slopeAngle.toFixed(1)}°, walkable=${surfaceData.isWalkable}`);

    // If on flat ground or terrain boundary, use simple movement
    if (surfaceData.isTerrainBoundary || surfaceData.slopeAngle < 5) {
      debugInfo += 'FLAT_GROUND ';
      const movement = inputDirection.clone().multiplyScalar(speed * deltaTime);
      const newPosition = currentPosition.clone().add(movement);
      newPosition.y = surfaceData.height + 0.4; // Consistent player height
      
      return {
        newPosition,
        actualVelocity: movement.divideScalar(deltaTime),
        isBlocked: false,
        surfaceData,
        debugInfo: debugInfo + 'SIMPLE_MOVEMENT'
      };
    }

    // For slopes, project movement onto surface
    const surfaceNormal = surfaceData.normal;
    
    // Project input direction onto the surface plane
    const projectedDirection = this.projectVectorOntoPlane(inputDirection, surfaceNormal);
    
    // Adjust speed based on slope
    const slopeSpeedMultiplier = this.calculateSlopeSpeedMultiplier(surfaceData.slopeAngle);
    const adjustedSpeed = speed * slopeSpeedMultiplier;
    
    // Calculate movement
    const movementVector = projectedDirection.clone().multiplyScalar(adjustedSpeed * deltaTime);
    
    // Apply movement
    const newPosition = currentPosition.clone().add(movementVector);
    newPosition.y = surfaceData.height + 0.4; // Force to terrain surface
    
    console.log(`🏃 Slope movement: speed=${adjustedSpeed.toFixed(2)}, projected=(${projectedDirection.x.toFixed(2)}, ${projectedDirection.z.toFixed(2)})`);

    return {
      newPosition,
      actualVelocity: movementVector.divideScalar(deltaTime),
      isBlocked: false,
      surfaceData,
      debugInfo: debugInfo + 'SLOPE_MOVEMENT'
    };
  }

  private projectVectorOntoPlane(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    // Simple and stable vector projection
    const normalizedNormal = normal.clone().normalize();
    const dotProduct = vector.dot(normalizedNormal);
    const projection = normalizedNormal.multiplyScalar(dotProduct);
    const result = vector.clone().sub(projection);
    
    // Ensure result has reasonable length
    if (result.length() < this.minMovementThreshold) {
      return vector.clone().normalize();
    }
    
    return result.normalize();
  }

  private calculateSlopeSpeedMultiplier(slopeAngle: number): number {
    // Simple slope speed adjustment
    if (slopeAngle > 45) {
      return 0.3; // Very steep
    } else if (slopeAngle > 30) {
      return 0.6; // Steep
    } else if (slopeAngle > 15) {
      return 0.8; // Moderate
    }
    return 1.0; // Gentle or flat
  }

  public resetStuckCounter(): void {
    // No longer needed with raycasting approach
  }
}
