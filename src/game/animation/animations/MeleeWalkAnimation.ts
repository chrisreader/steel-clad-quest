
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
    
    // Arms - reduced swing when holding weapon with FORWARD-ANGLED base position
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    // FORWARD-ANGLED base position for melee weapons (30° upward, forward tilt)
    const forwardAngleBase = Math.PI / 6; // 30° instead of 22.5°
    const forwardZ = -0.3; // Forward tilt for better POV visibility
    
    // Left arm - normal walking swing with FORWARD-ANGLED base positioning
    playerBody.leftArm.rotation.x = forwardAngleBase - armSwing;
    playerBody.leftArm.rotation.y = 0; // Ensure symmetric positioning
    playerBody.leftArm.rotation.z = forwardZ; // Forward angle for better visibility
    
    // Right arm - only animate if not attacking with FORWARD-ANGLED base positioning
    if (!isAttacking) {
      playerBody.rightArm.rotation.x = forwardAngleBase + armSwing;
      playerBody.rightArm.rotation.y = 0; // Ensure symmetric positioning
      playerBody.rightArm.rotation.z = forwardZ; // Forward angle for better visibility
    }
    
    // Elbows - subtle movement during walking
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
    }
    if (playerBody.rightElbow && !isAttacking) {
      playerBody.rightElbow.rotation.x = Math.sin(walkCycle) * this.config.elbowMovement + 0.05;
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] Updated with FORWARD-ANGLED arms for better POV - Attacking: ${isAttacking}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // Reset to FORWARD-ANGLED weapon stance (not side stance)
    const forwardAngleBase = Math.PI / 6; // 30° upward angle
    const forwardZ = -0.3; // Forward tilt for better visibility
    
    playerBody.leftArm.rotation.set(forwardAngleBase, 0, forwardZ); // FORWARD-ANGLED position
    playerBody.rightArm.rotation.set(forwardAngleBase, 0, forwardZ); // FORWARD-ANGLED position
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0, 0, 0);
    }
    
    console.log('⚔️ [MeleeWalkAnimation] Reset to FORWARD-ANGLED weapon stance for better POV');
  }
}
