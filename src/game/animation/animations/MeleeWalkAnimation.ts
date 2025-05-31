
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
    
    // MELEE READY STANCE: Right arm raised, left arm at side
    
    // Left arm - normal side position with walking swing
    const leftArmBaseX = Math.PI / 8; // Normal side position
    const leftArmBaseY = 0;           // FIXED: NO Y rotation - keep natural like empty hands
    const leftArmBaseZ = 0;
    
    playerBody.leftArm.rotation.x = leftArmBaseX - armSwing;
    playerBody.leftArm.rotation.y = leftArmBaseY; // FIXED: Always 0 - no inward rotation
    playerBody.leftArm.rotation.z = leftArmBaseZ;
    
    // Right arm - WEAPON ARM: raised ready position with reduced swing
    if (!isAttacking) {
      const rightArmBaseX = Math.PI / 4;   // 45° raised position
      const rightArmBaseY = 0;             // FIXED: NO Y rotation - keep natural like empty hands
      const rightArmBaseZ = -Math.PI / 8;  // Slight forward tilt
      
      // Reduced swing intensity for weapon arm to maintain ready stance
      playerBody.rightArm.rotation.x = rightArmBaseX + (armSwing * 0.3);
      playerBody.rightArm.rotation.y = rightArmBaseY; // FIXED: Always 0 - no inward rotation
      playerBody.rightArm.rotation.z = rightArmBaseZ;
    }
    
    // Elbows - subtle movement during walking
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
    }
    if (playerBody.rightElbow && !isAttacking) {
      // Less elbow movement for weapon arm to maintain control
      playerBody.rightElbow.rotation.x = Math.sin(walkCycle) * (this.config.elbowMovement * 0.5) + 0.05;
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] FIXED - Right arm raised with NO Y rotation - Attacking: ${isAttacking}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to MELEE READY STANCE (not empty hands stance)
    
    // Left arm: Normal side position
    playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
    
    // FIXED: Right arm: Raised ready position for weapon - NO Y rotation
    playerBody.rightArm.rotation.set(Math.PI / 4, 0, -Math.PI / 8);
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0, 0, 0);
    }
    
    console.log('⚔️ [MeleeWalkAnimation] FIXED reset - Right arm raised upward/forward with NO Y rotation');
  }
}
