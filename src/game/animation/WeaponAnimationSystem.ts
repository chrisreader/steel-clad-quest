
import * as THREE from 'three';
import { PlayerBody } from '../../types/GameTypes';
import { EmptyHandsWalkAnimation } from './animations/EmptyHandsWalkAnimation';
import { MeleeWalkAnimation } from './animations/MeleeWalkAnimation';
import { BowWalkAnimation } from './animations/BowWalkAnimation';
import { BowDrawAnimation } from './animations/BowDrawAnimation';
import { WalkAnimationConfig } from './AnimationConfig';

export type WeaponType = 'emptyHands' | 'melee' | 'bow';

export class WeaponAnimationSystem {
  private currentWeaponType: WeaponType = 'emptyHands';
  private emptyHandsWalkAnimation: EmptyHandsWalkAnimation;
  private meleeWalkAnimation: MeleeWalkAnimation;
  private bowWalkAnimation: BowWalkAnimation;
  private bowDrawAnimation: BowDrawAnimation;
  private config: WalkAnimationConfig;

  constructor() {
    // Initialize animation configuration
    this.config = {
      walkCycleSpeed: 4,
      armSwingIntensity: 0.1,
      legSwingIntensity: 0.25,
      sprintMultiplier: 1.5,
      returnSpeed: 3
    };

    // Initialize walk animations
    this.emptyHandsWalkAnimation = new EmptyHandsWalkAnimation(this.config);
    this.meleeWalkAnimation = new MeleeWalkAnimation(this.config);
    this.bowWalkAnimation = new BowWalkAnimation(this.config);
    
    // Initialize bow draw animation
    this.bowDrawAnimation = new BowDrawAnimation(this.config);
    
    console.log("🎭 [WeaponAnimationSystem] Initialized with bow draw animation support");
  }

  public setWeaponType(weaponType: WeaponType): void {
    if (this.currentWeaponType !== weaponType) {
      this.currentWeaponType = weaponType;
      console.log(`🎭 [WeaponAnimationSystem] Weapon type changed to: ${weaponType}`);
    }
  }

  public getCurrentWeaponType(): WeaponType {
    return this.currentWeaponType;
  }

  public getWalkCycleSpeed(): number {
    return this.config.walkCycleSpeed;
  }

  // CRITICAL FIX: Add dedicated bow draw animation update method
  public updateBowDrawAnimation(
    playerBody: PlayerBody,
    chargeLevel: number,
    deltaTime: number
  ): void {
    if (this.currentWeaponType === 'bow') {
      console.log(`🏹 [WeaponAnimationSystem] Updating bow draw - Charge: ${(chargeLevel * 100).toFixed(1)}%`);
      this.bowDrawAnimation.update(playerBody, chargeLevel, deltaTime);
    }
  }

  public updateWalkAnimation(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isWalking: boolean,
    isSprinting: boolean,
    isAttacking: boolean,
    isBowDrawing: boolean
  ): void {
    // Skip walk animation if bow is being drawn to avoid interference
    if (isBowDrawing && this.currentWeaponType === 'bow') {
      console.log("🏹 [WeaponAnimationSystem] Skipping walk animation - bow is being drawn");
      return;
    }

    // Apply appropriate walk animation based on weapon type
    switch (this.currentWeaponType) {
      case 'emptyHands':
        this.emptyHandsWalkAnimation.update(
          playerBody, walkCycle, deltaTime, isWalking, isSprinting, isAttacking
        );
        break;
      case 'melee':
        this.meleeWalkAnimation.update(
          playerBody, walkCycle, deltaTime, isWalking, isSprinting, isAttacking
        );
        break;
      case 'bow':
        this.bowWalkAnimation.update(
          playerBody, walkCycle, deltaTime, isWalking, isSprinting, isAttacking
        );
        break;
    }
  }

  public resetToNeutralStance(playerBody: PlayerBody): void {
    // Reset arms to neutral position based on weapon type
    switch (this.currentWeaponType) {
      case 'emptyHands':
        playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
        playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0);
        break;
      case 'melee':
        playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
        playerBody.rightArm.rotation.set(Math.PI / 3, 0, 0);
        break;
      case 'bow':
        this.bowDrawAnimation.reset(playerBody);
        break;
    }

    console.log(`🎭 [WeaponAnimationSystem] Reset to neutral stance for: ${this.currentWeaponType}`);
  }
}
