
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
        duration: 0.53,
        phases: {
          windup: 0.106,
          slash: 0.265,
          recovery: 0.159
        },
        rotations: {
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // 60° chest level position
          windup: { 
            x: Math.PI / 3, // STAY at chest level - no vertical movement
            y: -THREE.MathUtils.degToRad(15), // Pull back for dramatic windup
            z: 0            // NO EXTRA ROTATION
          },
          slash: { 
            x: Math.PI / 3,                       // STAY at chest level throughout swing
            y: THREE.MathUtils.degToRad(75),      // WIDE cross-body slash motion (increased from 35°)
            z: THREE.MathUtils.degToRad(-12)      // Enhanced wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
