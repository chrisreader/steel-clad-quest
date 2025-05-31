
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
            x: Math.PI / 3 + THREE.MathUtils.degToRad(30), // 90° overhead position
            y: THREE.MathUtils.degToRad(-60),               // Increased from -30° for wider swing
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(50),                // 50° reasonable end position
            y: THREE.MathUtils.degToRad(75),                // Increased from 45° for wider swing
            z: THREE.MathUtils.degToRad(-18)                // Strong wrist snap for heavy weapon
          }
        }
      }
    };
    
    super(config);
  }
}
