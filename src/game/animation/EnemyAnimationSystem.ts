
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
    
    console.log(`🎭 [EnemyAnimationSystem] Initialized with data-driven metrics - body Y=${this.metrics.positions.bodyY}`);
  }
  
  public updateWalkAnimation(deltaTime: number, isMoving: boolean, movementSpeed: number): void {
    if (!isMoving) {
      this.updateIdleAnimation(deltaTime);
      return;
    }
    
    this.walkTime += deltaTime * movementSpeed * this.metrics.animationMetrics.walkCycleSpeed;
    
    // Enhanced walking animation using metrics
    const armSwing = Math.sin(this.walkTime) * this.metrics.animationMetrics.armSwingIntensity;
    const legSwing = Math.sin(this.walkTime + Math.PI) * this.metrics.animationMetrics.legSwingIntensity;
    const shoulderSway = Math.sin(this.walkTime * 0.5) * this.metrics.animationMetrics.shoulderMovement;
    
    // === BODY ANIMATION (AUTO-SYNCED) ===
    if (this.bodyParts.body) {
      const walkingBob = Math.sin(this.walkTime * 2) * 0.05;
      this.bodyParts.body.position.y = this.metrics.positions.bodyY + walkingBob;
    }
    
    // === ARM MOVEMENT (AUTO-SYNCED TO NEUTRAL POSES) - SKIP DURING ATTACKS ===
    const isAttacking = this.swingAnimation?.isActive || false;
    
    if (this.bodyParts.leftArm && this.bodyParts.rightArm && !isAttacking) {
      // Left arm system - use neutral pose as base
      const leftNeutral = this.metrics.neutralPoses.arms.left;
      this.bodyParts.leftArm.rotation.x = leftNeutral.x + armSwing;
      this.bodyParts.leftArm.rotation.z = leftNeutral.z + shoulderSway;
      
      if (this.bodyParts.leftElbow) {
        this.bodyParts.leftElbow.rotation.x = -Math.abs(armSwing) * this.metrics.animationMetrics.elbowMovement;
      }
      if (this.bodyParts.leftWrist) {
        this.bodyParts.leftWrist.rotation.x = armSwing * 0.3;
      }
      
      // Right arm system (weapon arm - reduced swing for weapon control)
      const rightNeutral = this.metrics.neutralPoses.arms.right;
      const weaponArmSwing = armSwing * 0.6;
      this.bodyParts.rightArm.rotation.x = rightNeutral.x + weaponArmSwing;
      this.bodyParts.rightArm.rotation.z = rightNeutral.z - shoulderSway;
      
      if (this.bodyParts.rightElbow) {
        this.bodyParts.rightElbow.rotation.x = -Math.abs(weaponArmSwing) * (this.metrics.animationMetrics.elbowMovement * 0.4);
      }
      if (this.bodyParts.rightWrist) {
        this.bodyParts.rightWrist.rotation.x = -weaponArmSwing * 0.2;
      }
    }
    
    // === LEG ANIMATIONS (CONTINUE DURING ATTACKS) ===
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
    
    console.log(`🎭 [EnemyAnimationSystem] Independent walking: body Y=${this.bodyParts.body?.position.y.toFixed(3)}, attacking=${isAttacking}`);
  }
  
  private updateIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;
    
    // === IDLE BREATHING (AUTO-SYNCED) ===
    if (this.bodyParts.body) {
      const breathingOffset = Math.sin(this.idleTime * 4) * this.metrics.animationMetrics.breathingIntensity;
      this.bodyParts.body.position.y = this.metrics.positions.bodyY + breathingOffset;
    }
    
    // Subtle weapon sway
    if (this.bodyParts.weapon) {
      const baseRotation = -0.3;
      this.bodyParts.weapon.rotation.z = baseRotation + Math.sin(this.idleTime * 2) * 0.1;
    }
    
    // Return arms to neutral position gradually (AUTO-SYNCED) - SKIP DURING ATTACKS
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
    
    // Reset clock and set start time
    this.swingAnimation.clock.start();
    this.swingAnimation.startTime = this.swingAnimation.clock.getElapsedTime();
    
    console.log("🗡️ [EnemyAnimationSystem] Started enemy-specific forward attack animation");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { phases } = this.swingAnimation;
    const { duration } = STANDARD_SWORD_ANIMATION;
    
    // Get enemy's actual neutral pose as starting point
    const enemyNeutral = this.metrics.neutralPoses.arms.right;
    
    // Create enemy-specific animation phases that swing forward from the neutral pose
    let shoulderRotation = { 
      x: enemyNeutral.x, 
      y: enemyNeutral.y, 
      z: enemyNeutral.z 
    };
    let elbowRotation = { x: 0, y: 0, z: 0 };
    let wristRotation = { x: 0, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE - Raise arm up and back slightly for forward swing preparation
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Raise arm up from enemy's neutral position (more upward, less backward)
      shoulderRotation.x = THREE.MathUtils.lerp(enemyNeutral.x, enemyNeutral.x - 0.5, easedT); // Raise up moderately
      shoulderRotation.y = THREE.MathUtils.lerp(enemyNeutral.y, 0.2, easedT); // Slight right position
      shoulderRotation.z = THREE.MathUtils.lerp(enemyNeutral.z, enemyNeutral.z + 0.3, easedT); // Twist for power
      
      elbowRotation.x = THREE.MathUtils.lerp(0, -0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 8, easedT);
      
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 10, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0.2, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0, -0.2, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE - Forward swing down from raised position
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t);
      
      // Swing forward and down from windup position
      shoulderRotation.x = THREE.MathUtils.lerp(enemyNeutral.x - 0.5, enemyNeutral.x + 0.3, aggressiveT); // Swing down and slightly forward
      shoulderRotation.y = THREE.MathUtils.lerp(0.2, -0.3, aggressiveT); // Sweep across to left
      shoulderRotation.z = THREE.MathUtils.lerp(enemyNeutral.z + 0.3, enemyNeutral.z - 0.2, aggressiveT); // Counter-twist
      
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.1, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, Math.PI / 8, aggressiveT);
      
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 10, Math.PI / 12, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(0.2, -0.1, aggressiveT);
      
      torsoRotation = THREE.MathUtils.lerp(-0.2, 0.15, aggressiveT);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE - Return to enemy's exact neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return to actual enemy neutral pose
      shoulderRotation.x = THREE.MathUtils.lerp(enemyNeutral.x + 0.3, enemyNeutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(-0.3, enemyNeutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(enemyNeutral.z - 0.2, enemyNeutral.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 8, 0, easedT);
      
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 12, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(-0.1, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0.15, 0, easedT);
      
    } else {
      // ANIMATION COMPLETE
      this.completeAttackAnimation();
      return false;
    }
    
    // Apply the coordinated movement to enemy body parts
    this.applyAttackMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    
    console.log(`🗡️ [EnemyAnimationSystem] Forward attack animation progress: ${(elapsed / duration * 100).toFixed(1)}%`);
    return true;
  }
  
  private applyAttackMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    // Apply SHOULDER rotations (right arm for weapon) - use actual neutral Z value
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    }
    
    // Apply ELBOW rotations
    if (this.bodyParts.rightElbow) {
      this.bodyParts.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    // Apply WRIST rotations
    if (this.bodyParts.rightWrist) {
      this.bodyParts.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    // Apply TORSO rotation
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = torsoRotation;
    }
  }
  
  private completeAttackAnimation(): void {
    // Reset to enemy's actual neutral positions using metrics
    const rightNeutral = this.metrics.neutralPoses.arms.right;
    const rightElbowNeutral = this.metrics.neutralPoses.elbows.right;
    const rightWristNeutral = this.metrics.neutralPoses.wrists.right;
    
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.set(rightNeutral.x, rightNeutral.y, rightNeutral.z);
    }
    
    if (this.bodyParts.rightElbow) {
      this.bodyParts.rightElbow.rotation.set(rightElbowNeutral.x, rightElbowNeutral.y, rightElbowNeutral.z);
    }
    if (this.bodyParts.rightWrist) {
      this.bodyParts.rightWrist.rotation.set(rightWristNeutral.x, rightWristNeutral.y, rightWristNeutral.z);
    }
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = 0;
    }
    
    this.swingAnimation = null;
    console.log("🗡️ [EnemyAnimationSystem] Attack animation completed, returned to enemy's actual neutral stance");
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
