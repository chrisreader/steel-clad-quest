
import * as THREE from 'three';
import { PlayerBody, WeaponSwingAnimation } from '../../../types/GameTypes';

export class SwordSwingAnimation {
  private weaponSwing: WeaponSwingAnimation;
  private playerBody: PlayerBody;
  private equippedWeapon: any;
  private originalShoulderPosition: THREE.Vector3;
  private originalShoulderWorldPosition: THREE.Vector3;
  
  constructor(weaponSwing: WeaponSwingAnimation, playerBody: PlayerBody, equippedWeapon: any) {
    this.weaponSwing = weaponSwing;
    this.playerBody = playerBody;
    this.equippedWeapon = equippedWeapon;
    
    // Store original shoulder position for restoration
    this.originalShoulderPosition = this.playerBody.rightArm.position.clone();
    this.originalShoulderWorldPosition = new THREE.Vector3();
    this.playerBody.rightArm.getWorldPosition(this.originalShoulderWorldPosition);
    
    console.log('🗡️ [SwordSwingAnimation] *** CONSTRUCTOR CALLED *** - NEW INSTANCE CREATED');
    console.log('🗡️ [SwordSwingAnimation] Original shoulder local position:', this.originalShoulderPosition);
    console.log('🗡️ [SwordSwingAnimation] Original shoulder world position:', this.originalShoulderWorldPosition);
    console.log('🗡️ [SwordSwingAnimation] WeaponSwing active?:', this.weaponSwing.isActive);
  }
  
