
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
          neutral: { x: Math.PI / 3 + 0.03, y: 0, z: 0 }, // Match new idle position (61.7°)
          windup: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(15), // Reduced from 55° to 15°
            y: THREE.MathUtils.degToRad(-20), // Reduced Y rotation 
            z: THREE.MathUtils.degToRad(10)   // Reduced Z rotation
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-25), // Increased downward from -35° to -25°
            y: THREE.MathUtils.degToRad(40),  // Increased cross-body slash
            z: THREE.MathUtils.degToRad(-8)   // Moderate wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
