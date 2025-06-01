import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from '../../base/BaseWeapon';

export class SteelSword extends BaseWeapon {
  constructor() {
    super(SteelSword.createConfig());
  }

  public static createConfig(): WeaponConfig {
    return {
      id: 'steel_sword',
      name: 'Steel Sword',
      type: 'sword',
      handRequirement: 'one-handed',
      stats: {
        damage: 20,
        attackSpeed: 0.8,
        range: 2.5,
        durability: 80,
        weight: 7
      },
      swingAnimation: {
        duration: 0.768,
        phases: {
          windup: 0.2,
          slash: 0.3,
          recovery: 0.268
        },
        rotations: {
          neutral: { x: 0, y: 0, z: 0 },
          windup: { x: 0, y: 0, z: 0.5 },
          slash: { x: 0, y: 0, z: -2.5 }
        }
      }
    };
  }

  public createMesh(): THREE.Group {
    const swordGroup = new THREE.Group();

    // Hilt
    const hiltGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const hiltMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
    hilt.position.set(0, 0, 0);
    swordGroup.add(hilt);

    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 32);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, -0.4);
    swordGroup.add(handle);

    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.02, 1.2);
    const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0xA9A9A9 });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0, 0.7);
    blade.castShadow = true;
    swordGroup.add(blade);

    // Make the sword point upwards
    swordGroup.rotation.x = Math.PI / 2;

    this.mesh = swordGroup;
    return this.mesh;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.2);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    this.hitBox.position.set(0, 0, 0.7);
    return this.hitBox;
  }

  public getBladeReference(): THREE.Mesh {
    return this.mesh.children.find(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) as THREE.Mesh;
  }
}
