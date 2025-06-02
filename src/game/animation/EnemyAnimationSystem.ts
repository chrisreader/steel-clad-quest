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
    
    console.log("🗡️ [EnemyAnimationSystem] Started enemy-specific cross-body attack animation");
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
    
    // Create enemy-specific animation phases with FLIPPED CROSS-BODY SWING DIRECTION
    let shoulderRotation = { 
      x: enemyNeutral.x, 
      y: enemyNeutral.y, 
      z: enemyNeutral.z 
    };
    let elbowRotation = { x: 0, y: 0, z: 0 };
    let wristRotation = { x: 0, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE - FLIPPED: Wind up to the RIGHT side for cross-body swing to LEFT
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Wind up to the RIGHT side (positive Z for cross-body swing to left)
      shoulderRotation.x = THREE.MathUtils.lerp(enemyNeutral.x, enemyNeutral.x - 1.4, easedT); // Higher up position
      shoulderRotation.y = THREE.MathUtils.lerp(enemyNeutral.y, 0.8, easedT); // More forward positioning
      shoulderRotation.z = THREE.MathUtils.lerp(enemyNeutral.z, enemyNeutral.z + 1.2, easedT); // FLIPPED: Far to the RIGHT side for cross-body swing to left
      
      elbowRotation.x = THREE.MathUtils.lerp(0, -0.3, easedT); // Support the high position
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 4, easedT); // FLIPPED: Elbow positioning for right windup
      
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 6, easedT); // FLIPPED: Wrist positioning
      wristRotation.z = THREE.MathUtils.lerp(0, 0.4, easedT); // FLIPPED: Wrist positioning for right side
      
      // FLIPPED: Torso winds up to the RIGHT to support the cross-body swing to left
      torsoRotation = THREE.MathUtils.lerp(0, -0.6, easedT); // FLIPPED: Negative rotation to the right
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE - FLIPPED: Cross-body swing from RIGHT to LEFT (across body forward)
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t);
      
      // SHOULDER: Swing from right side to left side (cross-body forward)
      shoulderRotation.x = THREE.MathUtils.lerp(enemyNeutral.x - 1.4, enemyNeutral.x + 0.8, aggressiveT); // Swing down and forward
      shoulderRotation.y = THREE.MathUtils.lerp(0.8, -0.7, aggressiveT); // Forward/back motion
      shoulderRotation.z = THREE.MathUtils.lerp(enemyNeutral.z + 1.2, enemyNeutral.z - 1.0, aggressiveT); // FLIPPED: From far RIGHT to far LEFT (~2.2 radian cross-body sweep!)
      
      elbowRotation.x = THREE.MathUtils.lerp(-0.3, 0.3, aggressiveT); // Support the swing motion
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 4, Math.PI / 3, aggressiveT); // FLIPPED: Elbow motion from right to left
      
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 6, aggressiveT); // FLIPPED: Wrist follows the cross-body swing
      wristRotation.z = THREE.MathUtils.lerp(0.4, -0.3, aggressiveT); // FLIPPED: Wrist motion for cross-body swing
      
      // FLIPPED: Torso powerfully unwinds from RIGHT to LEFT to support the cross-body swing
      torsoRotation = THREE.MathUtils.lerp(-0.6, 0.5, aggressiveT); // FLIPPED: From -0.6 to +0.5 (cross-body swing rotation)
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE - Return to enemy's exact neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return to actual enemy neutral pose
      shoulderRotation.x = THREE.MathUtils.lerp(enemyNeutral.x + 0.8, enemyNeutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(-0.7, enemyNeutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(enemyNeutral.z - 1.0, enemyNeutral.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.3, 0, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 3, 0, easedT);
      
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 6, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(-0.3, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0.5, 0, easedT);
      
    } else {
      // ANIMATION COMPLETE
      this.completeAttackAnimation();
      return false;
    }
    
    // Apply the coordinated movement to enemy body parts
    this.applyAttackMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    
    console.log(`🗡️ [EnemyAnimationSystem] FLIPPED cross-body attack animation progress: ${(elapsed / duration * 100).toFixed(1)}%`);
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
    console.log("🗡️ [EnemyAnimationSystem] FLIPPED cross-body attack animation completed, returned to enemy's actual neutral stance");
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
