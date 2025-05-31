
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
          neutral: { x: Math.PI / 5, y: 0, z: 0 }, // Match new REALISTIC idle position (36°)
          windup: { 
            x: Math.PI / 5 + THREE.MathUtils.degToRad(5), // Minimal windup to 41°
            y: THREE.MathUtils.degToRad(-15), // Reduced Y rotation
            z: THREE.MathUtils.degToRad(8)    // Reduced Z rotation
          },
          slash: { 
            x: Math.PI / 5 + THREE.MathUtils.degToRad(-25), // Forward slash to 11°
            y: THREE.MathUtils.degToRad(35),  // Cross-body slash
            z: THREE.MathUtils.degToRad(-8)   // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
