import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from '../../base/BaseWeapon';

export abstract class BaseBow extends BaseWeapon {
  constructor(config: WeaponConfig) {
    super(config);
  }

  public abstract draw(amount: number): void;
  public abstract release(): void;
}
