import * as THREE from 'three';
import { PlayerBody } from '../../types/GameTypes';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { SwordSwingAnimation } from './animations/SwordSwingAnimation';
import { BowDrawAnimation } from './animations/BowDrawAnimation';
import { MeleeWalkAnimation } from './animations/MeleeWalkAnimation';
import { BowWalkAnimation } from './animations/BowWalkAnimation';
import { EmptyHandsWalkAnimation } from './animations/EmptyHandsWalkAnimation';

export class WeaponAnimationSystem {
  private playerBody: PlayerBody;
  private currentWeapon: BaseWeapon | null = null;
  private swordSwingAnimation: SwordSwingAnimation;
  private bowDrawAnimation: BowDrawAnimation;
  private meleeWalkAnimation: MeleeWalkAnimation;
  private bowWalkAnimation: BowWalkAnimation;
  private emptyHandsWalkAnimation: EmptyHandsWalkAnimation;
  
  // Bow drawing state
  private isDrawingBow: boolean = false;
  private currentDrawingStage: number = 1;
  private currentChargeLevel: number = 0;

  constructor(playerBody: PlayerBody) {
    this.playerBody = playerBody;
    this.swordSwingAnimation = new SwordSwingAnimation(playerBody);
    this.bowDrawAnimation = new BowDrawAnimation(playerBody);
    this.meleeWalkAnimation = new MeleeWalkAnimation(playerBody);
    this.bowWalkAnimation = new BowWalkAnimation(playerBody);
    this.emptyHandsWalkAnimation = new EmptyHandsWalkAnimation(playerBody);
  }

  public setWeapon(weapon: BaseWeapon | null): void {
    this.currentWeapon = weapon;
  }

  public startSwordSwing(): void {
    if (this.currentWeapon && this.currentWeapon.getConfig().type === 'sword') {
      this.swordSwingAnimation.startSwing(this.currentWeapon.getConfig().swingAnimation);
    }
  }

  public update(deltaTime: number): void {
    this.swordSwingAnimation.update(deltaTime);
    this.bowDrawAnimation.update(deltaTime);
  }

  public dispose(): void {
    this.swordSwingAnimation.dispose();
    this.bowDrawAnimation.dispose();
    this.meleeWalkAnimation.dispose();
    this.bowWalkAnimation.dispose();
    this.emptyHandsWalkAnimation.dispose();
  }

  public startBowDraw(): void {
    console.log('🏹 [WeaponAnimationSystem] Starting bow draw animation');
    this.isDrawingBow = true;
    this.currentDrawingStage = 1;
    this.currentChargeLevel = 0;
    this.bowDrawAnimation.startDraw();
  }

  public stopBowDraw(): void {
    console.log('🏹 [WeaponAnimationSystem] Stopping bow draw animation');
    this.isDrawingBow = false;
    this.currentDrawingStage = 1;
    this.currentChargeLevel = 0;
    this.bowDrawAnimation.stopDraw();
  }

  public updateBowDrawingStage(stage: number, chargeLevel: number): void {
    if (!this.isDrawingBow) return;
    
    // Only update if stage actually changed
    if (this.currentDrawingStage !== stage) {
      this.currentDrawingStage = stage;
      this.currentChargeLevel = chargeLevel;
      
      console.log(`🏹 [WeaponAnimationSystem] Updating bow drawing stage to: ${stage} (charge: ${(chargeLevel * 100).toFixed(1)}%)`);
      
      // Update the bow draw animation with new stage
      this.bowDrawAnimation.updateDrawingStage(stage, chargeLevel);
    }
  }

  public updateWalkAnimation(deltaTime: number, isWalking: boolean, walkDirection: THREE.Vector3): void {
    if (!this.currentWeapon) {
      this.emptyHandsWalkAnimation.update(deltaTime, isWalking, walkDirection);
      return;
    }

    const weaponType = this.currentWeapon.getConfig().type;
    
    if (weaponType === 'bow') {
      // Use bow walk animation and pass drawing stage info
      this.bowWalkAnimation.update(deltaTime, isWalking, walkDirection, {
        isDrawing: this.isDrawingBow,
        drawingStage: this.currentDrawingStage,
        chargeLevel: this.currentChargeLevel
      });
    } else {
      // Use melee walk animation
      this.meleeWalkAnimation.update(deltaTime, isWalking, walkDirection);
    }
  }
}
