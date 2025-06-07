
import * as THREE from 'three';
import { EnhancedGrassBladeConfig } from './EnhancedGrassGeometry';

export class GroundGrassGeometry {
  // Create simplified ground grass geometry for dense carpet coverage
  public static createGroundGrassBladeGeometry(
    config: EnhancedGrassBladeConfig,
    heightReduction: number = 0.25
  ): THREE.BufferGeometry {
    const { width, curve, taper, species } = config;
    const height = config.height * heightReduction; // Much shorter for ground coverage
    const segments = 2; // Simplified geometry for performance
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    // Create very short, simple grass blade
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = height * t;
      
      // Minimal curve for ground grass
      const bendFactor = Math.sin(t * Math.PI * 0.5) * curve * 0.3; // Reduced curve
      
      // Linear width tapering for simplicity
      const widthFactor = 1.0 - (t * taper * 0.8);
      const currentWidth = width * widthFactor * 0.8; // Slightly narrower
      
      const leftX = -currentWidth * 0.5;
      const rightX = currentWidth * 0.5;
      
      vertices.push(leftX + bendFactor, y, 0);
      vertices.push(rightX + bendFactor, y, 0);
      
      uvs.push(0, t);
      uvs.push(1, t);
      
      const normal = new THREE.Vector3(0, 0, 1);
      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);
      
      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    return geometry;
  }
  
  // Create dense ground grass cluster for carpet effect
  public static createGroundGrassCluster(
    config: EnhancedGrassBladeConfig, 
    clusterSize: number = 5,
    heightReduction: number = 0.25
  ): THREE.BufferGeometry {
    const clusterGeometry = new THREE.BufferGeometry();
    const clusterVertices: number[] = [];
    const clusterUVs: number[] = [];
    const clusterIndices: number[] = [];
    const clusterNormals: number[] = [];
    
    let indexOffset = 0;
    
    for (let i = 0; i < clusterSize; i++) {
      const bladeConfig = {
        ...config,
        height: config.height * heightReduction * (0.9 + Math.random() * 0.2),
        width: config.width * (0.8 + Math.random() * 0.3),
        curve: config.curve * 0.5 // Less curve for ground grass
      };
      
      const bladeGeometry = this.createGroundGrassBladeGeometry(bladeConfig, 1.0);
      const bladeVertices = bladeGeometry.getAttribute('position').array;
      const bladeUVs = bladeGeometry.getAttribute('uv').array;
      const bladeNormals = bladeGeometry.getAttribute('normal').array;
      const bladeIndices = bladeGeometry.getIndex()?.array || [];
      
      // Tighter clustering for ground coverage
      const angle = (i / clusterSize) * Math.PI * 2 + Math.random() * 0.3;
      const radius = Math.random() * 0.05; // Smaller radius for denser clusters
      const offsetX = Math.cos(angle) * radius;
      const offsetZ = Math.sin(angle) * radius;
      
      for (let j = 0; j < bladeVertices.length; j += 3) {
        clusterVertices.push(
          bladeVertices[j] + offsetX,
          bladeVertices[j + 1] + 0.01, // Slightly above ground to avoid z-fighting
          bladeVertices[j + 2] + offsetZ
        );
      }
      
      for (let j = 0; j < bladeUVs.length; j++) {
        clusterUVs.push(bladeUVs[j]);
      }
      
      for (let j = 0; j < bladeNormals.length; j++) {
        clusterNormals.push(bladeNormals[j]);
      }
      
      for (let j = 0; j < bladeIndices.length; j++) {
        clusterIndices.push(bladeIndices[j] + indexOffset);
      }
      
      indexOffset += bladeVertices.length / 3;
    }
    
    clusterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(clusterVertices, 3));
    clusterGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(clusterUVs, 2));
    clusterGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(clusterNormals, 3));
    clusterGeometry.setIndex(clusterIndices);
    
    return clusterGeometry;
  }
  
  // Get ground grass species configurations for each biome
  public static getGroundGrassSpeciesForBiome(biomeType: string): EnhancedGrassBladeConfig[] {
    const baseSpecies = [
      {
        height: 0.1, // Very short for ground coverage
        width: 0.06,
        segments: 2,
        curve: 0.1,
        taper: 0.6,
        species: 'fine' as const,
        color: new THREE.Color(0x6b8f47),
        clustered: true
      },
      {
        height: 0.15,
        width: 0.08,
        segments: 2,
        curve: 0.15,
        taper: 0.7,
        species: 'meadow' as const,
        color: new THREE.Color(0x5a8442),
        clustered: true
      },
      {
        height: 0.12,
        width: 0.07,
        segments: 2,
        curve: 0.2,
        taper: 0.5,
        species: 'prairie' as const,
        color: new THREE.Color(0x4a7339),
        clustered: true
      },
      {
        height: 0.08,
        width: 0.05,
        segments: 2,
        curve: 0.05,
        taper: 0.8,
        species: 'clumping' as const,
        color: new THREE.Color(0x7a9451),
        clustered: true
      }
    ];
    
    // Apply biome-specific height adjustments
    return baseSpecies.map(species => {
      const modified = { ...species };
      
      if (biomeType === 'normal') {
        // Emphasize clumping grass in normal biome
        if (species.species === 'clumping') {
          modified.height *= 1.2;
        }
      } else if (biomeType === 'meadow') {
        // Slightly taller ground coverage in meadow
        modified.height *= 1.1;
        modified.color = modified.color.clone().multiplyScalar(1.05);
      } else if (biomeType === 'prairie') {
        // Prairie ground grass slightly more varied
        if (species.species === 'prairie') {
          modified.height *= 1.15;
        }
      }
      
      return modified;
    });
  }
}
