
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
    
    // Base position matching current idle arm position
    const parallelAngleBase = Math.PI / 3 + 0.03; // 61.7°
    
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
    const t = elapsed / phases.windup;
    const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    // Drastically reduce windup height - only add 10° instead of 35°
    const windupX = parallelAngleBase + THREE.MathUtils.degToRad(10); // Total: 71.7°
    
    shoulderRotation.x = THREE.MathUtils.lerp(parallelAngleBase, windupX, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(0, rotations.windup.y, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(0, rotations.windup.z, easedT);
    
    elbowRotation.x = THREE.MathUtils.lerp(0, 0.5, easedT); // Reduced elbow bend
    torsoRotation = THREE.MathUtils.lerp(0, -0.15, easedT); // Minimal torso rotation
  }
  
  private updateSlashPhase(elapsed: number, phases: any, rotations: any, shoulderRotation: any, elbowRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    const t = (elapsed - phases.windup) / phases.slash;
    const easedT = t * t * (3 - 2 * t);
    
    // Increase downward slash motion - go down to 31.7° (much lower)
    const windupX = this.playerBody.rightArm.rotation.x; // Current windup position
    const slashX = Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-30); // Down to 31.7°
    
    shoulderRotation.x = THREE.MathUtils.lerp(windupX, slashX, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(rotations.windup.z, rotations.slash.z, easedT);
    
    elbowRotation.x = THREE.MathUtils.lerp(0.5, 0.1, easedT); // Extend arm during slash
    torsoRotation = THREE.MathUtils.lerp(-0.15, 0.25, easedT); // More torso follow-through
    
    // Enhanced wrist rotation for proper slashing motion
    if (t >= 0.2 && t <= 0.8) {
      const wristT = (t - 0.2) / 0.6;
      const intensity = this.weaponSwing.wristSnapIntensity || 1.0;
      weaponWristRotation = Math.sin(wristT * Math.PI) * (intensity * 2.0); // Increased intensity
    }
  }
  
  private updateRecoveryPhase(elapsed: number, phases: any, rotations: any, parallelAngleBase: number, shoulderRotation: any, elbowRotation: any, torsoRotation: number): void {
    const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
    const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    shoulderRotation.x = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.x, parallelAngleBase, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.y, 0, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.z, 0, easedT);
    
    elbowRotation.x = THREE.MathUtils.lerp(0.1, 0, easedT);
    torsoRotation = THREE.MathUtils.lerp(0.25, 0, easedT);
  }
  
  private completeAnimation(parallelAngleBase: number): void {
    this.playerBody.rightArm.rotation.set(parallelAngleBase, 0, 0);
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0, 0, 0);
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
