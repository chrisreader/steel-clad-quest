
import * as THREE from 'three';

export class JointAnimationHelpers {
  /**
   * Calculate realistic knee movement for walking gait
   * @param legPhase - 0 to 1 representing position in gait cycle
   * @param isSupporting - whether this leg is currently supporting weight
   */
  public static calculateRealisticKneeMovement(legPhase: number, isSupporting: boolean = false): number {
    // Natural walking gait has distinct phases:
    // 0.0-0.1: Heel strike (slight bend)
    // 0.1-0.4: Stance phase (straighten)
    // 0.4-0.6: Toe-off (slight bend for push)
    // 0.6-0.8: Swing phase (maximum bend)
    // 0.8-1.0: Leg extension (prepare for heel strike)
    
    if (legPhase < 0.1) {
      // Heel strike - slight flexion for impact absorption
      const t = legPhase / 0.1;
      return THREE.MathUtils.lerp(0.1, 0.05, t);
    } else if (legPhase < 0.4) {
      // Stance phase - leg straightens for weight bearing
      const t = (legPhase - 0.1) / 0.3;
      return THREE.MathUtils.lerp(0.05, 0, t);
    } else if (legPhase < 0.6) {
      // Toe-off - slight bend for power generation
      const t = (legPhase - 0.4) / 0.2;
      return THREE.MathUtils.lerp(0, 0.15, t);
    } else if (legPhase < 0.8) {
      // Swing phase - maximum knee flexion to clear ground
      const t = (legPhase - 0.6) / 0.2;
      const maxBend = isSupporting ? 0.6 : 0.8; // Supporting leg bends less
      return THREE.MathUtils.lerp(0.15, maxBend, Math.sin(t * Math.PI));
    } else {
      // Leg extension - prepare for next heel strike
      const t = (legPhase - 0.8) / 0.2;
      const maxBend = isSupporting ? 0.6 : 0.8;
      return THREE.MathUtils.lerp(maxBend, 0.1, t);
    }
  }

  /**
   * Calculate coordinated elbow movement during walking
   * @param opposingLegPhase - phase of the opposing leg (for natural coordination)
   * @param armType - 'weapon' for armed hand, 'supporting' for free hand
   * @param weaponWeight - how much the weapon affects movement (0-1)
   */
  public static calculateCoordinatedElbowMovement(
    opposingLegPhase: number, 
    armType: 'weapon' | 'supporting',
    weaponWeight: number = 0.7
  ): number {
    // Natural arm swing opposes leg movement
    // Weapon arm has different movement pattern due to weight and grip
    // FIXED: Use NEGATIVE values for natural elbow bending
    
    const baseSwing = Math.sin(opposingLegPhase * Math.PI * 2) * 0.3;
    
    if (armType === 'weapon') {
      // Weapon arm: more controlled movement, less swing due to weight
      const weightedSwing = baseSwing * (1 - weaponWeight * 0.5);
      const gripTension = Math.sin(opposingLegPhase * Math.PI * 4) * 0.1 * weaponWeight;
      // FIXED: Use negative values for natural elbow bend
      return -(Math.abs(weightedSwing + gripTension) + 0.2); // Base flexion for weapon grip
    } else {
      // Supporting arm: more natural swing for balance
      const balanceCompensation = Math.sin(opposingLegPhase * Math.PI * 2 + Math.PI) * 0.2;
      // FIXED: Use negative values for natural elbow bend
      return -(Math.abs(baseSwing + balanceCompensation) + 0.1); // Slight base flexion
    }
  }

