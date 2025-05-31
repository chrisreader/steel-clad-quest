
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
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(65), // Increased from 50° to 65° for heavier weapon feel
            y: THREE.MathUtils.degToRad(-40), // Increased Y rotation for better positioning
            z: THREE.MathUtils.degToRad(25)   // Increased Z rotation for heavier weapon windup
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-45), // Increased from -25° to -45° for powerful heavy swing
            y: THREE.MathUtils.degToRad(65),  // Increased Y rotation for dramatic heavy slash
            z: THREE.MathUtils.degToRad(-18)  // Increased Z rotation for heavy weapon impact
          }
        }
      }
    };
    
    super(config);
  }
}
