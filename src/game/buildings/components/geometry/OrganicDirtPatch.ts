
import * as THREE from 'three';
import { DirtTextureGenerator } from '../textures/DirtTextureGenerator';

export class OrganicDirtPatch {
  static create(): THREE.Mesh {
    // Create irregular, organic dirt patch geometry
    const vertices: THREE.Vector3[] = [];
    const baseRadius = 1.5;
    const vertexCount = 12; // More vertices for smoother organic shape
    
    // Generate irregular vertices in a rough circle with random variations
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      
      // Add randomness to radius (0.7 to 1.3 times base radius)
      const radiusVariation = baseRadius * (0.7 + Math.random() * 0.6);
      
      // Add angular offset for more organic shape
      const angleOffset = (Math.random() - 0.5) * 0.4;
      const finalAngle = angle + angleOffset;
      
      const x = Math.cos(finalAngle) * radiusVariation;
      const z = Math.sin(finalAngle) * radiusVariation;
      
      // Add slight height variation for uneven ground
      const y = (Math.random() - 0.5) * 0.03;
      
      vertices.push(new THREE.Vector3(x, y, z));
    }
    
    // Create geometry from vertices using triangulation
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    
    // Add center vertex for triangulation
    const centerY = (Math.random() - 0.5) * 0.02;
    vertices.push(new THREE.Vector3(0, centerY, 0));
    const centerIndex = vertices.length - 1;
    
    // Convert vertices to position array
    for (const vertex of vertices) {
      positions.push(vertex.x, vertex.y, vertex.z);
    }
    
    // Create triangular faces from center to edge vertices
    for (let i = 0; i < vertexCount; i++) {
      const next = (i + 1) % vertexCount;
      
      // Triangle from center to edge
      indices.push(centerIndex, i, next);
    }
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    // Create realistic dirt material
    const dirtMaterial = new THREE.MeshLambertMaterial({
      color: 0x4A3728, // Dark brown earth color
      map: DirtTextureGenerator.createDirtTexture()
    });

    const dirtPatch = new THREE.Mesh(geometry, dirtMaterial);
    dirtPatch.position.set(0, 0.01, 0); // Slightly above ground
    dirtPatch.castShadow = false;
    dirtPatch.receiveShadow = true;

    console.log('🏗️ Organic dirt patch base created with irregular shape');
    return dirtPatch;
  }
}
