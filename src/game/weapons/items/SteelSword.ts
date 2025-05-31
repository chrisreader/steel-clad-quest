
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
          neutral: { x: Math.PI / 3 + 0.03, y: 0, z: 0 }, // Match new idle position (61.7°)
          windup: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(20), // Reduced from 65° to 20°
            y: THREE.MathUtils.degToRad(-30), // Reduced Y rotation
            z: THREE.MathUtils.degToRad(15)   // Reduced Z rotation
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-32), // Increased downward from -45° to -32°
            y: THREE.MathUtils.degToRad(50),  // Increased cross-body slash
            z: THREE.MathUtils.degToRad(-12)  // Strong wrist snap for heavy weapon
          }
        }
      }
    };
    
    super(config);
  }
}
