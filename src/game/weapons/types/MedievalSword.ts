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
    
    // Find and remove the existing rectangular cross guard
    const existingGuardIndex = swordGroup.children.findIndex(child => 
      child instanceof THREE.Mesh && 
      child.geometry instanceof THREE.BoxGeometry &&
      child.position.z === -0.3
    );
    
    if (existingGuardIndex !== -1) {
      // Remove the old rectangular guard
      const oldGuard = swordGroup.children[existingGuardIndex];
      swordGroup.remove(oldGuard);
      
      // Create realistic curved crossguard with single tapered pieces
      const guardMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x9A9A9A, // Match original guard color
        shininess: 100,
        specular: 0xffffff,
        map: metalTexture
      });
      
      // Left tapered guard - single piece curving upward
      const leftGuardGeometry = new THREE.ConeGeometry(0.02, 0.2, 8);
      const leftGuard = new THREE.Mesh(leftGuardGeometry, guardMaterial);
      leftGuard.position.set(-0.1, 0.03, -0.3);
      leftGuard.rotation.z = Math.PI / 2 + Math.PI / 8; // Horizontal + 22.5° upward tilt
      leftGuard.castShadow = true;
      swordGroup.add(leftGuard);

      // Right tapered guard - single piece curving upward (mirrored)
      const rightGuard = new THREE.Mesh(leftGuardGeometry.clone(), guardMaterial);
      rightGuard.position.set(0.1, 0.03, -0.3);
      rightGuard.rotation.z = -Math.PI / 2 - Math.PI / 8; // Horizontal + 22.5° upward tilt (mirrored)
      rightGuard.castShadow = true;
      swordGroup.add(rightGuard);
      
      // Small center piece to connect the tapered ends
      const centerGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8);
      const centerGuard = new THREE.Mesh(centerGeometry, guardMaterial);
      centerGuard.position.set(0, 0, -0.3);
      centerGuard.rotation.x = Math.PI / 2;
      centerGuard.castShadow = true;
      swordGroup.add(centerGuard);
    }

    this.mesh = swordGroup;
    return swordGroup;
  }
}