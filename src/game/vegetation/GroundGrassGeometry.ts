
import * as THREE from 'three';
import { EnhancedGrassBladeConfig } from './EnhancedGrassGeometry';

export class GroundGrassGeometry {
  // Create realistic ground grass geometry using the same sophisticated geometry as regular grass
  public static createGroundGrassBladeGeometry(
    config: EnhancedGrassBladeConfig,
    heightReduction: number = 0.85 // 15% shorter (85% of original height)
  ): THREE.BufferGeometry {
    const { width, segments, curve, taper, species } = config;
    const height = config.height * heightReduction;
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    // Use same sophisticated geometry as regular grass but shorter
    const shapeModifier = this.getSpeciesShapeModifier(species);
    
    // Create realistic curved grass blade with species variation
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = height * t;
      
      // Same curve calculation as regular grass but proportionally scaled
      const bendFactor = Math.sin(t * Math.PI * 0.5) * curve * shapeModifier.curveFactor;
      const bendOffset = bendFactor + (Math.sin(t * Math.PI * 3) * 0.02); // Add micro-curves
      
      // Realistic width tapering using same method as regular grass
      const widthFactor = this.calculateWidthTaper(t, taper, species);
      const currentWidth = width * widthFactor;
      
      // Add subtle asymmetry for natural look
      const asymmetry = (Math.random() - 0.5) * 0.02;
      
      const leftX = -currentWidth * 0.5 + asymmetry;
      const rightX = currentWidth * 0.5 + asymmetry;
      
      vertices.push(leftX + bendOffset, y, 0);
      vertices.push(rightX + bendOffset, y, 0);
      
      // Enhanced UV mapping for better texturing
      uvs.push(0, t);
      uvs.push(1, t);
      
      // Calculate normals for better lighting
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
    clusterSize: number = 7, // Increased from 5 for denser coverage
    heightReduction: number = 0.85
  ): THREE.BufferGeometry {
    const clusterGeometry = new THREE.BufferGeometry();
    const clusterVertices: number[] = [];
    const clusterUVs: number[] = [];
    const clusterIndices: number[] = [];
    const clusterNormals: number[] = [];
    
    let indexOffset = 0;
    
    for (let i = 0; i < clusterSize; i++) {
      // Vary each blade in the cluster with more realistic height variation
      const individualHeightVariation = heightReduction * (0.9 + Math.random() * 0.2);
      const bladeConfig = {
        ...config,
        height: config.height * individualHeightVariation,
        width: config.width * (0.9 + Math.random() * 0.2),
        curve: config.curve * (0.8 + Math.random() * 0.4)
      };
      
      const bladeGeometry = this.createGroundGrassBladeGeometry(bladeConfig, 1.0);
      const bladeVertices = bladeGeometry.getAttribute('position').array;
      const bladeUVs = bladeGeometry.getAttribute('uv').array;
      const bladeNormals = bladeGeometry.getAttribute('normal').array;
      const bladeIndices = bladeGeometry.getIndex()?.array || [];
      
      // Tighter clustering for denser ground coverage
      const angle = (i / clusterSize) * Math.PI * 2 + Math.random() * 0.3;
      const radius = Math.random() * 0.04; // Slightly smaller radius for tighter clusters
      const offsetX = Math.cos(angle) * radius;
      const offsetZ = Math.sin(angle) * radius;
      
      for (let j = 0; j < bladeVertices.length; j += 3) {
        clusterVertices.push(
          bladeVertices[j] + offsetX,
          bladeVertices[j + 1] + 0.05, // Positioned at y=0.05 to stand properly
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
  
  private static getSpeciesShapeModifier(species: string) {
    // Same shape modifiers as regular grass for consistency
    switch (species) {
      case 'meadow':
        return { curveFactor: 1.0, taperRate: 0.7 };
      case 'prairie':
        return { curveFactor: 1.3, taperRate: 0.5 };
      case 'clumping':
        return { curveFactor: 0.8, taperRate: 0.9 };
      case 'fine':
        return { curveFactor: 1.1, taperRate: 0.3 };
      default:
        return { curveFactor: 1.0, taperRate: 0.7 };
    }
  }
  
  private static calculateWidthTaper(t: number, taper: number, species: string): number {
    // Same tapering patterns as regular grass for consistency
    switch (species) {
      case 'meadow':
        return 1.0 - (t * t * taper); // Quadratic taper
      case 'prairie':
        return 1.0 - (Math.pow(t, 1.5) * taper); // Gentle taper
      case 'clumping':
        return 1.0 - (t * taper * 0.8); // Linear taper, less aggressive
      case 'fine':
        return 1.0 - (Math.pow(t, 2.5) * taper); // Sharp taper
      default:
        return 1.0 - (t * taper);
    }
  }
  
  // Get ground grass species configurations for each biome with realistic heights
  public static getGroundGrassSpeciesForBiome(biomeType: string): EnhancedGrassBladeConfig[] {
    const baseSpecies = [
      {
        height: 0.34, // 15% shorter than regular fine grass (0.4 * 0.85)
        width: 0.06,
        segments: 4, // Same as regular grass for realistic geometry
        curve: 0.2,
        taper: 0.8,
        species: 'fine' as const,
        color: new THREE.Color(0x6b8f47),
        clustered: true
      },
      {
        height: 0.51, // 15% shorter than regular meadow grass (0.6 * 0.85)
        width: 0.08,
        segments: 5,
        curve: 0.3,
        taper: 0.7,
        species: 'meadow' as const,
        color: new THREE.Color(0x5a8442),
        clustered: true
      },
      {
        height: 0.68, // 15% shorter than regular prairie grass (0.8 * 0.85)
        width: 0.10,
        segments: 6,
        curve: 0.4,
        taper: 0.6,
        species: 'prairie' as const,
        color: new THREE.Color(0x4a7339),
        clustered: true
      },
      {
        height: 0.30, // 15% shorter than regular clumping grass (0.35 * 0.85)
        width: 0.07,
        segments: 4,
        curve: 0.15,
        taper: 0.9,
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
        modified.color = modified.color.clone().multiplyScalar(0.9); // Slightly darker for ground
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
