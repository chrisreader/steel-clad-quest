
import * as THREE from 'three';
import { PlayerBody } from '../../types/GameTypes';
import { ANIMATION_CONFIGS, WeaponAnimationConfigs } from './AnimationConfig';
import { BowWalkAnimation } from './animations/BowWalkAnimation';
import { MeleeWalkAnimation } from './animations/MeleeWalkAnimation';
import { EmptyHandsWalkAnimation } from './animations/EmptyHandsWalkAnimation';

export type WeaponType = 'emptyHands' | 'melee' | 'bow';

export class WeaponAnimationSystem {
  private configs: WeaponAnimationConfigs;
  private bowWalkAnimation: BowWalkAnimation;
  private meleeWalkAnimation: MeleeWalkAnimation;
  private emptyHandsWalkAnimation: EmptyHandsWalkAnimation;
  private currentWeaponType: WeaponType = 'emptyHands';
  private animationReturnSpeed: number = 3;
  
  constructor() {
    this.configs = ANIMATION_CONFIGS;
    this.bowWalkAnimation = new BowWalkAnimation(this.configs.bow);
    this.meleeWalkAnimation = new MeleeWalkAnimation(this.configs.melee);
    this.emptyHandsWalkAnimation = new EmptyHandsWalkAnimation(this.configs.emptyHands);
    
    console.log('🎭 [WeaponAnimationSystem] Initialized with weapon-specific animations');
  }
  
  public setWeaponType(weaponType: WeaponType): void {
    if (this.currentWeaponType !== weaponType) {
      console.log(`🎭 [WeaponAnimationSystem] Weapon type changed: ${this.currentWeaponType} -> ${weaponType}`);
      this.currentWeaponType = weaponType;
    }
  }
  
  public updateWalkAnimation(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isMoving: boolean,
    isSprinting: boolean,
    isAttacking: boolean = false,
    isBowDrawing: boolean = false
  ): void {
    console.log(`🎭 [WeaponAnimationSystem] Update: moving=${isMoving}, weapon=${this.currentWeaponType}, attacking=${isAttacking}, bowDrawing=${isBowDrawing}`);
    
    if (isMoving) {
      // FIXED: Always allow walking animation when moving, regardless of weapon state
      // Only block walking animation during melee attacks, not during bow drawing
      const shouldBlockWalkAnimation = isAttacking && this.currentWeaponType === 'melee';
      
      if (!shouldBlockWalkAnimation) {
        // Apply weapon-specific walking animation
        switch (this.currentWeaponType) {
          case 'bow':
            this.bowWalkAnimation.update(playerBody, walkCycle, deltaTime, isSprinting);
            console.log('🏹 [WeaponAnimationSystem] Applied bow walking animation');
            break;
          case 'melee':
            this.meleeWalkAnimation.update(playerBody, walkCycle, deltaTime, isSprinting, isAttacking);
            console.log('⚔️ [WeaponAnimationSystem] Applied melee walking animation');
            break;
          case 'emptyHands':
            this.emptyHandsWalkAnimation.update(playerBody, walkCycle, deltaTime, isSprinting);
            console.log('✋ [WeaponAnimationSystem] Applied empty hands walking animation');
            break;
        }
      } else {
        console.log('🚫 [WeaponAnimationSystem] Walking animation blocked due to melee attack');
      }
    } else if (!isMoving && !isAttacking && !isBowDrawing) {
      // Return to idle pose only when completely idle
      this.returnToIdlePose(playerBody, deltaTime);
    }
  }
  
  private returnToIdlePose(playerBody: PlayerBody, deltaTime: number): void {
    const returnSpeed = deltaTime * this.animationReturnSpeed;
    
    // Return legs to neutral
    playerBody.leftLeg.rotation.x = THREE.MathUtils.lerp(
      playerBody.leftLeg.rotation.x, 0, returnSpeed
    );
    playerBody.rightLeg.rotation.x = THREE.MathUtils.lerp(
      playerBody.rightLeg.rotation.x, 0, returnSpeed
    );
    
    // Return to weapon-appropriate idle stance
    switch (this.currentWeaponType) {
      case 'bow':
        // BOW NATURAL READY STANCE: Left arm at 80° chest level, parallel with body
        const bowLeftArmTargetX = Math.PI * 80 / 180;  // 80° upward angle
        const bowLeftArmTargetY = 0;                   // Parallel with body
        const bowLeftArmTargetZ = 0;                   // Parallel with body
        
        playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.x, bowLeftArmTargetX, returnSpeed
        );
        playerBody.leftArm.rotation.y = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.y, bowLeftArmTargetY, returnSpeed
        );
        playerBody.leftArm.rotation.z = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.z, bowLeftArmTargetZ, returnSpeed
        );
        
        // Right arm in ready position
        playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.x, Math.PI / 6, returnSpeed
        );
        playerBody.rightArm.rotation.y = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.y, 0, returnSpeed
        );
        playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.z, -Math.PI / 8, returnSpeed
        );
        
        // Bow-specific elbow and hand positions
        if (playerBody.leftElbow) {
          playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.leftElbow.rotation.x, 0.2, returnSpeed
          );
        }
        if (playerBody.rightElbow) {
          playerBody.rightElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.rightElbow.rotation.x, 0.3, returnSpeed
          );
        }
        
        playerBody.leftHand.rotation.x = THREE.MathUtils.lerp(
          playerBody.leftHand.rotation.x, -Math.PI / 6, returnSpeed
        );
        playerBody.leftHand.rotation.y = THREE.MathUtils.lerp(
          playerBody.leftHand.rotation.y, 0, returnSpeed
        );
        playerBody.leftHand.rotation.z = THREE.MathUtils.lerp(
          playerBody.leftHand.rotation.z, Math.PI / 4, returnSpeed
        );
        
        playerBody.rightHand.rotation.x = THREE.MathUtils.lerp(
          playerBody.rightHand.rotation.x, 0, returnSpeed
        );
        playerBody.rightHand.rotation.y = THREE.MathUtils.lerp(
          playerBody.rightHand.rotation.y, 0, returnSpeed
        );
        playerBody.rightHand.rotation.z = THREE.MathUtils.lerp(
          playerBody.rightHand.rotation.z, 0, returnSpeed
        );
        
        console.log('🏹 [WeaponAnimationSystem] Returning to bow natural ready stance - 80° chest level, parallel with body');
        break;
        
      case 'melee':
      case 'emptyHands':
        // Return to neutral arm positions
        playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.x, Math.PI / 8, returnSpeed
        );
        playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.x, Math.PI / 8, returnSpeed
        );
        
        if (playerBody.leftElbow) {
          playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.leftElbow.rotation.x, 0, returnSpeed
          );
        }
        if (playerBody.rightElbow) {
          playerBody.rightElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.rightElbow.rotation.x, 0, returnSpeed
          );
        }
        break;
    }
  }
  
  public resetToWeaponStance(playerBody: PlayerBody): void {
    switch (this.currentWeaponType) {
      case 'bow':
        this.bowWalkAnimation.reset(playerBody);
        break;
      case 'melee':
        this.meleeWalkAnimation.reset(playerBody);
        break;
      case 'emptyHands':
        this.emptyHandsWalkAnimation.reset(playerBody);
        break;
    }
  }
  
  public getCurrentWeaponType(): WeaponType {
    return this.currentWeaponType;
  }
  
  public getWalkCycleSpeed(): number {
    return this.configs[this.currentWeaponType].walkCycleSpeed;
  }
}
