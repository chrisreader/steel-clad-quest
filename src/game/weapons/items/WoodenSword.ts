
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
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // Parallel base position
          windup: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(45),
            y: THREE.MathUtils.degToRad(-25), // Added Y rotation for windup
            z: THREE.MathUtils.degToRad(12)   // Added Z rotation for natural movement
          },
          slash: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(-10),
            y: THREE.MathUtils.degToRad(40),  // Added Y rotation for slash across body
            z: THREE.MathUtils.degToRad(-8)   // Added Z rotation for wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
