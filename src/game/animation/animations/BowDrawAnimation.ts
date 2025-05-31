
import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';
import { WalkAnimationConfig } from '../AnimationConfig';

export class BowDrawAnimation {
  private config: WalkAnimationConfig;
  
  constructor(config: WalkAnimationConfig) {
    this.config = config;
  }
  
  public update(
    playerBody: PlayerBody,
    chargeLevel: number,
    deltaTime: number
  ): void {
    // Draw animation - right arm pulls back while left arm holds bow steady
    
    // Left arm maintains bow-holding position (95° raised position, parallel with body)
    const leftArmBaseX = Math.PI * 95 / 180;  // 95° raised position for drawing
    playerBody.leftArm.rotation.x = leftArmBaseX;
    playerBody.leftArm.rotation.y = 0;  // Parallel with body
    playerBody.leftArm.rotation.z = 0;  // Parallel with body
    
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
      playerBody.leftElbow.rotation.x = 0.2 + (drawAmount * 0.1);
    }
    
    if (playerBody.rightElbow) {
      // Right elbow bends more as we draw
      playerBody.rightElbow.rotation.x = 0.3 + (drawAmount * 0.8);
    }
    
    // Hand positions for drawing
    playerBody.leftHand.rotation.x = -Math.PI / 6;
    playerBody.leftHand.rotation.y = 0;
    playerBody.leftHand.rotation.z = Math.PI / 4;
    
    // Right hand pulls string back
    playerBody.rightHand.rotation.x = drawAmount * Math.PI / 8;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = drawAmount * Math.PI / 6;
    
    console.log(`🏹 [BowDrawAnimation] Drawing at 95° - Charge: ${(chargeLevel * 100).toFixed(1)}%`);
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
