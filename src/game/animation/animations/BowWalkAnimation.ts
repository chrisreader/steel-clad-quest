
import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';
import { WalkAnimationConfig } from '../AnimationConfig';

export class BowWalkAnimation {
  private config: WalkAnimationConfig;
  private breathingTime: number = 0;
  
  constructor(config: WalkAnimationConfig) {
    this.config = config;
  }
  
  public update(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isSprinting: boolean
  ): void {
    const sprintMultiplier = isSprinting ? 1.5 : 1;
    this.breathingTime += deltaTime * 2;
    
    // Legs - normal walking animation
    const legSwing = Math.sin(walkCycle) * this.config.legSwingIntensity;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    // Arms - more natural walking movement with FORWARD-ANGLED bow positioning
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    // FORWARD-ANGLED base position for bow stance (30° upward, forward tilt)
    const forwardAngleBase = Math.PI / 6; // 30° instead of 22.5°
    
    // Left arm - bow holding with walking movement and FORWARD-ANGLED base
    playerBody.leftArm.rotation.x = forwardAngleBase - armSwing * 0.5;
    playerBody.leftArm.rotation.y = -0.6; // Bow angle positioning
    playerBody.leftArm.rotation.z = -0.4; // Forward angle for better POV visibility
    
    // Right arm - ready-to-draw with walking movement and FORWARD-ANGLED base
    playerBody.rightArm.rotation.x = forwardAngleBase + armSwing * 0.5;
    playerBody.rightArm.rotation.y = 0.1; // Slight outward angle
    playerBody.rightArm.rotation.z = -0.3; // Forward angle for better POV visibility
    
    // Elbows - more natural movement for bow stance
    if (playerBody.leftElbow) {
      const leftElbowMovement = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
      playerBody.leftElbow.rotation.x = leftElbowMovement;
    }
    
    if (playerBody.rightElbow) {
      const rightElbowMovement = Math.sin(walkCycle) * this.config.elbowMovement + 0.05;
      playerBody.rightElbow.rotation.x = rightElbowMovement;
    }
    
    // Hands - maintain grip positions with subtle movement
    const handBreathing = Math.sin(this.breathingTime * 1.2) * this.config.handMovement;
    
    // Left hand maintains bow grip but less extreme
    playerBody.leftHand.rotation.x = -Math.PI / 6 + handBreathing; // Reduced from -Math.PI / 4
    playerBody.leftHand.rotation.y = 0;
    playerBody.leftHand.rotation.z = Math.PI / 4; // Reduced from Math.PI / 3
    
    // Right hand ready position
    playerBody.rightHand.rotation.x = handBreathing * 0.5;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = 0;
    
    // Torso sway for natural movement (applied to entire body group)
    const torsoSway = Math.sin(walkCycle * 0.8) * this.config.torsoSway * sprintMultiplier;
    if (playerBody.body) {
      playerBody.body.rotation.z = torsoSway;
    }
    
    console.log(`🏹 [BowWalkAnimation] Updated with FORWARD-ANGLED arms for better POV - Cycle: ${walkCycle.toFixed(2)}, Sprint: ${isSprinting}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to FORWARD-ANGLED archery stance
    const forwardAngleBase = Math.PI / 6; // 30° upward angle
    
    playerBody.leftArm.rotation.set(forwardAngleBase, -0.6, -0.4); // FORWARD-ANGLED bow stance
    playerBody.rightArm.rotation.set(forwardAngleBase, 0.1, -0.3); // FORWARD-ANGLED ready stance
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0.05, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0.05, 0, 0);
    }
    
    playerBody.leftHand.rotation.set(-Math.PI / 6, 0, Math.PI / 4);
    playerBody.rightHand.rotation.set(0, 0, 0);
    
    if (playerBody.body) {
      playerBody.body.rotation.z = 0;
    }
    
    console.log('🏹 [BowWalkAnimation] Reset to FORWARD-ANGLED archery stance for better POV');
  }
}
