
import * as THREE from 'three';
import { PhysicsManager } from '../../engine/PhysicsManager';
import { TerrainSurfaceDetector } from '../terrain/TerrainSurfaceDetector';
import { SurfaceMovementCalculator } from './SurfaceMovementCalculator';

export interface EnemyMovementConfig {
  speed: number;
  radius: number;
  slopeSpeedMultiplier: boolean;
  maxSlopeAngle: number;
}

export class EnemyMovementHelper {
  private physicsManager: PhysicsManager;
  private terrainDetector: TerrainSurfaceDetector;
  private surfaceCalculator: SurfaceMovementCalculator;

  constructor(physicsManager: PhysicsManager, terrainDetector: TerrainSurfaceDetector) {
    this.physicsManager = physicsManager;
    this.terrainDetector = terrainDetector;
    this.surfaceCalculator = new SurfaceMovementCalculator();
    console.log('🚶 EnemyMovementHelper initialized with comprehensive surface movement');
  }

  public calculateEnemyMovement(
    currentPosition: THREE.Vector3,
    inputDirection: THREE.Vector3,
    config: EnemyMovementConfig,
    deltaTime: number = 0.016
  ): THREE.Vector3 {
    // Get surface data at current position
    const surfaceData = this.terrainDetector.getSurfaceDataAtPosition(currentPosition);
    
    // Use the same surface movement calculation as the player
    const movementResult = this.surfaceCalculator.calculateSurfaceMovement(
      currentPosition,
      inputDirection,
      config.speed,
      surfaceData,
      deltaTime
    );

    // Check if slope is too steep for movement
    if (surfaceData.slopeAngle > config.maxSlopeAngle && !surfaceData.isTerrainBoundary) {
      console.log(`🚶 Enemy movement blocked by steep slope: ${surfaceData.slopeAngle.toFixed(1)}°`);
      return currentPosition; // Don't move if slope is too steep
    }

    // Use physics manager for collision detection like the player does
    const checkedPosition = this.physicsManager.checkPlayerMovement(
      currentPosition,
      movementResult.newPosition,
      config.radius
    );

    console.log(`🚶 Enemy surface movement: height=${surfaceData.height.toFixed(2)}, slope=${surfaceData.slopeAngle.toFixed(1)}°, blocked=${movementResult.isBlocked}`);
    return checkedPosition;
  }

  public getTerrainHeightAtPosition(position: THREE.Vector3): number {
    return this.physicsManager.getTerrainHeightAtPosition(position);
  }

  public isPositionWalkable(position: THREE.Vector3, maxSlopeAngle: number): boolean {
    const surfaceData = this.terrainDetector.getSurfaceDataAtPosition(position);
    return surfaceData.isWalkable && surfaceData.slopeAngle <= maxSlopeAngle;
  }

  public resetStuckCounter(): void {
    this.surfaceCalculator.resetStuckCounter();
  }
}
