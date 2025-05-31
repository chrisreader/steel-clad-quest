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
    
    // Get weapon config rotations - use these for coordinated movement
    const weaponConfig = this.equippedWeapon.getConfig();
    const configRotations = weaponConfig.swingAnimation.rotations;
    
    console.log('🗡️ [SwordSwingAnimation] Using weapon config rotations for coordinated swing:', configRotations);
    
    // Initialize with weapon config neutral position
    let shoulderRotation = { 
      x: configRotations.neutral.x, 
      y: configRotations.neutral.y, 
      z: configRotations.neutral.z 
    };
    
    // Enhanced elbow control for linear sweep
    let elbowRotation = { x: 0.02, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 4, y: 0, z: configRotations.neutral.z };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: REDUCED shoulder movement, focus on positioning for linear sweep
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // REDUCED shoulder movement - only slight positioning, not a big arc
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.neutral.x, configRotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(configRotations.neutral.y, Math.PI / 6, easedT); // REDUCED from π/2.2 to π/6 (~30°)
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Elbow prepares for extension during sweep
      elbowRotation.x = THREE.MathUtils.lerp(0.02, 0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT); // Slight outward for linear preparation
      
      // WRIST: Primary setup for horizontal sweep - moderate right position
      wristRotation.y = THREE.MathUtils.lerp(0, Math.PI / 4, easedT); // REDUCED from π/3 to π/4 (~45°)
      wristRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Minimal torso coiling
      torsoRotation = THREE.MathUtils.lerp(0, -0.1, easedT); // REDUCED from -0.2
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - REDUCED shoulder arc, preparing for linear sweep`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: LINEAR SWEEP with wrist as primary driver
      const t = (elapsed - phases.windup) / phases.slash;
      const linearT = t; // USE LINEAR interpolation instead of eased for straight motion
      
      // MINIMAL shoulder movement - just slight repositioning
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.windup.x, configRotations.slash.x, linearT);
      shoulderRotation.y = THREE.MathUtils.lerp(Math.PI / 6, -Math.PI / 12, linearT); // MUCH smaller arc: 30° to -15°
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, linearT);
      
      // ELBOW: Extension and compensation for linear motion
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.05, linearT); // Extends for reach
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 12, -Math.PI / 8, linearT); // Compensates for linear path
      
      // WRIST: PRIMARY DRIVER of horizontal sweep motion
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 4, -Math.PI / 2, linearT); // MAJOR horizontal sweep: 45° to -90°
      wristRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, linearT);
      
      // TORSO: Counter-rotation to support linear sweep
      torsoRotation = THREE.MathUtils.lerp(-0.1, 0.2, linearT); // Counter-rotates to shoulder
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - LINEAR SWEEP: wrist drives horizontal motion, wrist Y: ${wristRotation.y.toFixed(2)}`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to weapon config neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return to weapon config neutral rotations
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.slash.x, configRotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(-Math.PI / 12, configRotations.neutral.y, easedT); // Return from small left position
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.05, 0.02, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, 0, easedT);
      
      // WRIST: Return to neutral position
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 2, 0, easedT); // Return from left sweep
      wristRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.2, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to neutral, wrist Y: ${wristRotation.y.toFixed(2)}`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the coordinated rotations for linear sweep motion
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING LINEAR SWEEP ROTATIONS ***`);
    this.applyLinearSweepRotations(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyLinearSweepRotations(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** APPLY LINEAR SWEEP *** - Blade follows straight horizontal line`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply shoulder rotations with minimal arc for positioning
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] Shoulder rotation (minimal arc): x=${shoulderRotation.x.toFixed(2)}, y=${shoulderRotation.y.toFixed(2)}, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply elbow rotations for linear path compensation
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Elbow rotation (linear compensation): x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply wrist rotations as PRIMARY DRIVER of horizontal sweep
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Wrist rotation (PRIMARY LINEAR SWEEP): x=${wristRotation.x.toFixed(2)}, y=${wristRotation.y.toFixed(2)}, z=${wristRotation.z.toFixed(2)}`);
    }
    
    // Apply supporting torso counter-rotation
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] Torso rotation (supports linear sweep): ${torsoRotation.toFixed(2)}`);
    }
    
    // Debug weapon position if available
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
    
    // Reset elbow to minimal bend for straight arm
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.05, 0, 0);
    }
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(-Math.PI / 4, 0, neutralRotation.z);
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0;
    }
    
    this.weaponSwing.isActive = false;
    console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - weaponSwing.isActive set to false');
  }
}
