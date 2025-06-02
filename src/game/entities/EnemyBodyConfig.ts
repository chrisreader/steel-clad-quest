
import { EnemyType } from '../../types/GameTypes';

export interface EnemyBodyScale {
  body: { radius: number; height: number };
  head: { radius: number };
  arm: { radius: [number, number]; length: number };
  forearm: { radius: [number, number]; length: number };
  leg: { radius: [number, number]; length: number };
  shin: { radius: [number, number]; length: number };
}

export interface EnemyNeutralPose {
  armRotation: { x: number; z: number };
  legPosition: { x: number };
  shoulderOffset: number;
}

export interface EnemyAnimationParams {
  walkCycleSpeed: number;
  armSwingIntensity: number;
  legSwingIntensity: number;
  shoulderMovement: number;
  breathingIntensity: number;
  weaponArmSwingReduction: number;
}

export interface EnemyBodyConfiguration {
  type: EnemyType;
  scale: EnemyBodyScale;
  neutralPose: EnemyNeutralPose;
  animationParams: EnemyAnimationParams;
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
  stats: {
    health: number;
    speed: number;
    damage: number;
    attackRange: number;
    damageRange: number;
    attackCooldown: number;
    knockbackResistance: number;
  };
}

export const ENEMY_CONFIGURATIONS: Record<EnemyType, EnemyBodyConfiguration> = {
  [EnemyType.ORC]: {
    type: EnemyType.ORC,
    scale: {
      body: { radius: 0.55, height: 1.4 },
      head: { radius: 0.5 },
      arm: { radius: [0.18, 0.22], length: 1.1 },
      forearm: { radius: [0.16, 0.18], length: 0.9 },
      leg: { radius: [0.22, 0.26], length: 0.7 },
      shin: { radius: [0.18, 0.20], length: 0.65 }
    },
    neutralPose: {
      armRotation: { x: -0.393, z: 0.3 }, // Forward-facing combat stance
      legPosition: { x: 0.4 },
      shoulderOffset: 0.25
    },
    animationParams: {
      walkCycleSpeed: 2.5,
      armSwingIntensity: 0.25,
      legSwingIntensity: 0.2,
      shoulderMovement: 0.1,
      breathingIntensity: 0.02,
      weaponArmSwingReduction: 0.6
    },
    colors: {
      skin: 0x4A5D23,
      muscle: 0x5D7A2A,
      accent: 0x3A4D1A
    },
    stats: {
      health: 60,
      speed: 3,
      damage: 20,
      attackRange: 3.5,
      damageRange: 2.5,
      attackCooldown: 2000,
      knockbackResistance: 0.7
    }
  },
  [EnemyType.GOBLIN]: {
    type: EnemyType.GOBLIN,
    scale: {
      body: { radius: 0.35, height: 1.2 },
      head: { radius: 0.35 },
      arm: { radius: [0.1, 0.12], length: 0.8 },
      forearm: { radius: [0.08, 0.10], length: 0.6 },
      leg: { radius: [0.12, 0.15], length: 0.8 },
      shin: { radius: [0.10, 0.12], length: 0.6 }
    },
    neutralPose: {
      armRotation: { x: -0.2, z: 0.3 },
      legPosition: { x: 0.5 },
      shoulderOffset: 0.2
    },
    animationParams: {
      walkCycleSpeed: 3.0,
      armSwingIntensity: 0.3,
      legSwingIntensity: 0.25,
      shoulderMovement: 0.15,
      breathingIntensity: 0.03,
      weaponArmSwingReduction: 0.7
    },
    colors: {
      skin: 0x4A7C4A,
      muscle: 0x6B8E6B,
      accent: 0x4A7C4A
    },
    stats: {
      health: 20,
      speed: 4,
      damage: 10,
      attackRange: 2.5,
      damageRange: 1.5,
      attackCooldown: 2000,
      knockbackResistance: 1.0
    }
  }
};
