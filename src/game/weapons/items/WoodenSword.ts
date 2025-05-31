
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
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // FIXED: Parallel base position
          windup: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(45),
            y: 0, // FIXED: NO Y rotation - keep parallel
            z: 0  // FIXED: NO Z rotation - keep parallel
          },
          slash: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(-10),
            y: 0, // FIXED: NO Y rotation - keep parallel
            z: 0  // FIXED: NO Z rotation - keep parallel
          }
        }
      }
    };
    
    super(config);
  }
}
