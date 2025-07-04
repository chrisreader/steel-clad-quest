import * as THREE from 'three';
import { BirdMaterials } from '../core/BirdTypes';

export class BirdMaterialManager {
  public static createCrowMaterials(): BirdMaterials {
    const materials = this.createBaseMaterials();
    this.addBodyGradients(materials);
    this.addWingMaterials(materials);
    return materials;
  }

  private static createBaseMaterials(): BirdMaterials {
    // Create highly realistic crow materials with iridescence and proper coloration
    return {
      feather: new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,        // Natural crow black with slight warmth
        specular: 0x4a4a6a,     // Blue-purple iridescent sheen like real crows
        shininess: 25,          // Higher shininess for feather sheen
        side: THREE.DoubleSide  // Make feathers visible from both sides
      }),
      beak: new THREE.MeshPhongMaterial({
        color: 0x2a2a2a,        // Dark but visible beak
        specular: 0x4a4a4a,     // Subtle shine on beak
        shininess: 40,          // Beaks have natural shine
        emissive: 0x0a0a0a      // Slight emission for visibility
      }),
      eye: new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,        // Dark eye with some depth
        specular: 0xffffff,     // High specular for eye shine
        shininess: 100,         // Very shiny eyes
        emissive: 0x0a0505      // Dark red emission for life-like eyes
      }),
      leg: new THREE.MeshPhongMaterial({
        color: 0x2a2a2a,        // Dark grey crow legs (not brown)
        specular: 0x1a1a1a,     // Minimal shine on legs
        shininess: 15           // Low shininess for scaly texture
      })
    };
  }

  private static addBodyGradients(materials: BirdMaterials): void {
    // Create gradient materials for realistic crow body coloration
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x0f0f0f,          // Very dark base for crow body
      specular: 0x3a3a5a,       // Purple-blue iridescence
      shininess: 30,
      side: THREE.DoubleSide
    });

    const bellyMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,          // Slightly lighter belly
      specular: 0x2a2a4a,       // Less iridescence on belly
      shininess: 20,
      side: THREE.DoubleSide
    });

    // Store gradient materials for body parts
    materials.body = bodyMaterial;
    materials.belly = bellyMaterial;
  }

  private static addWingMaterials(materials: BirdMaterials): void {
    // Create specialized wing materials with realistic iridescence
    const wingFeatherMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a0a0a,          // Deeper black for wing feathers
      specular: 0x4a4a7a,       // Strong blue-purple iridescence on wings
      shininess: 35,            // Higher shine for flight feathers
      side: THREE.DoubleSide
    });

    const primaryFeatherMaterial = new THREE.MeshPhongMaterial({
      color: 0x050505,          // Almost black for primary flight feathers
      specular: 0x5a5a8a,       // Strongest iridescence on primary feathers
      shininess: 40,            // Highest shine for primary feathers
      side: THREE.DoubleSide
    });

    // Store wing materials
    materials.wingFeather = wingFeatherMaterial;
    materials.primaryFeather = primaryFeatherMaterial;
  }
}