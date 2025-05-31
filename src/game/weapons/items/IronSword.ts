
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
          neutral: { x: THREE.MathUtils.degToRad(50), y: 0, z: 0 }, // 50° ready position, slightly down
          windup: { 
            x: THREE.MathUtils.degToRad(70),           // 70° move to right side
            y: THREE.MathUtils.degToRad(20),           // 20° right side position
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(60),           // 60° sweep to left side, down follow-through
            y: THREE.MathUtils.degToRad(60),           // 60° left side sweep end
            z: THREE.MathUtils.degToRad(-12)           // Enhanced wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
