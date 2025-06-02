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
    
    console.log("🗡️ [EnemyAnimationSystem] Started STANDARDIZED enemy sword attack animation (same as player)");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { phases, duration, rotations } = STANDARD_SWORD_ANIMATION;
    
    console.log(`🗡️ [EnemyAnimationSystem] STANDARDIZED attack animation - Elapsed: ${elapsed.toFixed(3)}s, Duration: ${duration}s`);
    
    // Get enemy's actual neutral pose as baseline (same as player approach)
    const enemyNeutral = this.metrics.neutralPoses.arms.right;
    
    // Use STANDARDIZED animation rotations (same as player)
    let shoulderRotation = { 
      x: rotations.neutral.x, 
      y: rotations.neutral.y, 
      z: rotations.neutral.z 
    };
    
    // Elbow and wrist coordination (same as player)
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 6, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Use STANDARDIZED windup rotations (same as player)
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Use standardized windup position (same as player)
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.neutral.x, rotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.neutral.y, rotations.windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.neutral.z, rotations.windup.z, easedT);
      
      // ELBOW: Extend to support right position (same as player)
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 6, easedT);
      
      // WRIST: Position for diagonal strike (same as player)
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 8, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, rotations.windup.z, easedT);
      
      // TORSO: Coil to the right for power (same as player)
      torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT);
      
      console.log(`🗡️ [EnemyAnimationSystem] WINDUP PHASE t=${t.toFixed(2)} - Using STANDARDIZED rotations (same as player)`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Use STANDARDIZED slash movement (same as player)
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t); // Smoothstep for aggressive acceleration (same as player)
      
      // SHOULDER: Movement from windup to standardized slash end position (same as player)
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.windup.z, rotations.slash.z, aggressiveT);
      
      // ELBOW: Aggressive movement to support fast diagonal (same as player)
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.15, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 6, aggressiveT);
      
      // WRIST: Aggressive movement with snap (same as player)
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, Math.PI / 10, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(rotations.windup.z, 0, aggressiveT);
      
      // TORSO: Aggressive rotation to support diagonal movement (same as player)
      torsoRotation = THREE.MathUtils.lerp(-0.3, 0.25, aggressiveT);
      
      console.log(`🗡️ [EnemyAnimationSystem] SLASH PHASE t=${t.toFixed(2)} - STANDARDIZED diagonal sweep (same as player)`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral position (same as player)
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return from slash end position to neutral (same as player)
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.slash.x, rotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.slash.y, rotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.slash.z, rotations.neutral.z, easedT);
      
      // Return elbow to neutral (same as player)
      elbowRotation.x = THREE.MathUtils.lerp(0.15, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 6, 0, easedT);
      
      // Return wrist to neutral (same as player)
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 10, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      // Torso returns to center (same as player)
      torsoRotation = THREE.MathUtils.lerp(0.25, 0, easedT);
      
      console.log(`🗡️ [EnemyAnimationSystem] RECOVERY PHASE t=${t.toFixed(2)} - Returning to STANDARDIZED neutral (same as player)`);
      
    } else {
      // ANIMATION COMPLETE
      this.completeAttackAnimation();
      return false;
    }
    
    // Apply the coordinated movement to enemy body parts (same as player)
    this.applyAttackMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    
    console.log(`🗡️ [EnemyAnimationSystem] STANDARDIZED attack animation progress: ${(elapsed / duration * 100).toFixed(1)}% (same as player)`);
    return true;
  }
  
  private applyAttackMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    // Apply SHOULDER rotations (right arm for weapon) - same logic as player
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    }
    
    // Apply ELBOW rotations (same as player)
    if (this.bodyParts.rightElbow) {
      this.bodyParts.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    // Apply WRIST rotations (same as player)
    if (this.bodyParts.rightWrist) {
      this.bodyParts.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    // Apply TORSO rotation (same as player)
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = torsoRotation;
    }
  }
  
  private completeAttackAnimation(): void {
    // Reset to STANDARDIZED neutral rotations (same as player)
    const neutralRotation = STANDARD_SWORD_ANIMATION.rotations.neutral;
    
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.set(neutralRotation.x, neutralRotation.y, neutralRotation.z);
    }
    
    // Reset other joints to standardized positions (same as player)
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
    console.log("🗡️ [EnemyAnimationSystem] STANDARDIZED attack animation completed, returned to neutral stance (same as player)");
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
