import * as THREE from 'three';
import { TreeSpeciesType } from './TreeSpecies';

export interface OrganicFoliageConfig {
  species: TreeSpeciesType;
  size: number;
  irregularity: number;
  subdivisions: number;
}

export class OrganicFoliageGenerator {
  private static geometryCache = new Map<string, THREE.BufferGeometry>();

  static createOrganicFoliageGeometry(config: OrganicFoliageConfig): THREE.BufferGeometry {
    const cacheKey = `${config.species}_${config.size.toFixed(1)}_${config.irregularity.toFixed(1)}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }

    let geometry: THREE.BufferGeometry;

    switch (config.species) {
      case TreeSpeciesType.OAK:
        geometry = this.createOakFoliageGeometry(config);
        break;
      case TreeSpeciesType.BIRCH:
        geometry = this.createBirchFoliageGeometry(config);
        break;
      case TreeSpeciesType.WILLOW:
        geometry = this.createWillowFoliageGeometry(config);
        break;
      case TreeSpeciesType.DEAD:
        geometry = this.createDeadFoliageGeometry(config);
        break;
      default:
        geometry = this.createGenericOrganicGeometry(config);
    }

    this.geometryCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  private static createOakFoliageGeometry(config: OrganicFoliageConfig): THREE.BufferGeometry {
    // Oak: Broad, rounded, dense clusters
    const baseGeometry = new THREE.SphereGeometry(1, 12, 8);
    
    // Apply organic deformation for broader, more natural oak leaves
    this.applyOrganicDeformation(baseGeometry, {
      horizontalStretch: 1.3, // Broader canopy
      verticalCompress: 0.8,  // Slightly flattened
      noiseScale: 0.4,
      noiseIntensity: 0.3
    });

    return baseGeometry;
  }

  private static createBirchFoliageGeometry(config: OrganicFoliageConfig): THREE.BufferGeometry {
    // Birch: Small, delicate, sparse foliage
    const baseGeometry = new THREE.SphereGeometry(1, 10, 6);
    
    this.applyOrganicDeformation(baseGeometry, {
      horizontalStretch: 0.9,  // Slightly narrower
      verticalCompress: 1.1,   // Slightly taller
      noiseScale: 0.6,
      noiseIntensity: 0.4
    });

    return baseGeometry;
  }

  private static createWillowFoliageGeometry(config: OrganicFoliageConfig): THREE.BufferGeometry {
    // Willow: Long, drooping, flowing shapes
    const baseGeometry = new THREE.SphereGeometry(1, 10, 8);
    
    this.applyOrganicDeformation(baseGeometry, {
      horizontalStretch: 0.7,  // Narrower
      verticalCompress: 1.5,   // Much taller/drooping
      noiseScale: 0.3,
      noiseIntensity: 0.5,
      droopEffect: true        // Special drooping for willow
    });

    return baseGeometry;
  }

  private static createDeadFoliageGeometry(config: OrganicFoliageConfig): THREE.BufferGeometry {
    // Dead: Sparse, irregular, patchy remnants
    const baseGeometry = new THREE.SphereGeometry(1, 8, 6);
    
    this.applyOrganicDeformation(baseGeometry, {
      horizontalStretch: 1.2,
      verticalCompress: 0.6,   // Very flattened
      noiseScale: 0.8,
      noiseIntensity: 0.7,     // Very irregular
      sparse: true             // Create gaps/holes
    });

    return baseGeometry;
  }

  private static createGenericOrganicGeometry(config: OrganicFoliageConfig): THREE.BufferGeometry {
    const baseGeometry = new THREE.SphereGeometry(1, 12, 8);
    
    this.applyOrganicDeformation(baseGeometry, {
      horizontalStretch: 1.0 + (Math.random() - 0.5) * 0.4,
      verticalCompress: 1.0 + (Math.random() - 0.5) * 0.3,
      noiseScale: 0.5,
      noiseIntensity: config.irregularity
    });

    return baseGeometry;
  }

  private static applyOrganicDeformation(
    geometry: THREE.BufferGeometry, 
    options: {
      horizontalStretch: number;
      verticalCompress: number;
      noiseScale: number;
      noiseIntensity: number;
      droopEffect?: boolean;
      sparse?: boolean;
    }
  ): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;

    for (let i = 0; i < positions.count; i++) {
      const x = positionArray[i * 3];
      const y = positionArray[i * 3 + 1];
      const z = positionArray[i * 3 + 2];

      // Apply species-specific scaling
      let newX = x * options.horizontalStretch;
      let newY = y * options.verticalCompress;
      let newZ = z * options.horizontalStretch;

      // Add noise for organic irregularity
      const noiseX = this.simpleNoise3D(x * options.noiseScale, y * options.noiseScale, z * options.noiseScale);
      const noiseY = this.simpleNoise3D(x * options.noiseScale + 100, y * options.noiseScale, z * options.noiseScale);
      const noiseZ = this.simpleNoise3D(x * options.noiseScale, y * options.noiseScale, z * options.noiseScale + 100);

      newX += noiseX * options.noiseIntensity;
      newY += noiseY * options.noiseIntensity;
      newZ += noiseZ * options.noiseIntensity;

      // Willow drooping effect
      if (options.droopEffect && y > 0) {
        newY -= Math.abs(x * z) * 0.3; // Create drooping based on distance from center
      }

      // Dead tree sparse effect - randomly remove some vertices
      if (options.sparse && Math.random() < 0.3) {
        newX *= 0.3;
        newY *= 0.3;
        newZ *= 0.3;
      }

      positionArray[i * 3] = newX;
      positionArray[i * 3 + 1] = newY;
      positionArray[i * 3 + 2] = newZ;
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  // Simple 3D noise function for organic deformation
  private static simpleNoise3D(x: number, y: number, z: number): number {
    return Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 0.5;
  }

  static createMultiClusterFoliage(
    species: TreeSpeciesType,
    baseSize: number,
    clusterCount: number = 3
  ): THREE.BufferGeometry[] {
    const clusters: THREE.BufferGeometry[] = [];
    
    for (let i = 0; i < clusterCount; i++) {
      const sizeVariation = 0.7 + Math.random() * 0.6; // 0.7-1.3x base size
      const irregularity = 0.3 + Math.random() * 0.4;   // 0.3-0.7 irregularity
      
      const clusterGeometry = this.createOrganicFoliageGeometry({
        species,
        size: baseSize * sizeVariation,
        irregularity,
        subdivisions: 12
      });
      
      clusters.push(clusterGeometry);
    }
    
    return clusters;
  }

  static dispose(): void {
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();
  }
}