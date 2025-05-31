
import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';
import { WalkAnimationConfig } from '../AnimationConfig';

export class EmptyHandsWalkAnimation {
  private config: WalkAnimationConfig;
  
  constructor(config: WalkAnimationConfig) {
    this.config = config;
  }
  
  public update(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isSprinting: boolean
  ): void {
    // Legs - normal walking animation
    const legSwing = Math.sin(walkCycle) * this.config.legSwingIntensity;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    // Arms - full natural swing
    const armSwing = Math.sin(walkCycle) * this.config.armSwingIntensity;
    playerBody.leftArm.rotation.x = Math.PI / 8 - armSwing;
    playerBody.rightArm.rotation.x = Math.PI / 8 + armSwing;
    
    // Elbows - natural movement during walking
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = Math.sin(walkCycle + Math.PI) * this.config.elbowMovement + 0.05;
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.x = Math.sin(walkCycle) * this.config.elbowMovement + 0.05;
    }
    
    console.log('👐 [EmptyHandsWalkAnimation] Updated empty hands walking animation');
  }
  
  public reset(playerBody: PlayerBody): void {
    playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
    playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0);
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0, 0, 0);
    }
    
    console.log('👐 [EmptyHandsWalkAnimation] Reset to neutral stance');
  }
}
