
import * as THREE from 'three';
import { GrassBladeConfig } from './GrassConfig';

export class GrassGeometry {
  private static geometryCache = new Map<string, THREE.BufferGeometry>();

  public static createGrassBladeGeometry(
    config: GrassBladeConfig,
    heightVariation: number = 1.0,
    isGroundGrass: boolean = false
  ): THREE.BufferGeometry {
    const cacheKey = `${config.species}_${heightVariation.toFixed(2)}_${isGroundGrass}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }

    const { width, segments, curve, taper, species } = config;
    const height = config.height * heightVariation * (isGroundGrass ? 0.85 : 1.0);
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    const shapeModifier = this.getSpeciesShapeModifier(species);
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = height * t;
      
      const bendFactor = Math.sin(t * Math.PI * 0.5) * curve * shapeModifier.curveFactor;
      const bendOffset = bendFactor + (Math.sin(t * Math.PI * 3) * 0.02);
      
      const widthFactor = this.calculateWidthTaper(t, taper, species);
      const currentWidth = width * widthFactor;
      
      const asymmetry = (Math.random() - 0.5) * 0.02;
      
      const leftX = -currentWidth * 0.5 + asymmetry;
      const rightX = currentWidth * 0.5 + asymmetry;
      
      vertices.push(leftX + bendOffset, y, 0);
      vertices.push(rightX + bendOffset, y, 0);
      
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
    
    this.geometryCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  public static createGrassCluster(
    config: GrassBladeConfig, 
    clusterSize: number = 3,
    isGroundGrass: boolean = false
  ): THREE.BufferGeometry {
    const clusterGeometry = new THREE.BufferGeometry();
    const clusterVertices: number[] = [];
    const clusterUVs: number[] = [];
    const clusterIndices: number[] = [];
    const clusterNormals: number[] = [];
    
    let indexOffset = 0;
    
    for (let i = 0; i < clusterSize; i++) {
      const individualHeightVariation = 0.8 + Math.random() * 0.4;
      const bladeConfig = {
        ...config,
        height: config.height * individualHeightVariation,
        width: config.width * (0.9 + Math.random() * 0.2),
        curve: config.curve * (0.8 + Math.random() * 0.4)
      };
      
      const bladeGeometry = this.createGrassBladeGeometry(bladeConfig, 1.0, isGroundGrass);
      const bladeVertices = bladeGeometry.getAttribute('position').array;
      const bladeUVs = bladeGeometry.getAttribute('uv').array;
      const bladeNormals = bladeGeometry.getAttribute('normal').array;
      const bladeIndices = bladeGeometry.getIndex()?.array || [];
      
      const angle = (i / clusterSize) * Math.PI * 2 + Math.random() * 0.5;
      const radius = Math.random() * (isGroundGrass ? 0.04 : 0.1);
      const offsetX = Math.cos(angle) * radius;
      const offsetZ = Math.sin(angle) * radius;
      
      for (let j = 0; j < bladeVertices.length; j += 3) {
        clusterVertices.push(
          bladeVertices[j] + offsetX,
          bladeVertices[j + 1] + (isGroundGrass ? 0.05 : 0),
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
    switch (species) {
      case 'meadow': return { curveFactor: 1.0, taperRate: 0.7 };
      case 'prairie': return { curveFactor: 1.3, taperRate: 0.5 };
      case 'clumping': return { curveFactor: 0.8, taperRate: 0.9 };
      case 'fine': return { curveFactor: 1.1, taperRate: 0.3 };
      default: return { curveFactor: 1.0, taperRate: 0.7 };
    }
  }
  
  private static calculateWidthTaper(t: number, taper: number, species: string): number {
    switch (species) {
      case 'meadow': return 1.0 - (t * t * taper);
      case 'prairie': return 1.0 - (Math.pow(t, 1.5) * taper);
      case 'clumping': return 1.0 - (t * taper * 0.8);
      case 'fine': return 1.0 - (Math.pow(t, 2.5) * taper);
      default: return 1.0 - (t * taper);
    }
  }

  public static getGrassSpecies(): GrassBladeConfig[] {
    return [
      {
        height: 0.3, width: 0.06, segments: 4, curve: 0.2, taper: 0.8, // Reduced height from 0.4
        species: 'fine', color: new THREE.Color(0x6b8f47), clustered: false
      },
      {
        height: 0.45, width: 0.1, segments: 5, curve: 0.3, taper: 0.7, // Reduced height from 0.6
        species: 'meadow', color: new THREE.Color(0x5a8442), clustered: true
      },
      {
        height: 0.5, width: 0.12, segments: 6, curve: 0.4, taper: 0.6, // Reduced height from 0.8
        species: 'prairie', color: new THREE.Color(0x4a7339), clustered: true
      },
      {
        height: 0.25, width: 0.08, segments: 4, curve: 0.15, taper: 0.9, // Reduced height from 0.35
        species: 'clumping', color: new THREE.Color(0x7a9451), clustered: true
      }
    ];
  }

  public static dispose(): void {
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    this.geometryCache.clear();
  }
}
