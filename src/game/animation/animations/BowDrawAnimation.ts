import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';
import { WalkAnimationConfig } from '../AnimationConfig';

// DEPRECATED: This class is now handled by BowAnimationController
// Keeping for compatibility but functionality moved to unified system
export class BowDrawAnimation {
  private config: WalkAnimationConfig;
  private transitionSpeed: number = 4;
  
  // STANDARDIZED CONSTANTS - Must match BowAnimationController
  private static readonly HAND_ROTATION_X = Math.PI * 80 / 180; // +80° downward angle for grip
  private static readonly HAND_ROTATION_Y = 0; // 0° no side rotation
  private static readonly HAND_ROTATION_Z = 0; // 0° no twist for bow grip
  
  constructor(config: WalkAnimationConfig) {
    this.config = config;
    console.log('⚠️ [BowDrawAnimation] DEPRECATED: Use BowAnimationController instead');
  }
  
  public update(
    playerBody: PlayerBody,
    chargeLevel: number,
    deltaTime: number
  ): void {
    // Legacy implementation - consider migrating to BowAnimationController
    const targetLeftArmX = Math.PI * 115 / 180;
    const targetLeftArmY = 0;
    const targetLeftArmZ = 0;
    
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
    
    const drawAmount = this.easeInOutQuad(chargeLevel);
    
    const rightArmDrawX = Math.PI / 6 + (drawAmount * Math.PI / 4);
    const rightArmDrawY = drawAmount * Math.PI / 8;
    const rightArmDrawZ = -Math.PI / 8 - (drawAmount * Math.PI / 6);
    
    playerBody.rightArm.rotation.x = rightArmDrawX;
    playerBody.rightArm.rotation.y = rightArmDrawY;
    playerBody.rightArm.rotation.z = rightArmDrawZ;
    
    if (playerBody.leftElbow) {
      const targetLeftElbowX = 0.2 + (drawAmount * 0.1);
      playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
        playerBody.leftElbow.rotation.x,
        targetLeftElbowX,
        transitionAmount
      );
    }
    
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.x = 0.3 + (drawAmount * 0.8);
    }
    
    // STANDARDIZED: Use consistent hand rotations
    playerBody.leftHand.rotation.x = THREE.MathUtils.lerp(
      playerBody.leftHand.rotation.x,
      BowDrawAnimation.HAND_ROTATION_X,
      transitionAmount
    );
    playerBody.leftHand.rotation.y = THREE.MathUtils.lerp(
      playerBody.leftHand.rotation.y,
      BowDrawAnimation.HAND_ROTATION_Y,
      transitionAmount
    );
    playerBody.leftHand.rotation.z = THREE.MathUtils.lerp(
      playerBody.leftHand.rotation.z,
      BowDrawAnimation.HAND_ROTATION_Z,
      transitionAmount
    );
    
    playerBody.rightHand.rotation.x = drawAmount * Math.PI / 8;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = drawAmount * Math.PI / 6;
    
    console.log(`🏹 [BowDrawAnimation] DEPRECATED - Use BowAnimationController instead`);
  }
  
  public reset(playerBody: PlayerBody): void {
    playerBody.leftArm.rotation.set(Math.PI * 60 / 180, 0, 0);
    playerBody.rightArm.rotation.set(Math.PI / 6, 0, -Math.PI / 8);
    
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.set(0.2, 0, 0);
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.set(0.3, 0, 0);
    }
    
    // STANDARDIZED: Use consistent hand rotations
    playerBody.leftHand.rotation.set(
      BowDrawAnimation.HAND_ROTATION_X,
      BowDrawAnimation.HAND_ROTATION_Y,
      BowDrawAnimation.HAND_ROTATION_Z
    );
    playerBody.rightHand.rotation.set(0, 0, 0);
    
    console.log('🏹 [BowDrawAnimation] DEPRECATED - Reset to bow ready stance');
  }
  
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
