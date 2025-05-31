
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
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // 60° proper ready position
          windup: { 
            x: Math.PI * 5 / 12, // 75° elevated but not overhead for horizontal swing
            y: THREE.MathUtils.degToRad(45), // Right position for right-to-left arc
            z: 0
          },
          slash: { 
            x: Math.PI / 4, // 45° horizontal slash level (not 30°)
            y: THREE.MathUtils.degToRad(-45), // Left position completing the horizontal arc
            z: 0
          }
        }
      }
    };
    
    super(config);
  }
}
