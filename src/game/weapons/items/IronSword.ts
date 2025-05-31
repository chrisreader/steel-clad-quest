
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
          neutral: { x: Math.PI / 12, y: 0, z: 0 }, // 15° horizontal position
          windup: { 
            x: Math.PI / 12, // NO CHANGE - stay at horizontal position
            y: 0,            // NO BACKWARD PULL
            z: 0             // NO EXTRA ROTATION
          },
          slash: { 
            x: Math.PI / 12 + THREE.MathUtils.degToRad(-10), // Forward slash to 5° (horizontal)
            y: THREE.MathUtils.degToRad(40),  // Cross-body slash
            z: THREE.MathUtils.degToRad(-10)  // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
