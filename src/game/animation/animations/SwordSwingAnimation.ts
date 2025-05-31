
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
    
    // Enhanced base position matching current idle arm position
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
    
    shoulderRotation.x = THREE.MathUtils.lerp(parallelAngleBase, rotations.windup.x, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(0, rotations.windup.y, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(0, rotations.windup.z, easedT);
    
    elbowRotation.x = THREE.MathUtils.lerp(0, 1.2, easedT);
    torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT);
  }
  
  private updateSlashPhase(elapsed: number, phases: any, rotations: any, shoulderRotation: any, elbowRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    const t = (elapsed - phases.windup) / phases.slash;
    const easedT = t * t * (3 - 2 * t);
    
    shoulderRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(rotations.windup.z, rotations.slash.z, easedT);
    
    elbowRotation.x = THREE.MathUtils.lerp(1.2, 0.1, easedT);
    torsoRotation = THREE.MathUtils.lerp(-0.3, 0.4, easedT);
    
    if (t >= 0.15 && t <= 0.85) {
      const wristT = (t - 0.15) / 0.7;
      weaponWristRotation = Math.sin(wristT * Math.PI) * (this.weaponSwing.wristSnapIntensity * 1.5);
    }
  }
  
  private updateRecoveryPhase(elapsed: number, phases: any, rotations: any, parallelAngleBase: number, shoulderRotation: any, elbowRotation: any, torsoRotation: number): void {
    const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
    const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    shoulderRotation.x = THREE.MathUtils.lerp(rotations.slash.x, parallelAngleBase, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(rotations.slash.y, 0, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(rotations.slash.z, 0, easedT);
    
    elbowRotation.x = THREE.MathUtils.lerp(0.1, 0, easedT);
    torsoRotation = THREE.MathUtils.lerp(0.4, 0, easedT);
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
    
    if (this.equippedWeapon) {
      this.equippedWeapon.getMesh().rotation.z = weaponWristRotation;
    }
  }
}
