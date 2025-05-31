
import * as THREE from 'three';
import { Sword } from '../Sword';
import { WeaponConfig } from '../BaseWeapon';

export class IronSword extends Sword {
  constructor() {
    const config: WeaponConfig = {
      id: 'iron_sword',
      name: 'Iron Sword',
      type: 'sword',
      stats: {
        damage: 10,
        attackSpeed: 1.0,
        range: 2.0,
        durability: 100,
        weight: 3.5
      },
      swingAnimation: {
        duration: 0.64,
        phases: {
          windup: 0.128,
          slash: 0.32,
          recovery: 0.192
        },
        rotations: {
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // Parallel base position
          windup: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(50),
            y: THREE.MathUtils.degToRad(-30), // Added Y rotation for windup
            z: THREE.MathUtils.degToRad(15)   // Added Z rotation for natural movement
          },
          slash: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(-15),
            y: THREE.MathUtils.degToRad(45),  // Added Y rotation for slash across body
            z: THREE.MathUtils.degToRad(-10)  // Added Z rotation for wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
