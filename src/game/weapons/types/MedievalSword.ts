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
      
      // Create realistic curved crossguard with upward curving tips
      const guardMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x9A9A9A, // Match original guard color
        shininess: 100,
        specular: 0xffffff,
        map: metalTexture
      });
      
      // Left curved guard section
      const leftCurve = new THREE.Group();
      
      // Base section (horizontal)
      const leftBaseGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.08, 8);
      const leftBase = new THREE.Mesh(leftBaseGeometry, guardMaterial);
      leftBase.position.set(-0.06, 0, 0);
      leftBase.rotation.x = Math.PI / 2;
      leftCurve.add(leftBase);
      
      // Middle section (slight upward angle)
      const leftMidGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.06, 8);
      const leftMid = new THREE.Mesh(leftMidGeometry, guardMaterial);
      leftMid.position.set(-0.11, 0.02, 0);
      leftMid.rotation.x = Math.PI / 2;
      leftMid.rotation.z = Math.PI / 8; // 22.5 degree upward angle
      leftCurve.add(leftMid);
      
      // Tip section (curved upward)
      const leftTipGeometry = new THREE.CylinderGeometry(0.015, 0.025, 0.05, 8);
      const leftTip = new THREE.Mesh(leftTipGeometry, guardMaterial);
      leftTip.position.set(-0.15, 0.05, 0);
      leftTip.rotation.x = Math.PI / 2;
      leftTip.rotation.z = Math.PI / 4; // 45 degree upward curve
      leftCurve.add(leftTip);
      
      leftCurve.position.set(0, 0, -0.3);
      leftCurve.castShadow = true;
      swordGroup.add(leftCurve);

      // Right curved guard section (mirror of left)
      const rightCurve = new THREE.Group();
      
      // Base section (horizontal)
      const rightBase = new THREE.Mesh(leftBaseGeometry.clone(), guardMaterial);
      rightBase.position.set(0.06, 0, 0);
      rightBase.rotation.x = Math.PI / 2;
      rightCurve.add(rightBase);
      
      // Middle section (slight upward angle)
      const rightMid = new THREE.Mesh(leftMidGeometry.clone(), guardMaterial);
      rightMid.position.set(0.11, 0.02, 0);
      rightMid.rotation.x = Math.PI / 2;
      rightMid.rotation.z = -Math.PI / 8; // 22.5 degree upward angle (mirrored)
      rightCurve.add(rightMid);
      
      // Tip section (curved upward)
      const rightTip = new THREE.Mesh(leftTipGeometry.clone(), guardMaterial);
      rightTip.position.set(0.15, 0.05, 0);
      rightTip.rotation.x = Math.PI / 2;
      rightTip.rotation.z = -Math.PI / 4; // 45 degree upward curve (mirrored)
      rightCurve.add(rightTip);
      
      rightCurve.position.set(0, 0, -0.3);
      rightCurve.castShadow = true;
      swordGroup.add(rightCurve);
      
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