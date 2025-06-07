import * as THREE from 'three';
import { PlayerBody } from '../../types/GameTypes';
import { ANIMATION_CONFIGS, WeaponAnimationConfigs } from './AnimationConfig';
import { BowAnimationController } from './bow/BowAnimationController';
import { MeleeWalkAnimation } from './animations/MeleeWalkAnimation';
import { EmptyHandsWalkAnimation } from './animations/EmptyHandsWalkAnimation';
import { logger } from '../core/Logger';
import { LOGGING_CONSTANTS, ANIMATION_CONSTANTS } from '../core/GameConstants';

export type WeaponType = 'emptyHands' | 'melee' | 'bow';

export class WeaponAnimationSystem {
  private configs: WeaponAnimationConfigs;
  private bowAnimationController: BowAnimationController;
  private meleeWalkAnimation: MeleeWalkAnimation;
  private emptyHandsWalkAnimation: EmptyHandsWalkAnimation;
  private currentWeaponType: WeaponType = 'emptyHands';
  private animationReturnSpeed: number = 3;
  
  constructor() {
    this.configs = ANIMATION_CONFIGS;
    this.bowAnimationController = new BowAnimationController();
    this.meleeWalkAnimation = new MeleeWalkAnimation(this.configs.melee);
    this.emptyHandsWalkAnimation = new EmptyHandsWalkAnimation(this.configs.emptyHands);
    
    logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, 'WeaponAnimationSystem initialized with unified bow animation controller');
  }
  
  public setWeaponType(weaponType: WeaponType): void {
    if (this.currentWeaponType !== weaponType) {
      logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, `Weapon type changed: ${this.currentWeaponType} -> ${weaponType}`);
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
    isBowDrawing: boolean = false,
    bowChargeLevel: number = 0
  ): void {
    // Only log in debug mode to reduce performance overhead
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, 
        `Update: moving=${isMoving}, weapon=${this.currentWeaponType}, attacking=${isAttacking}, bowDrawing=${isBowDrawing}, chargeLevel=${bowChargeLevel.toFixed(2)}`);
    }
    
    if (this.currentWeaponType === 'bow') {
      this.bowAnimationController.updateAnimation(
        playerBody,
        deltaTime,
        isMoving,
        isBowDrawing,
        bowChargeLevel,
        walkCycle,
        isSprinting
      );
      return;
    }
    
    if (isMoving) {
      const shouldBlockWalkAnimation = isAttacking && this.currentWeaponType === 'melee';
      
      if (!shouldBlockWalkAnimation) {
        switch (this.currentWeaponType) {
          case 'melee':
            this.meleeWalkAnimation.update(playerBody, walkCycle, deltaTime, isSprinting, isAttacking);
            break;
          case 'emptyHands':
            this.emptyHandsWalkAnimation.update(playerBody, walkCycle, deltaTime, isSprinting);
            break;
        }
      }
    } else if (!isMoving && !isAttacking && !isBowDrawing) {
      this.returnToIdlePose(playerBody, deltaTime);
    }
  }
  
  private returnToIdlePose(playerBody: PlayerBody, deltaTime: number): void {
    const returnSpeed = deltaTime * this.animationReturnSpeed;
    
    playerBody.leftLeg.rotation.x = THREE.MathUtils.lerp(
      playerBody.leftLeg.rotation.x, 0, returnSpeed
    );
    playerBody.rightLeg.rotation.x = THREE.MathUtils.lerp(
      playerBody.rightLeg.rotation.x, 0, returnSpeed
    );
    
    switch (this.currentWeaponType) {
      case 'melee':
      case 'emptyHands':
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
        this.bowAnimationController.reset();
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
