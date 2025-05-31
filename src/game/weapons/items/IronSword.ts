
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
          neutral: { x: Math.PI / 5, y: 0, z: 0 }, // Match new REALISTIC idle position (36°)
          windup: { 
            x: Math.PI / 5 + THREE.MathUtils.degToRad(5), // Minimal windup to 41°
            y: THREE.MathUtils.degToRad(-20), // Reduced Y rotation
            z: THREE.MathUtils.degToRad(10)   // Reduced Z rotation
          },
          slash: { 
            x: Math.PI / 5 + THREE.MathUtils.degToRad(-25), // Forward slash to 11°
            y: THREE.MathUtils.degToRad(40),  // Cross-body slash
            z: THREE.MathUtils.degToRad(-10)  // Wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
