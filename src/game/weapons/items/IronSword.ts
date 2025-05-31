
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
        duration: 0.64, // Standard duration for realistic timing
        phases: {
          windup: 0.128,   // 20% of 0.64s
          slash: 0.32,     // 50% of 0.64s
          recovery: 0.192  // 30% of 0.64s
        },
        rotations: {
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // 60° proper ready position
          windup: { 
            x: Math.PI / 2, // 90° overhead position
            y: THREE.MathUtils.degToRad(45), // Right position for right-to-left arc
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(30), // 30° reasonable end position (not too low)
            y: THREE.MathUtils.degToRad(-45), // Left position completing the arc
            z: 0
          }
        }
      }
    };
    
    super(config);
  }
}
