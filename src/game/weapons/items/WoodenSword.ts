
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
            y: 0,           // NO BACKWARD PULL
            z: 0            // NO EXTRA ROTATION
          },
          slash: { 
            x: Math.PI / 3,                       // STAY at chest level throughout swing
            y: THREE.MathUtils.degToRad(35),      // Cross-body slash motion
            z: THREE.MathUtils.degToRad(-8)       // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
