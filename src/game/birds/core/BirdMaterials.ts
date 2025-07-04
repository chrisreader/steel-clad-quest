import * as THREE from 'three';
import { BirdMaterialSet } from './BirdTypes';

export class BirdMaterials {
  public static createCrowMaterials(): BirdMaterialSet {
    const materials: BirdMaterialSet = {
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

    // Add specialized materials
    materials.body = new THREE.MeshPhongMaterial({
      color: 0x0f0f0f,          // Very dark base for crow body
      specular: 0x3a3a5a,       // Purple-blue iridescence
      shininess: 30,
      side: THREE.DoubleSide
    });

    materials.belly = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,          // Slightly lighter belly
      specular: 0x2a2a4a,       // Less iridescence on belly
      shininess: 20,
      side: THREE.DoubleSide
    });

    materials.wingFeather = new THREE.MeshPhongMaterial({
      color: 0x0a0a0a,          // Deeper black for wing feathers
      specular: 0x4a4a7a,       // Strong blue-purple iridescence on wings
      shininess: 35,            // Higher shine for flight feathers
      side: THREE.DoubleSide
    });

    materials.primaryFeather = new THREE.MeshPhongMaterial({
      color: 0x050505,          // Almost black for primary flight feathers
      specular: 0x5a5a8a,       // Strongest iridescence on primary feathers
      shininess: 40,            // Highest shine for primary feathers
      side: THREE.DoubleSide
    });

    return materials;
  }

  public static createTaperedFeatherGeometry(baseWidth: number, tipWidth: number, length: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const thickness = 0.002; // Add slight thickness to make feathers visible from all angles
    
    // Create tapered feather shape with thickness - tips pointing backward (negative X direction)
    const vertices = [
      // Bottom face
      // Base (wider) - at wing bone attachment point
      0, -baseWidth/2, -thickness/2,
      0, baseWidth/2, -thickness/2,
      // Tip (narrower) - extending backward from wing bone
      -length, -tipWidth/2, -thickness/2,
      -length, tipWidth/2, -thickness/2,
      
      // Top face
      // Base (wider) - at wing bone attachment point
      0, -baseWidth/2, thickness/2,
      0, baseWidth/2, thickness/2,
      // Tip (narrower) - extending backward from wing bone
      -length, -tipWidth/2, thickness/2,
      -length, tipWidth/2, thickness/2
    ];
    
    const indices = [
      // Bottom face
      0, 1, 2,  1, 3, 2,
      // Top face  
      4, 6, 5,  5, 6, 7,
      // Front edge
      0, 4, 5,  0, 5, 1,
      // Back edge
      2, 3, 7,  2, 7, 6,
      // Left edge
      0, 2, 6,  0, 6, 4,
      // Right edge
      1, 5, 7,  1, 7, 3
    ];
    
    const uvs = [
      // Bottom face
      0, 0,  0, 1,  1, 0,  1, 1,
      // Top face
      0, 0,  0, 1,  1, 0,  1, 1
    ];
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }
}