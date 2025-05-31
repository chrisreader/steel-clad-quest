
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
          neutral: { x: Math.PI / 12, y: 0, z: 0 }, // 15° horizontal position
          windup: { 
            x: Math.PI / 12, // NO CHANGE - stay at horizontal position
            y: 0,            // NO BACKWARD PULL
            z: 0             // NO EXTRA ROTATION
          },
          slash: { 
            x: Math.PI / 12 + THREE.MathUtils.degToRad(-10), // Forward slash to 5° (horizontal)
            y: THREE.MathUtils.degToRad(35),  // Cross-body slash
            z: THREE.MathUtils.degToRad(-8)   // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
