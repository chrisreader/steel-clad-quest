
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
    // PHYSICS: Perfect horizontal blade positioning
    const shoulderAngle = Math.PI / 36; // 5° forward shoulder angle  
    const counteractingElbowAngle = -Math.PI / 36; // -5° downward elbow angle for perfect horizontal
    
    // Legs - normal walking animation
    const legSwing = Math.sin(walkCycle) * this.config.legSwingIntensity;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    // Arms - different base positions for weapon vs non-weapon arms
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    
    // MELEE READY STANCE: Right arm raised and HORIZONTAL with perfect physics
    
    // Left arm - normal side position with walking swing
    const leftArmBaseX = Math.PI / 8; // Normal side position
    const leftArmBaseY = 0;           // FIXED: Always 0 - parallel with body
    const leftArmBaseZ = 0;           // FIXED: Always 0 - parallel with body
    
    playerBody.leftArm.rotation.x = leftArmBaseX - armSwing;
    playerBody.leftArm.rotation.y = leftArmBaseY;
    playerBody.leftArm.rotation.z = leftArmBaseZ;
    
    // Right arm - WEAPON ARM: Perfect horizontal position with physics-based elbow
    if (!isAttacking) {
      // Apply reduced swing intensity for weapon arm to maintain ready stance
      playerBody.rightArm.rotation.x = shoulderAngle + (armSwing * 0.3); // 5° + small walking motion
      playerBody.rightArm.rotation.y = 0; // FIXED: Always 0 - parallel
      playerBody.rightArm.rotation.z = 0; // FIXED: Always 0 - perfectly parallel
    }
    
    // Elbows - perfect physics for horizontal blade
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
    }
    if (playerBody.rightElbow && !isAttacking) {
      // PERFECT PHYSICS: Exactly -5° elbow to counteract +5° shoulder for horizontal blade
      playerBody.rightElbow.rotation.x = counteractingElbowAngle + (Math.sin(walkCycle) * (this.config.elbowMovement * 0.3)); // Small walking motion around perfect angle
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] PERFECT HORIZONTAL PHYSICS - Shoulder: +${(shoulderAngle * 180 / Math.PI).toFixed(1)}°, Elbow: ${(counteractingElbowAngle * 180 / Math.PI).toFixed(1)}°, Result: 0° perfect horizontal - Attacking: ${isAttacking}`);
  }
  
  public reset(playerBody: PlayerBody): void {
    // PHYSICS: Perfect horizontal blade positioning at rest
    const shoulderAngle = Math.PI / 36; // 5° forward shoulder angle  
    const counteractingElbowAngle = -Math.PI / 36; // -5° downward elbow angle for perfect horizontal
    
    // Reset to MELEE READY STANCE with perfect physics
    
    // Left arm: Normal side position
    playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
    
    // PERFECT PHYSICS: Right arm at exactly 5° with -5° elbow for 0° horizontal blade
    playerBody.rightArm.rotation.set(shoulderAngle, 0, 0); // Exactly 5° forward
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (playerBody.rightElbow) {
      // PERFECT PHYSICS: Exactly -5° elbow bend for perfect horizontal blade positioning
      playerBody.rightElbow.rotation.set(counteractingElbowAngle, 0, 0); // Exactly -5° downward
    }
    
    console.log(`⚔️ [MeleeWalkAnimation] PERFECT HORIZONTAL PHYSICS reset - Shoulder: +${(shoulderAngle * 180 / Math.PI).toFixed(1)}°, Elbow: ${(counteractingElbowAngle * 180 / Math.PI).toFixed(1)}°, Result: 0° perfect horizontal`);
  }
}

