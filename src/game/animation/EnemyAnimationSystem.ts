
import * as THREE from 'three';
import { EnemyBodyParts } from '../entities/EnemyBody';
import { EnemyBodyMetrics } from '../entities/EnemyBodyMetrics';
import { HumanoidAnimationSystem } from './humanoid/HumanoidAnimationSystem';
import { HumanoidBodyParts } from '../entities/humanoid/HumanoidBody';
import { HumanoidBodyMetrics } from '../entities/humanoid/HumanoidBodyMetrics';

export interface EnemySwingAnimation {
  isActive: boolean;
  clock: THREE.Clock;
  startTime: number;
  phases: {
    windup: number;
    slash: number;
    recovery: number;
  };
}

export class EnemyAnimationSystem extends HumanoidAnimationSystem {
  // Legacy support for old enemy body parts interface
  private legacyBodyParts: EnemyBodyParts | null = null;
  private legacyMetrics: EnemyBodyMetrics | null = null;
  
  constructor(bodyParts: EnemyBodyParts | HumanoidBodyParts, metrics: EnemyBodyMetrics | HumanoidBodyMetrics) {
    // Convert legacy interfaces to humanoid interfaces if needed
    if (this.isLegacyInterface(bodyParts, metrics)) {
      this.legacyBodyParts = bodyParts as EnemyBodyParts;
      this.legacyMetrics = metrics as EnemyBodyMetrics;
      
      // Convert to humanoid interface for base class
      const humanoidBodyParts = this.convertToHumanoidBodyParts(bodyParts as EnemyBodyParts);
      const humanoidMetrics = this.convertToHumanoidMetrics(metrics as EnemyBodyMetrics);
      
      super(humanoidBodyParts, humanoidMetrics);
      console.log(`🎭 [EnemyAnimationSystem] Initialized with legacy interface conversion to humanoid base`);
    } else {
      // Already humanoid interface
      super(bodyParts as HumanoidBodyParts, metrics as HumanoidBodyMetrics);
      console.log(`🎭 [EnemyAnimationSystem] Initialized with native humanoid interface`);
    }
  }
  
  private isLegacyInterface(bodyParts: any, metrics: any): boolean {
    // Check if this uses the old EnemyBodyParts interface
    return 'leftElbow' in bodyParts && 'neutralPoses' in metrics;
  }
  
  private convertToHumanoidBodyParts(legacyParts: EnemyBodyParts): HumanoidBodyParts {
    // Convert legacy EnemyBodyParts to HumanoidBodyParts
    return {
      body: legacyParts.body,
      head: legacyParts.head,
      leftArm: legacyParts.leftArm,
      rightArm: legacyParts.rightArm,
      leftElbow: legacyParts.leftElbow,
      rightElbow: legacyParts.rightElbow,
      leftWrist: legacyParts.leftWrist,
      rightWrist: legacyParts.rightWrist,
      leftLeg: legacyParts.leftLeg,
      rightLeg: legacyParts.rightLeg,
      leftKnee: legacyParts.leftKnee,
      rightKnee: legacyParts.rightKnee,
      weapon: legacyParts.weapon,
      hitBox: legacyParts.hitBox
    };
  }
  
  private convertToHumanoidMetrics(legacyMetrics: EnemyBodyMetrics): HumanoidBodyMetrics {
    // Convert legacy EnemyBodyMetrics to HumanoidBodyMetrics
    return {
      scale: {
        body: legacyMetrics.scale.body,
        head: legacyMetrics.scale.head,
        arm: legacyMetrics.scale.arm,
        forearm: legacyMetrics.scale.forearm,
        leg: legacyMetrics.scale.leg,
        shin: legacyMetrics.scale.shin
      },
      positions: {
        legTopY: legacyMetrics.positions.legTopY,
        thighCenterY: legacyMetrics.positions.thighCenterY,
        bodyY: legacyMetrics.positions.bodyY,
        bodyTopY: legacyMetrics.positions.bodyTopY,
        headY: legacyMetrics.positions.headY,
        shoulderHeight: legacyMetrics.positions.shoulderHeight
      },
      neutralPoses: {
        arms: legacyMetrics.neutralPoses.arms,
        elbows: legacyMetrics.neutralPoses.elbows,
        wrists: legacyMetrics.neutralPoses.wrists
      },
      animationMetrics: {
        walkCycleSpeed: legacyMetrics.animationMetrics.walkCycleSpeed,
        armSwingIntensity: legacyMetrics.animationMetrics.armSwingIntensity,
        legSwingIntensity: legacyMetrics.animationMetrics.legSwingIntensity,
        shoulderMovement: legacyMetrics.animationMetrics.shoulderMovement,
        elbowMovement: legacyMetrics.animationMetrics.elbowMovement,
        breathingIntensity: legacyMetrics.animationMetrics.breathingIntensity
      },
      colors: legacyMetrics.colors
    };
  }
  
  // Legacy method names for backwards compatibility
  public updateWalkAnimation(deltaTime: number, isMoving: boolean, movementSpeed: number): void {
    // Delegate to parent humanoid animation system
    super.updateWalkAnimation(deltaTime, isMoving, movementSpeed);
  }
  
  public startAttackAnimation(): void {
    // Delegate to parent humanoid animation system
    super.startAttackAnimation();
    console.log("🗡️ [EnemyAnimationSystem] Legacy wrapper: started humanoid attack animation");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    // Delegate to parent humanoid animation system
    return super.updateAttackAnimation(deltaTime);
  }
  
  // Legacy getters for backwards compatibility
  public getSwingPhase(): 'windup' | 'slash' | 'recovery' | 'idle' {
    return super.getSwingPhase();
  }
  
  public getAttackProgress(): number {
    return super.getAttackProgress();
  }
  
  public isAttacking(): boolean {
    return super.isAttacking();
  }
}