  public update(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon) {
      if (!this.weaponSwing.isActive) {
        console.log('🗡️ [SwordSwingAnimation] Update SKIPPED - weaponSwing not active');
      }
      if (!this.equippedWeapon) {
        console.log('🗡️ [SwordSwingAnimation] Update SKIPPED - no equipped weapon');
      }
      return;
    }
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, duration } = this.weaponSwing;
    
    console.log(`🗡️ [SwordSwingAnimation] *** UPDATE CALLED *** - Elapsed: ${elapsed.toFixed(3)}s, Duration: ${duration}s`);
    
    // Calculate world-space arm movement for dramatic cross-body swing
    let armWorldOffset = { x: 0, y: 0, z: 0 };
    let shoulderRotation = { x: 0, y: 0, z: 0 };
    let elbowRotation = { x: 0, y: 0, z: 0 };
    let wristRotation = { x: 0, y: 0, z: 0 };
    let torsoRotation = 0;
    
    // Enhanced spatial movement parameters for dramatic cross-body swing
    const maxRightReach = 3.5;   // How far right the arm reaches during windup
    const maxLeftReach = -4.0;   // How far left the arm travels during slash
    const maxHeight = 1.8;       // Peak height during windup
    const maxForwardReach = 2.8; // Maximum forward extension during slash
    
    // Natural shoulder rotation positions
    const neutralShoulderX = Math.PI / 3; // 60° ready position
    const windupShoulderX = Math.PI / 3 + THREE.MathUtils.degToRad(35); // Higher overhead
    const slashEndShoulderX = THREE.MathUtils.degToRad(45); // Lower end position
    
    const neutralShoulderY = 0;
    const windupShoulderY = THREE.MathUtils.degToRad(-40); // More dramatic wind back
    const slashEndShoulderY = THREE.MathUtils.degToRad(65); // Wider sweep across body
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: DRAMATIC preparation - arm moves FAR to the right and up
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // MASSIVE spatial movement - arm travels to far right position
      armWorldOffset.x = THREE.MathUtils.lerp(0, maxRightReach, easedT);
      armWorldOffset.y = THREE.MathUtils.lerp(0, maxHeight, easedT);
      armWorldOffset.z = THREE.MathUtils.lerp(0, -1.5, easedT); // Pull back for power
      
      // Shoulder rotation - preparing for strike
      shoulderRotation.x = THREE.MathUtils.lerp(neutralShoulderX, windupShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(neutralShoulderY, windupShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0, -0.4, easedT);
      
      // Elbow - dramatic bend for power coiling
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, -2.4, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, 0.6, easedT);
      
      // Wrist preparation
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 4, -Math.PI / 6, easedT);
      wristRotation.y = THREE.MathUtils.lerp(0, -0.3, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0.25, easedT);
      
      // Torso coiling for power
      torsoRotation = THREE.MathUtils.lerp(0, -1.3, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** - World offset: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: EXPLOSIVE cross-body movement from far right to far left
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration
      
      // MASSIVE cross-body sweep through world space
      armWorldOffset.x = THREE.MathUtils.lerp(maxRightReach, maxLeftReach, easedT);
      armWorldOffset.y = THREE.MathUtils.lerp(maxHeight, -0.8, easedT); // Arc downward
      armWorldOffset.z = THREE.MathUtils.lerp(-1.5, maxForwardReach, easedT); // Extend forward powerfully
      
      // Shoulder rotation - driving the swing
      shoulderRotation.x = THREE.MathUtils.lerp(windupShoulderX, slashEndShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(windupShoulderY, slashEndShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(-0.4, 0.6, easedT);
      
      // Elbow - EXPLOSIVE extension for maximum reach
      elbowRotation.x = THREE.MathUtils.lerp(-2.4, 2.0, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0.6, -0.7, easedT);
      
      // Wrist - snap through the strike
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 6, -Math.PI / 3, easedT);
      wristRotation.y = THREE.MathUtils.lerp(-0.3, Math.PI / 4, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0.25, -Math.PI / 4, easedT);
      
      // Torso uncoiling with maximum power
      torsoRotation = THREE.MathUtils.lerp(-1.3, 1.7, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** - World offset: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to center ready position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return arm to neutral world position
      armWorldOffset.x = THREE.MathUtils.lerp(maxLeftReach, 0, easedT);
      armWorldOffset.y = THREE.MathUtils.lerp(-0.8, 0, easedT);
      armWorldOffset.z = THREE.MathUtils.lerp(maxForwardReach, 0, easedT);
      
      // Return shoulder rotation to ready
      shoulderRotation.x = THREE.MathUtils.lerp(slashEndShoulderX, neutralShoulderX, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(slashEndShoulderY, neutralShoulderY, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0.6, 0, easedT);
      
      // Return elbow to ready position
      elbowRotation.x = THREE.MathUtils.lerp(2.0, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-0.7, 0, easedT);
      
      // Return wrist to ready position
      wristRotation.x = THREE.MathUtils.lerp(-Math.PI / 3, -Math.PI / 4, easedT);
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 4, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(-Math.PI / 4, 0, easedT);
      
      // Return torso to neutral
      torsoRotation = THREE.MathUtils.lerp(1.7, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** - World offset: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the world-space arm movement and rotations
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING WORLD TRANSFORMS *** - About to apply world offset: x=${armWorldOffset.x.toFixed(2)}`);
    this.applyWorldSpaceMovement(armWorldOffset, shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyWorldSpaceMovement(
    armWorldOffset: any,
    shoulderRotation: any, 
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    // Apply world-space arm movement (this is the key for spatial movement)
    const newWorldPosition = this.originalShoulderWorldPosition.clone();
    newWorldPosition.x += armWorldOffset.x; // Cross-body movement
    newWorldPosition.y += armWorldOffset.y; // Vertical arc
    newWorldPosition.z += armWorldOffset.z; // Forward/back extension
    
    // Convert world position back to local space relative to the player body
    const playerWorldMatrix = new THREE.Matrix4();
    this.playerBody.body.matrixWorld.copy(playerWorldMatrix);
    
    const localPosition = this.playerBody.body.worldToLocal(newWorldPosition.clone());
    this.playerBody.rightArm.position.copy(localPosition);
    
    console.log(`🗡️ [SwordSwingAnimation] *** WORLD POSITION APPLIED ***`);
    console.log(`    Original world pos: x=${this.originalShoulderWorldPosition.x.toFixed(2)}, y=${this.originalShoulderWorldPosition.y.toFixed(2)}, z=${this.originalShoulderWorldPosition.z.toFixed(2)}`);
    console.log(`    New world pos: x=${newWorldPosition.x.toFixed(2)}, y=${newWorldPosition.y.toFixed(2)}, z=${newWorldPosition.z.toFixed(2)}`);
    console.log(`    Local pos: x=${localPosition.x.toFixed(2)}, y=${localPosition.y.toFixed(2)}, z=${localPosition.z.toFixed(2)}`);
    console.log(`    World offset applied: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
    
    // Apply joint rotations
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
    
    // Debug weapon position if available
    if (this.equippedWeapon && this.equippedWeapon.mesh) {
      const weaponWorldPos = new THREE.Vector3();
      this.equippedWeapon.mesh.getWorldPosition(weaponWorldPos);
      console.log(`🗡️ [SwordSwingAnimation] Weapon world position: x=${weaponWorldPos.x.toFixed(2)}, y=${weaponWorldPos.y.toFixed(2)}, z=${weaponWorldPos.z.toFixed(2)}`);
    }
  }
  
  private completeAnimation(): void {
    console.log('🗡️ [SwordSwingAnimation] *** COMPLETING ANIMATION *** - Resetting to original position');
    
    // Reset to original positions and rotations
    this.playerBody.rightArm.position.copy(this.originalShoulderPosition);
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
    
    this.weaponSwing.isActive = false;
    console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - weaponSwing.isActive set to false');
  }
}
