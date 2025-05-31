
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
    
    // Cross-body swing using local rotations only
    let shoulderRotation = { x: Math.PI / 3, y: 0, z: 0 }; // Default ready position
    let elbowRotation = { x: -0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 4, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Prepare for cross-body swing - move to right side
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Shoulder rotation - preparing for strike with cross-body movement
      shoulderRotation.x = THREE.MathUtils.lerp(Math.PI / 3, Math.PI / 3 + THREE.MathUtils.degToRad(35), easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(-45), easedT); // Cross-body right position
      shoulderRotation.z = THREE.MathUtils.lerp(0, -0.4, easedT);
      
      // Elbow - dramatic bend for power coiling
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, -2.4, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, 0.6, easedT);
      
      // Torso coiling for power
      torsoRotation = THREE.MathUtils.lerp(0, -1.3, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - Shoulder Y rotation: ${shoulderRotation.y.toFixed(2)}`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Cross-body sweep from right to left using shoulder Y rotation
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration
      
      // Shoulder rotation - driving the cross-body swing
      shoulderRotation.x = THREE.MathUtils.lerp(Math.PI / 3 + THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(45), easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-45), THREE.MathUtils.degToRad(45), easedT); // Cross-body sweep from right to left
      shoulderRotation.z = THREE.MathUtils.lerp(-0.4, 0.6, easedT);
      
      // Elbow - EXPLOSIVE extension for maximum reach
      elbowRotation.x = THREE.MathUtils.lerp(-2.4, 2.0, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0.6, -0.7, easedT);
      
      // Torso uncoiling with maximum power
      torsoRotation = THREE.MathUtils.lerp(-1.3, 1.7, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - Shoulder Y rotation: ${shoulderRotation.y.toFixed(2)}`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to center ready position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return to ready positions
      shoulderRotation.x = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(45), Math.PI / 3, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(45), 0, easedT); // Return to center
      shoulderRotation.z = THREE.MathUtils.lerp(0.6, 0, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(2.0, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-0.7, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(1.7, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Shoulder Y rotation: ${shoulderRotation.y.toFixed(2)}`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the local rotations directly to the joints
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING LOCAL ROTATIONS ONLY ***`);
    this.applyLocalRotations(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyLocalRotations(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** APPLY LOCAL ROTATIONS *** - No position changes, only rotations`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply shoulder rotations - this creates the cross-body swing motion
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] Shoulder rotation applied: x=${shoulderRotation.x.toFixed(2)}, y=${shoulderRotation.y.toFixed(2)}, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply elbow rotations
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Elbow rotation applied: x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply wrist rotations
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Wrist rotation applied`);
    }
    
    // Apply torso rotation
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
    console.log('🗡️ [SwordSwingAnimation] *** COMPLETING ANIMATION *** - Resetting to original rotations');
    
    // Reset to original rotations only - no position changes
    this.playerBody.rightArm.rotation.set(Math.PI / 3, 0, 0);
    
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(-0.05, 0, 0);
    }
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(-Math.PI / 4, 0, 0);
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0;
    }
    
    this.weaponSwing.isActive = false;
    console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - weaponSwing.isActive set to false');
  }
}