  /**
   * Calculate combat stance knee positioning
   * @param attackPhase - current phase of attack (0-1)
   * @param stanceType - type of combat stance
   */
  public static calculateCombatStance(attackPhase: number, stanceType: 'aggressive' | 'defensive' = 'aggressive'): {
    frontKnee: number;
    backKnee: number;
  } {
    const baseStance = stanceType === 'aggressive' ? 0.3 : 0.2;
    
    if (attackPhase < 0.3) {
      // Windup: weight shifts to back leg, front leg prepares
      const t = attackPhase / 0.3;
      return {
        frontKnee: THREE.MathUtils.lerp(baseStance, 0.4, t),
        backKnee: THREE.MathUtils.lerp(baseStance, 0.5, t)
      };
    } else if (attackPhase < 0.6) {
      // Strike: power transfer from back to front
      const t = (attackPhase - 0.3) / 0.3;
      return {
        frontKnee: THREE.MathUtils.lerp(0.4, 0.2, t),
        backKnee: THREE.MathUtils.lerp(0.5, 0.3, t)
      };
    } else {
      // Recovery: return to base stance
      const t = (attackPhase - 0.6) / 0.4;
      return {
        frontKnee: THREE.MathUtils.lerp(0.2, baseStance, t),
        backKnee: THREE.MathUtils.lerp(0.3, baseStance, t)
      };
    }
  }

  /**
   * Calculate weapon-specific elbow articulation during attacks
   * @param attackPhase - current phase of attack (0-1)
   * @param weaponType - type of weapon affecting movement
   */
  public static calculateWeaponElbowMovement(
    attackPhase: number, 
    weaponType: 'axe' | 'sword' | 'club' = 'axe'
  ): number {
    // Different weapons require different elbow mechanics
    // FIXED: Use negative values for natural elbow bending
    const weaponMultiplier = {
      axe: 1.2,    // More dramatic movement for heavy weapons
      sword: 1.0,  // Standard movement
      club: 1.1    // Slightly more dramatic than sword
    }[weaponType];

    if (attackPhase < 0.3) {
      // Windup: elbow pulls back and up (more bend = more negative)
      const t = attackPhase / 0.3;
      const windupAngle = -Math.PI * 0.4 * weaponMultiplier; // NEGATIVE for natural bend
      return THREE.MathUtils.lerp(-0.2, windupAngle, Math.sin(t * Math.PI * 0.5));
    } else if (attackPhase < 0.6) {
      // Strike: rapid extension (less bend = less negative)
      const t = (attackPhase - 0.3) / 0.3;
      const strikeAngle = -Math.PI * 0.1 * weaponMultiplier; // NEGATIVE for natural bend
      const windupAngle = -Math.PI * 0.4 * weaponMultiplier;
      return THREE.MathUtils.lerp(windupAngle, strikeAngle, t * t); // Quadratic for rapid acceleration
    } else {
      // Recovery: controlled return to neutral
      const t = (attackPhase - 0.6) / 0.4;
      const strikeAngle = -Math.PI * 0.1 * weaponMultiplier;
      return THREE.MathUtils.lerp(strikeAngle, -0.2, Math.sin(t * Math.PI * 0.5));
    }
  }

  /**
   * Calculate supporting arm elbow movement during attacks for balance
   * @param attackPhase - current phase of attack (0-1)
   */
  public static calculateBalanceElbowMovement(attackPhase: number): number {
    // Supporting arm provides balance and counter-movement
    // FIXED: Use negative values for natural elbow bending
    if (attackPhase < 0.3) {
      // Windup: supporting arm extends for balance (less bend)
      const t = attackPhase / 0.3;
      return THREE.MathUtils.lerp(-0.1, -0.05, t);
    } else if (attackPhase < 0.6) {
      // Strike: supporting arm pulls in for stability (more bend)
      const t = (attackPhase - 0.3) / 0.3;
      return THREE.MathUtils.lerp(-0.05, -0.3, t);
    } else {
      // Recovery: return to neutral position
      const t = (attackPhase - 0.6) / 0.4;
      return THREE.MathUtils.lerp(-0.3, -0.1, t);
    }
  }

  /**
   * Add subtle asymmetry to movement for realism
   * @param baseValue - base animation value
   * @param characterSeed - unique seed for this character
   * @param intensity - how much asymmetry to add (0-1)
   */
  public static addAsymmetry(baseValue: number, characterSeed: number, intensity: number = 0.1): number {
    // Use character seed to create consistent but subtle variations
    const asymmetryFactor = Math.sin(characterSeed * 12.9898) * intensity;
    return baseValue * (1 + asymmetryFactor);
  }
}
