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
    
    // FIXED: Much lower base angle for TRUE HORIZONTAL positioning (~5° instead of 15°)
    const parallelAngleBase = Math.PI / 36; // ~5° - TRULY HORIZONTAL combat position
    
    if (elapsed < phases.windup) {
      this.updateWindupPhase(elapsed, phases, rotations, parallelAngleBase, shoulderRotation, elbowRotation, torsoRotation);
    } else if (elapsed < phases.windup + phases.slash) {
      this.updateSlashPhase(elapsed, phases, rotations, shoulderRotation, elbowRotation, torsoRotation, weaponWristRotation);
    } else if (elapsed < duration) {
      this.updateRecoveryPhase(elapsed, phases, rotations, parallelAngleBase, shoulderRotation, elbowRotation, torsoRotation);
    } else {
      this.completeAnimation(parallelAngleBase);
      return;
    }
    
    this.applyRotations(shoulderRotation, elbowRotation, torsoRotation, weaponWristRotation);
  }
  
  private updateWindupPhase(elapsed: number, phases: any, rotations: any, parallelAngleBase: number, shoulderRotation: any, elbowRotation: any, torsoRotation: number): void {
    // FIXED: Absolutely NO movement during windup - stay at horizontal position
    shoulderRotation.x = parallelAngleBase; // Stay at ~5° horizontal position
    shoulderRotation.y = 0; // Absolutely no backward pull
    shoulderRotation.z = 0; // No extra rotation
    
    // FIXED: UPWARD elbow bend to counteract forward shoulder angle and keep blade horizontal
    elbowRotation.x = 0.05; // POSITIVE (upward) elbow bend to maintain horizontal blade
    torsoRotation = 0; // No torso movement during windup
  }
  
  private updateSlashPhase(elapsed: number, phases: any, rotations: any, shoulderRotation: any, elbowRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    const t = (elapsed - phases.windup) / phases.slash;
    const easedT = t * t * (3 - 2 * t);
    
    // FIXED: True horizontal slash - from ~5° to -5° (parallel to player's perspective)
    const startX = Math.PI / 36; // Start from ~5° horizontal
    const slashX = Math.PI / 36 + THREE.MathUtils.degToRad(-10); // End at ~-5° (horizontal forward slash)
    
    shoulderRotation.x = THREE.MathUtils.lerp(startX, slashX, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(0, rotations.slash.y, easedT); // Right-to-left motion
    shoulderRotation.z = THREE.MathUtils.lerp(0, rotations.slash.z, easedT); // Wrist snap
    
    // FIXED: UPWARD elbow animation to maintain horizontal blade positioning
    elbowRotation.x = THREE.MathUtils.lerp(0.05, 0.1, easedT); // POSITIVE (upward) bend increase for follow-through
    torsoRotation = THREE.MathUtils.lerp(0, 0.15, easedT); // Reduced torso rotation
    
    // Enhanced wrist rotation for proper slashing motion
    if (t >= 0.2 && t <= 0.8) {
      const wristT = (t - 0.2) / 0.6;
      const intensity = this.weaponSwing.wristSnapIntensity || 1.0;
      weaponWristRotation = Math.sin(wristT * Math.PI) * (intensity * 1.5);
    }
  }
  
  private updateRecoveryPhase(elapsed: number, phases: any, rotations: any, parallelAngleBase: number, shoulderRotation: any, elbowRotation: any, torsoRotation: number): void {
    const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
    const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    shoulderRotation.x = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.x, parallelAngleBase, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.y, 0, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.z, 0, easedT);
    
    // FIXED: Return to UPWARD elbow position for horizontal stance
    elbowRotation.x = THREE.MathUtils.lerp(0.1, 0.05, easedT); // Return to upward bend
    torsoRotation = THREE.MathUtils.lerp(0.15, 0, easedT);
  }
  
  private completeAnimation(parallelAngleBase: number): void {
    this.playerBody.rightArm.rotation.set(parallelAngleBase, 0, 0);
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.05, 0, 0); // FIXED: UPWARD elbow bend at rest for horizontal blade
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
