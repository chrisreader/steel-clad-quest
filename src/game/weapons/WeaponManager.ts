import * as THREE from 'three';
import { BaseWeapon } from './BaseWeapon';
import { IronSword, WoodenSword, SteelSword } from './types';
import { HuntingBow } from './ranged';

export class WeaponManager {
  private weapons: Map<string, () => BaseWeapon> = new Map();

  constructor() {
    this.registerWeapons();
  }

  private registerWeapons(): void {
    this.weapons.set('iron_sword', () => new IronSword());
    this.weapons.set('wooden_sword', () => new WoodenSword());
    this.weapons.set('steel_sword', () => new SteelSword());
    this.weapons.set('hunting_bow', () => new HuntingBow());
  }

  public createWeapon(weaponId: string): BaseWeapon | null {
    const weaponFactory = this.weapons.get(weaponId);
    if (weaponFactory) {
      return weaponFactory();
    }
    console.warn(`Weapon with id '${weaponId}' not found`);
    return null;
  }

  public getAvailableWeapons(): string[] {
    return Array.from(this.weapons.keys());
  }

  public registerWeapon(id: string, factory: () => BaseWeapon): void {
    this.weapons.set(id, factory);
  }
}
