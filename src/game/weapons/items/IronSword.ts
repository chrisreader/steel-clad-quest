
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
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(18), // Reduced from 60° to 18°
            y: THREE.MathUtils.degToRad(-25), // Reduced Y rotation
            z: THREE.MathUtils.degToRad(12)   // Reduced Z rotation
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-28), // Increased downward from -40° to -28°
            y: THREE.MathUtils.degToRad(45),  // Increased cross-body slash
            z: THREE.MathUtils.degToRad(-10)  // Moderate wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
