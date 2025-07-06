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
    
    // Find and remove the existing blade (positioned at -1.2)
    const existingBladeIndex = swordGroup.children.findIndex(child => 
      child instanceof THREE.Mesh && 
      child.position.z === -1.2
    );
    
    if (existingBladeIndex !== -1) {
      // Remove the old blade but keep its material
      const oldBlade = swordGroup.children[existingBladeIndex] as THREE.Mesh;
      const bladeMaterial = oldBlade.material;
      swordGroup.remove(oldBlade);
      
      // Create tapered blade shape - designed to match original blade dimensions
      const bladeShape = new THREE.Shape();
      
      // Start from tip and work toward handle (Z goes from -0.9 to +0.9 for total length 1.8)
      bladeShape.moveTo(0, 0.9);      // Tip point
      bladeShape.lineTo(0.01, 0.7);   // Narrow near tip
      bladeShape.lineTo(0.02, 0.3);   // Widening
      bladeShape.lineTo(0.025, 0);    // Widest at middle
      bladeShape.lineTo(0.02, -0.3);  // Narrowing back
      bladeShape.lineTo(0.015, -0.7); // Getting narrow
      bladeShape.lineTo(0.01, -0.9);  // Narrow at base (near handle)
      bladeShape.lineTo(-0.01, -0.9); // Mirror to other side
      bladeShape.lineTo(-0.015, -0.7);
      bladeShape.lineTo(-0.02, -0.3);
      bladeShape.lineTo(-0.025, 0);   // Widest at middle
      bladeShape.lineTo(-0.02, 0.3);
      bladeShape.lineTo(-0.01, 0.7);
      bladeShape.lineTo(0, 0.9);      // Close at tip
      
      // Extrude the shape to create 3D blade with same thickness as original (0.02)
      const extrudeSettings = {
        depth: 0.02,
        bevelEnabled: false
      };
      
      const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
      
      // Center the geometry and rotate to match original orientation
      bladeGeometry.translate(0, 0, -0.01);
      bladeGeometry.rotateX(Math.PI / 2); // Rotate to match original blade orientation
      
      const taperedBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      taperedBlade.position.set(0, 0, -1.2); // Same position as original blade
      taperedBlade.castShadow = true;
      swordGroup.add(taperedBlade);
      
      // CRITICAL: Store blade reference for animation system
      this.bladeMesh = taperedBlade;
    }
    
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
      
      // Create tapered crossguard - left side (tapered outward)
      const leftGuardGeometry = new THREE.ConeGeometry(0.05, 0.25, 8); // Bigger cone
      const guardMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x9A9A9A, // Match original guard color
        shininess: 100,
        specular: 0xffffff,
        map: metalTexture
      });
      
      const leftGuard = new THREE.Mesh(leftGuardGeometry, guardMaterial);
      leftGuard.position.set(-0.125, 0, -0.3); // Further apart
      leftGuard.rotation.z = Math.PI / 2; // Point outward left
      leftGuard.castShadow = true;
      swordGroup.add(leftGuard);

      // Create tapered crossguard - right side (tapered outward)
      const rightGuard = new THREE.Mesh(leftGuardGeometry.clone(), guardMaterial);
      rightGuard.position.set(0.125, 0, -0.3); // Further apart
      rightGuard.rotation.z = -Math.PI / 2; // Point outward right
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