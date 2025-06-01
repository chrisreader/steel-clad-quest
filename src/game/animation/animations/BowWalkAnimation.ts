import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';
import { WalkAnimationConfig } from '../AnimationConfig';

// DEPRECATED: This class is now handled by BowAnimationController
// Keeping for compatibility but functionality moved to unified system
export class BowWalkAnimation {
  private config: WalkAnimationConfig;
  private breathingTime: number = 0;
  
  // STANDARDIZED CONSTANTS - Must match BowAnimationController
  private static readonly HAND_ROTATION_X = Math.PI * 80 / 180; // +80° downward angle for grip
  private static readonly HAND_ROTATION_Y = 0; // 0° no side rotation
  private static readonly HAND_ROTATION_Z = 0; // 0° no twist for bow grip
  
  constructor(config: WalkAnimationConfig) {
    this.config = config;
    console.log('⚠️ [BowWalkAnimation] DEPRECATED: Use BowAnimationController instead');
  }
  
  public update(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isSprinting: boolean
  ): void {
    const sprintMultiplier = isSprinting ? 1.5 : 1;
    this.breathingTime += deltaTime * 2;
    
    const legSwing = Math.sin(walkCycle) * this.config.legSwingIntensity;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    const leftArmBaseX = Math.PI * 70 / 180;
    const leftArmBaseY = 0;
    const leftArmBaseZ = 0;
    
    playerBody.leftArm.rotation.x = leftArmBaseX - (armSwing * 0.3);
    playerBody.leftArm.rotation.y = leftArmBaseY;
    playerBody.leftArm.rotation.z = leftArmBaseZ;
    
    const rightArmBaseX = Math.PI / 6;
    const rightArmBaseY = 0;
    const rightArmBaseZ = -Math.PI / 8;
    
    playerBody.rightArm.rotation.x = rightArmBaseX + (armSwing * 0.5);
    playerBody.rightArm.rotation.y = rightArmBaseY;
    playerBody.rightArm.rotation.z = rightArmBaseZ;
    
    if (playerBody.leftElbow) {
      const leftElbowMovement = Math.sin(walkCycle + Math.PI) * (this.config.elbowMovement * 0.5) + 0.2;
      playerBody.leftElbow.rotation.x = leftElbowMovement;
    }
    
    if (playerBody.rightElbow) {
      const rightElbowMovement = Math.sin(walkCycle) * this.config.elbowMovement + 0.3;
      playerBody.rightElbow.rotation.x = rightElbowMovement;
    }
    
    const handBreathing = Math.sin(this.breathingTime * 1.2) * this.config.handMovement;
    
    // STANDARDIZED: Use consistent hand rotations
    playerBody.leftHand.rotation.x = BowWalkAnimation.HAND_ROTATION_X + handBreathing;
    playerBody.leftHand.rotation.y = BowWalkAnimation.HAND_ROTATION_Y;
    playerBody.leftHand.rotation.z = BowWalkAnimation.HAND_ROTATION_Z;
    
    playerBody.rightHand.rotation.x = handBreathing * 0.5;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = 0;
    
    const torsoSway = Math.sin(walkCycle * 0.8) * this.config.torsoSway * sprintMultiplier;
    if (playerBody.body) {
      playerBody.body.rotation.z = torsoSway;
    }
    
    console.log(`🏹 [BowWalkAnimation] DEPRECATED - Use BowAnimationController instead`);
  }
  
  public reset(playerBody: PlayerBody): void {
    playerBody.leftArm.rotation.set(Math.PI * 70 / 180, 0, 0);
    playerBody.rightArm.rotation.set(Math.PI / 6, 0, -Math.PI / 8);
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0.2, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0.3, 0, 0);
    }
    
    // STANDARDIZED: Use consistent hand rotations
    playerBody.leftHand.rotation.set(
      BowWalkAnimation.HAND_ROTATION_X,
      BowWalkAnimation.HAND_ROTATION_Y,
      BowWalkAnimation.HAND_ROTATION_Z
    );
    playerBody.rightHand.rotation.set(0, 0, 0);
    
    if (playerBody.body) {
      playerBody.body.rotation.z = 0;
    }
    
    console.log('🏹 [BowWalkAnimation] DEPRECATED - Reset to walking ready stance');
  }
}
