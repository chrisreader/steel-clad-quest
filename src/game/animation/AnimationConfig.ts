
export interface WalkAnimationConfig {
  armSwingIntensity: number;
  legSwingIntensity: number;
  walkCycleSpeed: number;
  shoulderMovement: number;
  elbowMovement: number;
  handMovement: number;
  torsoSway: number;
  breathingIntensity: number;
  sprintMultiplier: number;
  returnSpeed: number;
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
    breathingIntensity: 0.01,
    sprintMultiplier: 1.5,
    returnSpeed: 3
  },
  melee: {
    armSwingIntensity: 0.1,
    legSwingIntensity: 0.25,
    walkCycleSpeed: 3,
    shoulderMovement: 0.1,
    elbowMovement: 0.1,
    handMovement: 0.05,
    torsoSway: 0.02,
    breathingIntensity: 0.01,
    sprintMultiplier: 1.5,
    returnSpeed: 3
  },
  bow: {
    armSwingIntensity: 0.1, // Increased from 0.02 for visibility
    legSwingIntensity: 0.25, // Keep normal leg movement
    walkCycleSpeed: 3,
    shoulderMovement: 0.1, // Increased from 0.03 for visibility
    elbowMovement: 0.1, // Increased from 0.02 for visibility
    handMovement: 0.05, // Increased from 0.01 for visibility
    torsoSway: 0.02, // Standardized with other weapons
    breathingIntensity: 0.01, // Standardized with other weapons
    sprintMultiplier: 1.5,
    returnSpeed: 3
  }
};
