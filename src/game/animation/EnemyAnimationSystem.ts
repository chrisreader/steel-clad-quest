
import * as THREE from 'three';
import { EnemyBodyParts } from '../entities/EnemyBody';
import { EnemyBodyMetrics } from '../entities/EnemyBodyMetrics';
import { STANDARD_SWORD_ANIMATION } from './StandardSwordAnimation';

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

export class EnemyAnimationSystem {
  private bodyParts: EnemyBodyParts;
  private metrics: EnemyBodyMetrics;
  private walkTime: number = 0;
  private idleTime: number = 0;
  private swingAnimation: EnemySwingAnimation | null = null;
  
  constructor(bodyParts: EnemyBodyParts, metrics: EnemyBodyMetrics) {
    this.bodyParts = bodyParts;
    this.metrics = metrics;
    
    console.log(`🎭 [EnemyAnimationSystem] Initialized with preserved functionality`);
  }
  
  public updateWalkAnimation(deltaTime: number, isMoving: boolean, movementSpeed: number): void {
    if (!isMoving) {
      this.updateIdleAnimation(deltaTime);
      return;
    }
    
    this.walkTime += deltaTime * movementSpeed * this.metrics.animationMetrics.walkCycleSpeed;
    
    const armSwing = Math.sin(this.walkTime) * this.metrics.animationMetrics.armSwingIntensity;
    const legSwing = Math.sin(this.walkTime + Math.PI) * this.metrics.animationMetrics.legSwingIntensity;
    const shoulderSway = Math.sin(this.walkTime * 0.5) * this.metrics.animationMetrics.shoulderMovement;
    
    if (this.bodyParts.body) {
      const walkingBob = Math.sin(this.walkTime * 2) * 0.05;
      this.bodyParts.body.position.y = this.metrics.positions.bodyY + walkingBob;
    }
    
    const isAttacking = this.swingAnimation?.isActive || false;
    
    if (this.bodyParts.leftArm && this.bodyParts.rightArm && !isAttacking) {
      const leftNeutral = this.metrics.neutralPoses.arms.left;
      const weaponArmSwing = armSwing * 0.6;
      this.bodyParts.leftArm.rotation.x = leftNeutral.x + weaponArmSwing;
      this.bodyParts.leftArm.rotation.z = leftNeutral.z + shoulderSway;
      
      if (this.bodyParts.leftElbow) {
        this.bodyParts.leftElbow.rotation.x = -Math.abs(weaponArmSwing) * (this.metrics.animationMetrics.elbowMovement * 0.4);
      }
      if (this.bodyParts.leftWrist) {
        this.bodyParts.leftWrist.rotation.x = -weaponArmSwing * 0.2;
      }
      
      const rightNeutral = this.metrics.neutralPoses.arms.right;
      this.bodyParts.rightArm.rotation.x = rightNeutral.x + armSwing;
      this.bodyParts.rightArm.rotation.z = rightNeutral.z - shoulderSway;
      
      if (this.bodyParts.rightElbow) {
        this.bodyParts.rightElbow.rotation.x = -Math.abs(armSwing) * this.metrics.animationMetrics.elbowMovement;
      }
      if (this.bodyParts.rightWrist) {
        this.bodyParts.rightWrist.rotation.x = armSwing * 0.3;
      }
    }
    
    if (this.bodyParts.leftLeg && this.bodyParts.rightLeg) {
      this.bodyParts.leftLeg.rotation.x = legSwing;
      this.bodyParts.rightLeg.rotation.x = -legSwing;
      
      if (this.bodyParts.leftKnee) {
        this.bodyParts.leftKnee.rotation.x = Math.max(0, legSwing) * 0.8;
      }
      if (this.bodyParts.rightKnee) {
        this.bodyParts.rightKnee.rotation.x = Math.max(0, -legSwing) * 0.8;
      }
    }
  }
  
  private updateIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;
    
    if (this.bodyParts.body) {
      const breathingOffset = Math.sin(this.idleTime * 4) * this.metrics.animationMetrics.breathingIntensity;
      this.bodyParts.body.position.y = this.metrics.positions.bodyY + breathingOffset;
    }
    
    if (this.bodyParts.weapon) {
      const baseRotation = -0.3;
      this.bodyParts.weapon.rotation.z = baseRotation + Math.sin(this.idleTime * 2) * 0.1;
    }
    
    const isAttacking = this.swingAnimation?.isActive || false;
    const returnSpeed = deltaTime * 2;
    
