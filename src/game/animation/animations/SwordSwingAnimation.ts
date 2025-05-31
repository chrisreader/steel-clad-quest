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
    
    // Pull back during windup for dramatic effect
    shoulderRotation.x = chestLevelBase; // Stay at 60° chest level position
    shoulderRotation.y = THREE.MathUtils.lerp(0, rotations.windup.y, easedT); // Pull back motion
    shoulderRotation.z = 0; // No extra rotation
    
    // Downward elbow bend to maintain horizontal blade at chest level
    elbowRotation.x = -0.05; // Downward bend to counteract forward shoulder angle
    
    // Wrist positioning for forward-pointing sword during windup
    wristRotation.x = -Math.PI / 4; // Angle wrist down to point sword forward (-45°)
    wristRotation.y = 0;
    wristRotation.z = 0;
    
    // Add slight torso counter-rotation during windup for more power
    torsoRotation = THREE.MathUtils.lerp(0, -0.1, easedT); // Slight counter-rotation
  }
  
  private updateSlashPhase(elapsed: number, phases: any, rotations: any, shoulderRotation: any, elbowRotation: any, wristRotation: any, torsoRotation: number, weaponWristRotation: number): void {
    const t = (elapsed - phases.windup) / phases.slash;
    const easedT = t * t * (3 - 2 * t);
    
    // DRAMATIC HORIZONTAL CHEST-LEVEL SLASH - wide arc across screen
    const startX = Math.PI / 3; // Start from 60° chest level
    const slashX = Math.PI / 3; // END at same 60° chest level (no vertical movement)
    
    shoulderRotation.x = THREE.MathUtils.lerp(startX, slashX, easedT); // Stay at chest level
    shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, easedT); // WIDE right-to-left motion
    shoulderRotation.z = THREE.MathUtils.lerp(0, rotations.slash.z, easedT); // Enhanced wrist snap
    
    // Elbow maintains horizontal blade positioning throughout
    elbowRotation.x = THREE.MathUtils.lerp(-0.05, -0.1, easedT); // Slightly more downward bend for follow-through
    
    // Wrist motion for forward slashing - angles sword forward and sweeps
    const startWristX = -Math.PI / 4; // Start with sword pointing forward
    const endWristX = -Math.PI / 6;   // End with sword still forward but less angled
    wristRotation.x = THREE.MathUtils.lerp(startWristX, endWristX, easedT);
    
    // Add horizontal wrist rotation for slashing motion
    wristRotation.y = THREE.MathUtils.lerp(0, Math.PI / 8, easedT); // Rotate wrist for slash
    wristRotation.z = THREE.MathUtils.lerp(0, -Math.PI / 12, easedT); // Slight twist for realism
    
    // ENHANCED TORSO ROTATION for dramatic full-body movement
    torsoRotation = THREE.MathUtils.lerp(-0.1, 0.35, easedT); // Increased torso rotation for wider arc
    
    // Enhanced wrist rotation for proper slashing motion
    if (t >= 0.2 && t <= 0.8) {
      const wristT = (t - 0.2) / 0.6;
      const intensity = this.weaponSwing.wristSnapIntensity || 1.0;
      weaponWristRotation = Math.sin(wristT * Math.PI) * (intensity * 2.0); // Increased intensity
    }
  }
  
  private updateRecoveryPhase(elapsed: number, phases: any, rotations: any, chestLevelBase: number, shoulderRotation: any, elbowRotation: any, wristRotation: any, torsoRotation: number): void {
    const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
    const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    shoulderRotation.x = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.x, chestLevelBase, easedT);
    shoulderRotation.y = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.y, 0, easedT);
    shoulderRotation.z = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.z, 0, easedT);
    
    // Return to downward elbow position for horizontal stance
    elbowRotation.x = THREE.MathUtils.lerp(-0.1, -0.05, easedT);
    
    // Return wrist to forward-pointing ready position
    wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, -Math.PI / 4, easedT); // Return to forward-pointing
    wristRotation.y = THREE.MathUtils.lerp(Math.PI / 8, 0, easedT);
    wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 12, 0, easedT);
    
    // Return torso to neutral position
    torsoRotation = THREE.MathUtils.lerp(0.35, 0, easedT);
  }
  
  private completeAnimation(chestLevelBase: number): void {
    this.playerBody.rightArm.rotation.set(chestLevelBase, 0, 0);
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(-0.05, 0, 0); // Downward elbow bend at rest
    }
    // NEW: Set wrist to forward-pointing ready position
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(-Math.PI / 4, 0, 0); // Forward-pointing sword
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
    
    // NEW: Apply wrist rotation to angle sword forward
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
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
