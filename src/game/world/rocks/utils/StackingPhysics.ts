
import * as THREE from 'three';
import { ClusterRole, RockCategory } from '../types/RockTypes';

export class StackingPhysics {
  /**
   * Calculate realistic stacking position with contact physics
   */
  public static calculateRealisticStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: ClusterRole,
    category: RockCategory
  ): THREE.Vector3 {
    const stackedPosition = basePosition.clone();

    switch (role) {
      case 'foundation':
        // Foundation rocks are embedded at ground level
        stackedPosition.y = rockSize * 0.15; // Slight embedding
        break;

      case 'support':
        // Support rocks lean against foundation with contact physics
        const leanOffset = this.calculateLeanOffset(baseSize, rockSize);
        stackedPosition.add(leanOffset);
        stackedPosition.y = baseSize * 0.3 + rockSize * 0.4; // Contact point
        break;

      case 'accent':
        // Accent rocks sit on top or in gaps
        const gapOffset = this.calculateGapOffset(baseSize, rockSize, category);
        stackedPosition.add(gapOffset);
        stackedPosition.y = baseSize * 0.8 + rockSize * 0.5; // Top placement
        break;
    }

    // Add natural jitter for realistic feel
    this.addNaturalJitter(stackedPosition, rockSize);

    return stackedPosition;
  }

  /**
   * Calculate lean offset for support rocks
   */
  private static calculateLeanOffset(baseSize: number, rockSize: number): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = (baseSize + rockSize) * 0.6; // Contact distance

    return new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
  }

  /**
   * Calculate gap offset for accent rocks
   */
  private static calculateGapOffset(
    baseSize: number, 
    rockSize: number, 
    category: RockCategory
  ): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    let distance: number;

    switch (category) {
      case 'massive':
        distance = baseSize * (0.3 + Math.random() * 0.4);
        break;
      case 'large':
        distance = baseSize * (0.4 + Math.random() * 0.5);
        break;
      default:
        distance = baseSize * (0.5 + Math.random() * 0.6);
    }

    return new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
  }

  /**
   * Add natural jitter for realistic positioning
   */
  private static addNaturalJitter(position: THREE.Vector3, rockSize: number): void {
    const jitterAmount = rockSize * 0.1;
    
    position.x += (Math.random() - 0.5) * jitterAmount;
    position.y += (Math.random() - 0.5) * jitterAmount * 0.5;
    position.z += (Math.random() - 0.5) * jitterAmount;
  }

  /**
   * Check for collision with existing rocks
   */
  public static checkCollision(
    position: THREE.Vector3,
    size: number,
    existingRocks: Array<{ position: THREE.Vector3; size: number }>
  ): boolean {
    for (const rock of existingRocks) {
      const distance = position.distanceTo(rock.position);
      const minDistance = (size + rock.size) * 0.8; // Allow some overlap for realism

      if (distance < minDistance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find stable placement avoiding overlaps
   */
  public static findStablePlacement(
    basePosition: THREE.Vector3,
    rockSize: number,
    role: ClusterRole,
    existingRocks: Array<{ position: THREE.Vector3; size: number }>,
    maxAttempts: number = 10
  ): THREE.Vector3 | null {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const testPosition = this.calculateRealisticStackingPosition(
        basePosition,
        rockSize,
        rockSize, // Use rockSize as baseSize for simplicity
        role,
        'medium' // Default category
      );

      if (!this.checkCollision(testPosition, rockSize, existingRocks)) {
        return testPosition;
      }

      // Adjust position for next attempt
      const adjustmentAngle = (attempt / maxAttempts) * Math.PI * 2;
      const adjustmentDistance = rockSize * (1 + attempt * 0.2);
      basePosition.x += Math.cos(adjustmentAngle) * adjustmentDistance;
      basePosition.z += Math.sin(adjustmentAngle) * adjustmentDistance;
    }

    return null; // Failed to find stable placement
  }
}