    if (this.bodyParts.leftArm && this.bodyParts.rightArm && !isAttacking) {
      const leftNeutral = this.metrics.neutralPoses.arms.left;
      const rightNeutral = this.metrics.neutralPoses.arms.right;
      
      this.bodyParts.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.leftArm.rotation.x, leftNeutral.x, returnSpeed
      );
      this.bodyParts.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.rightArm.rotation.x, rightNeutral.x, returnSpeed
      );
    }
  }
  
  public startAttackAnimation(): void {
    if (this.swingAnimation && this.swingAnimation.isActive) {
      console.log("🗡️ [EnemyAnimationSystem] Attack animation already active, ignoring new request");
      return;
    }
    
    this.swingAnimation = {
      isActive: true,
      clock: new THREE.Clock(),
      startTime: 0,
      phases: STANDARD_SWORD_ANIMATION.phases
    };
    
    this.swingAnimation.clock.start();
    this.swingAnimation.startTime = this.swingAnimation.clock.getElapsedTime();
    
    console.log("🗡️ [EnemyAnimationSystem] Started attack animation with preserved flow");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { phases, duration } = STANDARD_SWORD_ANIMATION;
    
    const walkingNeutralX = THREE.MathUtils.degToRad(-22.5);
    const walkingNeutralY = 0;
    const walkingNeutralZ = THREE.MathUtils.degToRad(-17.2);
    
    let shoulderRotation = { 
      x: walkingNeutralX,
      y: walkingNeutralY,
      z: walkingNeutralZ
    };
    
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: walkingNeutralX, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(walkingNeutralX, THREE.MathUtils.degToRad(-60), easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(walkingNeutralY, 0, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(walkingNeutralZ, THREE.MathUtils.degToRad(-80), easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, Math.PI / 8, easedT);
      
      wristRotation.x = THREE.MathUtils.lerp(walkingNeutralX, -Math.PI / 6, easedT);
      wristRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, -Math.PI / 12, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0, -0.2, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t);
      
      shoulderRotation.x = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-60), THREE.MathUtils.degToRad(-52.5), aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(0, 0, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-80), THREE.MathUtils.degToRad(50), aggressiveT);
      
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, 0.1, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 8, -Math.PI / 12, aggressiveT);
      
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 12, aggressiveT);
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 12, -Math.PI / 16, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 12, 0, aggressiveT);
      
      torsoRotation = THREE.MathUtils.lerp(-0.2, 0.15, aggressiveT);
      
    } else if (elapsed < duration) {
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-52.5), walkingNeutralX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(0, walkingNeutralY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(50), walkingNeutralZ, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 12, 0, easedT);
      
      wristRotation.x = THREE.MathUtils.lerp(Math.PI / 12, walkingNeutralX, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 16, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0.15, 0, easedT);
      
    } else {
      this.completeAttackAnimation();
      return false;
    }
    
    this.applyAttackMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    return true;
  }
  
  private applyAttackMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    }
    
    if (this.bodyParts.leftElbow) {
      this.bodyParts.leftElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = torsoRotation;
    }
  }
  
  private completeAttackAnimation(): void {
    const walkingNeutralX = THREE.MathUtils.degToRad(-22.5);
    const walkingNeutralY = 0;
    const walkingNeutralZ = THREE.MathUtils.degToRad(-17.2);
    
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.set(walkingNeutralX, walkingNeutralY, walkingNeutralZ);
    }
    
    if (this.bodyParts.leftElbow) {
      this.bodyParts.leftElbow.rotation.set(0.05, 0, 0);
    }
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(walkingNeutralX, 0, 0);
    }
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = 0;
    }
    
    this.swingAnimation = null;
    console.log("🗡️ [EnemyAnimationSystem] Attack animation completed with preserved flow");
  }
  
  public isAttacking(): boolean {
    return this.swingAnimation?.isActive || false;
  }
  
  public getAttackProgress(): number {
    if (!this.swingAnimation || !this.swingAnimation.isActive) return 0;
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    return Math.min(elapsed / STANDARD_SWORD_ANIMATION.duration, 1);
  }
  
  public getSwingPhase(): 'windup' | 'slash' | 'recovery' | 'idle' {
    if (!this.swingAnimation || !this.swingAnimation.isActive) return 'idle';
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { phases } = this.swingAnimation;
    
    if (elapsed < phases.windup) return 'windup';
    if (elapsed < phases.windup + phases.slash) return 'slash';
    return 'recovery';
  }
}
