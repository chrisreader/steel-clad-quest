
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
          neutral: { x: Math.PI / 3 + 0.03, y: 0, z: 0 }, // Match new idle position (61.7°)
          windup: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(45), // Reduced from 50° to 45°
            y: THREE.MathUtils.degToRad(-30), // Keep Y rotation for windup
            z: THREE.MathUtils.degToRad(15)   // Keep Z rotation for natural movement
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-20), // Increased from -15° to -20°
            y: THREE.MathUtils.degToRad(45),  // Keep Y rotation for slash across body
            z: THREE.MathUtils.degToRad(-10)  // Keep Z rotation for wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
