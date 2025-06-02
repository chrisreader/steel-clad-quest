import * as THREE from 'three';
import { EnemyBodyParts, EnemyBodyMetrics } from '../entities/humanoid/EnemyHumanoid';
import { STANDARD_SWORD_ANIMATION } from './StandardSwordAnimation';
import { RealisticMovementSystem, RealisticMovementConfig } from './RealisticMovementSystem';

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
  private realisticMovement: RealisticMovementSystem;
  
  constructor(bodyParts: EnemyBodyParts, metrics: EnemyBodyMetrics, enemyType: string = 'orc') {
    this.bodyParts = bodyParts;
    this.metrics = metrics;
    
    // Create realistic movement configuration based on enemy type
    const movementConfig: RealisticMovementConfig = this.createMovementConfig(enemyType);
    this.realisticMovement = new RealisticMovementSystem(movementConfig);
    
    console.log(`🎭 [EnemyAnimationSystem] Initialized with enhanced realistic movement for ${enemyType}`);
  }

  private createMovementConfig(enemyType: string): RealisticMovementConfig {
    // Different enemy types have different movement characteristics
    const baseConfig = {
      stepLength: 1.0,
      walkCycleSpeed: this.metrics.animationMetrics.walkCycleSpeed,
      kneeFlexionIntensity: 1.0,
      elbowSwingIntensity: 1.0,
      weaponWeight: 0.7,
      combatStanceType: 'aggressive' as const,
      weaponType: 'axe' as const,
      characterSeed: Math.random() * 1000, // Unique per enemy instance
      asymmetryIntensity: 0.1,
      legLength: this.metrics.scale.leg.length,
      armLength: this.metrics.scale.arm.length
    };

    // Customize based on enemy type
    switch (enemyType.toLowerCase()) {
      case 'orc':
        return {
          ...baseConfig,
          kneeFlexionIntensity: 1.2, // Orcs have more pronounced knee movement
          elbowSwingIntensity: 1.1, // Slightly more elbow swing due to bulk
          weaponWeight: 0.8, // Heavy weapons
          combatStanceType: 'aggressive',
          weaponType: 'axe',
          asymmetryIntensity: 0.15 // More irregular movement
        };
      case 'goblin':
        return {
          ...baseConfig,
          kneeFlexionIntensity: 1.4, // Goblins are more agile
          elbowSwingIntensity: 1.3, // More animated movement
          weaponWeight: 0.5, // Lighter weapons
          combatStanceType: 'aggressive',
          weaponType: 'sword',
          asymmetryIntensity: 0.2 // More erratic movement
        };
      default:
        return baseConfig;
    }
  }
  
  public updateWalkAnimation(deltaTime: number, isMoving: boolean, movementSpeed: number): void {
    // Create complete neutral poses structure for the realistic movement system
    const enhancedNeutralPoses = {
      bodyY: this.metrics.positions.bodyY,
      headY: this.metrics.positions.headY,
      shoulderHeight: this.metrics.positions.shoulderHeight,
      bodyRadius: this.metrics.scale.body.radius,
      arms: this.metrics.neutralPoses.arms,
      elbows: this.metrics.neutralPoses.elbows,
      wrists: this.metrics.neutralPoses.wrists
    };

    // Use the new realistic movement system
    this.realisticMovement.updateRealisticWalk(
      this.bodyParts,
      deltaTime,
      isMoving,
      movementSpeed,
      enhancedNeutralPoses
    );

    // Keep the old walkTime for backward compatibility
    if (isMoving) {
      this.walkTime += deltaTime * movementSpeed * this.metrics.animationMetrics.walkCycleSpeed;
    }

    // Update leg swing using enhanced system for legs
    if (isMoving && this.bodyParts.leftLeg && this.bodyParts.rightLeg) {
      const legSwing = Math.sin(this.walkTime + Math.PI) * this.metrics.animationMetrics.legSwingIntensity;
      this.bodyParts.leftLeg.rotation.x = legSwing;
      this.bodyParts.rightLeg.rotation.x = -legSwing;
    }

    // Enhanced arm movement (the realistic system handles elbows)
    const isAttacking = this.swingAnimation?.isActive || false;
    if (this.bodyParts.leftArm && this.bodyParts.rightArm && !isAttacking && isMoving) {
      const armSwing = Math.sin(this.walkTime) * this.metrics.animationMetrics.armSwingIntensity;
      const shoulderSway = Math.sin(this.walkTime * 0.5) * this.metrics.animationMetrics.shoulderMovement;
      
      const leftNeutral = this.metrics.neutralPoses.arms.left;
      const weaponArmSwing = armSwing * 0.6;
      this.bodyParts.leftArm.rotation.x = leftNeutral.x + weaponArmSwing;
      this.bodyParts.leftArm.rotation.z = leftNeutral.z + shoulderSway;
      
      if (this.bodyParts.leftWrist) {
        this.bodyParts.leftWrist.rotation.x = -weaponArmSwing * 0.2;
      }
      
      const rightNeutral = this.metrics.neutralPoses.arms.right;
      this.bodyParts.rightArm.rotation.x = rightNeutral.x + armSwing;
      this.bodyParts.rightArm.rotation.z = rightNeutral.z - shoulderSway;
      
      if (this.bodyParts.rightWrist) {
        this.bodyParts.rightWrist.rotation.x = armSwing * 0.3;
      }
    }
  }
  
  private updateIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;
    
    // Create enhanced neutral poses for idle animation
    const enhancedNeutralPoses = {
      bodyY: this.metrics.positions.bodyY,
      headY: this.metrics.positions.headY,
      shoulderHeight: this.metrics.positions.shoulderHeight,
      bodyRadius: this.metrics.scale.body.radius,
      arms: this.metrics.neutralPoses.arms,
      elbows: this.metrics.neutralPoses.elbows,
      wrists: this.metrics.neutralPoses.wrists
    };
    
    // Use realistic movement system for idle animations
    this.realisticMovement.updateRealisticWalk(
      this.bodyParts,
      deltaTime,
      false,
      0,
      enhancedNeutralPoses
    );
    
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
    
    console.log("🗡️ [EnemyAnimationSystem] Started enhanced attack animation with realistic movement");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { duration } = STANDARD_SWORD_ANIMATION;
    
    const attackProgress = Math.min(elapsed / duration, 1);
    
    // Create enhanced neutral poses for attack animation
    const enhancedNeutralPoses = {
      bodyY: this.metrics.positions.bodyY,
      headY: this.metrics.positions.headY,
      shoulderHeight: this.metrics.positions.shoulderHeight,
      bodyRadius: this.metrics.scale.body.radius,
      arms: this.metrics.neutralPoses.arms,
      elbows: this.metrics.neutralPoses.elbows,
      wrists: this.metrics.neutralPoses.wrists
    };
    
    // Use realistic movement system for attack animations
    this.realisticMovement.updateRealisticAttack(
      this.bodyParts,
      attackProgress,
      enhancedNeutralPoses
    );
    
    // Keep existing arm animation logic for weapon swing
    this.applyWeaponSwingMovement(elapsed);
    
    if (elapsed >= duration) {
      this.completeAttackAnimation();
      return false;
    }
    
    return true;
  }

  private applyWeaponSwingMovement(elapsed: number): void {
    const { phases, duration } = STANDARD_SWORD_ANIMATION;
    
    const walkingNeutralX = THREE.MathUtils.degToRad(-22.5);
    const walkingNeutralY = 0;
    const walkingNeutralZ = THREE.MathUtils.degToRad(-17.2);
    
    let shoulderRotation = { 
      x: walkingNeutralX,
      y: walkingNeutralY,
      z: walkingNeutralZ
    };
    
    let wristRotation = { x: walkingNeutralX, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(walkingNeutralX, THREE.MathUtils.degToRad(-60), easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(walkingNeutralY, 0, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(walkingNeutralZ, THREE.MathUtils.degToRad(-80), easedT);
      
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
      
      wristRotation.x = THREE.MathUtils.lerp(Math.PI / 12, walkingNeutralX, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 16, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0.15, 0, easedT);
    }
    
    // Apply shoulder movements
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    }
    
    // Apply wrist movements
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    // Apply body rotation
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
    
    // FIXED: Reset elbows to natural bent position (negative values)
    if (this.bodyParts.leftElbow) {
      this.bodyParts.leftElbow.rotation.set(-0.05, 0, 0); // Natural slight bend
    }
    if (this.bodyParts.rightElbow) {
      this.bodyParts.rightElbow.rotation.set(-0.03, 0, 0); // Natural slight bend
    }
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(walkingNeutralX, 0, 0);
    }
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = 0;
    }
    
    this.swingAnimation = null;
    console.log("🗡️ [EnemyAnimationSystem] Enhanced attack animation completed with fixed elbow positions");
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
