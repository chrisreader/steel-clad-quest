
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
    console.log(`🚶 [EnemyMovementHelper] TERRAIN-AWARE movement calculation from (${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)}) to (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
    
    // Get terrain data at target position
    const terrainData = this.terrainDetector.getSurfaceDataAtPosition(targetPosition);
    
    // CRITICAL: Always ensure we have valid terrain height
    let terrainHeight = terrainData.height;
    if (terrainHeight === undefined || terrainHeight === null || isNaN(terrainHeight)) {
      console.log(`⚠️ [EnemyMovementHelper] Invalid terrain height detected, using physics manager fallback`);
      terrainHeight = this.physicsManager.getTerrainHeightAtPosition(targetPosition);
    }
    
    console.log(`🚶 [EnemyMovementHelper] Terrain height at target: ${terrainHeight.toFixed(2)}, slope: ${terrainData.slopeAngle.toFixed(1)}°`);
    
    // Calculate base movement with terrain height
    let finalPosition = targetPosition.clone();
    finalPosition.y = terrainHeight + config.radius;

    // Apply slope speed adjustment if enabled
    if (config.slopeSpeedMultiplier) {
      const slopeMultiplier = this.calculateSlopeSpeedMultiplier(terrainData.slopeAngle);
      const movementDirection = new THREE.Vector3().subVectors(targetPosition, currentPosition);
      const adjustedMovement = movementDirection.multiplyScalar(slopeMultiplier);
      
      finalPosition = currentPosition.clone().add(adjustedMovement);
      finalPosition.y = terrainHeight + config.radius; // ALWAYS apply terrain height
      console.log(`🚶 [EnemyMovementHelper] Slope speed adjustment applied: ${slopeMultiplier.toFixed(2)}`);
    }

    // Check if slope is too steep for movement
    if (terrainData.slopeAngle > config.maxSlopeAngle) {
      console.log(`🚶 Enemy movement blocked by steep slope: ${terrainData.slopeAngle.toFixed(1)}°`);
      // Even when blocked, ensure we're on terrain surface
      const blockedPosition = currentPosition.clone();
      const currentTerrainHeight = this.physicsManager.getTerrainHeightAtPosition(currentPosition);
      blockedPosition.y = currentTerrainHeight + config.radius;
      return blockedPosition;
    }

    // CRITICAL: Use dedicated enemy terrain movement for smooth terrain following
    console.log(`🚶 [EnemyMovementHelper] Using dedicated enemy terrain movement (smooth terrain following)`);
    const checkedPosition = this.physicsManager.checkEnemyTerrainMovement(
      currentPosition,
      finalPosition,
      config.radius
    );

    // PHASE 3: Enhanced position validation
    if (checkedPosition.y <= config.radius) {
      console.warn(`⚠️ [EnemyMovementHelper] Position Y too low (${checkedPosition.y.toFixed(2)}), applying terrain height correction`);
      const correctedHeight = this.physicsManager.getTerrainHeightAtPosition(checkedPosition);
      checkedPosition.y = correctedHeight + config.radius;
    }

    // PHASE 3: Additional validation to ensure enemy follows terrain exactly like player
    const finalTerrainHeight = this.physicsManager.getTerrainHeightAtPosition(checkedPosition);
    const expectedY = finalTerrainHeight + config.radius;
    
    if (Math.abs(checkedPosition.y - expectedY) > 0.1) {
      console.warn(`⚠️ [EnemyMovementHelper] Y position mismatch detected - correcting from ${checkedPosition.y.toFixed(2)} to ${expectedY.toFixed(2)}`);
      checkedPosition.y = expectedY;
    }

    console.log(`✅ [EnemyMovementHelper] Final movement result: terrain_height=${finalTerrainHeight.toFixed(2)}, slope=${terrainData.slopeAngle.toFixed(1)}°, final_pos=(${checkedPosition.x.toFixed(2)}, ${checkedPosition.y.toFixed(2)}, ${checkedPosition.z.toFixed(2)})`);
    
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

  // NEW: Ensure terrain height is always applied to any position
  public ensureTerrainHeight(position: THREE.Vector3, radius: number): THREE.Vector3 {
    const correctedPosition = position.clone();
    const terrainHeight = this.physicsManager.getTerrainHeightAtPosition(position);
    correctedPosition.y = terrainHeight + radius;
    
    console.log(`🚶 [EnemyMovementHelper] Terrain height correction: original_y=${position.y.toFixed(2)}, terrain_height=${terrainHeight.toFixed(2)}, corrected_y=${correctedPosition.y.toFixed(2)}`);
    return correctedPosition;
  }
}
