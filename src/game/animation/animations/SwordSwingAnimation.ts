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
  }
  
  public update(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon) return;
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, duration } = this.weaponSwing;
    
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
      // WINDUP PHASE: Move arm far to the right and coil
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Shoulder rotation - preparing for strike
      shoulderRotation.x = THREE.MathUtils.lerp(neutralShoulderX, windupShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(neutralShoulderY, windupShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0, -0.2, easedT);
      
      // ENHANCED: Dramatic spatial movement - move arm far to the right
      shoulderPosition.x = THREE.MathUtils.lerp(0, 0.6, easedT);   // Move far to the right
      shoulderPosition.y = THREE.MathUtils.lerp(0, 0.2, easedT);   // Raise arm up
      shoulderPosition.z = THREE.MathUtils.lerp(0, -0.3, easedT);  // Pull back for coiling
      
      // Elbow - retract arm during windup
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, -0.8, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, 0.1, easedT);
      
      // Wrist coordination
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 4, -Math.PI / 6, easedT);
      wristRotation.y = THREE.MathUtils.lerp(0, -0.1, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0.05, easedT);
      
      // ENHANCED: Torso - coil more dramatically for power
      torsoRotation = THREE.MathUtils.lerp(0, -0.5, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Sweep arm from right to far left across body
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration for power
      
      // Shoulder rotation - drive the swing
      shoulderRotation.x = THREE.MathUtils.lerp(windupShoulderX, slashEndShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(windupShoulderY, slashEndShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(-0.2, 0.2, easedT);
      
      // ENHANCED: Dramatic cross-body sweep - from far right to far left
      shoulderPosition.x = THREE.MathUtils.lerp(0.6, -0.7, easedT);    // Sweep across body to left
      shoulderPosition.y = THREE.MathUtils.lerp(0.2, -0.1, easedT);    // Slight downward as swing progresses
      shoulderPosition.z = THREE.MathUtils.lerp(-0.3, 0.5, easedT);    // Extend forward dramatically into strike
      
      // Elbow - explosive extension for reach and power
      elbowRotation.x = THREE.MathUtils.lerp(-0.8, 0.3, easedT); // Straighten arm dramatically
      elbowRotation.y = THREE.MathUtils.lerp(0.1, -0.2, easedT);
      
      // Wrist - snap through the strike
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, -Math.PI / 3, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-0.1, Math.PI / 8, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0.05, -Math.PI / 12, easedT);
      
      // ENHANCED: Torso - uncoil with more power
      torsoRotation = THREE.MathUtils.lerp(-0.5, 0.8, easedT);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to center ready position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return shoulder rotation to ready
      shoulderRotation.x = THREE.MathUtils.lerp(slashEndShoulderX, neutralShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(slashEndShoulderY, neutralShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0.2, 0, easedT);
      
      // ENHANCED: Return shoulder position to neutral center
      shoulderPosition.x = THREE.MathUtils.lerp(-0.7, 0, easedT);  // Return from left to center
      shoulderPosition.y = THREE.MathUtils.lerp(-0.1, 0, easedT);  // Return to neutral height
      shoulderPosition.z = THREE.MathUtils.lerp(0.5, 0, easedT);   // Return from extended to neutral
      
      // Return elbow to ready position
      elbowRotation.x = THREE.MathUtils.lerp(0.3, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-0.2, 0, easedT);
      
      // Return wrist to forward-pointing ready position
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 3, -Math.PI / 4, easedT);
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 8, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 12, 0, easedT);
      
      // Return torso to neutral
      torsoRotation = THREE.MathUtils.lerp(0.8, 0, easedT);
      
    } else {
      // ANIMATION COMPLETE - reset everything
      this.completeAnimation();
      return;
    }
    
    // Apply all rotations and positions
    this.applyRotations(shoulderRotation, shoulderPosition, elbowRotation, wristRotation, torsoRotation);
  }
  
  private completeAnimation(): void {
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
  }
  
  private applyRotations(
    shoulderRotation: any, 
    shoulderPosition: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    // Apply shoulder rotation AND position movement
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    
    // Apply spatial shoulder movement
    const newPosition = this.originalShoulderPosition.clone();
    newPosition.x += shoulderPosition.x;
    newPosition.y += shoulderPosition.y;
    newPosition.z += shoulderPosition.z;
    this.playerBody.rightArm.position.copy(newPosition);
    
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
