
import * as THREE from 'three';
import { ANIMATION_CONSTANTS, PRECALCULATED } from './AnimationConstants';
import { OrcAnimationProfile } from './OrcAnimationProfile';
import { AnimationCache } from './AnimationCache';
import { logger } from '../core/Logger';
import { LOGGING_CONSTANTS, PERFORMANCE_CONSTANTS } from '../core/GameConstants';

export class OptimizedJointAnimationHelpers {
  private static animationCache = new AnimationCache();
  private static orcProfile = new OrcAnimationProfile();

  /**
   * Calculate realistic knee movement for walking gait (optimized)
   */
  public static calculateRealisticKneeMovement(legPhase: number, isSupporting: boolean = false): number {
    const cacheKey = `knee_${legPhase.toFixed(2)}_${isSupporting}`;
    const cached = this.animationCache.getCachedAnimation(cacheKey, legPhase);
    
    if (cached) {
      return cached.jointRotations.get('knee')?.x || 0;
    }

    let result: number;
    const { HEEL_STRIKE, STANCE_MIN, TOE_OFF, MAX_BEND_SUPPORTING, MAX_BEND_SWING } = ANIMATION_CONSTANTS.KNEE_MOVEMENT;

    if (legPhase < 0.1) {
      const t = legPhase / 0.1;
      result = THREE.MathUtils.lerp(HEEL_STRIKE, STANCE_MIN, t);
    } else if (legPhase < 0.4) {
      const t = (legPhase - 0.1) / 0.3;
      result = THREE.MathUtils.lerp(STANCE_MIN, 0, t);
    } else if (legPhase < 0.6) {
      const t = (legPhase - 0.4) / 0.2;
      result = THREE.MathUtils.lerp(0, TOE_OFF, t);
    } else if (legPhase < 0.8) {
      const t = (legPhase - 0.6) / 0.2;
      const maxBend = isSupporting ? MAX_BEND_SUPPORTING : MAX_BEND_SWING;
      result = THREE.MathUtils.lerp(TOE_OFF, maxBend, Math.sin(t * Math.PI));
    } else {
      const t = (legPhase - 0.8) / 0.2;
      const maxBend = isSupporting ? MAX_BEND_SUPPORTING : MAX_BEND_SWING;
      result = THREE.MathUtils.lerp(maxBend, HEEL_STRIKE, t);
    }

    // Clamp to safe range using constants
    result = THREE.MathUtils.clamp(result, PERFORMANCE_CONSTANTS.KNEE_ROTATION_LIMITS.MIN, PERFORMANCE_CONSTANTS.KNEE_ROTATION_LIMITS.MAX);

    // Cache the result
    const rotations = new Map();
    rotations.set('knee', new THREE.Euler(result, 0, 0));
    this.animationCache.cacheAnimation(cacheKey, rotations, legPhase);

    return result;
  }

  /**
   * Calculate weapon-specific elbow articulation during attacks (optimized for orcs)
   */
  public static calculateOrcWeaponElbowMovement(attackPhase: number): number {
    const multiplier = this.orcProfile.getElbowMultiplier();
    const timing = this.orcProfile.getAttackTiming();

    if (attackPhase < timing.windup) {
      const t = attackPhase / timing.windup;
      const windupAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.WINDUP_MULTIPLIER * multiplier;
      return THREE.MathUtils.lerp(ANIMATION_CONSTANTS.ELBOW_ANGLES.BASE_FLEXION, windupAngle, Math.sin(t * PRECALCULATED.PI_HALF));
    } else if (attackPhase < (timing.windup + timing.strike)) {
      const t = (attackPhase - timing.windup) / timing.strike;
      const strikeAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.STRIKE_MULTIPLIER * multiplier;
      const windupAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.WINDUP_MULTIPLIER * multiplier;
      return THREE.MathUtils.lerp(windupAngle, strikeAngle, t * t);
    } else {
      const t = (attackPhase - timing.windup - timing.strike) / timing.recovery;
      const strikeAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.STRIKE_MULTIPLIER * multiplier;
      return THREE.MathUtils.lerp(strikeAngle, ANIMATION_CONSTANTS.ELBOW_ANGLES.NATURAL_BEND, Math.sin(t * PRECALCULATED.PI_HALF));
    }
  }

  /**
   * Calculate weapon wrist rotation for orc attacks (optimized)
   */
  public static calculateOrcWeaponWristMovement(attackPhase: number): { x: number; y: number; z: number } {
    const multiplier = this.orcProfile.getWristMultiplier();
    const timing = this.orcProfile.getAttackTiming();

    if (attackPhase < timing.windup) {
      const t = attackPhase / timing.windup;
      const windupWristX = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.WINDUP_X * multiplier;
      const windupWristY = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.WINDUP_Y * multiplier;
      
      return {
        x: THREE.MathUtils.lerp(ANIMATION_CONSTANTS.WRIST_ANGLES.BASE_X, windupWristX, Math.sin(t * PRECALCULATED.PI_HALF)),
        y: THREE.MathUtils.lerp(0, windupWristY, t),
        z: 0
      };
    } else if (attackPhase < (timing.windup + timing.strike)) {
      const t = (attackPhase - timing.windup) / timing.strike;
      const strikeWristX = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.STRIKE_X * multiplier;
      const strikeWristY = Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.STRIKE_Y * multiplier;
      const windupWristX = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.WINDUP_X * multiplier;
      const windupWristY = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.WINDUP_Y * multiplier;
      
      return {
        x: THREE.MathUtils.lerp(windupWristX, strikeWristX, t * t * t * t * t), // Quintic for sharp snap
        y: THREE.MathUtils.lerp(windupWristY, strikeWristY, t),
        z: 0
      };
    } else {
      const t = (attackPhase - timing.windup - timing.strike) / timing.recovery;
      const strikeWristX = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.STRIKE_X * multiplier;
      const strikeWristY = Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.STRIKE_Y * multiplier;
      
      return {
        x: THREE.MathUtils.lerp(strikeWristX, ANIMATION_CONSTANTS.WRIST_ANGLES.BASE_X, Math.sin(t * PRECALCULATED.PI_HALF)),
        y: THREE.MathUtils.lerp(strikeWristY, 0, t),
        z: 0
      };
    }
  }

  /**
   * Update orc animation profile
   */
  public static updateOrcProfile(config: Partial<{ weaponType: 'axe' | 'sword' | 'club'; aggressionLevel: number; bodySize: 'small' | 'medium' | 'large' }>): void {
    this.orcProfile.updateConfig(config);
    logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, 'Orc animation profile updated', config);
  }

  /**
   * Clear animation cache (useful for performance optimization)
   */
  public static clearCache(): void {
    const stats = this.animationCache.getStats();
    this.animationCache.clear();
    logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, `Animation cache cleared. Previous stats:`, stats);
  }

  /**
   * Get performance statistics
   */
  public static getPerformanceStats(): { cacheStats: any } {
    return {
      cacheStats: this.animationCache.getStats()
    };
  }
}
