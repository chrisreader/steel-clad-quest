
import * as THREE from 'three';
import { PlayerBody, WeaponSwingAnimation } from '../../../types/GameTypes';

export class SwordSwingAnimation {
  private weaponSwing: WeaponSwingAnimation;
  private playerBody: PlayerBody;
  private equippedWeapon: any;
  
  constructor(weaponSwing: WeaponSwingAnimation, playerBody: PlayerBody, equippedWeapon: any) {
    this.weaponSwing = weaponSwing;
    this.playerBody = playerBody;
    this.equippedWeapon = equippedWeapon;
    
    console.log('🗡️ [SwordSwingAnimation] *** CONSTRUCTOR CALLED *** - NEW INSTANCE CREATED');
    console.log('🗡️ [SwordSwingAnimation] *** DEBUGGING TRACE *** - Constructor parameters received:');
    console.log('🗡️ [SwordSwingAnimation]   - weaponSwing exists:', !!weaponSwing);
    console.log('🗡️ [SwordSwingAnimation]   - playerBody exists:', !!playerBody);
    console.log('🗡️ [SwordSwingAnimation]   - equippedWeapon exists:', !!equippedWeapon);
    console.log('🗡️ [SwordSwingAnimation]   - weaponSwing.isActive:', weaponSwing?.isActive);
    console.log('🗡️ [SwordSwingAnimation]   - weaponSwing.duration:', weaponSwing?.duration);
  }
  
  public update(): void {
    console.log('🗡️ [SwordSwingAnimation] *** UPDATE METHOD CALLED ***');
    console.log('🗡️ [SwordSwingAnimation] weaponSwing.isActive:', this.weaponSwing?.isActive);
    console.log('🗡️ [SwordSwingAnimation] equippedWeapon exists:', !!this.equippedWeapon);
    
    if (!this.weaponSwing) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - weaponSwing is null/undefined');
      return;
    }
    
    if (!this.weaponSwing.isActive) {
      console.log('🗡️ [SwordSwingAnimation] Update SKIPPED - weaponSwing not active');
      return;
    }
    
    if (!this.equippedWeapon) {
      console.log('🗡️ [SwordSwingAnimation] Update SKIPPED - no equipped weapon');
      return;
    }
    
    if (!this.weaponSwing.clock) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - weaponSwing.clock is null/undefined');
      return;
    }
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, duration } = this.weaponSwing;
    
    console.log(`🗡️ [SwordSwingAnimation] *** ANIMATION ACTIVE *** - Elapsed: ${elapsed.toFixed(3)}s, Duration: ${duration}s`);
    console.log(`🗡️ [SwordSwingAnimation] Animation phases:`, phases);
    
    // Get weapon configuration rotations
    const weaponConfig = this.equippedWeapon.getConfig();
    const rotations = weaponConfig.swingAnimation.rotations;
    
    console.log('🗡️ [SwordSwingAnimation] Using weapon config rotations:', rotations);
    
    // Initialize with neutral position from weapon config
    let shoulderRotation = { ...rotations.neutral };
    let elbowRotation = { x: 0.2, y: 0, z: 0 }; // Natural forward elbow bend
    let wristRotation = { x: 0, y: 0, z: 0 }; // Neutral wrist
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Move from neutral to windup position
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Shoulder rotation - X stays the same, Y creates right-to-left arc
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.neutral.x, rotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(45), easedT); // Right position
      shoulderRotation.z = rotations.neutral.z;
      
      // Natural elbow bend for windup - positive values for forward bending
      elbowRotation.x = THREE.MathUtils.lerp(0.2, 0.8, easedT);
      
      // Minimal torso rotation for power buildup
      torsoRotation = THREE.MathUtils.lerp(0, 0.2, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - Moving to right position`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Move from windup to slash position creating right-to-left arc
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration
      
      // Shoulder rotation - X moves down, Y sweeps from right to left
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(45), THREE.MathUtils.degToRad(-45), easedT); // Right to left sweep
      shoulderRotation.z = rotations.neutral.z;
      
      // Elbow extension for striking - positive values
      elbowRotation.x = THREE.MathUtils.lerp(0.8, 0.1, easedT);
      
      // Minimal wrist movement
      wristRotation.z = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(-10), easedT);
      
      // Torso follows the motion
      torsoRotation = THREE.MathUtils.lerp(0.2, -0.2, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - Right to left sweep`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return from slash to neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return to neutral positions
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.slash.x, rotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-45), 0, easedT); // Return to center
      shoulderRotation.z = rotations.neutral.z;
      
      // Return elbow to natural position - positive values
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.2, easedT);
      
      // Return wrist to neutral
      wristRotation.z = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-10), 0, easedT);
      
      // Return torso to center
      torsoRotation = THREE.MathUtils.lerp(-0.2, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to neutral`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the rotations
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING CORRECTED ROTATIONS ***`);
    this.applyLocalRotations(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyLocalRotations(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** APPLY LOCAL ROTATIONS *** - Natural elbow bending`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply shoulder rotations for the right-to-left arc
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] Shoulder rotation applied: x=${shoulderRotation.x.toFixed(2)}, y=${shoulderRotation.y.toFixed(2)}, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply natural elbow rotations - positive values for forward bending
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Elbow rotation applied: x=${elbowRotation.x.toFixed(2)} (positive = forward bend)`);
    }
    
    // Apply minimal wrist rotations
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Wrist rotation applied: z=${wristRotation.z.toFixed(2)}`);
    }
    
    // Apply coordinated torso rotation
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] Torso rotation applied: ${torsoRotation.toFixed(2)}`);
    }
    
    // Debug weapon position if available
    if (this.equippedWeapon && this.equippedWeapon.mesh) {
      const weaponWorldPos = new THREE.Vector3();
      this.equippedWeapon.mesh.getWorldPosition(weaponWorldPos);
      console.log(`🗡️ [SwordSwingAnimation] Weapon world position: x=${weaponWorldPos.x.toFixed(2)}, y=${weaponWorldPos.y.toFixed(2)}, z=${weaponWorldPos.z.toFixed(2)}`);
    }
  }
  
  private completeAnimation(): void {
    console.log('🗡️ [SwordSwingAnimation] *** COMPLETING ANIMATION *** - Resetting to neutral');
    
    // Get weapon configuration rotations for proper reset
    const weaponConfig = this.equippedWeapon.getConfig();
    const neutralRotation = weaponConfig.swingAnimation.rotations.neutral;
    
    // Reset to neutral rotations
    this.playerBody.rightArm.rotation.set(neutralRotation.x, 0, neutralRotation.z); // Y back to center
    
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.2, 0, 0); // Natural resting position - positive
    }
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(0, 0, 0); // Neutral wrist
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0; // Center torso
    }
    
    this.weaponSwing.isActive = false;
    console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - weaponSwing.isActive set to false');
  }
}
