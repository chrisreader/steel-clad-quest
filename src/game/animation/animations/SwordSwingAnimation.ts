
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
    
    console.log('🗡️ [SwordSwingAnimation] Using REFERENCE CODE angles for diagonal slash:', configRotations);
    
    // SHOULDER is PRIMARY DRIVER - DIAGONAL SLASH motion using reference angles
    let shoulderRotation = { 
      x: configRotations.neutral.x, 
      y: configRotations.neutral.y, 
      z: configRotations.neutral.z 
    };
    
    // Elbow supports shoulder motion
    let elbowRotation = { x: 0.02, y: 0, z: 0 };
    
    // WRIST is SECONDARY - only for snap effect
    let wristRotation = { x: -Math.PI / 4, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: REFERENCE ANGLES - UP and RIGHT
      // Starting: x=22.5° (π/8), y=0°
      // Ending: x=72.2° (π/8 + 50°), y=-39.6° (-40°)
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Reference windup angles - UP and RIGHT
      shoulderRotation.x = THREE.MathUtils.lerp(
        Math.PI / 8,                                  // Start at 22.5° (reference neutral)
        Math.PI / 8 + THREE.MathUtils.degToRad(50),   // End at 72.2° (reference windup)
        easedT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        0,                                            // Start at 0° (reference neutral)
        THREE.MathUtils.degToRad(-39.6),              // End at -39.6° (reference windup)
        easedT
      );
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Elbow extends to support the windup
      elbowRotation.x = THREE.MathUtils.lerp(0.02, -0.1, easedT); // Extends arm
      elbowRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT);
      
      // WRIST: Minimal movement - just positioning
      wristRotation.y = THREE.MathUtils.lerp(0, Math.PI / 12, easedT); // Small ~15° positioning
      wristRotation.z = THREE.MathUtils.lerp(configRotations.neutral.z, configRotations.windup.z, easedT);
      
      // Torso coils for power
      torsoRotation = THREE.MathUtils.lerp(0, -0.15, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - Reference angles: UP and RIGHT to 72.2°, -39.6°`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: REFERENCE DIAGONAL SWEEP - DOWN and LEFT
      // Peak: x=72.2°, y=-39.6°
      // Mid-slash: x=54.2°, y=-9.1°
      // End slash: x=7.5°, y=70.0°
      const t = (elapsed - phases.windup) / phases.slash;
      
      // AGGRESSIVE EASING like reference code: t * t * (3 - 2 * t)
      const aggressiveT = t * t * (3 - 2 * t);
      
      // SHOULDER: REFERENCE DIAGONAL SWEEP - DOWN and LEFT
      shoulderRotation.x = THREE.MathUtils.lerp(
        Math.PI / 8 + THREE.MathUtils.degToRad(50),   // From windup 72.2°
        Math.PI / 8 + THREE.MathUtils.degToRad(-15),  // To end slash 7.5° (DOWN motion)
        aggressiveT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        THREE.MathUtils.degToRad(-39.6),              // From windup -39.6°
        THREE.MathUtils.degToRad(70.0),               // To end slash 70.0° (LEFT sweep)
        aggressiveT
      );
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // Elbow contracts during slash for power
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.05, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 12, -Math.PI / 6, aggressiveT);
      
      // WRIST: SNAP EFFECT during peak slash (20%-80% like reference)
      let wristSnapMultiplier = 1.0;
      if (t >= 0.2 && t <= 0.8) {
        const snapProgress = (t - 0.2) / 0.6; // 0 to 1 during snap period
        wristSnapMultiplier = 1.0 + Math.sin(snapProgress * Math.PI) * 0.5; // Sine wave for snap
      }
      
      wristRotation.y = THREE.MathUtils.lerp(
        Math.PI / 12,                                 // From small positioning
        -Math.PI / 8 * wristSnapMultiplier,           // To snap position (enhanced during snap)
        aggressiveT
      );
      wristRotation.z = THREE.MathUtils.lerp(configRotations.windup.z, configRotations.slash.z, aggressiveT);
      
      // Torso uncoils to support diagonal slash
      torsoRotation = THREE.MathUtils.lerp(-0.15, 0.4, aggressiveT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - Reference diagonal: DOWN to 7.5°, LEFT to 70.0°`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to reference neutral (like reference)
      // Return to: x=22.5° (π/8), y=0°
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return all joints to reference neutral positions
      shoulderRotation.x = THREE.MathUtils.lerp(
        Math.PI / 8 + THREE.MathUtils.degToRad(-15),  // From end slash 7.5°
        Math.PI / 8,                                  // To reference neutral 22.5°
        easedT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        THREE.MathUtils.degToRad(70.0),               // From end slash 70.0°
        0,                                            // To reference neutral 0°
        easedT
      );
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.05, 0.02, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, 0, easedT);
      
      // Return wrist to neutral
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.4, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to reference neutral 22.5°, 0°`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the REFERENCE-BASED DIAGONAL SLASH rotations
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING REFERENCE DIAGONAL SLASH SWORD SWING ***`);
    this.applyShoulderDrivenSwing(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyShoulderDrivenSwing(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** REFERENCE-BASED DIAGONAL SLASH *** - Top-right to bottom-left`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply SHOULDER rotations - PRIMARY DRIVER of the diagonal slash
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] SHOULDER (PRIMARY): x=${shoulderRotation.x.toFixed(2)}, y=${shoulderRotation.y.toFixed(2)}, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply elbow rotations - SUPPORTS shoulder motion
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] ELBOW (SUPPORT): x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply wrist rotations - SECONDARY for snap effect
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] WRIST (SNAP EFFECT): x=${wristRotation.x.toFixed(2)}, y=${wristRotation.y.toFixed(2)}, z=${wristRotation.z.toFixed(2)}`);
    }
    
    // Apply torso rotation for power and support
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] TORSO (POWER): ${torsoRotation.toFixed(2)}`);
    }
    
    // Debug weapon position if available
    if (this.equippedWeapon && this.equippedWeapon.mesh) {
      const weaponWorldPos = new THREE.Vector3();
      this.equippedWeapon.mesh.getWorldPosition(weaponWorldPos);
      console.log(`🗡️ [SwordSwingAnimation] Weapon world position: x=${weaponWorldPos.x.toFixed(2)}, y=${weaponWorldPos.y.toFixed(2)}, z=${weaponWorldPos.z.toFixed(2)}`);
    }
  }
  
  private completeAnimation(): void {
    console.log('🗡️ [SwordSwingAnimation] *** COMPLETING ANIMATION *** - Resetting to reference neutral rotations');
    
    // Reset to reference neutral rotations: x=22.5° (π/8), y=0°
    this.playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0);
    
    // Reset elbow to minimal bend for straight arm
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.05, 0, 0);
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
