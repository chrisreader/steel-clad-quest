
import * as THREE from 'three';
import { PlayerBody, WeaponSwingAnimation } from '../../../types/GameTypes';
import { STANDARD_SWORD_ANIMATION } from '../StandardSwordAnimation';

export class SwordSwingAnimation {
  private weaponSwing: WeaponSwingAnimation;
  private playerBody: PlayerBody;
  private equippedWeapon: any;
  
  constructor(weaponSwing: WeaponSwingAnimation, playerBody: PlayerBody, equippedWeapon: any) {
    this.weaponSwing = weaponSwing;
    this.playerBody = playerBody;
    this.equippedWeapon = equippedWeapon;
    
    // Constructor called - using standardized sword animation
  }
  
  public update(): void {
    // Update method called
    
    if (!this.weaponSwing) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - weaponSwing is null/undefined');
      return;
    }
    
    if (!this.weaponSwing.isActive) {
      // Update skipped - weaponSwing not active
      return;
    }
    
    if (!this.weaponSwing.clock) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - weaponSwing.clock is null/undefined');
      return;
    }
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, duration, rotations } = STANDARD_SWORD_ANIMATION;
    
    // Standardized animation active
    
    // Initialize rotations from standardized config
    let shoulderRotation = { 
      x: rotations.neutral.x, 
      y: rotations.neutral.y, 
      z: rotations.neutral.z 
    };
    
    // Elbow and wrist for coordinated movement
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 6, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Smooth interpolation from neutral to raised position
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Use standardized windup position
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.neutral.x, rotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.neutral.y, rotations.windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.neutral.z, rotations.windup.z, easedT);
      
      // ELBOW: Extend to support right position
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 6, easedT);
      
      // WRIST: Position for diagonal strike
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 8, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, rotations.windup.z, easedT);
      
      // TORSO: Coil to the right for power
      torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT);
      
      // Windup phase
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Use standardized slash movement
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t); // Smoothstep for aggressive acceleration
      
      // SHOULDER: Movement from windup to standardized slash end position
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.windup.z, rotations.slash.z, aggressiveT);
      
      // ELBOW: Aggressive movement to support fast diagonal
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.15, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 6, aggressiveT);
      
      // WRIST: Aggressive movement with snap
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, Math.PI / 10, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(rotations.windup.z, 0, aggressiveT);
      
      // TORSO: Aggressive rotation to support diagonal movement
      torsoRotation = THREE.MathUtils.lerp(-0.3, 0.25, aggressiveT);
      
      // Slash phase
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return from slash end position to neutral
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.slash.x, rotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.slash.y, rotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.slash.z, rotations.neutral.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.15, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 6, 0, easedT);
      
      // Return wrist to neutral
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 10, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.25, 0, easedT);
      
      // Recovery phase
      
    } else {
      // ANIMATION COMPLETE
      // Animation complete
      this.completeAnimation();
      return;
    }
    
    // Apply the coordinated arm and sword movement
    this.applyCoordinatedMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyCoordinatedMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply SHOULDER rotations
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    
    // Apply ELBOW rotations
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    // Apply WRIST rotations
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    // Apply TORSO rotation
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
    }
  }
  
  private completeAnimation(): void {
    // Completing animation - resetting to neutral
    
    // Reset to standardized neutral rotations
    const neutralRotation = STANDARD_SWORD_ANIMATION.rotations.neutral;
    
    this.playerBody.rightArm.rotation.set(neutralRotation.x, neutralRotation.y, neutralRotation.z);
    
    // Reset other joints
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.05, 0, 0);
    }
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(-Math.PI / 6, 0, 0);
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0;
    }
    
    this.weaponSwing.isActive = false;
    // Animation complete - weaponSwing.isActive set to false
  }
}
