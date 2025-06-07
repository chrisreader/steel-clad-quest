import * as THREE from 'three';

export interface EnhancedGrassBladeConfig {
  height: number;
  width: number;
  segments: number;
  curve: number;
  taper: number;
  species: 'meadow' | 'prairie' | 'clumping' | 'fine';
  color: THREE.Color;
  clustered: boolean;
}

export class EnhancedGrassGeometry {
  // Enhanced grass blade creation with more realistic shapes
  public static createRealisticGrassBladeGeometry(
    config: EnhancedGrassBladeConfig,
    heightVariation: number = 1.0
  ): THREE.BufferGeometry {
    const { width, segments, curve, taper, species } = config;
    const height = config.height * heightVariation; // Apply height variation
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    // Species-specific shape modifications
    const shapeModifier = this.getSpeciesShapeModifier(species);
    
    // Create curved grass blade with realistic tapering
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = height * t;
      
      // Enhanced curve with species variation
      const bendFactor = Math.sin(t * Math.PI * 0.5) * curve * shapeModifier.curveFactor;
      const bendOffset = bendFactor + (Math.sin(t * Math.PI * 3) * 0.02); // Add micro-curves
      
      // Realistic width tapering
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
      
      // Create triangles
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
  
  // Create clustered grass for natural clumping
  public static createGrassCluster(
    config: EnhancedGrassBladeConfig, 
    clusterSize: number = 3,
    heightVariation: number = 1.0
  ): THREE.BufferGeometry {
    const clusterGeometry = new THREE.BufferGeometry();
    const clusterVertices: number[] = [];
    const clusterUVs: number[] = [];
    const clusterIndices: number[] = [];
    const clusterNormals: number[] = [];
    
    let indexOffset = 0;
    
    for (let i = 0; i < clusterSize; i++) {
      // Vary each blade in the cluster with additional height variation
      const individualHeightVariation = heightVariation * (0.8 + Math.random() * 0.4);
      const bladeConfig = {
        ...config,
        height: config.height * individualHeightVariation,
        width: config.width * (0.9 + Math.random() * 0.2),
        curve: config.curve * (0.8 + Math.random() * 0.4)
      };
      
      const bladeGeometry = this.createRealisticGrassBladeGeometry(bladeConfig, 1.0);
      const bladeVertices = bladeGeometry.getAttribute('position').array;
      const bladeUVs = bladeGeometry.getAttribute('uv').array;
      const bladeNormals = bladeGeometry.getAttribute('normal').array;
      const bladeIndices = bladeGeometry.getIndex()?.array || [];
      
      // Position blade within cluster
      const angle = (i / clusterSize) * Math.PI * 2 + Math.random() * 0.5;
      const radius = Math.random() * 0.1;
      const offsetX = Math.cos(angle) * radius;
      const offsetZ = Math.sin(angle) * radius;
      
      // Add transformed vertices
      for (let j = 0; j < bladeVertices.length; j += 3) {
        clusterVertices.push(
          bladeVertices[j] + offsetX,
          bladeVertices[j + 1],
          bladeVertices[j + 2] + offsetZ
        );
      }
      
      // Add UVs and normals
      for (let j = 0; j < bladeUVs.length; j++) {
        clusterUVs.push(bladeUVs[j]);
      }
      
      for (let j = 0; j < bladeNormals.length; j++) {
        clusterNormals.push(bladeNormals[j]);
      }
      
      // Add adjusted indices
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
    // Different tapering patterns for different species
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
  
  // Get enhanced grass species with biome-aware configurations
  public static getEnhancedGrassSpeciesForBiome(biomeType: string): EnhancedGrassBladeConfig[] {
    const baseSpecies = this.getEnhancedGrassSpecies();
    
    // Apply biome-specific modifications
    return baseSpecies.map(species => {
      const modified = { ...species };
      
      if (biomeType === 'normal') {
        // Shorter prairie grass, more clumping
        if (species.species === 'prairie') {
          modified.height = 0.5; // Reduced from 0.8
        }
      } else if (biomeType === 'meadow') {
        // Slightly taller and lusher
        modified.height *= 1.1;
        if (species.species === 'meadow' || species.species === 'fine') {
          modified.color = modified.color.clone().multiplyScalar(1.05);
        }
      } else if (biomeType === 'prairie') {
        // Taller grass, especially prairie species
        if (species.species === 'prairie') {
          modified.height *= 1.3;
        }
        modified.curve *= 1.2; // More wind exposure
      }
      
      return modified;
    });
  }
  
  // Get enhanced grass species with realistic variations
  public static getEnhancedGrassSpecies(): EnhancedGrassBladeConfig[] {
    return [
      {
        height: 0.4,
        width: 0.08,
        segments: 4,
        curve: 0.2,
        taper: 0.8,
        species: 'fine',
        color: new THREE.Color(0x6b8f47),
        clustered: false
      },
      {
        height: 0.6,
        width: 0.12,
        segments: 5,
        curve: 0.3,
        taper: 0.7,
        species: 'meadow',
        color: new THREE.Color(0x5a8442),
        clustered: true
      },
      {
        height: 0.8,
        width: 0.15,
        segments: 6,
        curve: 0.4,
        taper: 0.6,
        species: 'prairie',
        color: new THREE.Color(0x4a7339),
        clustered: true
      },
      {
        height: 0.35,
        width: 0.1,
        segments: 4,
        curve: 0.15,
        taper: 0.9,
        species: 'clumping',
        color: new THREE.Color(0x7a9451),
        clustered: true
      }
    ];
  }
}
