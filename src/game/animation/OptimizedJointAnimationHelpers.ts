import * as THREE from 'three';
import { ANIMATION_CONSTANTS, PRECALCULATED } from './AnimationConstants';
import { OrcAnimationProfile } from './OrcAnimationProfile';
import { AnimationCache } from './AnimationCache';
import { logger } from '../core/Logger';
import { LOGGING_CONSTANTS, PERFORMANCE_CONSTANTS } from '../core/GameConstants';

export class OptimizedJointAnimationHelpers {
  private static animationCache = new AnimationCache();
  private static orcProfile = new OrcAnimationProfile();
  private static updateCounter: number = 0;
  private static readonly CACHE_OPTIMIZATION_INTERVAL: number = 100; // Optimize cache every 100 calls

  /**
   * Calculate realistic knee movement for walking gait (heavily optimized)
   */
  public static calculateRealisticKneeMovement(legPhase: number, isSupporting: boolean = false): number {
    // Increase cache tolerance for better hit rates
    const cacheKey = `knee_${(legPhase * 20).toFixed(0)}_${isSupporting}`;
    const cached = this.animationCache.getCachedAnimation(cacheKey, legPhase, 0.05);
    
    if (cached) {
      return cached.jointRotations.get('knee')?.x || 0;
    }

    let result: number;
    const { HEEL_STRIKE, STANCE_MIN, TOE_OFF, MAX_BEND_SUPPORTING, MAX_BEND_SWING } = ANIMATION_CONSTANTS.KNEE_MOVEMENT;

    // Optimized calculation with fewer branches
    if (legPhase < 0.4) {
      const t = legPhase < 0.1 ? legPhase / 0.1 : (legPhase - 0.1) / 0.3;
      const startVal = legPhase < 0.1 ? HEEL_STRIKE : STANCE_MIN;
      const endVal = legPhase < 0.1 ? STANCE_MIN : 0;
      result = THREE.MathUtils.lerp(startVal, endVal, t);
    } else if (legPhase < 0.8) {
      const t = legPhase < 0.6 ? (legPhase - 0.4) / 0.2 : (legPhase - 0.6) / 0.2;
      if (legPhase < 0.6) {
        result = THREE.MathUtils.lerp(0, TOE_OFF, t);
      } else {
        const maxBend = isSupporting ? MAX_BEND_SUPPORTING : MAX_BEND_SWING;
        result = THREE.MathUtils.lerp(TOE_OFF, maxBend, Math.sin(t * Math.PI));
      }
    } else {
      const t = (legPhase - 0.8) / 0.2;
      const maxBend = isSupporting ? MAX_BEND_SUPPORTING : MAX_BEND_SWING;
      result = THREE.MathUtils.lerp(maxBend, HEEL_STRIKE, t);
    }

    result = THREE.MathUtils.clamp(result, PERFORMANCE_CONSTANTS.KNEE_ROTATION_LIMITS.MIN, PERFORMANCE_CONSTANTS.KNEE_ROTATION_LIMITS.MAX);

    // Cache with improved key for better reuse
    const rotations = new Map();
    rotations.set('knee', new THREE.Euler(result, 0, 0));
    this.animationCache.cacheAnimation(cacheKey, rotations, legPhase);

    return result;
  }

  /**
   * Calculate weapon-specific elbow articulation (optimized for performance)
   */
  public static calculateOrcWeaponElbowMovement(attackPhase: number): number {
    this.updateCounter++;
    
    // Use cached multipliers to avoid repeated profile access
    const multiplier = this.orcProfile.getElbowMultiplier();
    const timing = this.orcProfile.getAttackTiming();

    // Pre-calculate common values
    const windupThreshold = timing.windup;
    const strikeThreshold = timing.windup + timing.strike;

    if (attackPhase < windupThreshold) {
      const t = attackPhase / windupThreshold;
      const windupAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.WINDUP_MULTIPLIER * multiplier;
      return THREE.MathUtils.lerp(ANIMATION_CONSTANTS.ELBOW_ANGLES.BASE_FLEXION, windupAngle, Math.sin(t * PRECALCULATED.PI_HALF));
    } else if (attackPhase < strikeThreshold) {
      const t = (attackPhase - windupThreshold) / timing.strike;
      const strikeAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.STRIKE_MULTIPLIER * multiplier;
      const windupAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.WINDUP_MULTIPLIER * multiplier;
      return THREE.MathUtils.lerp(windupAngle, strikeAngle, t * t);
    } else {
      const t = (attackPhase - strikeThreshold) / timing.recovery;
      const strikeAngle = -Math.PI * ANIMATION_CONSTANTS.ELBOW_ANGLES.STRIKE_MULTIPLIER * multiplier;
      return THREE.MathUtils.lerp(strikeAngle, ANIMATION_CONSTANTS.ELBOW_ANGLES.NATURAL_BEND, Math.sin(t * PRECALCULATED.PI_HALF));
    }
  }

  /**
   * Calculate weapon wrist rotation (optimized with reduced precision)
   */
  public static calculateOrcWeaponWristMovement(attackPhase: number): { x: number; y: number; z: number } {
    const multiplier = this.orcProfile.getWristMultiplier();
    const timing = this.orcProfile.getAttackTiming();

    // Pre-calculate angle multipliers
    const windupX = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.WINDUP_X * multiplier;
    const windupY = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.WINDUP_Y * multiplier;
    const strikeX = -Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.STRIKE_X * multiplier;
    const strikeY = Math.PI * ANIMATION_CONSTANTS.WRIST_ANGLES.STRIKE_Y * multiplier;

    if (attackPhase < timing.windup) {
      const t = attackPhase / timing.windup;
      return {
        x: THREE.MathUtils.lerp(ANIMATION_CONSTANTS.WRIST_ANGLES.BASE_X, windupX, Math.sin(t * PRECALCULATED.PI_HALF)),
        y: THREE.MathUtils.lerp(0, windupY, t),
        z: 0
      };
    } else if (attackPhase < (timing.windup + timing.strike)) {
      const t = (attackPhase - timing.windup) / timing.strike;
      const t5 = t * t * t * t * t; // Pre-calculate quintic
      
      return {
        x: THREE.MathUtils.lerp(windupX, strikeX, t5),
        y: THREE.MathUtils.lerp(windupY, strikeY, t),
        z: 0
      };
    } else {
      const t = (attackPhase - timing.windup - timing.strike) / timing.recovery;
      
      return {
        x: THREE.MathUtils.lerp(strikeX, ANIMATION_CONSTANTS.WRIST_ANGLES.BASE_X, Math.sin(t * PRECALCULATED.PI_HALF)),
        y: THREE.MathUtils.lerp(strikeY, 0, t),
        z: 0
      };
    }
  }

  /**
   * Optimized cache management
   */
  private static optimizeCache(): void {
    if (this.updateCounter % this.CACHE_OPTIMIZATION_INTERVAL === 0) {
      // Periodically optimize cache for better performance
      const stats = this.animationCache.getStats();
      if (stats.size > PERFORMANCE_CONSTANTS.ANIMATION_CACHE_SIZE * 0.8) {
        // Cache is getting full, clear some old entries
        this.animationCache.clear();
        logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, 'Animation cache optimized for performance');
      }
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
