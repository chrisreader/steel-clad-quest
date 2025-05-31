
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
    
    console.log('🗡️ [SwordSwingAnimation] Using reference code angles for diagonal slash:', configRotations);
    
    // SHOULDER drives diagonal slash - using REFERENCE CODE ANGLES
    let shoulderRotation = { 
      x: configRotations.neutral.x, 
      y: configRotations.neutral.y, 
      z: configRotations.neutral.z 
    };
    
    // Elbow supports shoulder motion
    let elbowRotation = { x: 0.02, y: 0, z: 0 };
    
    // WRIST for snap effect
    let wristRotation = { x: -Math.PI / 4, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Build up to HIGH-RIGHT position (reference angles)
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Move to reference windup position (72.2° X, -39.6° Y)
      shoulderRotation.x = THREE.MathUtils.lerp(
        configRotations.neutral.x,                    // Start at neutral (~60°)
        THREE.MathUtils.degToRad(72.2),               // End at 72.2° (reference code)
        easedT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        configRotations.neutral.y,                    // Start at 0°
        THREE.MathUtils.degToRad(-39.6),              // End at -39.6° (reference code)
        easedT
      );
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Elbow extends to support the windup
      elbowRotation.x = THREE.MathUtils.lerp(0.02, -0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT);
      
      // WRIST: Minimal positioning
      wristRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Torso coils for power
      torsoRotation = THREE.MathUtils.lerp(0, -0.15, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - Moving to high-right position (72.2°, -39.6°)`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: DIAGONAL SWEEP from high-right to low-left (reference trajectory)
      const t = (elapsed - phases.windup) / phases.slash;
      
      // REFERENCE EASING: t * t * (3 - 2 * t) for aggressive slash
      const aggressiveT = t * t * (3 - 2 * t);
      
      // SHOULDER: DIAGONAL SLASH using reference angles (72.2° to 7.5° X, -39.6° to 70° Y)
      shoulderRotation.x = THREE.MathUtils.lerp(
        THREE.MathUtils.degToRad(72.2),               // From windup position (high)
        THREE.MathUtils.degToRad(7.5),                // To end position (low) - REFERENCE
        aggressiveT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        THREE.MathUtils.degToRad(-39.6),              // From windup position (right)
        THREE.MathUtils.degToRad(70),                 // To end position (left) - REFERENCE
        aggressiveT
      );
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // Elbow contracts during slash for power
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.05, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 12, -Math.PI / 6, aggressiveT);
      
      // WRIST: SNAP EFFECT during 20%-80% of slash (reference timing)
      let wristSnapMultiplier = 1.0;
      if (t >= 0.2 && t <= 0.8) {
        const snapProgress = (t - 0.2) / 0.6; // 0 to 1 during snap period
        wristSnapMultiplier = 1.0 + Math.sin(snapProgress * Math.PI) * 0.5; // Sine wave for snap
      }
      
      wristRotation.y = THREE.MathUtils.lerp(
        Math.PI / 12,                                 // From positioning
        -Math.PI / 8 * wristSnapMultiplier,           // To snap position (enhanced during snap)
        aggressiveT
      );
      wristRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // Torso uncoils to support diagonal slash
      torsoRotation = THREE.MathUtils.lerp(-0.15, 0.3, aggressiveT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - DIAGONAL SWEEP: X=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}° Y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return all joints to neutral positions
      shoulderRotation.x = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(7.5), configRotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(70), configRotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.05, 0.02, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, 0, easedT);
      
      // Return wrist to neutral
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.3, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to neutral`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the DIAGONAL SLASH rotations
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING DIAGONAL SLASH *** - High-right to low-left sweep`);
    this.applyDiagonalSlash(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyDiagonalSlash(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** DIAGONAL SLASH *** - Right-to-left screen swipe`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply SHOULDER rotations - PRIMARY DRIVER of diagonal slash
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] SHOULDER (DIAGONAL): x=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}°, y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply elbow rotations - SUPPORTS diagonal motion
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] ELBOW (SUPPORT): x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply wrist rotations - SNAP EFFECT
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] WRIST (SNAP): x=${wristRotation.x.toFixed(2)}, y=${wristRotation.y.toFixed(2)}, z=${wristRotation.z.toFixed(2)}`);
    }
    
    // Apply torso rotation for diagonal support
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] TORSO (DIAGONAL SUPPORT): ${torsoRotation.toFixed(2)}`);
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
