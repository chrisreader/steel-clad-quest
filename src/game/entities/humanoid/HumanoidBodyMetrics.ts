
import * as THREE from 'three';

export interface HumanoidScale {
  body: { radius: number; height: number };
  head: { radius: number };
  arm: { radius: [number, number]; length: number };
  forearm: { radius: [number, number]; length: number };
  leg: { radius: [number, number]; length: number };
  shin: { radius: [number, number]; length: number };
}

export interface HumanoidPositions {
  legTopY: number;
  thighCenterY: number;
  bodyY: number;
  bodyTopY: number;
  headY: number;
  shoulderHeight: number;
}

export interface HumanoidNeutralPoses {
  arms: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  elbows: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  wrists: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
}

export interface HumanoidAnimationMetrics {
  walkCycleSpeed: number;
  armSwingIntensity: number;
  legSwingIntensity: number;
  shoulderMovement: number;
  elbowMovement: number;
  breathingIntensity: number;
}

export interface HumanoidBodyMetrics {
  scale: HumanoidScale;
  positions: HumanoidPositions;
  neutralPoses: HumanoidNeutralPoses;
  animationMetrics: HumanoidAnimationMetrics;
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
}

export enum HumanoidType {
  ORC = 'ORC',
  GOBLIN = 'GOBLIN',
  HUMAN = 'HUMAN'
}

export class HumanoidBodyMetricsCalculator {
  public static calculateMetrics(type: HumanoidType): HumanoidBodyMetrics {
    switch (type) {
      case HumanoidType.ORC:
        return this.calculateOrcMetrics();
      case HumanoidType.GOBLIN:
        return this.calculateGoblinMetrics();
      case HumanoidType.HUMAN:
        return this.calculateHumanMetrics();
      default:
        throw new Error(`Unknown humanoid type: ${type}`);
    }
  }

