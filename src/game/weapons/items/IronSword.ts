
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
        duration: 0.64,
        phases: {
          windup: 0.128,
          slash: 0.32,
          recovery: 0.192
        },
        rotations: {
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // 60° chest level position
          windup: { 
            x: Math.PI / 3, // STAY at chest level - no vertical movement
            y: -THREE.MathUtils.degToRad(12), // Pull back for dramatic windup
            z: 0            // NO EXTRA ROTATION
          },
          slash: { 
            x: Math.PI / 3,                       // STAY at chest level throughout swing
            y: THREE.MathUtils.degToRad(80),      // WIDE cross-body slash motion (increased from 40°)
            z: THREE.MathUtils.degToRad(-15)      // Enhanced wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
