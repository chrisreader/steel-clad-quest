import * as THREE from 'three';
import { EnemyBodyParts, EnemyBodyMetrics } from '../entities/EnemyBody';
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
    
    console.log(`🎭 [EnemyAnimationSystem] Initialized with enhanced anatomical movement for ${enemyType}`);
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
      characterSeed: Math.random() * 1000,
      asymmetryIntensity: 0.1,
      legLength: this.metrics.scale.leg.length,
      armLength: this.metrics.scale.arm.length
    };

    switch (enemyType.toLowerCase()) {
      case 'orc':
        return {
          ...baseConfig,
          kneeFlexionIntensity: 1.2,
          elbowSwingIntensity: 1.1,
          weaponWeight: 0.8,
          combatStanceType: 'aggressive',
          weaponType: 'axe',
          asymmetryIntensity: 0.15
        };
      case 'goblin':
        return {
          ...baseConfig,
          kneeFlexionIntensity: 1.4,
          elbowSwingIntensity: 1.3,
          weaponWeight: 0.5,
          combatStanceType: 'aggressive',
          weaponType: 'sword',
          asymmetryIntensity: 0.2
        };
      default:
        return baseConfig;
    }
  }
  
  public updateWalkAnimation(deltaTime: number, isMoving: boolean, movementSpeed: number): void {
    const enhancedNeutralPoses = {
      bodyY: this.metrics.positions.bodyY,
      headY: this.metrics.positions.headY,
      shoulderHeight: this.metrics.positions.shoulderHeight,
      bodyRadius: this.metrics.scale.body.radius,
      arms: this.metrics.neutralPoses.arms,
      elbows: this.metrics.neutralPoses.elbows,
      wrists: this.metrics.neutralPoses.wrists
    };

    this.realisticMovement.updateRealisticWalk(
      this.bodyParts,
      deltaTime,
      isMoving,
      movementSpeed,
      enhancedNeutralPoses
    );

    if (isMoving) {
      this.walkTime += deltaTime * movementSpeed * this.metrics.animationMetrics.walkCycleSpeed;
    }

    // ENHANCED: Add anatomical body movement during walking
    this.updateAnatomicalWalkAnimation(deltaTime, isMoving);

    // Enhanced leg animation
    if (isMoving && this.bodyParts.leftLeg && this.bodyParts.rightLeg) {
      const legSwing = Math.sin(this.walkTime + Math.PI) * this.metrics.animationMetrics.legSwingIntensity;
      this.bodyParts.leftLeg.rotation.x = legSwing;
      this.bodyParts.rightLeg.rotation.x = -legSwing;
    }

    // Enhanced arm movement
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

  /**
   * NEW: Enhanced anatomical movement for chest, pelvis, and shoulders during walking
   */
  private updateAnatomicalWalkAnimation(deltaTime: number, isMoving: boolean): void {
    if (!isMoving && !this.isAttacking()) {
      this.updateAnatomicalIdleAnimation(deltaTime);
      return;
    }

    const walkPhase = (this.walkTime % (Math.PI * 2)) / (Math.PI * 2);
    
    // Enhanced shoulder movement with anatomical constraints
    this.updateShoulderWalkAnimation(deltaTime, isMoving);
    
    // NEW: Chest movement during walking
    this.updateChestWalkAnimation(walkPhase, isMoving);
    
    // NEW: Pelvis movement during walking
    this.updatePelvisWalkAnimation(walkPhase, isMoving);
    
    console.log('🏃 [EnemyAnimationSystem] Updated anatomical movement for walking');
  }

  /**
   * Enhanced shoulder movement during walking animation
   */
  private updateShoulderWalkAnimation(deltaTime: number, isMoving: boolean): void {
    if (!this.bodyParts.leftShoulder || !this.bodyParts.rightShoulder) return;
    
    if (isMoving && !this.isAttacking()) {
      const armSwing = Math.sin(this.walkTime) * this.metrics.animationMetrics.armSwingIntensity;
      const shoulderRoll = Math.sin(this.walkTime * 0.5) * this.metrics.animationMetrics.shoulderMovement;
      
      // Enhanced shoulder blade movement - retraction/protraction
      const shoulderBladeMovement = Math.sin(this.walkTime * 2) * 0.1;
      
      // Left shoulder (weapon side) - moves with left arm
      const leftShoulderMovement = armSwing * 0.4;
      this.bodyParts.leftShoulder.rotation.x = leftShoulderMovement * 0.5;
      this.bodyParts.leftShoulder.rotation.y = shoulderRoll * 0.3 + shoulderBladeMovement;
      this.bodyParts.leftShoulder.rotation.z = leftShoulderMovement * 0.2;
      
      // Shoulder position adjustment for natural movement
      this.bodyParts.leftShoulder.position.z = shoulderBladeMovement * 0.05; // Protraction/retraction
      
      // Right shoulder - counter-movement to left shoulder
      const rightShoulderMovement = -armSwing * 0.3;
      this.bodyParts.rightShoulder.rotation.x = rightShoulderMovement * 0.5;
      this.bodyParts.rightShoulder.rotation.y = -shoulderRoll * 0.3 - shoulderBladeMovement;
      this.bodyParts.rightShoulder.rotation.z = rightShoulderMovement * 0.2;
      
      // Shoulder position adjustment
      this.bodyParts.rightShoulder.position.z = -shoulderBladeMovement * 0.05;
      
    } else {
      // Return shoulders to neutral position when not moving
      const returnSpeed = deltaTime * 3;
      
      if (this.bodyParts.leftShoulder) {
        this.bodyParts.leftShoulder.rotation.x = THREE.MathUtils.lerp(this.bodyParts.leftShoulder.rotation.x, 0, returnSpeed);
        this.bodyParts.leftShoulder.rotation.y = THREE.MathUtils.lerp(this.bodyParts.leftShoulder.rotation.y, 0, returnSpeed);
        this.bodyParts.leftShoulder.rotation.z = THREE.MathUtils.lerp(this.bodyParts.leftShoulder.rotation.z, 0, returnSpeed);
        this.bodyParts.leftShoulder.position.z = THREE.MathUtils.lerp(this.bodyParts.leftShoulder.position.z, 0, returnSpeed);
      }
      
      if (this.bodyParts.rightShoulder) {
        this.bodyParts.rightShoulder.rotation.x = THREE.MathUtils.lerp(this.bodyParts.rightShoulder.rotation.x, 0, returnSpeed);
        this.bodyParts.rightShoulder.rotation.y = THREE.MathUtils.lerp(this.bodyParts.rightShoulder.rotation.y, 0, returnSpeed);
        this.bodyParts.rightShoulder.rotation.z = THREE.MathUtils.lerp(this.bodyParts.rightShoulder.rotation.z, 0, returnSpeed);
        this.bodyParts.rightShoulder.position.z = THREE.MathUtils.lerp(this.bodyParts.rightShoulder.position.z, 0, returnSpeed);
      }
    }
  }

  /**
   * NEW: Chest movement during walking - breathing and rotation
   */
  private updateChestWalkAnimation(walkPhase: number, isMoving: boolean): void {
    if (!this.bodyParts.chest) return;
    
    // Chest counter-rotation to pelvis for natural gait
    const chestRotation = Math.sin(walkPhase * Math.PI * 2) * 0.08; // Counter to hip sway
    
    // Breathing expansion during walking (more pronounced than idle)
    const walkingBreathingPhase = Math.sin(this.walkTime * 3) * 0.03;
    
    // Apply chest rotation (opposite to hip rotation)
    this.bodyParts.chest.rotation.y = -chestRotation; // Counter-rotate to hips
    this.bodyParts.chest.rotation.z = chestRotation * 0.5; // Slight lean into movement
    
    // Chest expansion/contraction
    this.bodyParts.chest.scale.x = 1 + walkingBreathingPhase;
    this.bodyParts.chest.scale.z = 1 + walkingBreathingPhase * 0.7; // Less expansion front-to-back
    
    // Vertical movement follows body bob
    this.bodyParts.chest.position.y = Math.sin(walkPhase * Math.PI * 4) * 0.02;
  }

  /**
   * NEW: Pelvis movement during walking - rotation and tilt
   */
  private updatePelvisWalkAnimation(walkPhase: number, isMoving: boolean): void {
    if (!this.bodyParts.pelvis) return;
    
    // Pelvis rotation during walking (opposite to chest)
    const pelvisRotation = Math.sin(walkPhase * Math.PI * 2) * 0.12; // Primary rotation axis
    
    // Pelvis tilt forward/backward based on leg movement
    const pelvisTilt = Math.sin(walkPhase * Math.PI * 4) * 0.05;
    
    // Weight transfer side-to-side
    const weightTransfer = Math.sin(walkPhase * Math.PI * 2) * 0.06;
    
    // Apply pelvis movements
    this.bodyParts.pelvis.rotation.y = pelvisRotation; // Primary rotation
    this.bodyParts.pelvis.rotation.x = pelvisTilt; // Forward/backward tilt
    this.bodyParts.pelvis.rotation.z = weightTransfer; // Side-to-side weight shift
    
    // Vertical bob following leg movement
    this.bodyParts.pelvis.position.y = Math.sin(walkPhase * Math.PI * 4) * 0.015;
  }

  /**
   * NEW: Anatomical idle animation for chest, pelvis, and shoulders
   */
  private updateAnatomicalIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;
    
    // Breathing cycle for chest
    if (this.bodyParts.chest) {
      const breathingPhase = Math.sin(this.idleTime * 4) * 0.02;
      this.bodyParts.chest.scale.x = 1 + breathingPhase;
      this.bodyParts.chest.scale.z = 1 + breathingPhase * 0.5;
      this.bodyParts.chest.position.y = breathingPhase * 0.3;
    }
    
    // Subtle pelvis micro-movements
    if (this.bodyParts.pelvis) {
      const microMovement = Math.sin(this.idleTime * 1.5) * 0.01;
      this.bodyParts.pelvis.rotation.x = microMovement;
      this.bodyParts.pelvis.rotation.z = microMovement * 0.5;
    }
    
    // Shoulder relaxation
    if (this.bodyParts.leftShoulder && this.bodyParts.rightShoulder) {
      const shoulderBreathing = Math.sin(this.idleTime * 4) * 0.005;
      this.bodyParts.leftShoulder.rotation.x = shoulderBreathing;
      this.bodyParts.rightShoulder.rotation.x = shoulderBreathing;
    }
  }
  
  private updateIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;
    
    const enhancedNeutralPoses = {
      bodyY: this.metrics.positions.bodyY,
      headY: this.metrics.positions.headY,
      shoulderHeight: this.metrics.positions.shoulderHeight,
      bodyRadius: this.metrics.scale.body.radius,
      arms: this.metrics.neutralPoses.arms,
      elbows: this.metrics.neutralPoses.elbows,
      wrists: this.metrics.neutralPoses.wrists
    };
    
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
    
    console.log("🗡️ [EnemyAnimationSystem] Started enhanced attack animation with anatomical movement");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { duration } = STANDARD_SWORD_ANIMATION;
    
    const attackProgress = Math.min(elapsed / duration, 1);
    
    const enhancedNeutralPoses = {
      bodyY: this.metrics.positions.bodyY,
      headY: this.metrics.positions.headY,
      shoulderHeight: this.metrics.positions.shoulderHeight,
      bodyRadius: this.metrics.scale.body.radius,
      arms: this.metrics.neutralPoses.arms,
      elbows: this.metrics.neutralPoses.elbows,
      wrists: this.metrics.neutralPoses.wrists
    };
    
    this.realisticMovement.updateRealisticAttack(
      this.bodyParts,
      attackProgress,
      enhancedNeutralPoses
    );
    
    // NEW: Enhanced anatomical attack animation
    this.updateAnatomicalAttackAnimation(attackProgress);
    
    this.applyWeaponSwingMovement(elapsed);
    
    if (elapsed >= duration) {
      this.completeAttackAnimation();
      return false;
    }
    
    return true;
  }

  /**
   * NEW: Enhanced anatomical movement during attacks
   */
  private updateAnatomicalAttackAnimation(attackProgress: number): void {
    // Chest muscle tension and rotation during attack
    if (this.bodyParts.chest) {
      if (attackProgress < 0.3) {
        // Windup: chest expansion and rotation
        const windupIntensity = attackProgress / 0.3;
        this.bodyParts.chest.rotation.y = THREE.MathUtils.lerp(0, -0.2, windupIntensity);
        this.bodyParts.chest.scale.x = THREE.MathUtils.lerp(1, 1.05, windupIntensity); // Muscle tension
      } else if (attackProgress < 0.6) {
        // Strike: rapid rotation and contraction
        const strikeIntensity = (attackProgress - 0.3) / 0.3;
        this.bodyParts.chest.rotation.y = THREE.MathUtils.lerp(-0.2, 0.15, strikeIntensity);
        this.bodyParts.chest.scale.x = THREE.MathUtils.lerp(1.05, 0.98, strikeIntensity); // Muscle contraction
      } else {
        // Recovery: return to neutral
        const recoveryIntensity = (attackProgress - 0.6) / 0.4;
        this.bodyParts.chest.rotation.y = THREE.MathUtils.lerp(0.15, 0, recoveryIntensity);
        this.bodyParts.chest.scale.x = THREE.MathUtils.lerp(0.98, 1, recoveryIntensity);
      }
    }

    // Pelvis bracing and power generation
    if (this.bodyParts.pelvis) {
      if (attackProgress < 0.3) {
        // Windup: pelvis rotation for power buildup
        const windupIntensity = attackProgress / 0.3;
        this.bodyParts.pelvis.rotation.y = THREE.MathUtils.lerp(0, 0.15, windupIntensity);
        this.bodyParts.pelvis.rotation.x = THREE.MathUtils.lerp(0, -0.05, windupIntensity); // Slight backward tilt
      } else if (attackProgress < 0.6) {
        // Strike: rapid pelvis snap for power transfer
        const strikeIntensity = (attackProgress - 0.3) / 0.3;
        this.bodyParts.pelvis.rotation.y = THREE.MathUtils.lerp(0.15, -0.1, strikeIntensity);
        this.bodyParts.pelvis.rotation.x = THREE.MathUtils.lerp(-0.05, 0.03, strikeIntensity); // Forward thrust
      } else {
        // Recovery: return to neutral
        const recoveryIntensity = (attackProgress - 0.6) / 0.4;
        this.bodyParts.pelvis.rotation.y = THREE.MathUtils.lerp(-0.1, 0, recoveryIntensity);
        this.bodyParts.pelvis.rotation.x = THREE.MathUtils.lerp(0.03, 0, recoveryIntensity);
      }
    }

    // Enhanced shoulder blade movement during attacks
    if (this.bodyParts.leftShoulder && this.bodyParts.rightShoulder) {
      if (attackProgress < 0.3) {
        // Windup: shoulder blade retraction
        const windupIntensity = attackProgress / 0.3;
        this.bodyParts.leftShoulder.position.z = THREE.MathUtils.lerp(0, -0.1, windupIntensity); // Retraction
        this.bodyParts.leftShoulder.rotation.y = THREE.MathUtils.lerp(0, -0.15, windupIntensity);
        this.bodyParts.rightShoulder.position.z = THREE.MathUtils.lerp(0, 0.05, windupIntensity); // Counter-movement
      } else if (attackProgress < 0.6) {
        // Strike: rapid protraction
        const strikeIntensity = (attackProgress - 0.3) / 0.3;
        this.bodyParts.leftShoulder.position.z = THREE.MathUtils.lerp(-0.1, 0.08, strikeIntensity); // Protraction
        this.bodyParts.leftShoulder.rotation.y = THREE.MathUtils.lerp(-0.15, 0.1, strikeIntensity);
        this.bodyParts.rightShoulder.position.z = THREE.MathUtils.lerp(0.05, -0.03, strikeIntensity);
      } else {
        // Recovery: return to neutral
        const recoveryIntensity = (attackProgress - 0.6) / 0.4;
        this.bodyParts.leftShoulder.position.z = THREE.MathUtils.lerp(0.08, 0, recoveryIntensity);
        this.bodyParts.leftShoulder.rotation.y = THREE.MathUtils.lerp(0.1, 0, recoveryIntensity);
        this.bodyParts.rightShoulder.position.z = THREE.MathUtils.lerp(-0.03, 0, recoveryIntensity);
      }
    }
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
    
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
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
      this.bodyParts.leftElbow.rotation.set(-0.05, 0, 0);
    }
    if (this.bodyParts.rightElbow) {
      this.bodyParts.rightElbow.rotation.set(-0.03, 0, 0);
    }
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.rotation.set(walkingNeutralX, 0, 0);
    }
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.y = 0;
    }
    
    // Reset anatomical parts to neutral
    if (this.bodyParts.chest) {
      this.bodyParts.chest.rotation.set(0, 0, 0);
      this.bodyParts.chest.scale.set(1, 1, 1);
    }
    if (this.bodyParts.pelvis) {
      this.bodyParts.pelvis.rotation.set(0, 0, 0);
    }
    if (this.bodyParts.leftShoulder && this.bodyParts.rightShoulder) {
      this.bodyParts.leftShoulder.position.z = 0;
      this.bodyParts.leftShoulder.rotation.set(0, 0, 0);
      this.bodyParts.rightShoulder.position.z = 0;
      this.bodyParts.rightShoulder.rotation.set(0, 0, 0);
    }
    
    this.swingAnimation = null;
    console.log("🗡️ [EnemyAnimationSystem] Enhanced anatomical attack animation completed");
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
