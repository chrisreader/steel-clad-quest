
import * as THREE from 'three';
import { Sword } from '../Sword';
import { WeaponConfig } from '../BaseWeapon';

export class WoodenSword extends Sword {
  constructor() {
    const config: WeaponConfig = {
      id: 'wooden_sword',
      name: 'Wooden Sword',
      type: 'sword',
      stats: {
        damage: 5,
        attackSpeed: 1.2,
        range: 1.8,
        durability: 50,
        weight: 2.0
      },
      swingAnimation: {
        duration: 0.53,
        phases: {
          windup: 0.106,
          slash: 0.265,
          recovery: 0.159
        },
        rotations: {
          neutral: { x: Math.PI / 8, y: 0, z: 0 },
          windup: { 
            x: Math.PI / 8 + THREE.MathUtils.degToRad(45),
            y: THREE.MathUtils.degToRad(-35),
            z: 0
          },
          slash: { 
            x: Math.PI / 8 + THREE.MathUtils.degToRad(-10),
            y: THREE.MathUtils.degToRad(65),
            z: 0
          }
        }
      }
    };
    
    super(config);
  }
}
