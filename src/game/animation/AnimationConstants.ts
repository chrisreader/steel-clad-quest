
import * as THREE from 'three';

export const ANIMATION_CONSTANTS = {
  // Walking animation parameters
  WALK_CYCLE: {
    SPEED: 2.5,
    ARM_SWING_INTENSITY: 0.25,
    LEG_SWING_INTENSITY: 0.2,
    SHOULDER_MOVEMENT: 0.1,
    ELBOW_MOVEMENT: 0.5,
    BREATHING_INTENSITY: 0.02
  },

  // Combat animation phases
  COMBAT_PHASES: {
    WINDUP_DURATION: 0.3,
    STRIKE_DURATION: 0.3,
    RECOVERY_DURATION: 0.4
  },

  // Weapon-specific multipliers
  WEAPON_MULTIPLIERS: {
    AXE: 0.6,
    SWORD: 0.4,
    CLUB: 0.5
  },

  // Elbow animation angles (in radians)
  ELBOW_ANGLES: {
    BASE_FLEXION: -0.1,
    WINDUP_MULTIPLIER: 0.15,
    STRIKE_MULTIPLIER: 0.03,
    NATURAL_BEND: -0.1
  },

  // Wrist animation angles (in radians)
  WRIST_ANGLES: {
    WINDUP_X: 0.1,
    WINDUP_Y: 0.05,
    STRIKE_X: 0.7,
    STRIKE_Y: 0.1,
    BASE_X: -0.05
  },

  // Knee movement parameters
  KNEE_MOVEMENT: {
    HEEL_STRIKE: 0.1,
    STANCE_MIN: 0.05,
    TOE_OFF: 0.15,
    MAX_BEND_SUPPORTING: 0.6,
    MAX_BEND_SWING: 0.8
  },

  // Animation timing
  TIMING: {
    HIT_FEEDBACK_DURATION: 300,
    KNOCKBACK_DURATION: 300,
    STUN_DURATION: 150,
    ROTATION_SPEED: 3.0
  }
};

// Pre-calculated common values
export const PRECALCULATED = {
  PI_HALF: Math.PI * 0.5,
  PI_QUARTER: Math.PI * 0.25,
  RADIANS_TO_DEGREES: 180 / Math.PI,
  DEGREES_TO_RADIANS: Math.PI / 180
};
