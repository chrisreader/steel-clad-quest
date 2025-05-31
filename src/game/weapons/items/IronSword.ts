
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
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(60), // Increased from 45° to 60° for more dramatic windup
            y: THREE.MathUtils.degToRad(-35), // Increased Y rotation for better side positioning
            z: THREE.MathUtils.degToRad(20)   // Increased Z rotation for more natural windup
          },
          slash: { 
            x: Math.PI / 3 + 0.03 + THREE.MathUtils.degToRad(-40), // Increased from -20° to -40° for powerful forward swing
            y: THREE.MathUtils.degToRad(60),  // Increased Y rotation for dramatic cross-body slash
            z: THREE.MathUtils.degToRad(-15)  // Increased Z rotation for better wrist snap
          }
        }
      }
    };
    
    super(config);
  }
}
