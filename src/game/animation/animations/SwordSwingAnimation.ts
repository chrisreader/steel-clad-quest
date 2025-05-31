
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
  }
  
  public update(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon) return;
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, rotations, duration } = this.weaponSwing;
    
    let shoulderRotation = { x: 0, y: 0, z: 0 };
    let elbowRotation = { x: 0, y: 0, z: 0 };
    let weaponWristRotation = 0;
    let torsoRotation = 0;
    
    // FIXED: Use proper chest-level horizontal base angle
    const chestLevelBase = Math.PI / 3; // 60° - matches the ready stance
    
    if (elapsed < phases.windup) {
      this.updateWindupPhase(elapsed, phases, rotations, chestLevelBase, shoulderRotation, elbowRotation, torsoRotation);
    } else if (elapsed < phases.windup + phases.slash) {
      this.updateSlashPhase(elapsed, phases, rotations, shoulderRotation, elbowRotation, torsoRotation, weaponWristRotation);
    } else if (elapsed < duration) {
      this.updateRecoveryPhase(elapsed, phases, rotations, chestLevelBase, shoulderRotation, elbowRotation, torsoRotation);
    } else {
      this.completeAnimation(chestLevelBase);
      return;
    }
    
    this.applyRotations(shoulderRotation, elbowRotation, torsoRotation, weaponWristRotation);
  }
  
  private updateWindupPhase(elapsed: number, phases: any, rotations: any, chestLevelBase: number, shoulderRotation: any, elbowRotation: any, torsoRotation: number): void {
    // FIXED: Stay at chest level during windup - no movement
    shoulderRotation.x = chestLevelBase; // Stay at 60° chest level position
    shoulderRotation.y = 0; // No backward pull
    shoulderRotation.z = 0; // No extra rotation
    
    // FIXED: Downward elbow bend to maintain horizontal blade at chest level
    elbowRotation.x = -0.05; // Downward bend to counteract forward shoulder angle
    torsoRotation = 0; // No torso movement during windup
  }
  
  private updateSlashPhase(elapsed: number, phases: any, rotations: any, shoulderRotation: any, elbowRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    const t = (elapsed - phases.windup) / phases.slash;
    const easedT = t * t * (3 - 2 * t);
    
    // FIXED: HORIZONTAL CHEST-LEVEL SLASH - swing across at same height
    const startX = Math.PI / 3; // Start from 60° chest level
    const slashX = Math.PI / 3; // END at same 60° chest level (no vertical movement)
    
    shoulderRotation.x = THREE.MathUtils.lerp(startX, slashX, easedT); // Stay at chest level
    shoulderRotation.y = THREE.MathUtils.lerp(0, rotations.slash.y, easedT); // Right-to-left motion
    shoulderRotation.z = THREE.MathUtils.lerp(0, rotations.slash.z, easedT); // Wrist snap
    
    // FIXED: Elbow maintains horizontal blade positioning throughout
    elbowRotation.x = THREE.MathUtils.lerp(-0.05, -0.1, easedT); // Slightly more downward bend for follow-through
    torsoRotation = THREE.MathUtils.lerp(0, 0.15, easedT); // Reduced torso rotation
    
    // Enhanced wrist rotation for proper slashing motion
    if (t >= 0.2 && t <= 0.8) {
      const wristT = (t - 0.2) / 0.6;
      const intensity = this.weaponSwing.wristSnapIntensity || 1.0;
      weaponWristRotation = Math.sin(wristT * Math.PI) * (intensity * 1.5);
    }
  }
  
  private updateRecoveryPhase(elapsed: number, phases: any, rotations: any, chestLevelBase: number, shoulderRotation: any, elbowRotation: any, torsoRotation: number): void {
    const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
    const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    shoulderRotation.x = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.x, chestLevelBase, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.y, 0, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.z, 0, easedT);
    
    // Return to downward elbow position for horizontal stance
    elbowRotation.x = THREE.MathUtils.lerp(-0.1, -0.05, easedT);
    torsoRotation = THREE.MathUtils.lerp(0.15, 0, easedT);
  }
  
  private completeAnimation(chestLevelBase: number): void {
    this.playerBody.rightArm.rotation.set(chestLevelBase, 0, 0);
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(-0.05, 0, 0); // Downward elbow bend at rest
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0;
    }
    if (this.equippedWeapon) {
      this.equippedWeapon.getMesh().rotation.z = 0;
    }
    this.weaponSwing.isActive = false;
  }
  
  private applyRotations(shoulderRotation: any, elbowRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
    }
    
    // Apply wrist rotation to make sword actually slash through the air
    if (this.equippedWeapon) {
      this.equippedWeapon.getMesh().rotation.z = weaponWristRotation;
    }
  }
}
