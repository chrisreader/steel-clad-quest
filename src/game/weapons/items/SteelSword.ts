
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
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(50), // Reduced from 55° to 50°
            y: THREE.MathUtils.degToRad(-35), // Keep Y rotation for windup
            z: THREE.MathUtils.degToRad(18)   // Keep Z rotation for natural movement
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-25), // Increased from -20° to -25°
            y: THREE.MathUtils.degToRad(50),  // Keep Y rotation for slash across body
            z: THREE.MathUtils.degToRad(-12)  // Keep Z rotation for wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
