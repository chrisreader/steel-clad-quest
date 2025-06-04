
// Time and lighting constants
export const TIME_CONSTANTS = {
  DAY_DURATION: 120000, // 2 minutes for full day cycle
  NIGHT_START: 0.75, // Night starts at 75% of day cycle
  NIGHT_END: 0.25, // Night ends at 25% of day cycle
  TRANSITION_DURATION: 0.1 // 10% of cycle for smooth transitions
} as const;

export const LIGHTING_CONSTANTS = {
  SUN_INTENSITY: {
    DAY: 2.5,
    NIGHT: 0.1,
    TRANSITION: 0.8
  },
  MOON_INTENSITY: {
    DAY: 0.0,
    NIGHT: 0.6,
    TRANSITION: 0.3
  },
  AMBIENT_INTENSITY: {
    DAY: 0.4,
    NIGHT: 0.15,
    TRANSITION: 0.25
  }
} as const;

// Fog system constants
export const FOG_CONSTANTS = {
  NEAR_DISTANCE: 5,
  FAR_DISTANCE: 100,
  DENSITY: 0.002,
  COLOR: {
    DAY: 0x87CEEB,
    NIGHT: 0x191970,
    TRANSITION: 0x4682B4
  }
} as const;

// Animation constants
export const ANIMATION_CONSTANTS = {
  ATTACK_DURATION: 600,
  SWING_PHASES: {
    WINDUP: 0.3,
    STRIKE: 0.4,
    RECOVERY: 0.3
  },
  MOVEMENT_SPEED: {
    WALK: 5,
    RUN: 8,
    SPRINT: 12
  }
} as const;

// Combat constants
export const COMBAT_CONSTANTS = {
  DAMAGE_MULTIPLIERS: {
    CRITICAL: 2.0,
    NORMAL: 1.0,
    WEAK: 0.5
  },
  EFFECT_DURATIONS: {
    BLOOD_DECAL: 8000,
    SWORD_TRAIL: 200,
    WOUND_EFFECT: 1500
  }
} as const;

// Physics constants
export const PHYSICS_CONSTANTS = {
  GRAVITY: -9.81,
  COLLISION_RADIUS: 0.5,
  GROUND_HEIGHT: 0
} as const;
