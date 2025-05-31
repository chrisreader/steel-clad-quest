
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
          neutral: { x: Math.PI / 3, y: 0, z: 0 }, // FIXED: Parallel base position
          windup: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(55),
            y: 0, // FIXED: NO Y rotation - keep parallel
            z: 0  // FIXED: NO Z rotation - keep parallel
          },
          slash: { 
            x: Math.PI / 3 + THREE.MathUtils.degToRad(-20),
            y: 0, // FIXED: NO Y rotation - keep parallel
            z: 0  // FIXED: NO Z rotation - keep parallel
          }
        }
      }
    };
    
    super(config);
  }
}
