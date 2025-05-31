
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
    
    console.log('🗡️ [SwordSwingAnimation] Using weapon config as base, but shoulder drives the swing:', configRotations);
    
    // SHOULDER is PRIMARY DRIVER - following reference code pattern
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
      // WINDUP PHASE: SHOULDER builds up the arc (like reference code)
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // SHOULDER: Main windup movement - UP and RIGHT (like reference: 22° to 72°, 0° to -40°)
      shoulderRotation.x = THREE.MathUtils.lerp(
        configRotations.neutral.x,                    // Start at ~22° (π/8)
        configRotations.neutral.x + Math.PI / 3,      // End at ~82° (π/8 + π/3)
        easedT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        configRotations.neutral.y,                    // Start at 0°
        -Math.PI / 4.5,                               // End at ~-40° (like reference)
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
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - SHOULDER drives UP+RIGHT movement`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: SHOULDER drives diagonal sweep (like reference: aggressive motion)
      const t = (elapsed - phases.windup) / phases.slash;
      
      // AGGRESSIVE EASING like reference code: t * t * (3 - 2 * t)
      const aggressiveT = t * t * (3 - 2 * t);
      
      // SHOULDER: Main diagonal slash movement - DOWN and LEFT (like reference: 72° to 7°, -40° to +70°)
      shoulderRotation.x = THREE.MathUtils.lerp(
        configRotations.neutral.x + Math.PI / 3,      // From windup ~82°
        configRotations.neutral.x - Math.PI / 12,     // To low position ~7° (π/8 - π/12)
        aggressiveT
      );
      shoulderRotation.y = THREE.MathUtils.lerp(
        -Math.PI / 4.5,                               // From windup ~-40°
        Math.PI / 2.5,                                // To sweep end ~+72° (like reference)
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
      
      // Torso uncoils to support slash
      torsoRotation = THREE.MathUtils.lerp(-0.15, 0.25, aggressiveT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - SHOULDER drives DOWN+LEFT diagonal sweep`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral (like reference)
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return all joints to neutral positions
      shoulderRotation.x = THREE.MathUtils.lerp(configRotations.neutral.x - Math.PI / 12, configRotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(Math.PI / 2.5, configRotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.05, 0.02, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, 0, easedT);
      
      // Return wrist to neutral
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(configRotations.slash.z, configRotations.neutral.z, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.25, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to neutral`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the SHOULDER-DRIVEN rotations
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING SHOULDER-DRIVEN SWORD SWING ***`);
    this.applyShoulderDrivenSwing(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyShoulderDrivenSwing(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** SHOULDER-DRIVEN SWING *** - Diagonal arc from high-right to low-left`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply SHOULDER rotations - PRIMARY DRIVER of the swing
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
