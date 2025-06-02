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
      // CANONICALIZED: Left arm system - weapon arm (reduced swing for weapon control)
      const leftNeutral = this.metrics.neutralPoses.arms.left;
      const weaponArmSwing = armSwing * 0.6; // Reduced swing for weapon control
      this.bodyParts.leftArm.rotation.x = leftNeutral.x + weaponArmSwing;
      this.bodyParts.leftArm.rotation.z = leftNeutral.z + shoulderSway;
      
      if (this.bodyParts.leftElbow) {
        this.bodyParts.leftElbow.rotation.x = -Math.abs(weaponArmSwing) * (this.metrics.animationMetrics.elbowMovement * 0.4);
      }
      if (this.bodyParts.leftWrist) {
        this.bodyParts.leftWrist.rotation.x = -weaponArmSwing * 0.2;
      }
      
      // Right arm system (free arm - normal swing)
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
    
    console.log(`🎭 [EnemyAnimationSystem] CANONICALIZED walking: LEFT arm is weapon arm, attacking=${isAttacking}`);
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
    
    console.log("🗡️ [EnemyAnimationSystem] Started UPDATED enemy sword attack animation (precise angle flow)");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { phases, duration } = STANDARD_SWORD_ANIMATION;
    
    console.log(`🗡️ [EnemyAnimationSystem] UPDATED attack animation - LEFT ARM weapon attack (precise angles) - Elapsed: ${elapsed.toFixed(3)}s, Duration: ${duration}s`);
    
    // Start with LEFT arm walking neutral position
    const walkingNeutral = this.metrics.neutralPoses.arms.left; // x: -0.393 (≈ -22.5°)
    let shoulderRotation = { 
      x: walkingNeutral.x, // Start from walking neutral (-22.5°)
      y: 0, // Always 0° for Y axis
      z: walkingNeutral.z // Walking neutral Z
    };
    
    // Elbow and wrist coordination for proper forward swing (LEFT ARM)
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: walkingNeutral.x, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Pull back to (-45°, -10°, +50°)
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Pull back from walking neutral to windup position
      shoulderRotation.x = THREE.MathUtils.lerp(walkingNeutral.x, -Math.PI / 4, easedT); // -22.5° to -45°
      shoulderRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 18, easedT); // 0° to -10°
      shoulderRotation.z = THREE.MathUtils.lerp(walkingNeutral.z, Math.PI * 50 / 180, easedT); // To +50°
      
      // ELBOW: Support the windup movement
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, Math.PI / 8, easedT);
      
      // WRIST: Position for forward strike
      wristRotation.x = THREE.MathUtils.lerp(walkingNeutral.x, -Math.PI / 6, easedT);
      wristRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, -Math.PI / 12, easedT);
      
      // TORSO: Small coil for power
      torsoRotation = THREE.MathUtils.lerp(0, -0.2, easedT);
      
      console.log(`🗡️ [EnemyAnimationSystem] WINDUP PHASE t=${t.toFixed(2)} - Pull back to (-45°, -10°, +50°)`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Forward strike to (+22.5°, 0°, 15°)
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t); // Smoothstep for aggressive acceleration
      
      // SHOULDER: Forward strike movement to precise angles
      shoulderRotation.x = THREE.MathUtils.lerp(-Math.PI / 4, Math.PI / 8, aggressiveT); // -45° to +22.5°
      shoulderRotation.y = THREE.MathUtils.lerp(-Math.PI / 18, 0, aggressiveT); // -10° to 0°
      shoulderRotation.z = THREE.MathUtils.lerp(Math.PI * 50 / 180, Math.PI / 12, aggressiveT); // +50° to 15°
      
      // ELBOW: Aggressive forward movement
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, 0.1, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 8, -Math.PI / 12, aggressiveT);
      
      // WRIST: Forward strike
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 12, aggressiveT);
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 12, -Math.PI / 16, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 12, 0, aggressiveT);
      
      // TORSO: Forward rotation
      torsoRotation = THREE.MathUtils.lerp(-0.2, 0.15, aggressiveT);
      
      console.log(`🗡️ [EnemyAnimationSystem] SLASH PHASE t=${t.toFixed(2)} - Forward strike to (+22.5°, 0°, 15°)`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to walking neutral (-22.5°, 0°, neutral Z)
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return from slash end position to walking neutral
      shoulderRotation.x = THREE.MathUtils.lerp(Math.PI / 8, walkingNeutral.x, easedT); // +22.5° back to -22.5°
      shoulderRotation.y = THREE.MathUtils.lerp(0, 0, easedT); // 0° to 0° (stays at 0°)
      shoulderRotation.z = THREE.MathUtils.lerp(Math.PI / 12, walkingNeutral.z, easedT); // 15° back to neutral Z
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 12, 0, easedT);
      
      // Return wrist to walking neutral
      wristRotation.x = THREE.MathUtils.lerp(Math.PI / 12, walkingNeutral.x, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 16, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.15, 0, easedT);
      
      console.log(`🗡️ [EnemyAnimationSystem] RECOVERY PHASE t=${t.toFixed(2)} - Return to walking neutral (-22.5°, 0°, neutral Z)`);
      
    } else {
      // ANIMATION COMPLETE
      this.completeAttackAnimation();
      return false;
    }
    
    // Apply the coordinated movement to LEFT ARM enemy body parts
    this.applyAttackMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    
    console.log(`🗡️ [EnemyAnimationSystem] UPDATED LEFT ARM attack animation progress: ${(elapsed / duration * 100).toFixed(1)}%`);
    return true;
  }
  
  private applyAttackMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    // Apply SHOULDER rotations (LEFT arm for weapon) - forward-pointing attack
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    }
    
    // Apply ELBOW rotations
    if (this.bodyParts.leftElbow) {
      this.bodyParts.leftElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    // Apply WRIST rotations
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    // Apply TORSO rotation
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = torsoRotation;
    }
  }
  
  private completeAttackAnimation(): void {
    // FIXED: Reset to proper walking neutral position for LEFT ARM
    const walkingNeutral = this.metrics.neutralPoses.arms.left;
    
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.set(walkingNeutral.x, walkingNeutral.y, walkingNeutral.z); // FIXED: Use walking neutral
    }
    
    // Reset other joints to neutral positions
    if (this.bodyParts.leftElbow) {
      this.bodyParts.leftElbow.rotation.set(0.05, 0, 0);
    }
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(walkingNeutral.x, 0, 0); // FIXED: Use walking neutral
    }
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = 0;
    }
    
    this.swingAnimation = null;
    console.log("🗡️ [EnemyAnimationSystem] FIXED LEFT ARM attack animation completed, returned to walking neutral");
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
