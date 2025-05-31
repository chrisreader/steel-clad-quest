
export interface WalkAnimationConfig {
  armSwingIntensity: number;
  legSwingIntensity: number;
  walkCycleSpeed: number;
  shoulderMovement: number;
  elbowMovement: number;
  handMovement: number;
  torsoSway: number;
  breathingIntensity: number;
}

export interface WeaponAnimationConfigs {
  emptyHands: WalkAnimationConfig;
  melee: WalkAnimationConfig;
  bow: WalkAnimationConfig;
}

export const ANIMATION_CONFIGS: WeaponAnimationConfigs = {
  emptyHands: {
    armSwingIntensity: 0.1,
    legSwingIntensity: 0.25,
    walkCycleSpeed: 3,
    shoulderMovement: 0.1,
    elbowMovement: 0.1,
    handMovement: 0.05,
    torsoSway: 0.02,
    breathingIntensity: 0.01
  },
  melee: {
    armSwingIntensity: 0.08,
    legSwingIntensity: 0.25,
    walkCycleSpeed: 3,
    shoulderMovement: 0.08,
    elbowMovement: 0.08,
    handMovement: 0.03,
    torsoSway: 0.015,
    breathingIntensity: 0.008
  },
  bow: {
    armSwingIntensity: 0.02, // Minimal arm swing
    legSwingIntensity: 0.25, // Normal leg movement
    walkCycleSpeed: 3,
    shoulderMovement: 0.03, // Subtle shoulder movement
    elbowMovement: 0.02, // Minimal elbow movement
    handMovement: 0.01, // Very subtle hand movement
    torsoSway: 0.025, // Slight natural sway
    breathingIntensity: 0.015 // Breathing for realism
  }
};
