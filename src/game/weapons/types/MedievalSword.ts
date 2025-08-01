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
      
      // Start from base (handle end) and work toward tip (flipped coordinates)
      bladeShape.moveTo(0, -0.9);      // Sharp tip point (flipped)
      bladeShape.lineTo(0.008, -0.8);  // Very narrow near tip for sharp point
      bladeShape.lineTo(0.015, -0.7);  // Gradually widening
      bladeShape.lineTo(0.03, -0.3);   // Wider section
      bladeShape.lineTo(0.055, 0);     // Much wider at middle (increased from 0.04 to 0.055)
      bladeShape.lineTo(0.03, 0.3);    // Wider narrowing back
      bladeShape.lineTo(0.025, 0.7);   // Getting wider toward base
      bladeShape.lineTo(0.03, 0.9);    // Much wider at base for better handle connection
      bladeShape.lineTo(-0.03, 0.9);   // Mirror wide base
      bladeShape.lineTo(-0.025, 0.7);  // Mirror
      bladeShape.lineTo(-0.03, 0.3);   // Mirror
      bladeShape.lineTo(-0.055, 0);    // Much wider at middle (mirrored)
      bladeShape.lineTo(-0.03, -0.3);  // Mirror
      bladeShape.lineTo(-0.015, -0.7); // Mirror
      bladeShape.lineTo(-0.008, -0.8); // Mirror narrow near tip
      bladeShape.lineTo(0, -0.9);      // Close at sharp tip
      
      // Extrude the shape to create 3D blade with increased thickness
      const extrudeSettings = {
        depth: 0.072, // Increased by 20% from 0.06 to 0.072
        bevelEnabled: false
      };
      
      const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
      
      // Center the geometry and rotate to match original orientation
      bladeGeometry.translate(0, 0, -0.036); // Adjusted for thicker blade (half of 0.072)
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
      
      // Create tapered rectangular crossguard - left side with dual-plane tapering
      // Create a custom tapered rectangular geometry extending outward
      const leftGuardShape = new THREE.Shape();
      leftGuardShape.moveTo(0, -0.025);     // Start at center bottom (reduced from -0.04)
      leftGuardShape.lineTo(-0.15, -0.015); // Intermediate taper (reduced)
      leftGuardShape.lineTo(-0.22, -0.008); // Near sharp tip, narrower (reduced)
      leftGuardShape.lineTo(-0.25, 0);      // Sharp point at tip center
      leftGuardShape.lineTo(-0.22, 0.008);  // Near sharp tip, narrower (top, reduced)
      leftGuardShape.lineTo(-0.15, 0.015);  // Intermediate taper (top, reduced)
      leftGuardShape.lineTo(0, 0.025);      // Back to center top (reduced from 0.04)
      leftGuardShape.lineTo(0, -0.025);     // Close shape
      
      const leftGuardGeometry = new THREE.ExtrudeGeometry(leftGuardShape, {
        depth: 0.05, // Reduced from 0.08 to 0.05
        bevelEnabled: true,
        bevelThickness: 0.005, // Reduced bevel
        bevelSize: 0.005,      // Reduced bevel
        bevelSegments: 3
      });
      
      const guardMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x9A9A9A, // Match original guard color
        shininess: 100,
        specular: 0xffffff,
        map: metalTexture
      });
      
      const leftGuard = new THREE.Mesh(leftGuardGeometry, guardMaterial);
      leftGuard.position.set(0, 0, -0.3); // Center position
      leftGuard.rotation.z = 0; // No rotation needed
      leftGuard.castShadow = true;
      swordGroup.add(leftGuard);

      // Create tapered rectangular crossguard - right side with dual-plane tapering
      const rightGuardShape = new THREE.Shape();
      rightGuardShape.moveTo(0, -0.025);     // Start at center bottom (reduced from -0.04)
      rightGuardShape.lineTo(0.15, -0.015);  // Intermediate taper (reduced)
      rightGuardShape.lineTo(0.22, -0.008);  // Near sharp tip, narrower (reduced)
      rightGuardShape.lineTo(0.25, 0);       // Sharp point at tip center
      rightGuardShape.lineTo(0.22, 0.008);   // Near sharp tip, narrower (top, reduced)
      rightGuardShape.lineTo(0.15, 0.015);   // Intermediate taper (top, reduced)
      rightGuardShape.lineTo(0, 0.025);      // Back to center top (reduced from 0.04)
      rightGuardShape.lineTo(0, -0.025);     // Close shape
      
      const rightGuardGeometry = new THREE.ExtrudeGeometry(rightGuardShape, {
        depth: 0.05, // Reduced from 0.08 to 0.05
        bevelEnabled: true,
        bevelThickness: 0.005, // Reduced bevel
        bevelSize: 0.005,      // Reduced bevel
        bevelSegments: 3
      });
      
      const rightGuard = new THREE.Mesh(rightGuardGeometry, guardMaterial);
      rightGuard.position.set(0, 0, -0.3); // Center position
      rightGuard.rotation.z = 0; // No rotation needed
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