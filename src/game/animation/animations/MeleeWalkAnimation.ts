
import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';
import { WalkAnimationConfig } from '../AnimationConfig';

export class MeleeWalkAnimation {
  private config: WalkAnimationConfig;
  
  constructor(config: WalkAnimationConfig) {
    this.config = config;
  }
  
  public update(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isSprinting: boolean,
    isAttacking: boolean = false
  ): void {
    // Legs - normal walking animation
    const legSwing = Math.sin(walkCycle) * this.config.legSwingIntensity;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    // Arms - different base positions for weapon vs non-weapon arms
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    // MELEE READY STANCE: Right arm raised and PARALLEL with body, left arm at side
    
    // Left arm - normal side position with walking swing
    const leftArmBaseX = Math.PI / 8; // Normal side position
    const leftArmBaseY = 0;           // FIXED: Always 0 - parallel with body
    const leftArmBaseZ = 0;           // FIXED: Always 0 - parallel with body
    
    playerBody.leftArm.rotation.x = leftArmBaseX - armSwing;
    playerBody.leftArm.rotation.y = leftArmBaseY;
    playerBody.leftArm.rotation.z = leftArmBaseZ;
    
    // Right arm - WEAPON ARM: raised ready position PARALLEL with body and reduced swing
    if (!isAttacking) {
      const rightArmBaseX = Math.PI / 3;   // 60° raised position - parallel with body
      const rightArmBaseY = 0;             // FIXED: Always 0 - parallel with body
      const rightArmBaseZ = 0;             // FIXED: Always 0 - perfectly parallel
      
      // Reduced swing intensity for weapon arm to maintain ready stance
      playerBody.rightArm.rotation.x = rightArmBaseX + (armSwing * 0.3);
      playerBody.rightArm.rotation.y = rightArmBaseY; // FIXED: Always 0 - parallel
      playerBody.rightArm.rotation.z = rightArmBaseZ; // FIXED: Always 0 - parallel
    }
    
    // Elbows - subtle movement during walking
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
    }
    if (playerBody.rightElbow && !isAttacking) {
      // FIXED: UPWARD elbow movement for weapon arm to maintain horizontal blade
      playerBody.rightElbow.rotation.x = Math.sin(walkCycle) * (this.config.elbowMovement * 0.5) + 0.05; // POSITIVE upward bend
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] FIXED - Right arm raised PARALLEL with body, UPWARD elbow - Attacking: ${isAttacking}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to MELEE READY STANCE (not empty hands stance)
    
    // Left arm: Normal side position
    playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
    
    // FIXED: Right arm: Raised ready position PARALLEL with body
    playerBody.rightArm.rotation.set(Math.PI / 3, 0, 0); // 60° up, parallel with body
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (playerBody.rightElbow) {
      // FIXED: UPWARD elbow bend for horizontal blade positioning
      playerBody.rightElbow.rotation.set(0.05, 0, 0); // POSITIVE upward bend
    }
    
    console.log('⚔️ [MeleeWalkAnimation] FIXED reset - Right arm raised PARALLEL with body, UPWARD elbow');
  }
}
