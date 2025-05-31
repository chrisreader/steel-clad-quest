
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
    let wristRotation = { x: 0, y: 0, z: 0 };
    let weaponWristRotation = 0;
    let torsoRotation = 0;
    
    // FIXED: Use proper chest-level horizontal base angle
    const chestLevelBase = Math.PI / 3; // 60° - matches the ready stance
    
    if (elapsed < phases.windup) {
      this.updateWindupPhase(elapsed, phases, rotations, chestLevelBase, shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    } else if (elapsed < phases.windup + phases.slash) {
      this.updateSlashPhase(elapsed, phases, rotations, shoulderRotation, elbowRotation, wristRotation, torsoRotation, weaponWristRotation);
    } else if (elapsed < duration) {
      this.updateRecoveryPhase(elapsed, phases, rotations, chestLevelBase, shoulderRotation, elbowRotation, wristRotation, torsoRotation);
    } else {
      this.completeAnimation(chestLevelBase);
      return;
    }
    
    this.applyRotations(shoulderRotation, elbowRotation, wristRotation, torsoRotation, weaponWristRotation);
  }
  
  private updateWindupPhase(elapsed: number, phases: any, rotations: any, chestLevelBase: number, shoulderRotation: any, elbowRotation: any, wristRotation: any, torsoRotation: number): void {
    const t = elapsed / phases.windup;
    const easedT = t * t * (3 - 2 * t);
    
    // ENTIRE ARM positioned to the RIGHT side during windup
    shoulderRotation.x = THREE.MathUtils.lerp(chestLevelBase, chestLevelBase + 0.2, easedT); // Slight upward for right position
    shoulderRotation.y = THREE.MathUtils.lerp(0, -0.8, easedT); // PULL ARM FAR TO THE RIGHT (-45°)
    shoulderRotation.z = THREE.MathUtils.lerp(0, -0.3, easedT); // Roll shoulder back for power
    
    // Elbow bends to bring sword closer and prepare for slash
    elbowRotation.x = THREE.MathUtils.lerp(-0.05, -0.4, easedT); // Bend elbow more for windup
    elbowRotation.y = THREE.MathUtils.lerp(0, 0.2, easedT); // Slight outward elbow for right position
    
    // Wrist angles sword forward and slightly up for dramatic ready position
    wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 4, -Math.PI / 6, easedT); // Less downward angle
    wristRotation.y = THREE.MathUtils.lerp(0, -0.2, easedT); // Slight inward wrist turn
    wristRotation.z = THREE.MathUtils.lerp(0, 0.1, easedT); // Slight twist for ready position
    
    // Counter-rotate torso to amplify the right-side positioning
    torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT); // Turn body right to load the swing
  }
  
  private updateSlashPhase(elapsed: number, phases: any, rotations: any, shoulderRotation: any, elbowRotation: any, wristRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    const t = (elapsed - phases.windup) / phases.slash;
    const easedT = t * t * (3 - 2 * t);
    
    // ENTIRE ARM SWEEPS FROM RIGHT TO LEFT across the body
    const startX = Math.PI / 3 + 0.2; // Start from right-side elevated position
    const endX = Math.PI / 3;         // End at chest level
    
    shoulderRotation.x = THREE.MathUtils.lerp(startX, endX, easedT); // Slight downward arc
    shoulderRotation.y = THREE.MathUtils.lerp(-0.8, rotations.slash.y, easedT); // MASSIVE sweep from right to left
    shoulderRotation.z = THREE.MathUtils.lerp(-0.3, rotations.slash.z, easedT); // Follow through with roll
    
    // Elbow extends and follows the arm swing
    elbowRotation.x = THREE.MathUtils.lerp(-0.4, -0.1, easedT); // Extend elbow during slash
    elbowRotation.y = THREE.MathUtils.lerp(0.2, -0.3, easedT); // Elbow sweeps from out to in
    
    // Wrist follows through with the slash motion
    const startWristX = -Math.PI / 6;
    const endWristX = -Math.PI / 4;
    wristRotation.x = THREE.MathUtils.lerp(startWristX, endWristX, easedT);
    wristRotation.y = THREE.MathUtils.lerp(-0.2, Math.PI / 6, easedT); // Wrist rotates through slash
    wristRotation.z = THREE.MathUtils.lerp(0.1, -Math.PI / 8, easedT); // Follow-through twist
    
    // MASSIVE TORSO ROTATION for full-body power
    torsoRotation = THREE.MathUtils.lerp(-0.3, 0.6, easedT); // HUGE body rotation from right to left
    
    // Enhanced wrist rotation for proper slashing motion
    if (t >= 0.2 && t <= 0.8) {
      const wristT = (t - 0.2) / 0.6;
      const intensity = this.weaponSwing.wristSnapIntensity || 1.0;
      weaponWristRotation = Math.sin(wristT * Math.PI) * (intensity * 2.5); // Even more intensity
    }
  }
  
  private updateRecoveryPhase(elapsed: number, phases: any, rotations: any, chestLevelBase: number, shoulderRotation: any, elbowRotation: any, wristRotation: any, torsoRotation: number): void {
    const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
    const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    // Return entire arm to neutral chest-level position
    shoulderRotation.x = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.x, chestLevelBase, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.y, 0, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.z, 0, easedT);
    
    // Return elbow to neutral ready position
    elbowRotation.x = THREE.MathUtils.lerp(-0.1, -0.05, easedT);
    elbowRotation.y = THREE.MathUtils.lerp(-0.3, 0, easedT);
    
    // Return wrist to forward-pointing ready position
    wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 4, -Math.PI / 4, easedT);
    wristRotation.y = THREE.MathUtils.lerp(Math.PI / 6, 0, easedT);
    wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 8, 0, easedT);
    
    // Return torso to neutral position
    torsoRotation = THREE.MathUtils.lerp(0.6, 0, easedT);
  }
  
  private completeAnimation(chestLevelBase: number): void {
    // Reset entire arm to neutral ready stance
    this.playerBody.rightArm.rotation.set(chestLevelBase, 0, 0);
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
    // Apply full arm movement
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
