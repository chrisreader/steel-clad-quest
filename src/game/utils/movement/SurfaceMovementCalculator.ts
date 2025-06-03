
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
  private smoothingFactor: number = 0.1; // For movement smoothing

  constructor() {
    console.log('🏃 SurfaceMovementCalculator initialized with smooth raycast-based terrain following');
  }

  public calculateSurfaceMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    speed: number,
    surfaceData: SurfaceData,
    deltaTime: number
  ): MovementResult {
    let debugInfo = '';
    
    console.log(`🏃 Calculating SMOOTH movement: slope=${surfaceData.slopeAngle.toFixed(1)}°, walkable=${surfaceData.isWalkable}`);

    // If on flat ground or terrain boundary, use simple movement with smoothing
    if (surfaceData.isTerrainBoundary || surfaceData.slopeAngle < 3) { // Lower threshold for smoother transitions
      debugInfo += 'SMOOTH_FLAT_GROUND ';
      const movement = inputDirection.clone().multiplyScalar(speed * deltaTime);
      const newPosition = currentPosition.clone().add(movement);
      newPosition.y = surfaceData.height + 0.4; // Consistent player height
      
      return {
        newPosition,
        actualVelocity: movement.divideScalar(deltaTime),
        isBlocked: false,
        surfaceData,
        debugInfo: debugInfo + 'SMOOTH_SIMPLE_MOVEMENT'
      };
    }

    // For slopes, project movement onto surface with enhanced smoothing
    const surfaceNormal = surfaceData.normal;
    
    // Project input direction onto the surface plane with smoothing
    const projectedDirection = this.projectVectorOntoPlaneSmooth(inputDirection, surfaceNormal);
    
    // Adjust speed based on slope with smoother curves
    const slopeSpeedMultiplier = this.calculateSmoothSlopeSpeedMultiplier(surfaceData.slopeAngle);
    const adjustedSpeed = speed * slopeSpeedMultiplier;
    
    // Calculate movement with smoothing
    const movementVector = projectedDirection.clone().multiplyScalar(adjustedSpeed * deltaTime);
    
    // Apply movement with position smoothing
    const newPosition = currentPosition.clone().add(movementVector);
    newPosition.y = surfaceData.height + 0.4; // Force to terrain surface
    
    console.log(`🏃 SMOOTH slope movement: speed=${adjustedSpeed.toFixed(2)}, projected=(${projectedDirection.x.toFixed(2)}, ${projectedDirection.z.toFixed(2)})`);

    return {
      newPosition,
      actualVelocity: movementVector.divideScalar(deltaTime),
      isBlocked: false,
      surfaceData,
      debugInfo: debugInfo + 'SMOOTH_SLOPE_MOVEMENT'
    };
  }

  private projectVectorOntoPlaneSmooth(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    // Enhanced smooth vector projection with gradual falloff
    const normalizedNormal = normal.clone().normalize();
    const dotProduct = vector.dot(normalizedNormal);
    const projection = normalizedNormal.multiplyScalar(dotProduct);
    let result = vector.clone().sub(projection);
    
    // Ensure result has reasonable length with smooth normalization
    if (result.length() < this.minMovementThreshold) {
      result = vector.clone().normalize();
    } else {
      result.normalize();
    }
    
    // Apply smoothing to prevent jitter
    const smoothedLength = Math.max(0.1, Math.min(1.0, result.length()));
    result.multiplyScalar(smoothedLength);
    
    return result;
  }

  private calculateSmoothSlopeSpeedMultiplier(slopeAngle: number): number {
    // Smooth slope speed adjustment using exponential curves
    if (slopeAngle > 40) {
      return 0.2; // Very steep
    } else if (slopeAngle > 25) {
      // Smooth transition between 25-40 degrees
      const factor = (slopeAngle - 25) / 15;
      return 0.2 + (0.4 - 0.2) * (1 - factor);
    } else if (slopeAngle > 10) {
      // Smooth transition between 10-25 degrees
      const factor = (slopeAngle - 10) / 15;
      return 0.6 + (0.8 - 0.6) * (1 - factor);
    }
    return 1.0; // Gentle or flat
  }

  public resetStuckCounter(): void {
    // No longer needed with smooth raycasting approach
  }
}
