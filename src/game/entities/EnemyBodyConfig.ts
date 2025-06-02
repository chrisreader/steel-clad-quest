
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

export interface EnemyFacialFeatures {
  eyes: {
    enabled: boolean;
    radius: number;
    color: number;
    emissiveIntensity: number;
    position: { x: number; y: number; z: number };
  };
  tusks: {
    enabled: boolean;
    radius: number;
    height: number;
    color: number;
    position: { x: number; y: number; z: number };
  };
}

export interface EnemyBodyConfiguration {
  type: EnemyType;
  scale: EnemyBodyScale;
  neutralPose: EnemyNeutralPose;
  animationParams: EnemyAnimationParams;
  facialFeatures: EnemyFacialFeatures;
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
      armRotation: { x: -0.2, z: 0.3 }, // Adjusted to match original appearance
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
    facialFeatures: {
      eyes: {
        enabled: true,
        radius: 0.08,
        color: 0xFF0000,
        emissiveIntensity: 0.3,
        position: { x: 0.15, y: 0.05, z: 0.4 }
      },
      tusks: {
        enabled: true,
        radius: 0.05,
        height: 0.25,
        color: 0xfffacd,
        position: { x: 0.15, y: -0.1, z: 0.4 }
      }
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
      armRotation: { x: -0.15, z: 0.3 }, // Adjusted to match original appearance
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
    facialFeatures: {
      eyes: {
        enabled: true,
        radius: 0.06,
        color: 0xFF0000,
        emissiveIntensity: 0.3,
        position: { x: 0.12, y: 0.04, z: 0.28 }
      },
      tusks: {
        enabled: false,
        radius: 0,
        height: 0,
        color: 0,
        position: { x: 0, y: 0, z: 0 }
      }
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
  },
  [EnemyType.SKELETON]: {
    type: EnemyType.SKELETON,
    scale: {
      body: { radius: 0.4, height: 1.3 },
      head: { radius: 0.4 },
      arm: { radius: [0.12, 0.14], length: 0.9 },
      forearm: { radius: [0.10, 0.12], length: 0.7 },
      leg: { radius: [0.14, 0.16], length: 0.9 },
      shin: { radius: [0.12, 0.14], length: 0.7 }
    },
    neutralPose: {
      armRotation: { x: -0.3, z: 0.2 },
      legPosition: { x: 0.45 },
      shoulderOffset: 0.22
    },
    animationParams: {
      walkCycleSpeed: 2.8,
      armSwingIntensity: 0.35,
      legSwingIntensity: 0.3,
      shoulderMovement: 0.12,
      breathingIntensity: 0.01,
      weaponArmSwingReduction: 0.65
    },
    facialFeatures: {
      eyes: {
        enabled: true,
        radius: 0.08,
        color: 0x00FF00,
        emissiveIntensity: 0.5,
        position: { x: 0.15, y: 0.05, z: 0.32 }
      },
      tusks: {
        enabled: false,
        radius: 0,
        height: 0,
        color: 0,
        position: { x: 0, y: 0, z: 0 }
      }
    },
    colors: {
      skin: 0xF5F5DC,
      muscle: 0xE6E6FA,
      accent: 0xDDD0C0
    },
    stats: {
      health: 30,
      speed: 3.5,
      damage: 15,
      attackRange: 3.0,
      damageRange: 2.0,
      attackCooldown: 1800,
      knockbackResistance: 0.8
    }
  },
  [EnemyType.BOSS]: {
    type: EnemyType.BOSS,
    scale: {
      body: { radius: 0.8, height: 2.0 },
      head: { radius: 0.7 },
      arm: { radius: [0.25, 0.3], length: 1.5 },
      forearm: { radius: [0.22, 0.25], length: 1.2 },
      leg: { radius: [0.3, 0.35], length: 1.0 },
      shin: { radius: [0.25, 0.28], length: 0.9 }
    },
    neutralPose: {
      armRotation: { x: -0.5, z: 0.4 },
      legPosition: { x: 0.35 },
      shoulderOffset: 0.3
    },
    animationParams: {
      walkCycleSpeed: 2.0,
      armSwingIntensity: 0.2,
      legSwingIntensity: 0.15,
      shoulderMovement: 0.08,
      breathingIntensity: 0.025,
      weaponArmSwingReduction: 0.5
    },
    facialFeatures: {
      eyes: {
        enabled: true,
        radius: 0.12,
        color: 0xFF0000,
        emissiveIntensity: 0.4,
        position: { x: 0.25, y: 0.1, z: 0.56 }
      },
      tusks: {
        enabled: true,
        radius: 0.08,
        height: 0.4,
        color: 0xfffacd,
        position: { x: 0.25, y: -0.2, z: 0.56 }
      }
    },
    colors: {
      skin: 0x2F1B14,
      muscle: 0x8B0000,
      accent: 0x654321
    },
    stats: {
      health: 200,
      speed: 2,
      damage: 50,
      attackRange: 5.0,
      damageRange: 3.5,
      attackCooldown: 3000,
      knockbackResistance: 0.3
    }
  }
};
