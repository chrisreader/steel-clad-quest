
import * as THREE from 'three';
import { PhysicsManager } from '../../engine/PhysicsManager';
import { TerrainSurfaceDetector } from '../terrain/TerrainSurfaceDetector';

export interface EnemyMovementConfig {
  speed: number;
  radius: number;
  slopeSpeedMultiplier: boolean;
  maxSlopeAngle: number;
}

export class EnemyMovementHelper {
  private physicsManager: PhysicsManager;
  private terrainDetector: TerrainSurfaceDetector;

  constructor(physicsManager: PhysicsManager, terrainDetector: TerrainSurfaceDetector) {
    this.physicsManager = physicsManager;
    this.terrainDetector = terrainDetector;
    console.log('🚶 EnemyMovementHelper initialized with terrain-aware movement');
  }

  public calculateEnemyMovement(
    currentPosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    config: EnemyMovementConfig
  ): THREE.Vector3 {
    // Get terrain data at target position
    const terrainData = this.terrainDetector.getSurfaceDataAtPosition(targetPosition);
    
    // Calculate base movement with terrain height
    let finalPosition = targetPosition.clone();
    finalPosition.y = terrainData.height + config.radius;

    // Apply slope speed adjustment if enabled
    if (config.slopeSpeedMultiplier) {
      const slopeMultiplier = this.calculateSlopeSpeedMultiplier(terrainData.slopeAngle);
      const movementDirection = new THREE.Vector3().subVectors(targetPosition, currentPosition);
      const adjustedMovement = movementDirection.multiplyScalar(slopeMultiplier);
      
      finalPosition = currentPosition.clone().add(adjustedMovement);
      finalPosition.y = terrainData.height + config.radius;
    }

    // Check if slope is too steep for movement
    if (terrainData.slopeAngle > config.maxSlopeAngle) {
      console.log(`🚶 Enemy movement blocked by steep slope: ${terrainData.slopeAngle.toFixed(1)}°`);
      return currentPosition; // Don't move if slope is too steep
    }

    // Use physics manager for collision detection
    const checkedPosition = this.physicsManager.checkPlayerMovement(
      currentPosition,
      finalPosition,
      config.radius
    );

    console.log(`🚶 Enemy terrain movement: height=${terrainData.height.toFixed(2)}, slope=${terrainData.slopeAngle.toFixed(1)}°`);
    return checkedPosition;
  }

  private calculateSlopeSpeedMultiplier(slopeAngle: number): number {
    // Same slope physics as player movement
    if (slopeAngle < 5) return 1.0; // Flat ground
    if (slopeAngle < 15) return 0.95; // Slight incline
    if (slopeAngle < 25) return 0.85; // Moderate incline  
    if (slopeAngle < 35) return 0.7; // Steep incline
    return 0.5; // Very steep (near max walkable)
  }

  public getTerrainHeightAtPosition(position: THREE.Vector3): number {
    return this.physicsManager.getTerrainHeightAtPosition(position);
  }

  public isPositionWalkable(position: THREE.Vector3, maxSlopeAngle: number): boolean {
    const surfaceData = this.terrainDetector.getSurfaceDataAtPosition(position);
    return surfaceData.isWalkable && surfaceData.slopeAngle <= maxSlopeAngle;
  }
}
