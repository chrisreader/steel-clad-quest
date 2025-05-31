
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
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // 60° chest level position
          windup: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(50), // High position (110°)
            y: THREE.MathUtils.degToRad(-40),               // Pull right/back
            z: 0
          },
          slash: { 
            x: Math.PI / 8,                           // Low position (22.5°)
            y: THREE.MathUtils.degToRad(70),          // Sweep left
            z: THREE.MathUtils.degToRad(-12)          // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
