
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
  private lastVelocity: THREE.Vector3 = new THREE.Vector3();
  private velocitySmoothing: number = 0.85; // How much to smooth velocity changes

  constructor() {
    console.log('🏃 SurfaceMovementCalculator initialized with smooth terrain following');
  }

  public calculateSurfaceMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    speed: number,
    surfaceData: SurfaceData,
    deltaTime: number
  ): MovementResult {
    let debugInfo = '';
    
    console.log(`🏃 Smooth movement: slope=${surfaceData.slopeAngle.toFixed(1)}°, walkable=${surfaceData.isWalkable}`);

    // If on flat ground or terrain boundary, use smooth movement
    if (surfaceData.isTerrainBoundary || surfaceData.slopeAngle < 5) {
      debugInfo += 'FLAT_GROUND ';
      return this.calculateSmoothMovement(currentPosition, inputDirection, speed, surfaceData, deltaTime, debugInfo);
    }

    // For slopes, use enhanced slope movement with smoothing
    return this.calculateSmoothSlopeMovement(currentPosition, inputDirection, speed, surfaceData, deltaTime);
  }

  // NEW: Smooth movement for flat terrain
  private calculateSmoothMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    speed: number,
    surfaceData: SurfaceData,
    deltaTime: number,
    debugInfo: string
  ): MovementResult {
    const targetVelocity = inputDirection.clone().multiplyScalar(speed);
    
    // Smooth velocity transitions
    const smoothedVelocity = this.lastVelocity.clone().lerp(targetVelocity, 1 - this.velocitySmoothing);
    this.lastVelocity.copy(smoothedVelocity);
    
    const movement = smoothedVelocity.clone().multiplyScalar(deltaTime);
    const newPosition = currentPosition.clone().add(movement);
    newPosition.y = surfaceData.height + 0.4; // Consistent player height
    
    return {
      newPosition,
      actualVelocity: smoothedVelocity,
      isBlocked: false,
      surfaceData,
      debugInfo: debugInfo + 'SMOOTH_MOVEMENT'
    };
  }

  // NEW: Enhanced slope movement with velocity smoothing and look-ahead
  private calculateSmoothSlopeMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    speed: number,
    surfaceData: SurfaceData,
    deltaTime: number
  ): MovementResult {
    const surfaceNormal = surfaceData.normal;
    
    // Project input direction onto the surface plane with enhanced smoothing
    const projectedDirection = this.projectVectorOntoPlaneSmooth(inputDirection, surfaceNormal);
    
    // Adjust speed based on slope with smoother transitions
    const slopeSpeedMultiplier = this.calculateSmoothSlopeSpeedMultiplier(surfaceData.slopeAngle);
    const adjustedSpeed = speed * slopeSpeedMultiplier;
    
    // Calculate target velocity
    const targetVelocity = projectedDirection.clone().multiplyScalar(adjustedSpeed);
    
    // Apply velocity smoothing to prevent sudden direction changes
    const smoothedVelocity = this.lastVelocity.clone().lerp(targetVelocity, 1 - this.velocitySmoothing);
    this.lastVelocity.copy(smoothedVelocity);
    
    // Calculate movement with smoothed velocity
    const movementVector = smoothedVelocity.clone().multiplyScalar(deltaTime);
    
    // Apply movement
    const newPosition = currentPosition.clone().add(movementVector);
    newPosition.y = surfaceData.height + 0.4; // Force to terrain surface
    
    console.log(`🏃 Smooth slope movement: speed=${adjustedSpeed.toFixed(2)}, smoothed velocity length=${smoothedVelocity.length().toFixed(2)}`);

    return {
      newPosition,
      actualVelocity: smoothedVelocity,
      isBlocked: false,
      surfaceData,
      debugInfo: 'SMOOTH_SLOPE_MOVEMENT'
    };
  }

  // ENHANCED: Smoother vector projection with stability checks
  private projectVectorOntoPlaneSmooth(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    // Enhanced vector projection with smoothing
    const normalizedNormal = normal.clone().normalize();
    const dotProduct = vector.dot(normalizedNormal);
    const projection = normalizedNormal.multiplyScalar(dotProduct);
    const result = vector.clone().sub(projection);
    
    // Ensure result has reasonable length and apply smoothing
    if (result.length() < this.minMovementThreshold) {
      return vector.clone().normalize().multiplyScalar(0.1);
    }
    
    // Normalize and apply slight damping for smoother movement
    return result.normalize().multiplyScalar(0.95);
  }

  // ENHANCED: Smoother slope speed calculations with better transitions
  private calculateSmoothSlopeSpeedMultiplier(slopeAngle: number): number {
    // Use smooth curves instead of hard thresholds
    if (slopeAngle > 45) {
      return 0.3 + (60 - slopeAngle) * 0.01; // Gradual transition
    } else if (slopeAngle > 30) {
      return 0.6 + (45 - slopeAngle) * 0.013; // Smooth transition
    } else if (slopeAngle > 15) {
      return 0.8 + (30 - slopeAngle) * 0.013; // Gentle transition
    }
    return 1.0; // Flat or gentle slopes
  }

  public resetStuckCounter(): void {
    // Reset velocity smoothing when stuck
    this.lastVelocity.set(0, 0, 0);
  }
}
