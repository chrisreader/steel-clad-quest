
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
        duration: 0.614, // 20% faster (was 0.768s)
        phases: {
          windup: 0.123,   // 20% of 0.614s
          slash: 0.307,    // 50% of 0.614s
          recovery: 0.184  // 30% of 0.614s
        },
        rotations: {
          neutral: { x: THREE.MathUtils.degToRad(60), y: 0, z: 0 }, // 60° ready position, no side angle
          windup: { 
            x: THREE.MathUtils.degToRad(70),           // 70° move to right side
            y: THREE.MathUtils.degToRad(10),           // 10° right side position
            z: 0
          },
          slash: { 
            x: THREE.MathUtils.degToRad(60),           // 60° sweep to left side, down follow-through
            y: THREE.MathUtils.degToRad(30),           // 30° left side sweep end
            z: THREE.MathUtils.degToRad(-12)           // Enhanced wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
