import * as THREE from 'three';
import { Sword } from '../Sword';
import { WeaponConfig } from '../BaseWeapon';
import { TextureGenerator } from '../../utils/graphics/TextureGenerator';

export class MedievalSword extends Sword {
  constructor() {
    const config: WeaponConfig = {
      id: 'medieval_sword',
      name: 'Medieval Sword',
      type: 'sword',
      handRequirement: 'one-handed',
      stats: {
        damage: 30, // 2x steel sword damage
        attackSpeed: 0.9, // Identical to steel sword
        range: 2.2, // Identical to steel sword
        durability: 150, // Identical to steel sword
        weight: 4.0 // Identical to steel sword
      }
    };
    
    super(config);
  }

  public createMesh(): THREE.Group {
    // Get the standard sword appearance first
    const swordGroup = super.createMesh();
    
    const metalTexture = TextureGenerator.createMetalTexture();
    
    // Find the existing cross guard to add pointed tips
    const existingGuard = swordGroup.children.find(child => 
      child instanceof THREE.Mesh && 
      child.geometry instanceof THREE.BoxGeometry &&
      child.position.z === -0.3
    ) as THREE.Mesh;
    
    if (existingGuard) {
      // Add pointed tips to the existing guard
      const guardEndGeometry = new THREE.ConeGeometry(0.04, 0.12, 8);
      const guardEndMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x9A9A9A, // Match existing guard color
        shininess: 100,
        specular: 0xffffff,
        map: metalTexture
      });
      
      // Left pointed tip
      const guardLeftEnd = new THREE.Mesh(guardEndGeometry, guardEndMaterial);
      guardLeftEnd.position.set(-0.15, 0, -0.3);
      guardLeftEnd.rotation.z = -Math.PI / 2; // Point left
      guardLeftEnd.castShadow = true;
      swordGroup.add(guardLeftEnd);

      // Right pointed tip
      const guardRightEnd = new THREE.Mesh(guardEndGeometry, guardEndMaterial);
      guardRightEnd.position.set(0.15, 0, -0.3);
      guardRightEnd.rotation.z = Math.PI / 2; // Point right
      guardRightEnd.castShadow = true;
      swordGroup.add(guardRightEnd);
    }

    this.mesh = swordGroup;
    return swordGroup;
  }
}