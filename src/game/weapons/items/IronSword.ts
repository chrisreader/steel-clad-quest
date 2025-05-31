
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
        duration: 0.768, // 20% longer than 0.64s
        phases: {
          windup: 0.154,   // 20% of 0.768s
          slash: 0.384,    // 50% of 0.768s
          recovery: 0.230  // 30% of 0.768s
        },
        rotations: {
          neutral: { x: THREE.MathUtils.degToRad(60), y: 0, z: 0 }, // 60° ready position, no side angle
          windup: { 
            x: THREE.MathUtils.degToRad(70),           // 70° move to left side
            y: THREE.MathUtils.degToRad(-20),          // -20° left side position (updated)
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(15),           // 15° sweep end (updated)
            y: THREE.MathUtils.degToRad(20),           // 20° right side sweep end (updated)
            z: THREE.MathUtils.degToRad(-12)           // Enhanced wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
