import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from '../../base/BaseWeapon';

export class IronSword extends BaseWeapon {
  constructor() {
    super(IronSword.getConfig());
    this.mesh = this.createMesh();
    this.hitBox = this.createHitBox();
  }

  public static getConfig(): WeaponConfig {
    return {
      id: 'iron_sword',
      name: 'Iron Sword',
      type: 'sword',
      handRequirement: 'one-handed',
      stats: {
        damage: 20,
        attackSpeed: 1.0,
        range: 2.5,
        durability: 80,
        weight: 5
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
    const hiltGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.15);
    const hiltMaterial = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 50 });
    const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
    hilt.castShadow = true;
    swordGroup.add(hilt);
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 12);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513, shininess: 30 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.8;
    handle.castShadow = true;
    swordGroup.add(handle);
    
    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.1, 0.2, 1.5);
    const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0xC0C0C0, shininess: 80 });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 1;
    blade.castShadow = true;
    swordGroup.add(blade);
    
    // Set sword position and rotation
    swordGroup.position.set(0, 0, 0);
    swordGroup.rotation.set(0, 0, 0);
    
    return swordGroup;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.5, 0.5, 2);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = 0.7;
    hitBox.position.z = 0.5;
    return hitBox;
  }

  public getBladeReference(): THREE.Mesh {
    return this.mesh.children[2] as THREE.Mesh;
  }
}
