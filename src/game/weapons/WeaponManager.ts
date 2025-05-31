
import * as THREE from 'three';
import { BaseWeapon } from './BaseWeapon';
import { IronSword } from './items/IronSword';
import { WoodenSword } from './items/WoodenSword';
import { SteelSword } from './items/SteelSword';
import { HuntingBow } from './items/HuntingBow';

export class WeaponManager {
  private weapons: Map<string, () => BaseWeapon> = new Map();
  private scene: THREE.Scene;
  private equippedWeapon: BaseWeapon | null = null;
  private attachmentPoint: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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

  public equipWeapon(weaponId: string, attachmentPoint: THREE.Object3D): void {
    // Unequip current weapon first
    if (this.equippedWeapon) {
      this.unequipWeapon();
    }

    // Create and equip new weapon
    const weapon = this.createWeapon(weaponId);
    if (weapon) {
      weapon.equip(this.scene);
      this.equippedWeapon = weapon;
      this.attachmentPoint = attachmentPoint;
      
      // Attach weapon to player
      if (attachmentPoint && weapon.getMesh()) {
        attachmentPoint.add(weapon.getMesh());
      }
      
      console.log(`Weapon ${weaponId} equipped successfully`);
    }
  }

  public unequipWeapon(): void {
    if (this.equippedWeapon && this.attachmentPoint) {
      // Remove weapon from attachment point
      this.attachmentPoint.remove(this.equippedWeapon.getMesh());
      
      // Unequip weapon
      this.equippedWeapon.unequip(this.scene);
      this.equippedWeapon = null;
      this.attachmentPoint = null;
      
      console.log('Weapon unequipped');
    }
  }

  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
  }

  public update(deltaTime: number): void {
    if (this.equippedWeapon && this.equippedWeapon.updateCharge) {
      this.equippedWeapon.updateCharge(deltaTime);
    }
  }

  public getAvailableWeapons(): string[] {
    return Array.from(this.weapons.keys());
  }

  public registerWeapon(id: string, factory: () => BaseWeapon): void {
    this.weapons.set(id, factory);
  }

  public dispose(): void {
    if (this.equippedWeapon) {
      this.unequipWeapon();
    }
  }
}
