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
    // Draw animation - right arm pulls back while left arm transitions to drawing position
    
    // Target position for drawing (105° raised position, parallel with body)
    const targetLeftArmX = Math.PI * 105 / 180;  // 105° raised position for drawing
    const targetLeftArmY = 0;  // Parallel with body
    const targetLeftArmZ = 0;  // Parallel with body
    
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
    
    // Right arm draw animation - pulls back based on charge level
    const drawAmount = this.easeInOutQuad(chargeLevel);
    
    // Right arm pulls back and up for draw
    const rightArmDrawX = Math.PI / 6 + (drawAmount * Math.PI / 4);  // Pull up
    const rightArmDrawY = drawAmount * Math.PI / 8;  // Slight outward angle
    const rightArmDrawZ = -Math.PI / 8 - (drawAmount * Math.PI / 6);  // Pull back
    
    playerBody.rightArm.rotation.x = rightArmDrawX;
    playerBody.rightArm.rotation.y = rightArmDrawY;
    playerBody.rightArm.rotation.z = rightArmDrawZ;
    
    // Elbow adjustments for natural draw
    if (playerBody.leftElbow) {
      const targetLeftElbowX = 0.2 + (drawAmount * 0.1);
      playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
        playerBody.leftElbow.rotation.x,
        targetLeftElbowX,
        transitionAmount
      );
    }
    
    if (playerBody.rightElbow) {
      // Right elbow bends more as we draw
      playerBody.rightElbow.rotation.x = 0.3 + (drawAmount * 0.8);
    }
    
    // Hand positions for drawing - also transition smoothly
    const targetLeftHandX = -Math.PI / 6;
    const targetLeftHandY = 0;
    const targetLeftHandZ = Math.PI / 4;
    
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
    
    // Right hand pulls string back
    playerBody.rightHand.rotation.x = drawAmount * Math.PI / 8;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = drawAmount * Math.PI / 6;
    
    console.log(`🏹 [BowDrawAnimation] Transitioning to 105° drawing position - Charge: ${(chargeLevel * 100).toFixed(1)}%`);
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
