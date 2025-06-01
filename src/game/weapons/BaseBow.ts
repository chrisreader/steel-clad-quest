
import * as THREE from 'three';
import { BaseWeapon, WeaponConfig, WeaponStats } from './BaseWeapon';

// Draw stage enumeration for better state management
export enum DrawStage {
  IDLE = 'idle',
  EARLY_DRAW = 'early_draw',
  MID_DRAW = 'mid_draw',
  FULL_DRAW = 'full_draw',
  OVERCHARGED = 'overcharged'
}

export abstract class BaseBow extends BaseWeapon {
  protected chargeLevel: number = 0;
  protected maxChargeTime: number = 3;
  protected drawingState: boolean = false;
  protected currentDrawStage: DrawStage = DrawStage.IDLE;
  protected shakeIntensity: number = 0;
  protected shakeTime: number = 0;

  constructor(config: WeaponConfig) {
    super(config);
    console.log(`🏹 [BaseBow] Initialized ${config.name} with unified bow system`);
  }

  public isDrawing(): boolean {
    return this.drawingState;
  }

  public startDrawing(): void {
    this.drawingState = true;
    this.chargeLevel = 0;
    this.updateDrawStage();
    console.log(`🏹 [BaseBow] Started drawing ${this.config.name}`);
  }

  public stopDrawing(): void {
    this.drawingState = false;
    this.chargeLevel = 0;
    this.currentDrawStage = DrawStage.IDLE;
    this.shakeIntensity = 0;
    this.updateBowVisuals();
    console.log(`🏹 [BaseBow] Stopped drawing ${this.config.name} and reset charge`);
  }

  public updateCharge(deltaTime: number): void {
    if (!this.drawingState) return;
    
    const chargeRate = 1.0 / this.maxChargeTime;
    this.chargeLevel = Math.min(this.chargeLevel + (deltaTime * chargeRate), 1.2);
    
    this.updateDrawStage();
    this.updateBowVisuals();
    
    // Handle overcharged shake
    if (this.chargeLevel >= 1.0) {
      this.shakeTime += deltaTime * 15;
      this.shakeIntensity = 0.015 + Math.sin(this.shakeTime) * 0.008;
      this.applyShakeEffect();
    }
  }

  private updateDrawStage(): void {
    const prevStage = this.currentDrawStage;
    
    if (this.chargeLevel === 0) {
      this.currentDrawStage = DrawStage.IDLE;
    } else if (this.chargeLevel < 0.25) {
      this.currentDrawStage = DrawStage.EARLY_DRAW;
    } else if (this.chargeLevel < 0.6) {
      this.currentDrawStage = DrawStage.MID_DRAW;
    } else if (this.chargeLevel < 1.0) {
      this.currentDrawStage = DrawStage.FULL_DRAW;
    } else {
      this.currentDrawStage = DrawStage.OVERCHARGED;
    }
    
    if (prevStage !== this.currentDrawStage) {
      console.log(`🏹 [BaseBow] Draw stage: ${prevStage} -> ${this.currentDrawStage} (${Math.round(this.chargeLevel * 100)}%)`);
    }
  }

  protected abstract updateBowVisuals(): void;
  protected abstract applyShakeEffect(): void;

  public getChargeLevel(): number {
    return Math.min(this.chargeLevel, 1.0);
  }

  public isFullyCharged(): boolean {
    return this.chargeLevel >= 1.0;
  }

  public getChargeDamage(): number {
    const baseDamage = this.config.stats.damage;
    const chargeMultiplier = Math.max(0.3, Math.min(this.chargeLevel, 1.0));
    const damage = Math.floor(baseDamage * chargeMultiplier);
    console.log(`🏹 [BaseBow] Damage calculation - Base: ${baseDamage}, Multiplier: ${chargeMultiplier.toFixed(2)}, Final: ${damage}`);
    return damage;
  }

  public getArrowSpeed(): number {
    const baseSpeed = 25;
    const chargeMultiplier = 0.5 + (Math.min(this.chargeLevel, 1.0) * 0.5);
    const speed = baseSpeed * chargeMultiplier;
    console.log(`🏹 [BaseBow] Speed calculation - Base: ${baseSpeed}, Multiplier: ${chargeMultiplier.toFixed(2)}, Final: ${speed.toFixed(1)}`);
    return speed;
  }

  public getCurrentDrawStage(): DrawStage {
    return this.currentDrawStage;
  }

  protected easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
