
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
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // 60° chest level position
          windup: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(50), // High position (110°)
            y: THREE.MathUtils.degToRad(-40),               // Pull right/back
            z: 0
          },
          slash: { 
            x: Math.PI / 8,                           // Low position (22.5°)
            y: THREE.MathUtils.degToRad(70),          // Sweep left
            z: THREE.MathUtils.degToRad(-15)          // Enhanced wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
