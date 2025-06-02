
import * as THREE from 'three';

export interface HumanoidAttackPhases {
  windup: number;
  slash: number;
  recovery: number;
}

export interface HumanoidAttackAnimation {
  phases: HumanoidAttackPhases;
  duration: number;
  rotationSequence: {
    start: { x: number; y: number; z: number };
    windup: { x: number; y: number; z: number };
    slash: { x: number; y: number; z: number };
  };
}

export interface HumanoidSwingAnimation {
  isActive: boolean;
  clock: THREE.Clock;
  startTime: number;
  phases: HumanoidAttackPhases;
}

export const STANDARD_HUMANOID_ATTACK: HumanoidAttackAnimation = {
  phases: {
    windup: 0.3,
    slash: 0.2,
    recovery: 0.4
  },
  duration: 0.9,
  rotationSequence: {
    // Your exact orc attack sequence as the standard for all humanoids
    start: { 
      x: THREE.MathUtils.degToRad(-22.5), 
      y: 0, 
      z: THREE.MathUtils.degToRad(-17.2) 
    },
    windup: { 
      x: THREE.MathUtils.degToRad(-60), 
      y: 0, 
      z: THREE.MathUtils.degToRad(-80) 
    },
    slash: { 
      x: THREE.MathUtils.degToRad(-52.5), 
      y: 0, 
      z: THREE.MathUtils.degToRad(50) 
    }
  }
};

export class HumanoidAttackAnimations {
  public static getStandardAttack(): HumanoidAttackAnimation {
    return STANDARD_HUMANOID_ATTACK;
  }

  public static createSwingAnimation(): HumanoidSwingAnimation {
    return {
      isActive: false,
      clock: new THREE.Clock(),
      startTime: 0,
      phases: STANDARD_HUMANOID_ATTACK.phases
    };
  }

  public static calculateAttackRotation(
    elapsed: number,
    animation: HumanoidAttackAnimation
  ): { shoulder: any; elbow: any; wrist: any; torso: number } {
    const { phases, rotationSequence } = animation;
    const { start, windup, slash } = rotationSequence;

    let shoulderRotation = { x: start.x, y: start.y, z: start.z };
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: start.x, y: 0, z: 0 };
    let torsoRotation = 0;

    if (elapsed < phases.windup) {
      // WINDUP PHASE
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(start.x, windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(start.y, windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(start.z, windup.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, Math.PI / 8, easedT);
      
      wristRotation.x = THREE.MathUtils.lerp(start.x, -Math.PI / 6, easedT);
      wristRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, -Math.PI / 12, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0, -0.2, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t);
      
      shoulderRotation.x = THREE.MathUtils.lerp(windup.x, slash.x, aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(windup.y, slash.y, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(windup.z, slash.z, aggressiveT);
      
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, 0.1, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 8, -Math.PI / 12, aggressiveT);
      
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 12, aggressiveT);
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 12, -Math.PI / 16, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 12, 0, aggressiveT);
      
      torsoRotation = THREE.MathUtils.lerp(-0.2, 0.15, aggressiveT);
      
    } else {
      // RECOVERY PHASE
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(slash.x, start.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(slash.y, start.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(slash.z, start.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 12, 0, easedT);
      
      wristRotation.x = THREE.MathUtils.lerp(Math.PI / 12, start.x, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 16, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0.15, 0, easedT);
    }

    return { shoulder: shoulderRotation, elbow: elbowRotation, wrist: wristRotation, torso: torsoRotation };
  }
}
