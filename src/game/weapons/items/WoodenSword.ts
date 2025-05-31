
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
        duration: 0.64, // Standard duration for realistic timing
        phases: {
          windup: 0.128,   // 20% of 0.64s
          slash: 0.32,     // 50% of 0.64s  
          recovery: 0.192  // 30% of 0.64s
        },
        rotations: {
          neutral: { x: THREE.MathUtils.degToRad(20), y: 0, z: 0 }, // 20° ready position, slightly down
          windup: { 
            x: THREE.MathUtils.degToRad(70),           // 70° move to right side
            y: THREE.MathUtils.degToRad(10),           // 10° right side position
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(60),           // 60° sweep to left side, down follow-through
            y: THREE.MathUtils.degToRad(30),           // 30° left side sweep end
            z: THREE.MathUtils.degToRad(-10)           // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
