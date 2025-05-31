
import * * THREE from 'three';
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
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // 60° proper ready position
          windup: { 
            x: Math.PI * 5 / 12, // 75° upper position for proper arc windup
            y: THREE.MathUtils.degToRad(45), // 45° right position
            z: 0
          },
          slash: { 
            x: Math.PI / 6, // 30° lower position for follow-through arc
            y: THREE.MathUtils.degToRad(-45), // 45° left position completing the diagonal arc
            z: 0
          }
        }
      }
    };
    
    super(config);
  }
}
