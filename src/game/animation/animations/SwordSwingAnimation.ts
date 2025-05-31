
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
    
    // Coordinated elbow rotation that follows the shoulder naturally - FIXED TO BEND FORWARD
    let elbowRotation = { x: 0.1, y: 0, z: 0 }; // Start with slight forward bend (was -0.1)
    let wristRotation = { x: -Math.PI / 4, y: 0, z: configRotations.neutral.z }; // Use config Z for wrist snap
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Move to upper-right position using weapon config windup
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Use weapon config windup rotations directly for coordinated movement
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.neutral.x, configRotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(configRotations.neutral.y, configRotations.windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Elbow follows shoulder naturally - forward bend for power coiling (FIXED: was -0.1 to -0.6)
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.6, easedT); // Forward bending increases
      elbowRotation.y = 0; // Keep elbow aligned with shoulder movement
      
      // Slight torso coiling to support the windup
      torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - Moving to upper-right (config windup), elbow forward bend: ${elbowRotation.x.toFixed(2)}`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Sweep from upper-right to left using weapon config slash
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration for powerful slash
      
      // Use weapon config slash rotations for the coordinated right-to-left sweep
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.windup.x, configRotations.slash.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(configRotations.windup.y, configRotations.slash.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, easedT);
      
      // Elbow follows shoulder naturally - extends as arm sweeps across (FIXED: was -0.6 to -0.2)
      elbowRotation.x = THREE.MathUtils.lerp(0.6, 0.2, easedT); // Forward extension during sweep
      elbowRotation.y = 0; // Keep aligned with shoulder movement
      
      // Wrist snap using weapon config Z-rotation for finishing power
      wristRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, easedT);
      
      // Torso uncoils to support the sweep
      torsoRotation = THREE.MathUtils.lerp(-0.3, 0.8, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - Sweeping right-to-left (config slash), elbow forward extension: ${elbowRotation.x.toFixed(2)}`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to weapon config neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return to weapon config neutral rotations for coordinated recovery
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.slash.x, configRotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(configRotations.slash.y, configRotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Elbow returns to natural position following shoulder (FIXED: was -0.2 to -0.1)
      elbowRotation.x = THREE.MathUtils.lerp(0.2, 0.1, easedT); // Return to slight forward bend
      elbowRotation.y = 0;
      
      // Wrist returns to neutral
      wristRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.8, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to neutral (config neutral), elbow forward bend: ${elbowRotation.x.toFixed(2)}`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the coordinated rotations to all joints
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING COORDINATED ROTATIONS FROM WEAPON CONFIG ***`);
    this.applyLocalRotations(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyLocalRotations(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** APPLY COORDINATED ROTATIONS *** - Shoulder leads, elbow follows forward`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply shoulder rotations using weapon config values - this drives the entire movement
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] Shoulder rotation (drives movement): x=${shoulderRotation.x.toFixed(2)}, y=${shoulderRotation.y.toFixed(2)}, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply coordinated elbow rotations that follow the shoulder naturally - NOW BENDING FORWARD
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Elbow rotation (follows shoulder FORWARD): x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply wrist rotations with weapon config Z-rotation for snap
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Wrist rotation (adds snap): x=${wristRotation.x.toFixed(2)}, z=${wristRotation.z.toFixed(2)}`);
    }
    
    // Apply supporting torso rotation
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] Torso rotation (supports movement): ${torsoRotation.toFixed(2)}`);
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
    
    // Reset to weapon config neutral rotations for coordinated return
    this.playerBody.rightArm.rotation.set(neutralRotation.x, neutralRotation.y, neutralRotation.z);
    
    // Reset elbow to natural forward position that follows shoulder (FIXED: was -0.1)
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.1, 0, 0); // Natural slight forward bend
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
