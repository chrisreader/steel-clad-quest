
import * as THREE from 'three';

export interface StandardSwordAnimationConfig {
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

// Standardized sword animation configuration that all swords will use
export const STANDARD_SWORD_ANIMATION: StandardSwordAnimationConfig = {
  duration: 0.768, // Standard duration for all swords
  phases: {
    windup: 0.154,   // 20% of total duration
    slash: 0.384,    // 50% of total duration
    recovery: 0.230  // 30% of total duration
  },
  rotations: {
    neutral: { x: THREE.MathUtils.degToRad(60), y: 0, z: 0 }, // 60° ready position
    windup: { 
      x: THREE.MathUtils.degToRad(65),           // 65° move to right side
      y: THREE.MathUtils.degToRad(10),           // 10° right side position
      z: THREE.MathUtils.degToRad(20)            // 20° twist for power buildup
    },
    slash: { 
      x: THREE.MathUtils.degToRad(15),           // 15° end position
      y: THREE.MathUtils.degToRad(20),           // 20° moderate sweep to left
      z: THREE.MathUtils.degToRad(-20)           // -20° counter-twist for dynamic slash
    }
  }
};
