
import * as THREE from 'three';

export interface SwordHitboxConfig {
  size: { width: number; height: number; depth: number };
  swingArc: { startAngle: number; endAngle: number }; // in radians
  forwardDistance: number;
  heightOffset: number;
}

export interface SwordAnimationConfig {
  duration: number;
  phases: {
    windup: number;
    slash: number;
    recovery: number;
  };
  rotations: {
    neutral: { x: number; y: number; z: number };
    windup: { x: number; y: number; z: number };
    slash: { x: number; y: number; z: number };
  };
}

export interface SwordEffectsConfig {
  trailConfig: {
    maxTrailLength: number;
    tipTrackInterval: number;
  };
  swooshConfig: {
    triggerAtProgress: number;
    intensity: number;
  };
  debugConfig: {
    enabled: boolean;
    wireframeColor: number;
    opacity: number;
  };
}

// Standardized sword configuration - single source of truth
export const STANDARD_SWORD_CONFIG = {
  hitbox: {
    size: { width: 0.4, height: 0.4, depth: 2.2 },
    swingArc: { 
      startAngle: -Math.PI / 3,  // -60°
      endAngle: Math.PI / 3      // +60°
    },
    forwardDistance: 1.5,
    heightOffset: 0.5
  } as SwordHitboxConfig,

  animation: {
    duration: 0.768,
    phases: {
      windup: 0.154,   // 20%
      slash: 0.384,    // 50%
      recovery: 0.230  // 30%
    },
    rotations: {
      neutral: { x: THREE.MathUtils.degToRad(60), y: 0, z: 0 },
      windup: { 
        x: THREE.MathUtils.degToRad(65),
        y: THREE.MathUtils.degToRad(10),
        z: THREE.MathUtils.degToRad(20)
      },
      slash: { 
        x: THREE.MathUtils.degToRad(15),
        y: THREE.MathUtils.degToRad(20),
        z: THREE.MathUtils.degToRad(-20)
      }
    }
  } as SwordAnimationConfig,

  effects: {
    trailConfig: {
      maxTrailLength: 25,
      tipTrackInterval: 16
    },
    swooshConfig: {
      triggerAtProgress: 0.0,
      intensity: 1.0
    },
    debugConfig: {
      enabled: true,
      wireframeColor: 0xff0000,
      opacity: 0.8
    }
  } as SwordEffectsConfig
};
