
import * as THREE from 'three';

export interface BodyScale {
  body: { radius: number; height: number };
  head: { radius: number };
  arm: { radius: [number, number]; length: number };
  forearm: { radius: [number, number]; length: number };
  leg: { radius: [number, number]; length: number };
  shin: { radius: [number, number]; length: number };
}

export interface BodyPositions {
  legTopY: number;
  thighCenterY: number;
  bodyY: number;
  bodyTopY: number;
  headY: number;
  shoulderHeight: number;
}

export interface NeutralPoses {
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

export interface AnimationMetrics {
  walkCycleSpeed: number;
  armSwingIntensity: number;
  legSwingIntensity: number;
  shoulderMovement: number;
  elbowMovement: number;
  breathingIntensity: number;
}

export interface EnemyBodyMetrics {
  scale: BodyScale;
  positions: BodyPositions;
  neutralPoses: NeutralPoses;
  animationMetrics: AnimationMetrics;
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
}

export class EnemyBodyMetricsCalculator {
  public static calculateOrcMetrics(): EnemyBodyMetrics {
    // Scale configuration from current EnemyBodyBuilder
    const scale: BodyScale = {
      body: { radius: 0.55, height: 1.4 },
      head: { radius: 0.5 },
      arm: { radius: [0.18, 0.22], length: 1.1 },
      forearm: { radius: [0.16, 0.18], length: 0.9 },
      leg: { radius: [0.22, 0.26], length: 0.7 },
      shin: { radius: [0.18, 0.20], length: 0.65 }
    };

    // Calculate positions based on current EnemyBodyBuilder logic
    const legTopY = 1.4;
    const thighCenterY = legTopY - scale.leg.length / 2;
    const bodyY = legTopY + scale.body.height / 2; // 1.4 + 0.7 = 2.1
    const bodyTopY = bodyY + scale.body.height / 2; // 2.1 + 0.7 = 2.8
    const headY = bodyTopY + scale.head.radius; // 2.8 + 0.5 = 3.3 (no gap)
    const shoulderHeight = bodyY + scale.body.height * 0.15; // FIXED: Lowered from 0.25 to 0.15

    const positions: BodyPositions = {
      legTopY,
      thighCenterY,
      bodyY,
      bodyTopY,
      headY,
      shoulderHeight
    };

    // FIXED: Arms pointing FORWARD/OUTWARD - corrected Z rotations for proper forward-facing orientation
    const neutralPoses: NeutralPoses = {
      arms: {
        left: { x: -0.393, y: 0, z: 0.3 }, // FIXED: Changed from -0.3 to +0.3 (forward/outward)
        right: { x: -0.393, y: 0, z: -0.3 } // FIXED: Changed from +0.3 to -0.3 (forward/outward)
      },
      elbows: {
        left: { x: 0, y: 0, z: 0 },
        right: { x: 0, y: 0, z: 0 }
      },
      wrists: {
        left: { x: 0, y: 0, z: 0 },
        right: { x: 0, y: 0, z: 0 }
      }
    };

    // Animation parameters from current EnemyAnimationSystem
    const animationMetrics: AnimationMetrics = {
      walkCycleSpeed: 2.5,
      armSwingIntensity: 0.25,
      legSwingIntensity: 0.2,
      shoulderMovement: 0.1,
      elbowMovement: 0.5,
      breathingIntensity: 0.02
    };

    // Colors from current EnemyBodyBuilder
    const colors = {
      skin: 0x4A5D23,
      muscle: 0x5D7A2A,
      accent: 0x3A4D1A
    };

    return {
      scale,
      positions,
      neutralPoses,
      animationMetrics,
      colors
    };
  }

  public static calculateGoblinMetrics(): EnemyBodyMetrics {
    // Smaller scale for goblins
    const scale: BodyScale = {
      body: { radius: 0.35, height: 1.2 },
      head: { radius: 0.35 },
      arm: { radius: [0.1, 0.12], length: 0.8 },
      forearm: { radius: [0.08, 0.10], length: 0.6 },
      leg: { radius: [0.12, 0.15], length: 0.6 },
      shin: { radius: [0.10, 0.12], length: 0.5 }
    };

    // Calculate positions for goblin proportions
    const legTopY = 1.0;
    const thighCenterY = legTopY - scale.leg.length / 2;
    const bodyY = legTopY + scale.body.height / 2;
    const bodyTopY = bodyY + scale.body.height / 2;
    const headY = bodyTopY + scale.head.radius;
    const shoulderHeight = bodyY + scale.body.height * 0.2; // FIXED: Lowered from 0.3 to 0.2

    const positions: BodyPositions = {
      legTopY,
      thighCenterY,
      bodyY,
      bodyTopY,
      headY,
      shoulderHeight
    };

    // FIXED: Goblin arms also pointing FORWARD/OUTWARD - corrected Z rotations
    const neutralPoses: NeutralPoses = {
      arms: {
        left: { x: -0.2, y: 0, z: 0.3 }, // FIXED: Changed from -0.3 to +0.3 (forward/outward)
        right: { x: -0.2, y: 0, z: -0.3 } // FIXED: Changed from +0.3 to -0.3 (forward/outward)
      },
      elbows: {
        left: { x: 0, y: 0, z: 0 },
        right: { x: 0, y: 0, z: 0 }
      },
      wrists: {
        left: { x: 0, y: 0, z: 0 },
        right: { x: 0, y: 0, z: 0 }
      }
    };

    // Faster animations for smaller goblins
    const animationMetrics: AnimationMetrics = {
      walkCycleSpeed: 3.0,
      armSwingIntensity: 0.3,
      legSwingIntensity: 0.25,
      shoulderMovement: 0.15,
      elbowMovement: 0.6,
      breathingIntensity: 0.03
    };

    const colors = {
      skin: 0x4A7C4A,
      muscle: 0x6B8E6B,
      accent: 0x3A5A3A
    };

    return {
      scale,
      positions,
      neutralPoses,
      animationMetrics,
      colors
    };
  }
}
