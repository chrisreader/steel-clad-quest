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
    
    // Arms - reduced swing when holding weapon (ensure symmetric Y rotation)
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    // Left arm - normal walking swing with symmetric positioning
    playerBody.leftArm.rotation.x = Math.PI / 8 - armSwing;
    playerBody.leftArm.rotation.y = 0; // Ensure symmetric positioning
    
    // Right arm - only animate if not attacking with symmetric positioning
    if (!isAttacking) {
      playerBody.rightArm.rotation.x = Math.PI / 8 + armSwing;
      playerBody.rightArm.rotation.y = 0; // Ensure symmetric positioning
    }
    
    // Elbows - subtle movement during walking
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
    }
    if (playerBody.rightElbow && !isAttacking) {
      playerBody.rightElbow.rotation.x = Math.sin(walkCycle) * this.config.elbowMovement + 0.05;
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] Updated melee walking animation - Attacking: ${isAttacking}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to symmetric stance
    playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0); // Ensure Y rotation is 0
    playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0); // Ensure Y rotation is 0
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0, 0, 0);
    }
    
    console.log('⚔️ [MeleeWalkAnimation] Reset to neutral stance');
  }
}
