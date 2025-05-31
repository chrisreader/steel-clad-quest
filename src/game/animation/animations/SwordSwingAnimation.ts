
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
    const { phases, duration } = this.weaponSwing;
    
    let shoulderRotation = { x: 0, y: 0, z: 0 };
    let elbowRotation = { x: 0, y: 0, z: 0 };
    let wristRotation = { x: 0, y: 0, z: 0 };
    let weaponWristRotation = 0;
    let torsoRotation = 0;
    
    // HORIZONTAL positions for realistic diagonal slash (65° to 55° vertical arc)
    const neutralShoulderX = Math.PI / 3; // 60° chest level
    const windupShoulderX = THREE.MathUtils.degToRad(65); // 65° slightly above chest (minimal rise)
    const slashEndShoulderX = THREE.MathUtils.degToRad(55); // 55° slightly below chest (minimal drop)
    
    const neutralShoulderY = 0;
    const windupShoulderY = THREE.MathUtils.degToRad(-40); // Pull right/back
    const slashEndShoulderY = THREE.MathUtils.degToRad(70); // Sweep left
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Minimal raise for horizontal swing (20% of total time)
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Horizontal diagonal windup - minimal vertical movement
      shoulderRotation.x = THREE.MathUtils.lerp(neutralShoulderX, windupShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(neutralShoulderY, windupShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0, -0.2, easedT);
      
      // Elbow bends naturally for high position
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, -0.3, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, 0.15, easedT);
      
      // Wrist prepares for strike
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 4, -Math.PI / 6, easedT);
      wristRotation.y = THREE.MathUtils.lerp(0, -0.15, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0.1, easedT);
      
      // Torso winds up for power
      torsoRotation = THREE.MathUtils.lerp(0, -0.4, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: Horizontal diagonal sweep with minimal vertical drop (50% of total time)
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration
      
      // HORIZONTAL diagonal sweep with only 10° vertical arc
      shoulderRotation.x = THREE.MathUtils.lerp(windupShoulderX, slashEndShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(windupShoulderY, slashEndShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(-0.2, 0.3, easedT);
      
      // Elbow extends dramatically during slash
      elbowRotation.x = THREE.MathUtils.lerp(-0.3, 0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0.15, -0.2, easedT);
      
      // Wrist follows through the diagonal motion
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, -Math.PI / 3, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-0.15, Math.PI / 4, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0.1, -Math.PI / 6, easedT);
      
      // Strong torso rotation for full-body diagonal slash
      torsoRotation = THREE.MathUtils.lerp(-0.4, 0.8, easedT);
      
      // Enhanced wrist snap during middle 60% of slash
      if (t >= 0.2 && t <= 0.8) {
        const wristT = (t - 0.2) / 0.6;
        const intensity = this.weaponSwing.wristSnapIntensity || 1.0;
        weaponWristRotation = Math.sin(wristT * Math.PI) * (intensity * 3.0);
      }
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral stance (30% of total time)
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Smooth return to neutral chest position
      shoulderRotation.x = THREE.MathUtils.lerp(slashEndShoulderX, neutralShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(slashEndShoulderY, neutralShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0.3, 0, easedT);
      
      // Return elbow to ready position
      elbowRotation.x = THREE.MathUtils.lerp(0.1, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-0.2, 0, easedT);
      
      // Return wrist to forward-pointing ready position
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 3, -Math.PI / 4, easedT);
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 4, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 6, 0, easedT);
      
      // Return torso to neutral
      torsoRotation = THREE.MathUtils.lerp(0.8, 0, easedT);
      
    } else {
      // ANIMATION COMPLETE - reset to exact neutral position
      this.completeAnimation();
      return;
    }
    
    this.applyRotations(shoulderRotation, elbowRotation, wristRotation, torsoRotation, weaponWristRotation);
  }
  
  private completeAnimation(): void {
    this.playerBody.rightArm.rotation.set(Math.PI / 3, 0, 0);
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(-0.05, 0, 0);
    }
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(-Math.PI / 4, 0, 0);
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0;
    }
    if (this.equippedWeapon) {
      this.equippedWeapon.getMesh().rotation.z = 0;
    }
    this.weaponSwing.isActive = false;
  }
  
  private applyRotations(shoulderRotation: any, elbowRotation: any, wristRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
    }
    
    if (this.equippedWeapon) {
      this.equippedWeapon.getMesh().rotation.z = weaponWristRotation;
    }
  }
}
