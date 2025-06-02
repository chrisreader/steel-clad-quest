import * as THREE from 'three';
import { EnemyBodyParts } from '../entities/EnemyBody';
import { EnemyBodyMetrics } from '../entities/EnemyBodyMetrics';
import { STANDARD_SWORD_ANIMATION } from './StandardSwordAnimation';
import { ANIMATION_CONFIGS } from './AnimationConfig';

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
  private animationConfigs = ANIMATION_CONFIGS.melee;
  
  constructor(bodyParts: EnemyBodyParts, metrics: EnemyBodyMetrics) {
    this.bodyParts = bodyParts;
    this.metrics = metrics;
    console.log(`🎭 [EnemyAnimationSystem] Initialized with data-driven metrics for ${metrics.getConfig().type}`);
    console.log(`🎭 [EnemyAnimationSystem] Body center Y: ${metrics.getBodyCenterY()}`);
  }
  
  public updateWalkAnimation(deltaTime: number, isMoving: boolean, movementSpeed: number): void {
    if (!isMoving) {
      this.updateIdleAnimation(deltaTime);
      return;
    }
    
    const animParams = this.metrics.getAnimationParams();
    this.walkTime += deltaTime * movementSpeed * animParams.walkCycleSpeed;
    
    // Get calculated animation values from metrics
    const armSwing = this.metrics.getArmSwing(this.walkTime);
    const legSwing = this.metrics.getLegSwing(this.walkTime);
    const shoulderSway = this.metrics.getShoulderSway(this.walkTime);
    const walkingBobOffset = this.metrics.getWalkingBobOffset(this.walkTime);
    
    // === BODY ANIMATION (METRICS-DRIVEN) ===
    if (this.bodyParts.body) {
      this.bodyParts.body.position.y = this.metrics.getBodyCenterY() + walkingBobOffset;
    }
    
    // === ARM MOVEMENT - AUTOMATICALLY ADAPTED TO BODY CONFIGURATION ===
    if (this.bodyParts.leftArm && this.bodyParts.rightArm) {
      const neutralRotations = this.metrics.getNeutralArmRotation();
      
      // Left arm system - uses calculated neutral position + swing
      this.bodyParts.leftArm.rotation.x = armSwing + neutralRotations.left.x;
      this.bodyParts.leftArm.rotation.z = neutralRotations.left.z + shoulderSway;
      
      if (this.bodyParts.leftElbow) {
        this.bodyParts.leftElbow.rotation.x = -Math.abs(armSwing) * 0.5;
      }
      if (this.bodyParts.leftWrist) {
        this.bodyParts.leftWrist.rotation.x = armSwing * 0.3;
      }
      
      // Right arm system (weapon arm) - reduced swing for weapon control
      const weaponArmSwing = armSwing * animParams.weaponArmSwingReduction;
      this.bodyParts.rightArm.rotation.x = -weaponArmSwing + neutralRotations.right.x;
      this.bodyParts.rightArm.rotation.z = neutralRotations.right.z - shoulderSway;
      
      if (this.bodyParts.rightElbow) {
        this.bodyParts.rightElbow.rotation.x = -Math.abs(weaponArmSwing) * 0.4;
      }
      if (this.bodyParts.rightWrist) {
        this.bodyParts.rightWrist.rotation.x = -weaponArmSwing * 0.2;
      }
    }
    
    // === LEG ANIMATIONS (UNCHANGED - ALREADY RELATIVE) ===
    if (this.bodyParts.leftLeg && this.bodyParts.rightLeg) {
      this.bodyParts.leftLeg.rotation.x = legSwing;
      this.bodyParts.rightLeg.rotation.x = -legSwing;
      
      // Knee movement for more realistic gait
      if (this.bodyParts.leftKnee) {
        this.bodyParts.leftKnee.rotation.x = Math.max(0, legSwing) * 0.8;
      }
      if (this.bodyParts.rightKnee) {
        this.bodyParts.rightKnee.rotation.x = Math.max(0, -legSwing) * 0.8;
      }
    }
    
    console.log(`🎭 [EnemyAnimationSystem] Walking: body Y=${this.bodyParts.body?.position.y.toFixed(3)} (${this.metrics.getBodyCenterY()} + ${walkingBobOffset.toFixed(3)} offset)`);
  }
  
  private updateIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;
    const breathingOffset = this.metrics.getBreathingOffset(this.idleTime);
    
    // === IDLE BREATHING (METRICS-DRIVEN) ===
    if (this.bodyParts.body) {
      this.bodyParts.body.position.y = this.metrics.getBodyCenterY() + breathingOffset;
    }
    
    // Subtle weapon sway
    if (this.bodyParts.weapon) {
      const baseRotation = -0.3;
      this.bodyParts.weapon.rotation.z = baseRotation + Math.sin(this.idleTime * 2) * 0.1;
    }
    
    // Return arms to neutral position gradually (METRICS-DRIVEN)
    const returnSpeed = deltaTime * 2;
    if (this.bodyParts.leftArm && this.bodyParts.rightArm) {
      const neutralRotations = this.metrics.getNeutralArmRotation();
      
      this.bodyParts.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.leftArm.rotation.x, neutralRotations.left.x, returnSpeed
      );
      this.bodyParts.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.rightArm.rotation.x, neutralRotations.right.x, returnSpeed
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
    
    console.log("🗡️ [EnemyAnimationSystem] Started standardized attack animation using player sword system");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { phases } = this.swingAnimation;
    const { duration, rotations } = STANDARD_SWORD_ANIMATION;
    
    let shoulderRotation = { 
      x: rotations.neutral.x, 
      y: rotations.neutral.y, 
      z: rotations.neutral.z 
    };
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 6, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.neutral.x, rotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.neutral.y, rotations.windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.neutral.z, rotations.windup.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 6, easedT);
      
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 8, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, rotations.windup.z, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t);
      
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.windup.z, rotations.slash.z, aggressiveT);
      
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.15, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 6, aggressiveT);
      
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, Math.PI / 10, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(rotations.windup.z, 0, aggressiveT);
      
      torsoRotation = THREE.MathUtils.lerp(-0.3, 0.25, aggressiveT);
      
    } else if (elapsed < duration) {
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.slash.x, rotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.slash.y, rotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.slash.z, rotations.neutral.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.15, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 6, 0, easedT);
      
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 10, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0.25, 0, easedT);
      
    } else {
      this.completeAttackAnimation();
      return false;
    }
    
    this.applyAttackMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    
    console.log(`🗡️ [EnemyAnimationSystem] Attack animation progress: ${(elapsed / duration * 100).toFixed(1)}%`);
    return true;
  }
  
  private applyAttackMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z - 0.3, 'XYZ');
    }
    
    if (this.bodyParts.rightElbow) {
      this.bodyParts.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    if (this.bodyParts.rightWrist) {
      this.bodyParts.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = torsoRotation;
    }
  }
  
  private completeAttackAnimation(): void {
    // METRICS-DRIVEN: Reset to calculated neutral positions
    const neutralRotations = this.metrics.getNeutralArmRotation();
    const neutralRotation = STANDARD_SWORD_ANIMATION.rotations.neutral;
    
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.set(neutralRotations.right.x, neutralRotation.y, neutralRotation.z - 0.3);
    }
    
    if (this.bodyParts.rightElbow) {
      this.bodyParts.rightElbow.rotation.set(0.05, 0, 0);
    }
    if (this.bodyParts.rightWrist) {
      this.bodyParts.rightWrist.rotation.set(-Math.PI / 6, 0, 0);
    }
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = 0;
    }
    
    this.swingAnimation = null;
    console.log("🗡️ [EnemyAnimationSystem] Attack animation completed, returned to metrics-driven neutral stance");
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
