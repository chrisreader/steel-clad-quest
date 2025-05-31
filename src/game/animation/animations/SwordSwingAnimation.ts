
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
    console.log('🗡️ [SwordSwingAnimation] *** DEBUGGING TRACE *** - Constructor parameters received:');
    console.log('🗡️ [SwordSwingAnimation]   - weaponSwing exists:', !!weaponSwing);
    console.log('🗡️ [SwordSwingAnimation]   - playerBody exists:', !!playerBody);
    console.log('🗡️ [SwordSwingAnimation]   - equippedWeapon exists:', !!equippedWeapon);
    console.log('🗡️ [SwordSwingAnimation]   - weaponSwing.isActive:', weaponSwing?.isActive);
    console.log('🗡️ [SwordSwingAnimation]   - weaponSwing.duration:', weaponSwing?.duration);
    console.log('🗡️ [SwordSwingAnimation] Original shoulder local position:', this.originalShoulderPosition);
    console.log('🗡️ [SwordSwingAnimation] Original shoulder world position:', this.originalShoulderWorldPosition);
  }
  
  public update(): void {
    console.log('🗡️ [SwordSwingAnimation] *** UPDATE METHOD CALLED ***');
    console.log('🗡️ [SwordSwingAnimation] weaponSwing.isActive:', this.weaponSwing?.isActive);
    console.log('🗡️ [SwordSwingAnimation] equippedWeapon exists:', !!this.equippedWeapon);
    
    if (!this.weaponSwing) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - weaponSwing is null/undefined');
      return;
    }
    
    if (!this.weaponSwing.isActive) {
      console.log('🗡️ [SwordSwingAnimation] Update SKIPPED - weaponSwing not active');
      return;
    }
    
    if (!this.equippedWeapon) {
      console.log('🗡️ [SwordSwingAnimation] Update SKIPPED - no equipped weapon');
      return;
    }
    
    if (!this.weaponSwing.clock) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - weaponSwing.clock is null/undefined');
      return;
    }
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, duration } = this.weaponSwing;
    
    console.log(`🗡️ [SwordSwingAnimation] *** ANIMATION ACTIVE *** - Elapsed: ${elapsed.toFixed(3)}s, Duration: ${duration}s`);
    console.log(`🗡️ [SwordSwingAnimation] Animation phases:`, phases);
    
    // Enhanced spatial movement parameters for dramatic cross-body swing
    const maxRightReach = 3.0;   // How far right the arm reaches during windup
    const maxLeftReach = -3.5;   // How far left the arm travels during slash
    const maxHeight = 1.5;       // Peak height during windup
    const maxForwardReach = 2.0; // Maximum forward extension during slash
    
    // Calculate the dramatic arm movement through world space
    let armWorldOffset = { x: 0, y: 0, z: 0 };
    let shoulderRotation = { x: Math.PI / 3, y: 0, z: 0 }; // Default ready position
    let elbowRotation = { x: -0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 4, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // WINDUP PHASE: Dramatic preparation - arm moves FAR to the right and up
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // MASSIVE spatial movement - arm travels to far right position
      armWorldOffset.x = THREE.MathUtils.lerp(0, maxRightReach, easedT);
      armWorldOffset.y = THREE.MathUtils.lerp(0, maxHeight, easedT);
      armWorldOffset.z = THREE.MathUtils.lerp(0, -1.0, easedT); // Pull back for power
      
      // Shoulder rotation - preparing for strike
      shoulderRotation.x = THREE.MathUtils.lerp(Math.PI / 3, Math.PI / 3 + THREE.MathUtils.degToRad(35), easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(-40), easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0, -0.4, easedT);
      
      // Elbow - dramatic bend for power coiling
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, -2.4, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, 0.6, easedT);
      
      // Torso coiling for power
      torsoRotation = THREE.MathUtils.lerp(0, -1.3, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** WINDUP PHASE *** t=${t.toFixed(2)} - World offset: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: EXPLOSIVE cross-body movement from far right to far left
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Aggressive acceleration
      
      // MASSIVE cross-body sweep through world space
      armWorldOffset.x = THREE.MathUtils.lerp(maxRightReach, maxLeftReach, easedT);
      armWorldOffset.y = THREE.MathUtils.lerp(maxHeight, -0.5, easedT); // Arc downward
      armWorldOffset.z = THREE.MathUtils.lerp(-1.0, maxForwardReach, easedT); // Extend forward powerfully
      
      // Shoulder rotation - driving the swing
      shoulderRotation.x = THREE.MathUtils.lerp(Math.PI / 3 + THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(45), easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(-40), THREE.MathUtils.degToRad(65), easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(-0.4, 0.6, easedT);
      
      // Elbow - EXPLOSIVE extension for maximum reach
      elbowRotation.x = THREE.MathUtils.lerp(-2.4, 2.0, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0.6, -0.7, easedT);
      
      // Torso uncoiling with maximum power
      torsoRotation = THREE.MathUtils.lerp(-1.3, 1.7, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** SLASH PHASE *** t=${t.toFixed(2)} - World offset: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to center ready position
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return arm to neutral world position
      armWorldOffset.x = THREE.MathUtils.lerp(maxLeftReach, 0, easedT);
      armWorldOffset.y = THREE.MathUtils.lerp(-0.5, 0, easedT);
      armWorldOffset.z = THREE.MathUtils.lerp(maxForwardReach, 0, easedT);
      
      // Return to ready positions
      shoulderRotation.x = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(45), Math.PI / 3, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(THREE.MathUtils.degToRad(65), 0, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0.6, 0, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(2.0, -0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(-0.7, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(1.7, 0, easedT);
      
      console.log(`🗡️ [SwordSwingAnimation] *** RECOVERY PHASE *** t=${t.toFixed(2)} - World offset: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
      
    } else {
      // ANIMATION COMPLETE
      console.log('🗡️ [SwordSwingAnimation] *** ANIMATION COMPLETE *** - calling completeAnimation()');
      this.completeAnimation();
      return;
    }
    
    // Apply the world-space arm movement and rotations
    console.log(`🗡️ [SwordSwingAnimation] *** APPLYING TRANSFORMS *** - About to apply world offset and rotations`);
    this.applyArmMovement(armWorldOffset, shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }
  
  private applyArmMovement(
    armWorldOffset: any,
    shoulderRotation: any, 
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    console.log(`🗡️ [SwordSwingAnimation] *** APPLY ARM MOVEMENT *** - Starting to apply transforms`);
    
    if (!this.playerBody || !this.playerBody.rightArm) {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - playerBody or rightArm is null');
      return;
    }
    
    // Calculate new world position for the entire arm assembly
    const newWorldPosition = this.originalShoulderWorldPosition.clone();
    newWorldPosition.x += armWorldOffset.x; // Cross-body movement
    newWorldPosition.y += armWorldOffset.y; // Vertical arc
    newWorldPosition.z += armWorldOffset.z; // Forward/back extension
    
    console.log(`🗡️ [SwordSwingAnimation] World position calculation:`);
    console.log(`  Original: x=${this.originalShoulderWorldPosition.x.toFixed(2)}, y=${this.originalShoulderWorldPosition.y.toFixed(2)}, z=${this.originalShoulderWorldPosition.z.toFixed(2)}`);
    console.log(`  Offset: x=${armWorldOffset.x.toFixed(2)}, y=${armWorldOffset.y.toFixed(2)}, z=${armWorldOffset.z.toFixed(2)}`);
    console.log(`  New: x=${newWorldPosition.x.toFixed(2)}, y=${newWorldPosition.y.toFixed(2)}, z=${newWorldPosition.z.toFixed(2)}`);
    
    // Convert world position back to local space relative to the player body
    if (this.playerBody.body && this.playerBody.body.worldToLocal) {
      const localPosition = this.playerBody.body.worldToLocal(newWorldPosition.clone());
      this.playerBody.rightArm.position.copy(localPosition);
      
      console.log(`🗡️ [SwordSwingAnimation] *** ARM POSITION UPDATED ***`);
      console.log(`  Local position: x=${localPosition.x.toFixed(2)}, y=${localPosition.y.toFixed(2)}, z=${localPosition.z.toFixed(2)}`);
    } else {
      console.error('🗡️ [SwordSwingAnimation] *** ERROR *** - Cannot convert to local position, playerBody.body or worldToLocal missing');
    }
    
    // Apply joint rotations
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    console.log(`🗡️ [SwordSwingAnimation] Shoulder rotation applied: x=${shoulderRotation.x.toFixed(2)}, y=${shoulderRotation.y.toFixed(2)}, z=${shoulderRotation.z.toFixed(2)}`);
    
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Elbow rotation applied: x=${elbowRotation.x.toFixed(2)}, y=${elbowRotation.y.toFixed(2)}, z=${elbowRotation.z.toFixed(2)}`);
    }
    
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
      console.log(`🗡️ [SwordSwingAnimation] Wrist rotation applied`);
    }
    
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
      console.log(`🗡️ [SwordSwingAnimation] Torso rotation applied: ${torsoRotation.toFixed(2)}`);
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
