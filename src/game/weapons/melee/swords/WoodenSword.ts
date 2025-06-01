import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from '../../base/BaseWeapon';

export class WoodenSword extends BaseWeapon {
  constructor() {
    super(WoodenSword.getConfig());
    this.mesh = this.createMesh();
  }

  public static getConfig(): WeaponConfig {
    return {
      id: 'wooden_sword',
      name: 'Wooden Sword',
      type: 'sword',
      handRequirement: 'one-handed',
      stats: {
        damage: 10,
        attackSpeed: 1.0,
        range: 2.0,
        durability: 50,
        weight: 1.5
      },
      swingAnimation: {
        duration: 768,
        phases: {
          windup: 0.25,
          slash: 0.35,
          recovery: 0.40
        },
        rotations: {
          neutral: { x: 0, y: 0, z: 0 },
          windup: { x: 0, y: 0, z: 0.5 },
          slash: { x: 0, y: 0, z: -1.5 }
        }
      }
    };
  }

  public createMesh(): THREE.Group {
    const swordGroup = new THREE.Group();

    // Hilt
    const hiltGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.3);
    const hiltMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
    hilt.position.set(0, 0, 0);
    swordGroup.add(hilt);

    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 32);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0.5, 0);
    swordGroup.add(handle);

    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.2, 1.5);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xA0522D });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 1.4, 0);
    blade.castShadow = true;
    swordGroup.add(blade);

    swordGroup.rotation.x = Math.PI / 2;
    swordGroup.position.y = -0.5;

    return swordGroup;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.5);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.set(0, 1.4, 0);
    return hitBox;
  }

  public getBladeReference(): THREE.Mesh {
    return this.mesh.children[2] as THREE.Mesh;
  }
}
