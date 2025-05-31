
import * * THREE from 'three';
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
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(55), // Increased from 40° to 55° for quicker but noticeable windup
            y: THREE.MathUtils.degToRad(-30), // Increased Y rotation for better positioning
            z: THREE.MathUtils.degToRad(15)   // Increased Z rotation for light weapon speed
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-35), // Increased from -15° to -35° for effective forward swing
            y: THREE.MathUtils.degToRad(55),  // Increased Y rotation for quick cross-body slash
            z: THREE.MathUtils.degToRad(-12)  // Increased Z rotation for quick snap
          }
        }
      }
    };
    
    super(config);
  }
}
