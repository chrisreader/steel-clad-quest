
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
          neutral: { x: Math.PI / 12, y: 0, z: 0 }, // Match new HORIZONTAL idle position (15°)
          windup: { 
            x: Math.PI / 12 + THREE.MathUtils.degToRad(5), // Minimal windup to 20°
            y: THREE.MathUtils.degToRad(-25), // Reduced Y rotation
            z: THREE.MathUtils.degToRad(12)   // Reduced Z rotation
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