  private static calculateOrcMetrics(): HumanoidBodyMetrics {
    const scale: HumanoidScale = {
      body: { radius: 0.55, height: 1.4 },
      head: { radius: 0.5 },
      arm: { radius: [0.18, 0.22], length: 1.1 },
      forearm: { radius: [0.16, 0.18], length: 0.9 },
      leg: { radius: [0.22, 0.26], length: 0.7 },
      shin: { radius: [0.18, 0.20], length: 0.65 }
    };

    const legTopY = 1.4;
    const thighCenterY = legTopY - scale.leg.length / 2;
    const bodyY = legTopY + scale.body.height / 2;
    const bodyTopY = bodyY + scale.body.height / 2;
    const headY = bodyTopY + scale.head.radius;
    const shoulderHeight = bodyTopY;

    const positions: HumanoidPositions = {
      legTopY,
      thighCenterY,
      bodyY,
      bodyTopY,
      headY,
      shoulderHeight
    };

    // Standard walking neutral pose for all humanoids
    const neutralPoses: HumanoidNeutralPoses = {
      arms: {
        left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: THREE.MathUtils.degToRad(-17.2) },
        right: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: THREE.MathUtils.degToRad(17.2) }
      },
      elbows: {
        left: { x: 0.05, y: 0, z: 0 },
        right: { x: 0.05, y: 0, z: 0 }
      },
      wrists: {
        left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: 0 },
        right: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: 0 }
      }
    };

    const animationMetrics: HumanoidAnimationMetrics = {
      walkCycleSpeed: 2.5,
      armSwingIntensity: 0.25,
      legSwingIntensity: 0.2,
      shoulderMovement: 0.1,
      elbowMovement: 0.5,
      breathingIntensity: 0.02
    };

    return {
      scale,
      positions,
      neutralPoses,
      animationMetrics,
      colors: {
        skin: 0x4A5D23,
        muscle: 0x5D7A2A,
        accent: 0x3A4D1A
      }
    };
  }

  private static calculateGoblinMetrics(): HumanoidBodyMetrics {
    const scale: HumanoidScale = {
      body: { radius: 0.35, height: 1.2 },
      head: { radius: 0.35 },
      arm: { radius: [0.1, 0.12], length: 0.8 },
      forearm: { radius: [0.08, 0.10], length: 0.6 },
      leg: { radius: [0.12, 0.15], length: 0.6 },
      shin: { radius: [0.10, 0.12], length: 0.5 }
    };

    const legTopY = 1.0;
    const thighCenterY = legTopY - scale.leg.length / 2;
    const bodyY = legTopY + scale.body.height / 2;
    const bodyTopY = bodyY + scale.body.height / 2;
    const headY = bodyTopY + scale.head.radius;
    const shoulderHeight = bodyTopY;

    const positions: HumanoidPositions = {
      legTopY,
      thighCenterY,
      bodyY,
      bodyTopY,
      headY,
      shoulderHeight
    };

    // Same standard neutral poses for consistency
    const neutralPoses: HumanoidNeutralPoses = {
      arms: {
        left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: THREE.MathUtils.degToRad(-17.2) },
        right: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: THREE.MathUtils.degToRad(17.2) }
      },
      elbows: {
        left: { x: 0.05, y: 0, z: 0 },
        right: { x: 0.05, y: 0, z: 0 }
      },
      wrists: {
        left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: 0 },
        right: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: 0 }
      }
    };

    const animationMetrics: HumanoidAnimationMetrics = {
      walkCycleSpeed: 3.0,
      armSwingIntensity: 0.3,
      legSwingIntensity: 0.25,
      shoulderMovement: 0.15,
      elbowMovement: 0.6,
      breathingIntensity: 0.03
    };

    return {
      scale,
      positions,
      neutralPoses,
      animationMetrics,
      colors: {
        skin: 0x4A7C4A,
        muscle: 0x6B8E6B,
        accent: 0x3A5A3A
      }
    };
  }

  private static calculateHumanMetrics(): HumanoidBodyMetrics {
    const scale: HumanoidScale = {
      body: { radius: 0.4, height: 1.6 },
      head: { radius: 0.4 },
      arm: { radius: [0.12, 0.15], length: 1.0 },
      forearm: { radius: [0.10, 0.12], length: 0.8 },
      leg: { radius: [0.15, 0.18], length: 0.8 },
      shin: { radius: [0.12, 0.15], length: 0.7 }
    };

    const legTopY = 1.6;
    const thighCenterY = legTopY - scale.leg.length / 2;
    const bodyY = legTopY + scale.body.height / 2;
    const bodyTopY = bodyY + scale.body.height / 2;
    const headY = bodyTopY + scale.head.radius;
    const shoulderHeight = bodyTopY;

    const positions: HumanoidPositions = {
      legTopY,
      thighCenterY,
      bodyY,
      bodyTopY,
      headY,
      shoulderHeight
    };

    // Same standard neutral poses for consistency
    const neutralPoses: HumanoidNeutralPoses = {
      arms: {
        left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: THREE.MathUtils.degToRad(-17.2) },
        right: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: THREE.MathUtils.degToRad(17.2) }
      },
      elbows: {
        left: { x: 0.05, y: 0, z: 0 },
        right: { x: 0.05, y: 0, z: 0 }
      },
      wrists: {
        left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: 0 },
        right: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: 0 }
      }
    };

    const animationMetrics: HumanoidAnimationMetrics = {
      walkCycleSpeed: 2.0,
      armSwingIntensity: 0.2,
      legSwingIntensity: 0.18,
      shoulderMovement: 0.08,
      elbowMovement: 0.4,
      breathingIntensity: 0.015
    };

    return {
      scale,
      positions,
      neutralPoses,
      animationMetrics,
      colors: {
        skin: 0xFFDBB5,
        muscle: 0xFFD1A3,
        accent: 0xE8C4A0
      }
    };
  }
}
