
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
          neutral: { x: Math.PI / 8, y: 0, z: 0 },
          windup: { 
            x: Math.PI / 8 + THREE.MathUtils.degToRad(55),
            y: THREE.MathUtils.degToRad(-45),
            z: 0
          },
          slash: { 
            x: Math.PI / 8 + THREE.MathUtils.degToRad(-20),
            y: THREE.MathUtils.degToRad(75),
            z: 0
          }
        }
      }
    };
    
    super(config);
  }
}
