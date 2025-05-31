
import * as THREE from 'three';
import { Sword } from '../Sword';
import { WeaponConfig } from '../BaseWeapon';

export class SteelSword extends Sword {
  constructor() {
    const config: WeaponConfig = {
      id: 'steel_sword',
      name: 'Steel Sword',
      type: 'sword',
      stats: {
        damage: 15,
        attackSpeed: 0.9,
        range: 2.2,
        durability: 150,
        weight: 4.0
      },
      swingAnimation: {
        duration: 0.64, // Standard duration for realistic timing
        phases: {
          windup: 0.128,   // 20% of 0.64s
          slash: 0.32,     // 50% of 0.64s
          recovery: 0.192  // 30% of 0.64s
        },
        rotations: {
          neutral: { x: THREE.MathUtils.degToRad(30), y: 0, z: 0 }, // 30° ready position, slightly down
          windup: { 
            x: THREE.MathUtils.degToRad(70),           // 70° move to right side
            y: THREE.MathUtils.degToRad(20),           // 20° right side position
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(35),           // 35° slight downward follow-through
            y: THREE.MathUtils.degToRad(60),           // 60° left side sweep end
            z: THREE.MathUtils.degToRad(-15)           // Strong wrist snap for heavy weapon
          }
        }
      }
    };
    
    super(config);
  }
}
