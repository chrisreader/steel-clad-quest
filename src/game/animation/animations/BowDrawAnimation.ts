import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';
import { WalkAnimationConfig } from '../AnimationConfig';

export class BowDrawAnimation {
  private config: WalkAnimationConfig;
  private transitionSpeed: number = 4; // Speed of transition to drawing position
  
  constructor(config: WalkAnimationConfig) {
    this.config = config;
  }
  
  public update(
    playerBody: PlayerBody,
    chargeLevel: number,
    deltaTime: number
  ): void {
    // Enhanced draw animation with 4 distinct stages based on charge level
    
    // Determine draw stage based on charge level
    let drawStage = 1;
    if (chargeLevel >= 0.75) drawStage = 4;
    else if (chargeLevel >= 0.5) drawStage = 3;
    else if (chargeLevel >= 0.25) drawStage = 2;
    
    // Target positions for progressive drawing stages
    const baseLeftArmX = Math.PI * 115 / 180;  // 115° raised position
    const progressiveRaise = (drawStage - 1) * 0.1; // Additional raise per stage
    
    const targetLeftArmX = baseLeftArmX + progressiveRaise;
    const targetLeftArmY = 0;
    const targetLeftArmZ = 0;
    
    // Smoothly transition left arm to drawing position
    const transitionAmount = deltaTime * this.transitionSpeed;
    
    playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
      playerBody.leftArm.rotation.x,
      targetLeftArmX,
      transitionAmount
    );
    playerBody.leftArm.rotation.y = THREE.MathUtils.lerp(
      playerBody.leftArm.rotation.y,
      targetLeftArmY,
      transitionAmount
    );
    playerBody.leftArm.rotation.z = THREE.MathUtils.lerp(
      playerBody.leftArm.rotation.z,
      targetLeftArmZ,
      transitionAmount
    );
    
    // Enhanced right arm draw animation with progressive stages
    const drawAmount = this.easeInOutQuad(chargeLevel);
    
    // Progressive right arm pull based on draw stage
    const baseRightArmX = Math.PI / 6;
    const baseRightArmZ = -Math.PI / 8;
    
    const stageMultiplier = 1 + (drawStage - 1) * 0.3; // Increase intensity per stage
    const rightArmDrawX = baseRightArmX + (drawAmount * Math.PI / 4 * stageMultiplier);
    const rightArmDrawY = drawAmount * Math.PI / 8;
    const rightArmDrawZ = baseRightArmZ - (drawAmount * Math.PI / 6 * stageMultiplier);
    
    playerBody.rightArm.rotation.x = rightArmDrawX;
    playerBody.rightArm.rotation.y = rightArmDrawY;
    playerBody.rightArm.rotation.z = rightArmDrawZ;
    
    // Enhanced elbow adjustments with stage progression
    if (playerBody.leftElbow) {
      const targetLeftElbowX = 0.2 + (drawAmount * 0.1) + (drawStage - 1) * 0.05;
      playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
        playerBody.leftElbow.rotation.x,
        targetLeftElbowX,
        transitionAmount
      );
    }
    
    if (playerBody.rightElbow) {
      // Progressive right elbow bend with stage enhancement
      const baseElbowBend = 0.3;
      const stageBend = drawAmount * 0.8;
      const stageBonus = (drawStage - 1) * 0.15;
      playerBody.rightElbow.rotation.x = baseElbowBend + stageBend + stageBonus;
    }
    
    // Enhanced hand positions with stage progression
    const targetLeftHandX = -Math.PI / 6 - (drawStage - 1) * 0.05;
    const targetLeftHandY = 0;
    const targetLeftHandZ = Math.PI / 4 + (drawStage - 1) * 0.1;
    
    playerBody.leftHand.rotation.x = THREE.MathUtils.lerp(
      playerBody.leftHand.rotation.x,
      targetLeftHandX,
      transitionAmount
    );
    playerBody.leftHand.rotation.y = THREE.MathUtils.lerp(
      playerBody.leftHand.rotation.y,
      targetLeftHandY,
      transitionAmount
    );
    playerBody.leftHand.rotation.z = THREE.MathUtils.lerp(
      playerBody.leftHand.rotation.z,
      targetLeftHandZ,
      transitionAmount
    );
    
    // Enhanced right hand string pull with stage progression
    const baseStringPull = drawAmount * Math.PI / 8;
    const stageStringPull = (drawStage - 1) * 0.1;
    playerBody.rightHand.rotation.x = baseStringPull + stageStringPull;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = drawAmount * Math.PI / 6 + stageStringPull;
    
    console.log(`🏹 [BowDrawAnimation] Draw Stage ${drawStage}/4 - Charge: ${(chargeLevel * 100).toFixed(1)}%`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to bow ready stance (60° chest level, parallel with body)
    playerBody.leftArm.rotation.set(Math.PI * 60 / 180, 0, 0);
    playerBody.rightArm.rotation.set(Math.PI / 6, 0, -Math.PI / 8);
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0.2, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0.3, 0, 0);
    }
    
    playerBody.leftHand.rotation.set(-Math.PI / 6, 0, Math.PI / 4);
    playerBody.rightHand.rotation.set(0, 0, 0);
    
    console.log('🏹 [BowDrawAnimation] Reset to bow ready stance');
  }
  
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
