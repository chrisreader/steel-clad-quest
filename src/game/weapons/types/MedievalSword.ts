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
        damage: 30, // 2x steel sword damage (15 * 2)
        attackSpeed: 0.9, // Same as steel sword for identical combat timing
        range: 2.2, // Same as steel sword for identical reach
        durability: 150, // Same as steel sword for identical durability
        weight: 4.0 // Same as steel sword for identical weight
      }
    };
    
    super(config);
  }

  public createMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    swordGroup.rotation.order = 'XYZ';

    const metalTexture = TextureGenerator.createMetalTexture();
    const woodTexture = TextureGenerator.createWoodTexture();

    // Handle - similar to base sword
    const handleGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 12);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513, // Darker brown for premium look
      shininess: 40,
      map: woodTexture,
      normalScale: new THREE.Vector2(0.3, 0.3)
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0);
    handle.rotation.x = Math.PI / 2;
    handle.castShadow = true;
    swordGroup.add(handle);

    // Enhanced Cross Guard - tapered with pointed ends
    const guardCenterGeometry = new THREE.BoxGeometry(0.2, 0.08, 0.08);
    const guardCenter = new THREE.Mesh(guardCenterGeometry, new THREE.MeshPhongMaterial({ 
      color: 0xC0C0C0, // Bright silver
      shininess: 120,
      specular: 0xffffff,
      map: metalTexture
    }));
    guardCenter.position.set(0, 0, -0.3);
    guardCenter.castShadow = true;
    swordGroup.add(guardCenter);

    // Tapered guard ends (pointed)
    const guardEndGeometry = new THREE.ConeGeometry(0.04, 0.12, 8);
    
    // Left tapered end
    const guardLeftEnd = new THREE.Mesh(guardEndGeometry, new THREE.MeshPhongMaterial({ 
      color: 0xC0C0C0,
      shininess: 120,
      specular: 0xffffff,
      map: metalTexture
    }));
    guardLeftEnd.position.set(-0.16, 0, -0.3);
    guardLeftEnd.rotation.z = -Math.PI / 2; // Point left
    guardLeftEnd.castShadow = true;
    swordGroup.add(guardLeftEnd);

    // Right tapered end
    const guardRightEnd = new THREE.Mesh(guardEndGeometry, new THREE.MeshPhongMaterial({ 
      color: 0xC0C0C0,
      shininess: 120,
      specular: 0xffffff,
      map: metalTexture
    }));
    guardRightEnd.position.set(0.16, 0, -0.3);
    guardRightEnd.rotation.z = Math.PI / 2; // Point right
    guardRightEnd.castShadow = true;
    swordGroup.add(guardRightEnd);

    // Medieval Tapered Blade - wider at base, tapering to sharp point
    const bladeGeometry = new THREE.ConeGeometry(0.025, 1.8, 8); // Tapered from base to point
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xF8F8FF, // Bright silver-white
      shininess: 180,
      specular: 0xffffff,
      reflectivity: 0.9,
      map: metalTexture
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0, -1.2);
    blade.rotation.x = Math.PI; // Point the cone tip forward
    blade.castShadow = true;
    swordGroup.add(blade);

    // Fuller (blood groove) - decorative groove down the blade
    const fullerGeometry = new THREE.BoxGeometry(0.01, 0.005, 1.4);
    const fullerMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xE6E6FA,
      shininess: 100
    });
    const fuller = new THREE.Mesh(fullerGeometry, fullerMaterial);
    fuller.position.set(0, 0.012, -1.0); // Slightly above blade surface
    fuller.castShadow = true;
    swordGroup.add(fuller);

    // Enhanced Pommel - more ornate
    const pommelGeometry = new THREE.SphereGeometry(0.07, 12, 8);
    const pommelMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      shininess: 100,
      map: woodTexture
    });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.set(0, 0, 0.3);
    pommel.castShadow = true;
    swordGroup.add(pommel);

    // Pommel decoration
    const pommelCapGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
    const pommelCap = new THREE.Mesh(pommelCapGeometry, new THREE.MeshPhongMaterial({ 
      color: 0xFFD700, // Gold accent
      shininess: 150
    }));
    pommelCap.position.set(0, 0, 0.36);
    pommelCap.rotation.x = Math.PI / 2;
    pommelCap.castShadow = true;
    swordGroup.add(pommelCap);

    // Same positioning as base sword
    swordGroup.position.set(0, -0.2, -0.3);
    swordGroup.rotation.x = -Math.PI / 6;

    this.mesh = swordGroup;
    return swordGroup;
  }
}