
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
    
    // Arms - different base positions for bow vs non-bow arms
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    // BOW READY STANCE: Left arm raised for bow, right arm at side
    
    // Left arm - WEAPON ARM: raised bow-holding position with reduced swing
    const leftArmBaseX = Math.PI / 4;   // 45° raised position
    const leftArmBaseY = 0;             // FIXED: NO Y rotation - keep natural like empty hands
    const leftArmBaseZ = -Math.PI / 6;  // Forward angle for better POV visibility
    
    // Reduced swing for bow-holding arm to maintain control
    playerBody.leftArm.rotation.x = leftArmBaseX - (armSwing * 0.3);
    playerBody.leftArm.rotation.y = leftArmBaseY; // FIXED: Always 0 - no inward rotation
    playerBody.leftArm.rotation.z = leftArmBaseZ;
    
    // Right arm - normal side position with walking movement (will be adjusted by draw animation)
    const rightArmBaseX = Math.PI / 6;  // Moderate upward angle
    const rightArmBaseY = 0;            // FIXED: NO Y rotation - keep natural like empty hands
    const rightArmBaseZ = -Math.PI / 8; // Forward angle for better POV visibility
    
    playerBody.rightArm.rotation.x = rightArmBaseX + (armSwing * 0.5);
    playerBody.rightArm.rotation.y = rightArmBaseY; // FIXED: Always 0 - no inward rotation
    playerBody.rightArm.rotation.z = rightArmBaseZ;
    
    // Elbows - natural movement for bow stance
    if (playerBody.leftElbow) {
      // Less movement for bow-holding arm
      const leftElbowMovement = Math.sin(walkCycle + Math.PI) * (this.config.elbowMovement * 0.5) + 0.2;
      playerBody.leftElbow.rotation.x = leftElbowMovement;
    }
    
    if (playerBody.rightElbow) {
      const rightElbowMovement = Math.sin(walkCycle) * this.config.elbowMovement + 0.3;
      playerBody.rightElbow.rotation.x = rightElbowMovement;
    }
    
    // Hands - maintain grip positions with subtle movement
    const handBreathing = Math.sin(this.breathingTime * 1.2) * this.config.handMovement;
    
    // Left hand maintains bow grip
    playerBody.leftHand.rotation.x = -Math.PI / 6 + handBreathing;
    playerBody.leftHand.rotation.y = 0;
    playerBody.leftHand.rotation.z = Math.PI / 4;
    
    // Right hand ready position
    playerBody.rightHand.rotation.x = handBreathing * 0.5;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = 0;
    
    // Torso sway for natural movement (applied to entire body group)
    const torsoSway = Math.sin(walkCycle * 0.8) * this.config.torsoSway * sprintMultiplier;
    if (playerBody.body) {
      playerBody.body.rotation.z = torsoSway;
    }
    
    console.log(`🏹 [BowWalkAnimation] FIXED - Left arm raised with NO Y rotation - Sprint: ${isSprinting}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to BOW READY STANCE (not empty hands stance)
    
    // FIXED: Left arm: Raised bow-holding position - NO Y rotation
    playerBody.leftArm.rotation.set(Math.PI / 4, 0, -Math.PI / 6);
    
    // FIXED: Right arm: Ready position - NO Y rotation
    playerBody.rightArm.rotation.set(Math.PI / 6, 0, -Math.PI / 8);
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0.2, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0.3, 0, 0);
    }
    
    playerBody.leftHand.rotation.set(-Math.PI / 6, 0, Math.PI / 4);
    playerBody.rightHand.rotation.set(0, 0, 0);
    
    if (playerBody.body) {
      playerBody.body.rotation.z = 0;
    }
    
    console.log('🏹 [BowWalkAnimation] FIXED reset - Left arm raised upward/forward with NO Y rotation');
  }
}
