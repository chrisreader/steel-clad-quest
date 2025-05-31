
import * as THREE from 'three';
import { Sword } from '../Sword';
import { WeaponConfig } from '../BaseWeapon';

export class SteelSword extends Sword {
  constructor() {
    const config: WeaponConfig = {
      id: 'steel_sword',
      name: 'Steel Sword',
      type: 'sword',
      stats: {
        damage: 15,
        attackSpeed: 0.9,
        range: 2.2,
        durability: 150,
        weight: 4.0
      },
      swingAnimation: {
        duration: 0.71,
        phases: {
          windup: 0.142,
          slash: 0.355,
          recovery: 0.213
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
            y: THREE.MathUtils.degToRad(45),  // Strong cross-body slash
            z: THREE.MathUtils.degToRad(-12)  // Strong wrist snap for heavy weapon
          }
        }
      }
    };
    
    super(config);
  }
}
