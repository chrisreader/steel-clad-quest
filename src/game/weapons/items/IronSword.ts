import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from '../BaseWeapon';

export class IronSword extends BaseWeapon {
  constructor() {
    const config: WeaponConfig = {
      id: 'iron_sword',
      name: 'Iron Sword',
      type: 'sword',
      handRequirement: 'one-handed',
      stats: {
        damage: 25,
        attackSpeed: 1.2,
        range: 1.5,
        durability: 100,
        weight: 3.0
      },
      swingAnimation: {
        duration: 833,
        phases: {
          windup: 0.25,
          slash: 0.35,
          recovery: 0.40
        },
        rotations: {
          neutral: { x: -0.3, y: 0, z: 0 },
          windup: { x: -0.8, y: -0.4, z: -0.2 },
          slash: { x: 0.4, y: 0.3, z: 0.1 }
        }
      }
    };
    
    super(config);
    console.log('⚔️ [IronSword] Created one-handed iron sword');
  }

  public createMesh(): THREE.Group {
    const swordGroup = new THREE.Group();

    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.1, 1.2, 0.02);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.6, 0);
    blade.castShadow = true;
    swordGroup.add(blade);

    // Guard
    const guardGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.1);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, 0, 0);
    guard.castShadow = true;
    swordGroup.add(guard);

    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.15, 0);
    handle.castShadow = true;
    swordGroup.add(handle);

    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.04, 8, 6);
    const pommelMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.set(0, -0.3, 0);
    pommel.castShadow = true;
    swordGroup.add(pommel);

    return swordGroup;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.2, 1.3, 0.2);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0 
    });
    
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.set(0, 0.65, 0);
    hitBox.visible = false;
    
    return hitBox;
  }

  public getBladeReference(): THREE.Mesh {
    return this.mesh.children.find(child => 
      child instanceof THREE.Mesh && child.position.y > 0.5
    ) as THREE.Mesh;
  }
}
