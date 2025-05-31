
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
    
    console.log('🗡️ [SwordSwingAnimation] Using HORIZONTAL SWIPE angles for right-to-left motion:', configRotations);
    
    // SHOULDER drives HORIZONTAL SWIPE - RIGHT TO LEFT ACROSS SCREEN
    let shoulderRotation = { 
      x: configRotations.neutral.x, 
      y: configRotations.neutral.y, 
      z: configRotations.neutral.z 
    };
    
    // Elbow supports horizontal motion
    let elbowRotation = { x: 0.02, y: 0, z: 0 };
    
    // WRIST for horizontal snap effect
    let wristRotation = { x: -Math.PI / 4, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Position sword on RIGHT SIDE of screen
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Move to RIGHT SIDE ready position (minimal vertical, max horizontal right)
      shoulderRotation.x = THREE.MathUtils.lerp(
        configRotations.neutral.x,                    // Start at neutral (~60°)
        THREE.MathUtils.degToRad(45),                 // Moderate angle (45°) - minimal vertical
        easedT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        configRotations.neutral.y,                    // Start at 0°
        THREE.MathUtils.degToRad(-60),                // Far RIGHT position (-60°)
        easedT
      );
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Elbow extends to support the horizontal windup
      elbowRotation.x = THREE.MathUtils.lerp(0.02, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 8, easedT); // Support rightward position
      
      // WRIST: Prepare for horizontal motion
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 12, easedT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Torso coils RIGHT for horizontal power
      torsoRotation = THREE.MathUtils.lerp(0, -0.2, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - Moving to RIGHT SIDE position (45°, -60°)`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: HORIZONTAL SWEEP from RIGHT to LEFT across screen
      const t = (elapsed - phases.windup) / phases.slash;
      
      // AGGRESSIVE EASING for fast horizontal slash
      const aggressiveT = t * t * (3 - 2 * t);
      
      // SHOULDER: HORIZONTAL SWEEP - minimal vertical, maximum horizontal
      shoulderRotation.x = THREE.MathUtils.lerp(
        THREE.MathUtils.degToRad(45),                 // From windup position (minimal vertical)
        THREE.MathUtils.degToRad(30),                 // To end position (slight down for follow-through)
        aggressiveT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        THREE.MathUtils.degToRad(-60),                // From windup position (FAR RIGHT)
        THREE.MathUtils.degToRad(80),                 // To end position (FAR LEFT) - BIG HORIZONTAL SWEEP
        aggressiveT
      );
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // Elbow supports horizontal slash motion
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, 0.1, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, Math.PI / 4, aggressiveT); // Sweep left
      
      // WRIST: HORIZONTAL SNAP EFFECT during 20%-80% of slash
      let wristSnapMultiplier = 1.0;
      if (t >= 0.2 && t <= 0.8) {
        const snapProgress = (t - 0.2) / 0.6; // 0 to 1 during snap period
        wristSnapMultiplier = 1.0 + Math.sin(snapProgress * Math.PI) * 0.8; // Enhanced horizontal snap
      }
      
      wristRotation.y = THREE.MathUtils.lerp(
        -Math.PI / 12,                                // From right positioning
        Math.PI / 6 * wristSnapMultiplier,            // To left snap position (enhanced during snap)
        aggressiveT
      );
      wristRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // Torso uncoils to support HORIZONTAL slash - strong body rotation
      torsoRotation = THREE.MathUtils.lerp(-0.2, 0.4, aggressiveT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - HORIZONTAL SWEEP: X=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}° Y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return all joints to neutral positions
      shoulderRotation.x = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(30), configRotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(80), configRotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.02, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 4, 0, easedT);
      
      // Return wrist to neutral
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 6, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.4, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to neutral`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the HORIZONTAL SWIPE rotations
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING HORIZONTAL SWIPE *** - Right-to-left screen sweep`);
    this.applyHorizontalSwipe(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyHorizontalSwipe(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** HORIZONTAL SWIPE *** - Clean right-to-left screen motion`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply SHOULDER rotations - PRIMARY DRIVER of horizontal swipe
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] SHOULDER (HORIZONTAL): x=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}°, y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply elbow rotations - SUPPORTS horizontal motion
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] ELBOW (HORIZONTAL SUPPORT): x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply wrist rotations - HORIZONTAL SNAP EFFECT
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] WRIST (HORIZONTAL SNAP): x=${wristRotation.x.toFixed(2)}, y=${wristRotation.y.toFixed(2)}, z=${wristRotation.z.toFixed(2)}`);
    }
    
    // Apply torso rotation for horizontal support - STRONG BODY ROTATION
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] TORSO (HORIZONTAL SUPPORT): ${torsoRotation.toFixed(2)}`);
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
      this.playerBody.rightWrist.rotation.set(-Math.PI / 4, 0, neutralRotation.z);
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0;
    }
    
    this.weaponSwing.isActive = false;
    console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - weaponSwing.isActive set to false');
  }
}
