
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
    
    // Get weapon config rotations as base
    const weaponConfig = this.equippedWeapon.getConfig();
    const configRotations = weaponConfig.swingAnimation.rotations;
    
    console.log('🗡️ [SwordSwingAnimation] Using CLEAN HORIZONTAL angles for right-to-left sweep:', configRotations);
    
    // Initialize rotations from weapon config
    let shoulderRotation = { 
      x: configRotations.neutral.x, 
      y: configRotations.neutral.y, 
      z: configRotations.neutral.z 
    };
    
    // Elbow and wrist for coordinated movement
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 6, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Move arm and sword to RIGHT SIDE ready position
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Use weapon config windup position (right side ready)
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.neutral.x, configRotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(configRotations.neutral.y, configRotations.windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // ELBOW: Extend to support right position
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 6, easedT); // Slight outward for right position
      
      // WRIST: Position for horizontal strike
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 8, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, configRotations.windup.z, easedT);
      
      // TORSO: Coil to the right for power
      torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - Moving to RIGHT SIDE position`);
      console.log(`🗡️ [SwordSwingAnimation] Shoulder Y angle: ${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: HORIZONTAL SWEEP from RIGHT to LEFT
      const t = (elapsed - phases.windup) / phases.slash;
      
      // AGGRESSIVE EASING for fast horizontal slash
      const aggressiveT = t * t * (3 - 2 * t);
      
      // SHOULDER: Clean horizontal sweep using weapon config angles
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.windup.x, configRotations.slash.x, aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(configRotations.windup.y, configRotations.slash.y, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // ELBOW: Support horizontal sweep
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.15, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 4, aggressiveT); // Sweep across body
      
      // WRIST: Add snap effect during middle of slash
      let wristSnapMultiplier = 1.0;
      if (t >= 0.3 && t <= 0.7) {
        const snapProgress = (t - 0.3) / 0.4;
        wristSnapMultiplier = 1.0 + Math.sin(snapProgress * Math.PI) * 0.6;
      }
      
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, Math.PI / 5 * wristSnapMultiplier, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // TORSO: Uncoil and rotate to support horizontal sweep
      torsoRotation = THREE.MathUtils.lerp(-0.3, 0.5, aggressiveT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - HORIZONTAL SWEEP`);
      console.log(`🗡️ [SwordSwingAnimation] Shoulder angles: X=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}° Y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return all joints to neutral using weapon config
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.slash.x, configRotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(configRotations.slash.y, configRotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.15, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 4, 0, easedT);
      
      // Return wrist to neutral
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 5, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, 0, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.5, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to neutral`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the coordinated arm and sword movement
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING COORDINATED MOVEMENT *** - Arm and sword moving together`);
    this.applyCoordinatedMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyCoordinatedMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** COORDINATED MOVEMENT *** - Arm segments moving together for horizontal sweep`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply SHOULDER rotations - Primary driver of horizontal sweep
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] SHOULDER: x=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}°, y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply ELBOW rotations - Support horizontal motion
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] ELBOW: x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply WRIST rotations - Add snap effect
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] WRIST: x=${wristRotation.x.toFixed(2)}, y=${wristRotation.y.toFixed(2)}, z=${wristRotation.z.toFixed(2)}`);
    }
    
    // Apply TORSO rotation for body support
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] TORSO: ${torsoRotation.toFixed(2)}`);
    }
    
    // Debug weapon position
    if (this.equippedWeapon && this.equippedWeapon.mesh) {
      const weaponWorldPos = new THREE.Vector3();
      this.equippedWeapon.mesh.getWorldPosition(weaponWorldPos);
      console.log(`🗡️ [SwordSwingAnimation] Weapon world position: x=${weaponWorldPos.x.toFixed(2)}, y=${weaponWorldPos.y.toFixed(2)}, z=${weaponWorldPos.z.toFixed(2)}`);
    }
  }
  
  private completeAnimation(): void {
    console.log('🗡️ [SwordSwingAnimation] *** COMPLETING ANIMATION *** - Resetting to weapon config neutral rotations');
    
    // Get weapon config for neutral position
    const weaponConfig = this.equippedWeapon.getConfig();
    const neutralRotation = weaponConfig.swingAnimation.rotations.neutral;
    
    // Reset to weapon config neutral rotations
    this.playerBody.rightArm.rotation.set(neutralRotation.x, neutralRotation.y, neutralRotation.z);
    
    // Reset elbow to minimal bend
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
    console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - weaponSwing.isActive set to false');
  }
}
