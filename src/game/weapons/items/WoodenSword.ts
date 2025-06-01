import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from '../BaseWeapon';

export class WoodenSword extends BaseWeapon {
  constructor() {
    const config: WeaponConfig = {
      id: 'wooden_sword',
      name: 'Wooden Sword',
      type: 'sword',
      handRequirement: 'one-handed',
      stats: {
        damage: 15,
        attackSpeed: 1.4,
        range: 1.3,
        durability: 50,
        weight: 1.5
      },
      swingAnimation: {
        duration: 714,
        phases: {
          windup: 0.3,
          slash: 0.4,
          recovery: 0.3
        },
        rotations: {
          neutral: { x: -0.2, y: 0, z: 0 },
          windup: { x: -0.7, y: -0.3, z: -0.15 },
          slash: { x: 0.3, y: 0.25, z: 0.08 }
        }
      }
    };
    
    super(config);
    console.log('⚔️ [WoodenSword] Created one-handed wooden sword');
  }

  public createMesh(): THREE.Group {
    const swordGroup = new THREE.Group();

    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.08, 1.0, 0.02);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xd2691e });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.5, 0);
    blade.castShadow = true;
    swordGroup.add(blade);

    // Guard
    const guardGeometry = new THREE.BoxGeometry(0.25, 0.04, 0.08);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, 0, 0);
    guard.castShadow = true;
    swordGroup.add(guard);

    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.125, 0);
    handle.castShadow = true;
    swordGroup.add(handle);

    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.035, 8, 6);
    const pommelMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.set(0, -0.25, 0);
    pommel.castShadow = true;
    swordGroup.add(pommel);

    return swordGroup;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.15, 1.1, 0.15);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0 
    });
    
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.set(0, 0.55, 0);
    hitBox.visible = false;
    
    return hitBox;
  }

  public getBladeReference(): THREE.Mesh {
    return this.mesh.children.find(child => 
      child instanceof THREE.Mesh && child.position.y > 0.4
    ) as THREE.Mesh;
  }
}
