import * as THREE from 'three';
import { EnemyBodyParts } from '../entities/EnemyBody';
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
  private walkTime: number = 0;
  private idleTime: number = 0;
  private swingAnimation: EnemySwingAnimation | null = null;
  private animationConfigs = ANIMATION_CONFIGS.melee;
  
  // FIXED: Updated to match correct body position from EnemyBodyBuilder
  private originalBodyY: number = 2.1; // Body center position (correct value)
  
  constructor(bodyParts: EnemyBodyParts) {
    this.bodyParts = bodyParts;
    console.log("🎭 [EnemyAnimationSystem] Initialized with FIXED body positioning - body center at Y=2.1");
  }
  
  public updateWalkAnimation(deltaTime: number, isMoving: boolean, movementSpeed: number): void {
    if (!isMoving) {
      this.updateIdleAnimation(deltaTime);
      return;
    }
    
    this.walkTime += deltaTime * movementSpeed * this.animationConfigs.walkCycleSpeed;
    
    // Enhanced walking animation using relative positioning
    const armSwing = Math.sin(this.walkTime) * this.animationConfigs.armSwingIntensity;
    const legSwing = Math.sin(this.walkTime + Math.PI) * this.animationConfigs.legSwingIntensity;
    const shoulderSway = Math.sin(this.walkTime * 0.5) * this.animationConfigs.shoulderMovement;
    
    // === BODY ANIMATION (FIXED) ===
    // Apply walking bob as OFFSET from original position, not absolute
    if (this.bodyParts.body) {
      const walkingBob = Math.sin(this.walkTime * 2) * 0.05;
      this.bodyParts.body.position.y = this.originalBodyY + walkingBob; // 2.1 + offset
    }
    
    // ARM MOVEMENT - Coordinated shoulder, elbow, wrist (FIXED: FORWARD-FACING)
    if (this.bodyParts.leftArm && this.bodyParts.rightArm) {
      // Left arm system - FIXED: Use negative base rotation for forward-facing
      this.bodyParts.leftArm.rotation.x = armSwing - Math.PI / 8; // FIXED: negative base for forward
      this.bodyParts.leftArm.rotation.z = 0.3 + shoulderSway;
      
      if (this.bodyParts.leftElbow) {
        this.bodyParts.leftElbow.rotation.x = -Math.abs(armSwing) * 0.5;
      }
      if (this.bodyParts.leftWrist) {
        this.bodyParts.leftWrist.rotation.x = armSwing * 0.3;
      }
      
      // Right arm system (weapon arm - less swing when holding weapon) - FIXED: FORWARD-FACING
      const weaponArmSwing = armSwing * 0.6; // Reduced swing for weapon control
      this.bodyParts.rightArm.rotation.x = -weaponArmSwing - Math.PI / 6; // FIXED: negative base for forward
      this.bodyParts.rightArm.rotation.z = -0.3 - shoulderSway;
      
      if (this.bodyParts.rightElbow) {
        this.bodyParts.rightElbow.rotation.x = -Math.abs(weaponArmSwing) * 0.4;
      }
      if (this.bodyParts.rightWrist) {
        this.bodyParts.rightWrist.rotation.x = -weaponArmSwing * 0.2;
      }
    }
    
    // === LEG ANIMATIONS (UNCHANGED) ===
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
    
    console.log(`🎭 [EnemyAnimationSystem] FIXED walking: body Y=${this.bodyParts.body?.position.y.toFixed(3)} (${this.originalBodyY} + ${(this.bodyParts.body?.position.y! - this.originalBodyY).toFixed(3)} offset)`);
  }
  
  private updateIdleAnimation(deltaTime: number): void {
    this.idleTime += deltaTime;
    const breathingIntensity = 0.02;
    
    // === IDLE BREATHING (FIXED) ===
    // Apply breathing as OFFSET from original position
    if (this.bodyParts.body) {
      const breathingOffset = Math.sin(this.idleTime * 4) * breathingIntensity;
      this.bodyParts.body.position.y = this.originalBodyY + breathingOffset; // 2.1 + offset
    }
    
    // Subtle weapon sway
    if (this.bodyParts.weapon) {
      const baseRotation = -0.3;
      this.bodyParts.weapon.rotation.z = baseRotation + Math.sin(this.idleTime * 2) * 0.1;
    }
    
    // Return arms to neutral position gradually (FIXED: FORWARD-FACING)
    const returnSpeed = deltaTime * 2;
    if (this.bodyParts.leftArm && this.bodyParts.rightArm) {
      this.bodyParts.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.leftArm.rotation.x, -Math.PI / 8, returnSpeed // FIXED: negative for forward
      );
      this.bodyParts.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.rightArm.rotation.x, -Math.PI / 6, returnSpeed // FIXED: negative for forward
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
    
    console.log("🗡️ [EnemyAnimationSystem] Started standardized attack animation using player sword system");
  }
  
  public updateAttackAnimation(deltaTime: number): boolean {
    if (!this.swingAnimation || !this.swingAnimation.isActive) {
      return false;
    }
    
    const elapsed = this.swingAnimation.clock.getElapsedTime() - this.swingAnimation.startTime;
    const { phases } = this.swingAnimation;
    const { duration, rotations } = STANDARD_SWORD_ANIMATION;
    
    // Use the same standardized animation system as the player
    let shoulderRotation = { 
      x: rotations.neutral.x, 
      y: rotations.neutral.y, 
      z: rotations.neutral.z 
    };
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 6, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE
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
      // SLASH PHASE
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
      // RECOVERY PHASE
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
      // ANIMATION COMPLETE
      this.completeAttackAnimation();
      return false;
    }
    
    // Apply the coordinated movement to enemy body parts
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
    // Apply SHOULDER rotations (right arm for weapon)
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z - 0.3, 'XYZ');
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
    // Reset to neutral positions using standardized values (FIXED: FORWARD-FACING)
    const neutralRotation = STANDARD_SWORD_ANIMATION.rotations.neutral;
    
    if (this.bodyParts.rightArm) {
      // FIXED: Use negative rotation for forward-facing neutral position
      this.bodyParts.rightArm.rotation.set(-Math.PI / 6, neutralRotation.y, neutralRotation.z - 0.3);
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
    console.log("🗡️ [EnemyAnimationSystem] Attack animation completed, returned to forward-facing neutral stance");
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
