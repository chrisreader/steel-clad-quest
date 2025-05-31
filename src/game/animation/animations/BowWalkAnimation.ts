
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
    
    // Left arm - maintain bow holding stance with minimal movement
    const leftShoulderBase = Math.PI / 8 - 0.3; // Base archery stance
    const leftShoulderSway = Math.sin(walkCycle * 0.5) * this.config.shoulderMovement;
    const leftBreathing = Math.sin(this.breathingTime) * this.config.breathingIntensity;
    
    playerBody.leftArm.rotation.x = leftShoulderBase + leftShoulderSway + leftBreathing;
    playerBody.leftArm.rotation.y = -0.6 + (Math.sin(walkCycle * 0.3) * 0.01); // Minimal sway
    playerBody.leftArm.rotation.z = 0.1;
    
    // Right arm - maintain ready-to-draw stance with subtle movement
    const rightShoulderBase = Math.PI / 8 - 0.2; // Base ready stance
    const rightShoulderSway = Math.sin(walkCycle * 0.4) * this.config.shoulderMovement * 0.8;
    const rightBreathing = Math.sin(this.breathingTime + Math.PI / 4) * this.config.breathingIntensity;
    
    playerBody.rightArm.rotation.x = rightShoulderBase + rightShoulderSway + rightBreathing;
    playerBody.rightArm.rotation.y = 0.1 + (Math.sin(walkCycle * 0.2) * 0.008); // Very subtle movement
    playerBody.rightArm.rotation.z = -0.1;
    
    // Elbows - maintain archery stance with minimal natural movement
    if (playerBody.leftElbow) {
      const leftElbowBase = 0.2; // Natural forward bend
      const leftElbowMovement = Math.sin(walkCycle * 0.6) * this.config.elbowMovement;
      playerBody.leftElbow.rotation.x = leftElbowBase + leftElbowMovement;
    }
    
    if (playerBody.rightElbow) {
      const rightElbowBase = 0.3; // Ready position
      const rightElbowMovement = Math.sin(walkCycle * 0.5) * this.config.elbowMovement;
      playerBody.rightElbow.rotation.x = rightElbowBase + rightElbowMovement;
    }
    
    // Hands - maintain grip positions with breathing
    const handBreathing = Math.sin(this.breathingTime * 1.2) * this.config.handMovement;
    
    // Left hand maintains bow grip
    playerBody.leftHand.rotation.x = -Math.PI / 4 + handBreathing;
    playerBody.leftHand.rotation.y = 0;
    playerBody.leftHand.rotation.z = Math.PI / 3;
    
    // Right hand ready position
    playerBody.rightHand.rotation.x = handBreathing * 0.5;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = 0;
    
    // Torso sway for natural movement (applied to entire body group)
    const torsoSway = Math.sin(walkCycle * 0.8) * this.config.torsoSway * sprintMultiplier;
    if (playerBody.body) {
      playerBody.body.rotation.z = torsoSway;
    }
    
    console.log(`🏹 [BowWalkAnimation] Updated bow walking animation - Cycle: ${walkCycle.toFixed(2)}, Sprint: ${isSprinting}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to archery stance
    playerBody.leftArm.rotation.set(Math.PI / 8 - 0.3, -0.6, 0.1);
    playerBody.rightArm.rotation.set(Math.PI / 8 - 0.2, 0.1, -0.1);
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0.2, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0.3, 0, 0);
    }
    
    playerBody.leftHand.rotation.set(-Math.PI / 4, 0, Math.PI / 3);
    playerBody.rightHand.rotation.set(0, 0, 0);
    
    if (playerBody.body) {
      playerBody.body.rotation.z = 0;
    }
    
    console.log('🏹 [BowWalkAnimation] Reset to archery stance');
  }
}
