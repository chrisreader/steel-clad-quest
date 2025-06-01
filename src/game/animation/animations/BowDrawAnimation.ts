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
    // CRITICAL FIX: Enhanced draw animation with 4 distinct stages based on charge level
    console.log(`🏹 [BowDrawAnimation] Received charge level: ${(chargeLevel * 100).toFixed(1)}%`);
    
    // Determine draw stage based on charge level with more responsive thresholds
    let drawStage = 1;
    if (chargeLevel >= 0.8) drawStage = 4;
    else if (chargeLevel >= 0.6) drawStage = 3;
    else if (chargeLevel >= 0.3) drawStage = 2;
    else if (chargeLevel > 0) drawStage = 1;
    
    // CRITICAL FIX: Only animate if there's actual charge
    if (chargeLevel <= 0) {
      console.log("🏹 [BowDrawAnimation] No charge detected - resetting to ready stance");
      this.reset(playerBody);
      return;
    }
    
    // Target positions for progressive drawing stages
    const baseLeftArmX = Math.PI * 115 / 180;  // 115° raised position
    const progressiveRaise = (drawStage - 1) * 0.15; // INCREASED: More noticeable progression
    
    const targetLeftArmX = baseLeftArmX + progressiveRaise;
    const targetLeftArmY = 0;
    const targetLeftArmZ = 0;
    
    // CRITICAL FIX: More aggressive transition speed for visible changes
    const transitionAmount = deltaTime * (this.transitionSpeed * 2);
    
    // CRITICAL FIX: Enhanced left arm movement with more dramatic staging
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
    
    // CRITICAL FIX: Enhanced right arm draw animation with dramatic progression
    const drawAmount = this.easeInOutQuad(chargeLevel);
    
    // Progressive right arm pull based on draw stage with more dramatic movement
    const baseRightArmX = Math.PI / 6;
    const baseRightArmZ = -Math.PI / 8;
    
    const stageMultiplier = 1 + (drawStage - 1) * 0.5; // INCREASED: More dramatic per stage
    const rightArmDrawX = baseRightArmX + (drawAmount * Math.PI / 3 * stageMultiplier); // INCREASED movement
    const rightArmDrawY = drawAmount * Math.PI / 6; // INCREASED Y movement
    const rightArmDrawZ = baseRightArmZ - (drawAmount * Math.PI / 4 * stageMultiplier); // INCREASED Z movement
    
    playerBody.rightArm.rotation.x = rightArmDrawX;
    playerBody.rightArm.rotation.y = rightArmDrawY;
    playerBody.rightArm.rotation.z = rightArmDrawZ;
    
    // CRITICAL FIX: Enhanced elbow adjustments with more dramatic stage progression
    if (playerBody.leftElbow) {
      const targetLeftElbowX = 0.2 + (drawAmount * 0.2) + (drawStage - 1) * 0.1; // INCREASED progression
      playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
        playerBody.leftElbow.rotation.x,
        targetLeftElbowX,
        transitionAmount
      );
    }
    
    if (playerBody.rightElbow) {
      // CRITICAL FIX: More dramatic right elbow bend progression
      const baseElbowBend = 0.3;
      const stageBend = drawAmount * 1.2; // INCREASED bend amount
      const stageBonus = (drawStage - 1) * 0.25; // INCREASED stage bonus
      playerBody.rightElbow.rotation.x = baseElbowBend + stageBend + stageBonus;
    }
    
    // CRITICAL FIX: Enhanced hand positions with more dramatic stage progression
    const targetLeftHandX = -Math.PI / 6 - (drawStage - 1) * 0.1; // INCREASED progression
    const targetLeftHandY = 0;
    const targetLeftHandZ = Math.PI / 4 + (drawStage - 1) * 0.15; // INCREASED progression
    
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
    
    // CRITICAL FIX: Enhanced right hand string pull with dramatic stage progression
    const baseStringPull = drawAmount * Math.PI / 6; // INCREASED base pull
    const stageStringPull = (drawStage - 1) * 0.15; // INCREASED stage pull
    playerBody.rightHand.rotation.x = baseStringPull + stageStringPull;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = drawAmount * Math.PI / 4 + stageStringPull; // INCREASED Z rotation
    
    console.log(`🏹 [BowDrawAnimation] ENHANCED Draw Stage ${drawStage}/4 - Charge: ${(chargeLevel * 100).toFixed(1)}% - Left Arm X: ${playerBody.leftArm.rotation.x.toFixed(3)} - Right Arm X: ${playerBody.rightArm.rotation.x.toFixed(3)}`);
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
