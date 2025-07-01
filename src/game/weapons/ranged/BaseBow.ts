
import * as THREE from 'three';
import { BaseWeapon, WeaponConfig, WeaponStats } from '../BaseWeapon';

export abstract class BaseBow extends BaseWeapon {
  protected readyToFire: boolean = false;

  constructor(config: WeaponConfig) {
    super(config);
    console.log(`🏹 [BaseBow] Initialized ${config.name} with fast FPS-style shooting`);
  }

  // SIMPLE BOW STATE METHODS
  public setReadyToFire(ready: boolean): void {
    this.readyToFire = ready;
    console.log(`🏹 [BaseBow] Ready to fire: ${ready}`);
  }

  public isReadyToFire(): boolean {
    return this.readyToFire;
  }

  // FIXED DAMAGE AND SPEED (NO CHARGE MECHANICS)
  public getArrowDamage(): number {
    return this.config.stats.damage;
  }

  public getArrowSpeed(): number {
    return 60; // Increased from 30 to 60 for much faster arrows
  }

  // ABSTRACT METHODS FOR SUBCLASSES (SIMPLIFIED)
  protected abstract updateBowVisuals(): void;
}
