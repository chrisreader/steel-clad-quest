
import * as THREE from 'three';
import { HumanoidBodyParts } from '../../entities/humanoid/HumanoidBody';
import { HumanoidBodyMetrics } from '../../entities/humanoid/HumanoidBodyMetrics';
import { HumanoidSwingAnimation, HumanoidAttackAnimations, STANDARD_HUMANOID_ATTACK } from './HumanoidAttackAnimations';

export class HumanoidAnimationSystem {
  protected bodyParts: HumanoidBodyParts;
  protected metrics: HumanoidBodyMetrics;
  private walkTime: number = 0;
  private idleTime: number = 0;
  private swingAnimation: HumanoidSwingAnimation | null = null;
  
  constructor(bodyParts: HumanoidBodyParts, metrics: HumanoidBodyMetrics) {
    this.bodyParts = bodyParts;
    this.metrics = metrics;
    
    console.log(`🎭 [HumanoidAnimationSystem] Initialized with standardized humanoid metrics`);
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
    
    // === BODY ANIMATION ===
    if (this.bodyParts.body) {
      const walkingBob = Math.sin(this.walkTime * 2) * 0.05;
      this.bodyParts.body.position.y = this.metrics.positions.bodyY + walkingBob;
    }
    
    // === ARM MOVEMENT - SKIP DURING ATTACKS ===
    const isAttacking = this.swingAnimation?.isActive || false;
    
    if (this.bodyParts.leftArm && this.bodyParts.rightArm && !isAttacking) {
      // Left arm system - weapon arm (reduced swing for weapon control)
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
    
    // === LEG ANIMATIONS ===
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
    
    // === IDLE BREATHING ===
    if (this.bodyParts.body) {
      const breathingOffset = Math.sin(this.idleTime * 4) * this.metrics.animationMetrics.breathingIntensity;
      this.bodyParts.body.position.y = this.metrics.positions.bodyY + breathingOffset;
    }
    
    // Subtle weapon sway
    if (this.bodyParts.weapon) {
      const baseRotation = -0.3;
      this.bodyParts.weapon.rotation.z = baseRotation + Math.sin(this.idleTime * 2) * 0.1;
    }
    
    // Return arms to neutral position gradually - SKIP DURING ATTACKS
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
      console.log("🗡️ [HumanoidAnimationSystem] Attack animation already active, ignoring new request");
      return;
    }
    
    this.swingAnimation = HumanoidAttackAnimations.createSwingAnimation();
    this.swingAnimation.isActive = true;
    this.swingAnimation.clock.start();
    this.swingAnimation.startTime = this.swingAnimation.clock.getElapsedTime();
    
    console.log("🗡️ [HumanoidAnimationSystem] Started standardized humanoid attack animation");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const animation = STANDARD_HUMANOID_ATTACK;
    
    console.log(`🗡️ [HumanoidAnimationSystem] Standardized attack animation - Elapsed: ${elapsed.toFixed(3)}s`);
    
    // Calculate rotations using your exact sequence
    const rotations = HumanoidAttackAnimations.calculateAttackRotation(elapsed, animation);
    
    if (elapsed >= animation.duration) {
      this.completeAttackAnimation();
      return false;
    }
    
    // Apply the coordinated movement to LEFT ARM
    this.applyAttackMovement(rotations.shoulder, rotations.elbow, rotations.wrist, rotations.torso);
    
    return true;
  }
  
  private applyAttackMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    // Apply SHOULDER rotations (LEFT arm for weapon)
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
    // Reset to precise walking neutral position for LEFT ARM
    const walkingNeutral = this.metrics.neutralPoses.arms.left;
    
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.set(walkingNeutral.x, walkingNeutral.y, walkingNeutral.z);
    }
    
    // Reset other joints to neutral positions
    if (this.bodyParts.leftElbow) {
      this.bodyParts.leftElbow.rotation.set(0.05, 0, 0);
    }
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(walkingNeutral.x, 0, 0);
    }
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = 0;
    }
    
    this.swingAnimation = null;
    console.log("🗡️ [HumanoidAnimationSystem] Standardized attack animation completed");
  }
  
  public isAttacking(): boolean {
    return this.swingAnimation?.isActive || false;
  }
  
  public getAttackProgress(): number {
    if (!this.swingAnimation || !this.swingAnimation.isActive) return 0;
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    return Math.min(elapsed / STANDARD_HUMANOID_ATTACK.duration, 1);
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
