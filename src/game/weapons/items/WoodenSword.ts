
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
        duration: 0.768, // 20% longer than 0.64s
        phases: {
          windup: 0.154,   // 20% of 0.768s
          slash: 0.384,    // 50% of 0.768s  
          recovery: 0.230  // 30% of 0.768s
        },
        rotations: {
          neutral: { x: THREE.MathUtils.degToRad(60), y: 0, z: 0 }, // 60° ready position, no side angle
          windup: { 
            x: THREE.MathUtils.degToRad(70),           // 70° move to right side
            y: THREE.MathUtils.degToRad(50),           // 50° right side position (updated)
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(15),           // 15° sweep end (updated)
            y: THREE.MathUtils.degToRad(20),           // 20° left side sweep end (updated)
            z: THREE.MathUtils.degToRad(-10)           // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
