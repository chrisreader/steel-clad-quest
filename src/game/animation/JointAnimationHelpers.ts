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
      axe: 0.8,    // Reduced from 1.2 - less dramatic movement for axes
      sword: 0.6,  // Reduced from 1.0 - more controlled sword movement
      club: 0.7    // Reduced from 1.1 - less dramatic than before
    }[weaponType];

    if (attackPhase < 0.3) {
      // Windup: elbow pulls back and up (more bend = more negative) - REDUCED angles
      const t = attackPhase / 0.3;
      const windupAngle = -Math.PI * 0.25 * weaponMultiplier; // REDUCED from 0.4 to 0.25
      return THREE.MathUtils.lerp(-0.15, windupAngle, Math.sin(t * Math.PI * 0.5)); // REDUCED base from -0.2
    } else if (attackPhase < 0.6) {
      // Strike: rapid extension (less bend = less negative) - REDUCED angles
      const t = (attackPhase - 0.3) / 0.3;
      const strikeAngle = -Math.PI * 0.05 * weaponMultiplier; // REDUCED from 0.1 to 0.05
      const windupAngle = -Math.PI * 0.25 * weaponMultiplier;
      return THREE.MathUtils.lerp(windupAngle, strikeAngle, t * t); // Quadratic for rapid acceleration
    } else {
      // Recovery: controlled return to neutral - REDUCED angles
      const t = (attackPhase - 0.6) / 0.4;
      const strikeAngle = -Math.PI * 0.05 * weaponMultiplier;
      return THREE.MathUtils.lerp(strikeAngle, -0.15, Math.sin(t * Math.PI * 0.5)); // REDUCED base from -0.2
    }
  }

  /**
   * Calculate weapon wrist rotation during attacks to control weapon angle for HORIZONTAL eye-level swings
   * @param attackPhase - current phase of attack (0-1)
   * @param weaponType - type of weapon affecting movement
   */
  public static calculateWeaponWristMovement(
    attackPhase: number, 
    weaponType: 'axe' | 'sword' | 'club' = 'axe'
  ): { x: number; y: number; z: number } {
    // Different weapons require different wrist angles for horizontal swings
    // FURTHER INCREASED multipliers for EXTREME downward angles, especially for axes
    const weaponWristMultiplier = {
      axe: 2.8,    // MASSIVELY INCREASED from 2.2 - axes need EXTREME downward angle for floor-level chops
      sword: 1.2,  // Keep moderate horizontal angle for swords
      club: 2.0    // INCREASED from 1.7 - clubs also need more aggressive angle
    }[weaponType];

    if (attackPhase < 0.3) {
      // Windup: wrist tilts slightly upward to prepare for downward strike
      const t = attackPhase / 0.3;
      const windupWristX = -Math.PI * 0.1 * weaponWristMultiplier; // Slight upward tilt
      const windupWristY = -Math.PI * 0.05 * weaponWristMultiplier; // Slight inward turn
      return {
        x: THREE.MathUtils.lerp(-0.05, windupWristX, Math.sin(t * Math.PI * 0.5)),
        y: THREE.MathUtils.lerp(0, windupWristY, t),
        z: 0
      };
    } else if (attackPhase < 0.6) {
      // Strike: aggressive downward snap for floor-level horizontal swing
      const t = (attackPhase - 0.3) / 0.3;
      // Downward angle set to -0.7 as requested (approximately -126°)
      const strikeWristX = -Math.PI * 0.7 * weaponWristMultiplier; // -0.7 downward angle
      const strikeWristY = Math.PI * 0.1 * weaponWristMultiplier; // Outward snap set to 0.1
      const windupWristX = -Math.PI * 0.1 * weaponWristMultiplier;
      const windupWristY = -Math.PI * 0.05 * weaponWristMultiplier;
      
      return {
        x: THREE.MathUtils.lerp(windupWristX, strikeWristX, t * t * t * t * t), // QUINTIC for extremely sharp snap
        y: THREE.MathUtils.lerp(windupWristY, strikeWristY, t),
        z: 0
      };
    } else {
      // Recovery: return to neutral position
      const t = (attackPhase - 0.6) / 0.4;
      const strikeWristX = -Math.PI * 0.7 * weaponWristMultiplier; // Match the strike angle
      const strikeWristY = Math.PI * 0.1 * weaponWristMultiplier;
      
      return {
        x: THREE.MathUtils.lerp(strikeWristX, -0.05, Math.sin(t * Math.PI * 0.5)),
        y: THREE.MathUtils.lerp(strikeWristY, 0, t),
        z: 0
      };
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
