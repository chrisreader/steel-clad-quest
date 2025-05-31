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
    // RESTORED: Keep original walking physics - shoulder angle and elbow positions that were working
    const shoulderAngle = Math.PI / 36; // 5° forward shoulder angle  
    const walkingElbowAngle = 0.05; // RESTORED: Original small positive elbow bend for walking
    
    // Legs - normal walking animation
    const legSwing = Math.sin(walkCycle) * this.config.legSwingIntensity;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    // Arms - different base positions for weapon vs non-weapon arms
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    // MELEE READY STANCE: Right arm raised and HORIZONTAL with RESTORED correct physics
    
    // Left arm - normal side position with walking swing
    const leftArmBaseX = Math.PI / 8; // Normal side position
    const leftArmBaseY = 0;           // FIXED: Always 0 - parallel with body
    const leftArmBaseZ = 0;           // FIXED: Always 0 - parallel with body
    
    playerBody.leftArm.rotation.x = leftArmBaseX - armSwing;
    playerBody.leftArm.rotation.y = leftArmBaseY;
    playerBody.leftArm.rotation.z = leftArmBaseZ;
    
    // Right arm - WEAPON ARM: Perfect horizontal position with RESTORED walking physics
    if (!isAttacking) {
      // Apply reduced swing intensity for weapon arm to maintain ready stance
      playerBody.rightArm.rotation.x = shoulderAngle + (armSwing * 0.3); // 5° + small walking motion
      playerBody.rightArm.rotation.y = 0; // FIXED: Always 0 - parallel
      playerBody.rightArm.rotation.z = 0; // FIXED: Always 0 - perfectly parallel
    }
    
    // Elbows - RESTORED correct walking physics
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
    }
    if (playerBody.rightElbow && !isAttacking) {
      // RESTORED: Original walking elbow physics that were working correctly
      playerBody.rightElbow.rotation.x = walkingElbowAngle + (Math.sin(walkCycle) * (this.config.elbowMovement * 0.3)); // RESTORED original working values
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] RESTORED walking physics - Shoulder: +${(shoulderAngle * 180 / Math.PI).toFixed(1)}°, Elbow: ${(walkingElbowAngle * 180 / Math.PI).toFixed(1)}° - Attacking: ${isAttacking}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // RESTORED: Original correct reset positioning that was working
    const shoulderAngle = Math.PI / 36; // 5° forward shoulder angle  
    const restElbowAngle = 0.05; // RESTORED: Original small positive elbow bend for rest position
    
    // Reset to MELEE READY STANCE with RESTORED correct physics
    
    // Left arm: Normal side position
    playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
    
    // RESTORED: Right arm at correct horizontal position with original working elbow
    playerBody.rightArm.rotation.set(shoulderAngle, 0, 0); // Exactly 5° forward
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (playerBody.rightElbow) {
      // RESTORED: Original working elbow position for rest stance
      playerBody.rightElbow.rotation.set(restElbowAngle, 0, 0); // RESTORED original working value
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] RESTORED reset positioning - Shoulder: +${(shoulderAngle * 180 / Math.PI).toFixed(1)}°, Elbow: ${(restElbowAngle * 180 / Math.PI).toFixed(1)}°`);
  }
}
