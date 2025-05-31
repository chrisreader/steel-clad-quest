
import * as THREE from 'three';
import { PlayerBody, WeaponSwingAnimation } from '../../../types/GameTypes';

export class SwordSwingAnimation {
  private weaponSwing: WeaponSwingAnimation;
  private playerBody: PlayerBody;
  private equippedWeapon: any;
  private originalShoulderPosition: THREE.Vector3;
  
  constructor(weaponSwing: WeaponSwingAnimation, playerBody: PlayerBody, equippedWeapon: any) {
    this.weaponSwing = weaponSwing;
    this.playerBody = playerBody;
    this.equippedWeapon = equippedWeapon;
    // Store original shoulder position for restoration
    this.originalShoulderPosition = this.playerBody.rightArm.position.clone();
    console.log('🗡️ [SwordSwingAnimation] Constructor - Original shoulder position:', this.originalShoulderPosition);
  }
  
  public update(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon) return;
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, duration } = this.weaponSwing;
    
    console.log(`🗡️ [SwordSwingAnimation] Update - Elapsed: ${elapsed.toFixed(3)}s, Duration: ${duration}s`);
    
    let shoulderRotation = { x: 0, y: 0, z: 0 };
    let shoulderPosition = { x: 0, y: 0, z: 0 };
    let elbowRotation = { x: 0, y: 0, z: 0 };
    let wristRotation = { x: 0, y: 0, z: 0 };
    let torsoRotation = 0;
    
    // Natural shoulder rotation positions
    const neutralShoulderX = Math.PI / 3; // 60° ready position
    const windupShoulderX = Math.PI / 3 + THREE.MathUtils.degToRad(30); // 90° overhead
    const slashEndShoulderX = THREE.MathUtils.degToRad(50); // 50° end position
    
    const neutralShoulderY = 0;
    const windupShoulderY = THREE.MathUtils.degToRad(-35); 
    const slashEndShoulderY = THREE.MathUtils.degToRad(55); 
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Move arm DRAMATICALLY to the right side
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Shoulder rotation - preparing for strike
      shoulderRotation.x = THREE.MathUtils.lerp(neutralShoulderX, windupShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(neutralShoulderY, windupShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0, -0.3, easedT);
      
      // MASSIVE SPATIAL MOVEMENT - move arm FAR to the right with dramatic arc
      shoulderPosition.x = THREE.MathUtils.lerp(0, 3.0, easedT);      // MASSIVE outward movement
      shoulderPosition.y = THREE.MathUtils.lerp(0, 1.0, easedT);      // Higher arc movement 
      shoulderPosition.z = THREE.MathUtils.lerp(0, -1.5, easedT);     // Much further back for maximum coiling
      
      // Elbow - retract arm dramatically during windup (bend in for power)
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, -2.0, easedT);    // Much more dramatic bend
      elbowRotation.y = THREE.MathUtils.lerp(0, 0.4, easedT);
      
      // Wrist coordination
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 4, -Math.PI / 6, easedT);
      wristRotation.y = THREE.MathUtils.lerp(0, -0.2, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0.15, easedT);
      
      // Enhanced torso coiling for power
      torsoRotation = THREE.MathUtils.lerp(0, -1.0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] WINDUP - Position: x=${shoulderPosition.x.toFixed(2)}, y=${shoulderPosition.y.toFixed(2)}, z=${shoulderPosition.z.toFixed(2)}`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: MASSIVE sweep from far right to far left across entire body
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration for power
      
      // Shoulder rotation - drive the swing
      shoulderRotation.x = THREE.MathUtils.lerp(windupShoulderX, slashEndShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(windupShoulderY, slashEndShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(-0.3, 0.4, easedT);
      
      // MASSIVE CROSS-BODY SWEEP - from FAR right to FAR left with dramatic arc
      shoulderPosition.x = THREE.MathUtils.lerp(3.0, -3.0, easedT);     // MASSIVE 6-unit sweep across body
      shoulderPosition.y = THREE.MathUtils.lerp(1.0, -0.5, easedT);     // Arc downward as swing progresses
      shoulderPosition.z = THREE.MathUtils.lerp(-1.5, 2.0, easedT);     // Extend dramatically forward into strike
      
      // Elbow - EXPLOSIVE extension for maximum reach and power
      elbowRotation.x = THREE.MathUtils.lerp(-2.0, 1.5, easedT);       // From bent to fully extended
      elbowRotation.y = THREE.MathUtils.lerp(0.4, -0.5, easedT);
      
      // Wrist - snap through the strike
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, -Math.PI / 3, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-0.2, Math.PI / 5, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0.15, -Math.PI / 6, easedT);
      
      // Enhanced torso uncoiling with maximum power
      torsoRotation = THREE.MathUtils.lerp(-1.0, 1.4, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] SLASH - Position: x=${shoulderPosition.x.toFixed(2)}, y=${shoulderPosition.y.toFixed(2)}, z=${shoulderPosition.z.toFixed(2)}`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to center ready position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return shoulder rotation to ready
      shoulderRotation.x = THREE.MathUtils.lerp(slashEndShoulderX, neutralShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(slashEndShoulderY, neutralShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0.4, 0, easedT);
      
      // Return shoulder position to neutral center
      shoulderPosition.x = THREE.MathUtils.lerp(-3.0, 0, easedT);       // Return from FAR left to center
      shoulderPosition.y = THREE.MathUtils.lerp(-0.5, 0, easedT);       // Return to neutral height
      shoulderPosition.z = THREE.MathUtils.lerp(2.0, 0, easedT);        // Return from extended to neutral
      
      // Return elbow to ready position
      elbowRotation.x = THREE.MathUtils.lerp(1.5, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-0.5, 0, easedT);
      
      // Return wrist to forward-pointing ready position
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 3, -Math.PI / 4, easedT);
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 5, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 6, 0, easedT);
      
      // Return torso to neutral
      torsoRotation = THREE.MathUtils.lerp(1.4, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] RECOVERY - Position: x=${shoulderPosition.x.toFixed(2)}, y=${shoulderPosition.y.toFixed(2)}, z=${shoulderPosition.z.toFixed(2)}`);
      
    } else {
      // ANIMATION COMPLETE - reset everything
      this.completeAnimation();
      return;
    }
    
    // Apply all rotations and positions
    this.applyRotations(shoulderRotation, shoulderPosition, elbowRotation, wristRotation, torsoRotation);
  }
  
  private completeAnimation(): void {
    console.log('🗡️ [SwordSwingAnimation] COMPLETING ANIMATION - Resetting to original position');
    
    // Reset to proper ready position
    this.playerBody.rightArm.rotation.set(Math.PI / 3, 0, 0);
    this.playerBody.rightArm.position.copy(this.originalShoulderPosition);
    
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
    console.log('🗡️ [SwordSwingAnimation] Animation complete');
  }
  
  private applyRotations(
    shoulderRotation: any, 
    shoulderPosition: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    // Apply shoulder rotation
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    
    // Apply MASSIVE spatial shoulder movement - THIS IS THE KEY FOR SPATIAL MOVEMENT
    const newPosition = this.originalShoulderPosition.clone();
    newPosition.x += shoulderPosition.x;  // This moves the arm left/right through space
    newPosition.y += shoulderPosition.y;  // This moves the arm up/down
    newPosition.z += shoulderPosition.z;  // This moves the arm forward/back
    this.playerBody.rightArm.position.copy(newPosition);
    
    console.log(`🗡️ [SwordSwingAnimation] Applied position - Original: x=${this.originalShoulderPosition.x.toFixed(2)}, New: x=${newPosition.x.toFixed(2)}, Offset: x=${shoulderPosition.x.toFixed(2)}`);
    
    // Apply joint rotations
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
    }
  }
}
