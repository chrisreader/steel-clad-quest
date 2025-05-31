
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
    
    console.log('🗡️ [SwordSwingAnimation] Using NEW WINDUP direction: UP and RIGHT with smoothstep easing');
    
    // NEW WINDUP POSITIONS: Starting neutral (π/8, 0, 0) to raised position (π/8 + 50°, -40°, 0)
    const neutralPosition = { 
      x: THREE.MathUtils.degToRad(22.5), // π/8 ≈ 22.5°
      y: 0, 
      z: 0 
    };
    const windupEndPosition = { 
      x: THREE.MathUtils.degToRad(22.5 + 50), // π/8 + 50° = 72.5°
      y: THREE.MathUtils.degToRad(-40),        // -40° to the right
      z: 0 
    };
    
    // Initialize rotations from neutral position
    let shoulderRotation = { 
      x: neutralPosition.x, 
      y: neutralPosition.y, 
      z: neutralPosition.z 
    };
    
    // Elbow and wrist for coordinated movement
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 6, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // NEW WINDUP PHASE: Move UP and RIGHT with smoothstep easing
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1); // Natural movement easing
      
      // SHOULDER: Smooth interpolation from neutral to raised UP and RIGHT position
      shoulderRotation.x = THREE.MathUtils.lerp(neutralPosition.x, windupEndPosition.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(neutralPosition.y, windupEndPosition.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(neutralPosition.z, windupEndPosition.z, easedT);
      
      // ELBOW: Support upward and rightward movement
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.2, easedT); // More extension for raised position
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 4, easedT); // Outward for right position
      
      // WRIST: Position for raised strike preparation
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 6, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      // TORSO: Slight coil to support raised position
      torsoRotation = THREE.MathUtils.lerp(0, -0.2, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** NEW WINDUP PHASE *** t=${t.toFixed(2)} easedT=${easedT.toFixed(2)} - Moving UP and RIGHT`);
      console.log(`🗡️ [SwordSwingAnimation] Target: X=${THREE.MathUtils.radToDeg(windupEndPosition.x).toFixed(1)}° Y=${THREE.MathUtils.radToDeg(windupEndPosition.y).toFixed(1)}°`);
      console.log(`🗡️ [SwordSwingAnimation] Current: X=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}° Y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: STRAIGHT DIAGONAL LINE from raised position to LEFT-DOWN with aggressive acceleration
      const t = (elapsed - phases.windup) / phases.slash;
      
      // AGGRESSIVE ACCELERATION: smoothstep easing for fast diagonal sweep
      const aggressiveT = t * t * (3 - 2 * t); // Smoothstep for aggressive acceleration
      
      // SLASH END POSITION: x: 15°, y: 70°, z: 0°
      const slashEndRotation = {
        x: THREE.MathUtils.degToRad(15),  // 15° end position
        y: THREE.MathUtils.degToRad(70), // 70° wide sweep to left
        z: 0 // No z rotation
      };
      
      // SHOULDER: Aggressive movement from NEW windup end position to slash end position
      shoulderRotation.x = THREE.MathUtils.lerp(windupEndPosition.x, slashEndRotation.x, aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(windupEndPosition.y, slashEndRotation.y, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(windupEndPosition.z, slashEndRotation.z, aggressiveT);
      
      // ELBOW: Aggressive movement to support fast diagonal from raised position
      elbowRotation.x = THREE.MathUtils.lerp(-0.2, 0.15, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 4, Math.PI / 3, aggressiveT); // Wide sweep across body
      
      // WRIST: Aggressive movement with snap for fast diagonal line
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 4, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, aggressiveT);
      
      // TORSO: Aggressive rotation to support fast diagonal movement
      torsoRotation = THREE.MathUtils.lerp(-0.2, 0.6, aggressiveT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} aggressiveT=${aggressiveT.toFixed(2)} - FAST DIAGONAL SWEEP from raised position`);
      console.log(`🗡️ [SwordSwingAnimation] From raised: X=${THREE.MathUtils.radToDeg(windupEndPosition.x)}° Y=${THREE.MathUtils.radToDeg(windupEndPosition.y)}°`);
      console.log(`🗡️ [SwordSwingAnimation] To end: X=${THREE.MathUtils.radToDeg(slashEndRotation.x)}° Y=${THREE.MathUtils.radToDeg(slashEndRotation.y)}°`);
      console.log(`🗡️ [SwordSwingAnimation] Current: X=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}° Y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return from the slash end position to NEW neutral position
      const slashEndRotation = {
        x: THREE.MathUtils.degToRad(15),
        y: THREE.MathUtils.degToRad(70),
        z: 0
      };
      
      // Return all joints to NEW neutral position
      shoulderRotation.x = THREE.MathUtils.lerp(slashEndRotation.x, neutralPosition.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(slashEndRotation.y, neutralPosition.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(slashEndRotation.z, neutralPosition.z, easedT);
      
      // Return elbow to neutral
      elbowRotation.x = THREE.MathUtils.lerp(0.15, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 3, 0, easedT);
      
      // Return wrist to neutral
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 4, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      // Torso returns to center
      torsoRotation = THREE.MathUtils.lerp(0.6, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - Returning to NEW neutral position`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the coordinated arm and sword movement
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING COORDINATED MOVEMENT *** - UP and RIGHT windup to fast diagonal slash`);
    this.applyCoordinatedMovement(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyCoordinatedMovement(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** COORDINATED MOVEMENT *** - Arm segments moving together for UP and RIGHT to diagonal slash`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Apply SHOULDER rotations - Primary driver of UP and RIGHT then diagonal slash
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] SHOULDER: x=${THREE.MathUtils.radToDeg(shoulderRotation.x).toFixed(1)}°, y=${THREE.MathUtils.radToDeg(shoulderRotation.y).toFixed(1)}°, z=${shoulderRotation.z.toFixed(2)}`);
    
    // Apply ELBOW rotations - Support upward and diagonal motion
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] ELBOW: x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    // Apply WRIST rotations - Support straight line movement
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
    console.log('🗡️ [SwordSwingAnimation] *** COMPLETING ANIMATION *** - Resetting to NEW neutral position');
    
    // NEW NEUTRAL POSITION: π/8, 0, 0
    const neutralPosition = { 
      x: THREE.MathUtils.degToRad(22.5), // π/8 ≈ 22.5°
      y: 0, 
      z: 0 
    };
    
    // Reset to NEW neutral rotations
    this.playerBody.rightArm.rotation.set(neutralPosition.x, neutralPosition.y, neutralPosition.z);
    
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
