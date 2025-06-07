
import * as THREE from 'three';
import { BushSpeciesType, BushSpeciesConfig } from './BushSpecies';

export class OptimizedMaterialGenerator {
  private static materialCache = new Map<string, THREE.MeshStandardMaterial>();

  static createOptimizedFoliageMaterial(
    species: BushSpeciesConfig,
    layerIndex: number = 0
  ): THREE.MeshStandardMaterial {
    const cacheKey = `${species.type}_${layerIndex}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const baseColors = this.getSpeciesColors(species.type);
    const color = baseColors[layerIndex % baseColors.length].clone();
    
    // Darken inner layers slightly
    if (layerIndex > 0) {
      color.multiplyScalar(1.0 - layerIndex * 0.05);
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  private static getSpeciesColors(species: BushSpeciesType): THREE.Color[] {
    switch (species) {
      case BushSpeciesType.DENSE_ROUND:
        return [
          new THREE.Color(0x2d5016),
          new THREE.Color(0x3a6b1f),
          new THREE.Color(0x4a7c28)
        ];
      case BushSpeciesType.SPRAWLING_GROUND:
        return [
          new THREE.Color(0x4a6b32),
          new THREE.Color(0x5c7d44),
          new THREE.Color(0x6e8f56)
        ];
      case BushSpeciesType.TALL_UPRIGHT:
        return [
          new THREE.Color(0x1f4a0f),
          new THREE.Color(0x2e5b1e),
          new THREE.Color(0x3d6c2d)
        ];
      case BushSpeciesType.WILD_BERRY:
        return [
          new THREE.Color(0x3c5e2e),
          new THREE.Color(0x4a6b32),
          new THREE.Color(0x547a3a)
        ];
      case BushSpeciesType.FLOWERING_ORNAMENTAL:
        return [
          new THREE.Color(0x4a7c28),
          new THREE.Color(0x5a8d31),
          new THREE.Color(0x6a9e3a)
        ];
      default:
        return [new THREE.Color(0x4a7c28)];
    }
  }

  static createSimpleStemMaterial(): THREE.MeshStandardMaterial {
    const cacheKey = 'stem_material';
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a3c2a,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  static createSimpleBerryMaterial(): THREE.MeshStandardMaterial {
    const cacheKey = 'berry_material';
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x8B0000,
      roughness: 0.3,
      metalness: 0.0,
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  static dispose(): void {
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();
  }
}
