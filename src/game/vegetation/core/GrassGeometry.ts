
import * as THREE from 'three';
import { GrassBladeConfig } from './GrassConfig';

export class GrassGeometry {
  private static geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  
  public static getGrassSpecies(species: string): GrassBladeConfig {
    const configs: Record<string, GrassBladeConfig> = {
      meadow: {
        height: 1.0,
        width: 0.15,
        segments: 5,
        curve: 0.3,
        taper: 0.8,
        species: 'meadow',
        color: new THREE.Color(0x2d5016),
        clustered: false
      },
      prairie: {
        height: 0.8,
        width: 0.1,
        segments: 4,
        curve: 0.2,
        taper: 0.9,
        species: 'prairie',
        color: new THREE.Color(0x4a6741),
        clustered: false
      },
      clumping: {
        height: 1.2,
        width: 0.2,
        segments: 6,
        curve: 0.4,
        taper: 0.7,
        species: 'clumping',
        color: new THREE.Color(0x1a3d0a),
        clustered: true
      },
      fine: {
        height: 0.6,
        width: 0.08,
        segments: 3,
        curve: 0.1,
        taper: 0.95,
        species: 'fine',
        color: new THREE.Color(0x3d5f2a),
        clustered: false
      },
      wildflower: {
        height: 0.9,
        width: 0.12,
        segments: 4,
        curve: 0.25,
        taper: 0.85,
        species: 'wildflower',
        color: new THREE.Color(0x2a4d1a),
        clustered: false
      },
      thicket: {
        height: 2.0,
        width: 0.35,
        segments: 8,
        curve: 0.15,
        taper: 0.6,
        species: 'thicket',
        color: new THREE.Color(0x1a3308),
        clustered: true
      },
      golden: {
        height: 0.5,
        width: 0.1,
        segments: 3,
        curve: 0.1,
        taper: 0.9,
        species: 'golden',
        color: new THREE.Color(0x8b7355),
        clustered: false
      }
    };

    return configs[species] || configs.meadow;
  }

  public static createGrassCluster(
    position: THREE.Vector3,
    species: string,
    config?: Partial<GrassBladeConfig>
  ): THREE.Group {
    const group = new THREE.Group();
    const baseConfig = this.getGrassSpecies(species);
    const finalConfig = { ...baseConfig, ...config };
    
    // Create base grass geometry
    const geometry = this.createSingleGrassBlade(finalConfig);
    const material = new THREE.MeshLambertMaterial({ 
      color: finalConfig.color,
      side: THREE.DoubleSide 
    });
    
    // Create cluster based on species - NO RECURSIVE CALLS
    let clusterSize = finalConfig.clustered ? 5 : 3;
    let spread = finalConfig.clustered ? 0.3 : 0.2;
    
    // Species-specific adjustments without calling other methods
    if (species === 'thicket') {
      clusterSize = 7;
      spread = 0.4;
    } else if (species === 'golden') {
      clusterSize = 4;
      spread = 0.15;
    } else if (species === 'wildflower') {
      clusterSize = 6;
      spread = 0.25;
    }
    
    for (let i = 0; i < clusterSize; i++) {
      const blade = new THREE.Mesh(geometry, material);
      
      // Position within cluster
      const angle = (Math.PI * 2 * i) / clusterSize;
      const radius = Math.random() * spread;
      blade.position.set(
        position.x + Math.cos(angle) * radius,
        position.y,
        position.z + Math.sin(angle) * radius
      );
      
      // Random rotation
      blade.rotation.y = Math.random() * Math.PI * 2;
      
      // Scale variation
      const scaleVariation = 0.8 + Math.random() * 0.4;
      blade.scale.set(scaleVariation, scaleVariation, scaleVariation);
      
      group.add(blade);
    }
    
    // Add flowers only for wildflower species
    if (species === 'wildflower' && Math.random() < 0.3) {
      const flowerGeometry = new THREE.SphereGeometry(0.02, 6, 6);
      const flowerColors = [0xff6b9d, 0x87ceeb, 0xffd700, 0xff6347];
      const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const flowerMaterial = new THREE.MeshLambertMaterial({ color: flowerColor });
      
      for (let i = 0; i < 2; i++) {
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.set(
          position.x + (Math.random() - 0.5) * 0.4,
          position.y + 0.3 + Math.random() * 0.3,
          position.z + (Math.random() - 0.5) * 0.4
        );
        group.add(flower);
      }
    }
    
    return group;
  }

  public static createSingleGrassBlade(config: GrassBladeConfig): THREE.BufferGeometry {
    const cacheKey = `${config.species}_${config.height}_${config.width}_${config.segments}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }
    
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // Create blade vertices
    for (let i = 0; i <= config.segments; i++) {
      const t = i / config.segments;
      const height = config.height * t;
      const width = config.width * (1 - config.taper * t);
      
      // Apply curve
      const curve = Math.sin(t * Math.PI * 0.5) * config.curve;
      
      // Left vertex
      vertices.push(-width / 2, height, curve);
      uvs.push(0, t);
      
      // Right vertex
      vertices.push(width / 2, height, curve);
      uvs.push(1, t);
      
      // Create faces (except for last segment)
      if (i < config.segments) {
        const baseIndex = i * 2;
        
        // Triangle 1
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        // Triangle 2
        indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    this.geometryCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  // Simplified specialized creation methods that just call createGrassCluster with configs
  public static createWildflowerCluster(position: THREE.Vector3): THREE.Group {
    return this.createGrassCluster(position, 'wildflower');
  }
  
  public static createThicketGrass(position: THREE.Vector3): THREE.Group {
    return this.createGrassCluster(position, 'thicket', {
      height: 2.2,
      width: 0.4,
      segments: 8
    });
  }
  
  public static createGoldenSteppeGrass(position: THREE.Vector3): THREE.Group {
    return this.createGrassCluster(position, 'golden', {
      height: 0.4,
      width: 0.08,
      color: new THREE.Color(0xd4af37)
    });
  }

  public static clearCache(): void {
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    this.geometryCache.clear();
  }

  public static dispose(): void {
    this.clearCache();
  }
}
