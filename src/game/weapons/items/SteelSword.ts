import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from '../BaseWeapon';

export class SteelSword extends BaseWeapon {
  constructor() {
    const config: WeaponConfig = {
      id: 'steel_sword',
      name: 'Steel Sword',
      type: 'sword',
      handRequirement: 'one-handed',
      stats: {
        damage: 35,
        attackSpeed: 1.1,
        range: 1.6,
        durability: 150,
        weight: 4.0
      },
      swingAnimation: {
        duration: 909,
        phases: {
          windup: 0.2,
          slash: 0.3,
          recovery: 0.5
        },
        rotations: {
          neutral: { x: -0.35, y: 0, z: 0 },
          windup: { x: -0.9, y: -0.5, z: -0.25 },
          slash: { x: 0.5, y: 0.35, z: 0.12 }
        }
      }
    };
    
    super(config);
    console.log('⚔️ [SteelSword] Created one-handed steel sword');
  }

  public createMesh(): THREE.Group {
    const swordGroup = new THREE.Group();

    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.12, 1.4, 0.025);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xe6e6fa });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.7, 0);
    blade.castShadow = true;
    swordGroup.add(blade);

    // Guard
    const guardGeometry = new THREE.BoxGeometry(0.35, 0.06, 0.12);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, 0, 0);
    guard.castShadow = true;
    swordGroup.add(guard);

    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x2f2f2f });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.175, 0);
    handle.castShadow = true;
    swordGroup.add(handle);

    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    const pommelMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.set(0, -0.35, 0);
    pommel.castShadow = true;
    swordGroup.add(pommel);

    return swordGroup;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.25, 1.5, 0.25);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0 
    });
    
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.set(0, 0.75, 0);
    hitBox.visible = false;
    
    return hitBox;
  }

  public getBladeReference(): THREE.Mesh {
    return this.mesh.children.find(child => 
      child instanceof THREE.Mesh && child.position.y > 0.6
    ) as THREE.Mesh;
  }
}
