
import * as THREE from 'three';
import { SurfaceData } from '../terrain/TerrainSurfaceDetector';

export interface MovementResult {
  newPosition: THREE.Vector3;
  actualVelocity: THREE.Vector3;
  isBlocked: boolean;
  surfaceData: SurfaceData;
}

export class SurfaceMovementCalculator {
  private gravity: number = -9.81;
  private friction: number = 0.8;

  constructor() {
    console.log('🏃 SurfaceMovementCalculator initialized');
  }

  public calculateSurfaceMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    speed: number,
    surfaceData: SurfaceData,
    deltaTime: number
  ): MovementResult {
    console.log(`🏃 Calculating surface movement: slope=${surfaceData.slopeAngle.toFixed(1)}°, walkable=${surfaceData.isWalkable}`);

    // If surface is not walkable, block movement
    if (!surfaceData.isWalkable) {
      console.log('🏃 Movement blocked - surface too steep');
      return {
        newPosition: currentPosition.clone(),
        actualVelocity: new THREE.Vector3(),
        isBlocked: true,
        surfaceData
      };
    }

    // Project input direction onto surface plane
    const surfaceNormal = surfaceData.normal;
    const projectedDirection = this.projectVectorOntoPlane(inputDirection, surfaceNormal);
    
    // Adjust speed based on slope
    const slopeSpeedMultiplier = this.calculateSlopeSpeedMultiplier(surfaceData.slopeAngle, projectedDirection, surfaceNormal);
    const adjustedSpeed = speed * slopeSpeedMultiplier;
    
    // Calculate movement vector
    const movementVector = projectedDirection.clone().multiplyScalar(adjustedSpeed * deltaTime);
    
    // Apply movement
    const newPosition = currentPosition.clone().add(movementVector);
    
    // Ensure player stays on surface
    newPosition.y = surfaceData.height + 0.4; // Player radius offset

    console.log(`🏃 Surface movement: speed=${adjustedSpeed.toFixed(2)}, direction=(${projectedDirection.x.toFixed(2)}, ${projectedDirection.z.toFixed(2)})`);

    return {
      newPosition,
      actualVelocity: movementVector.divideScalar(deltaTime),
      isBlocked: false,
      surfaceData
    };
  }

  private projectVectorOntoPlane(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    // Project vector onto plane defined by normal
    const dotProduct = vector.dot(normal);
    const projection = normal.clone().multiplyScalar(dotProduct);
    return vector.clone().sub(projection).normalize();
  }

  private calculateSlopeSpeedMultiplier(slopeAngle: number, direction: THREE.Vector3, normal: THREE.Vector3): number {
    // Determine if moving uphill or downhill
    const up = new THREE.Vector3(0, 1, 0);
    const slopeDirection = new THREE.Vector3().crossVectors(normal, up).normalize();
    const isUphill = direction.dot(slopeDirection) > 0;

    // Adjust speed based on slope angle and direction
    const slopeFactor = slopeAngle / 45; // Normalize to max slope
    
    if (isUphill) {
      // Slower uphill
      return Math.max(0.3, 1 - slopeFactor * 0.5);
    } else {
      // Slightly faster downhill, but controlled
      return Math.min(1.3, 1 + slopeFactor * 0.2);
    }
  }
}
