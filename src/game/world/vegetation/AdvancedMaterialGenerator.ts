
import * as THREE from 'three';
import { BushSpeciesType, BushSpeciesConfig } from './BushSpecies';

export interface MaterialVariation {
  baseColor: THREE.Color;
  roughness: number;
  metalness: number;
  opacity: number;
  transmission: number;
  thickness: number;
  ior: number;
  age: number; // 0-1, affects weathering
  health: number; // 0-1, affects color vibrancy
}

export class AdvancedMaterialGenerator {
  private static readonly SPECIES_BASE_COLORS: Record<BushSpeciesType, THREE.Color[]> = {
    [BushSpeciesType.DENSE_ROUND]: [
      new THREE.Color(0x2d5016), // Dark forest green
      new THREE.Color(0x3a6b1f), // Rich green
      new THREE.Color(0x4a7c28), // Medium green
      new THREE.Color(0x5a8d31)  // Bright green
    ],
    [BushSpeciesType.SPRAWLING_GROUND]: [
      new THREE.Color(0x4a6b32), // Olive green
      new THREE.Color(0x5c7d44), // Sage green
      new THREE.Color(0x6e8f56), // Light olive
      new THREE.Color(0x708f58)  // Yellowish green
    ],
    [BushSpeciesType.TALL_UPRIGHT]: [
      new THREE.Color(0x1f4a0f), // Very dark green
      new THREE.Color(0x2e5b1e), // Deep green
      new THREE.Color(0x3d6c2d), // Forest green
      new THREE.Color(0x4c7d3c)  // Natural green
    ],
    [BushSpeciesType.WILD_BERRY]: [
      new THREE.Color(0x3c5e2e), // Earthy green
      new THREE.Color(0x4a6b32), // Natural green
      new THREE.Color(0x547a3a), // Berry bush green
      new THREE.Color(0x5e8444)  // Lighter green
    ],
    [BushSpeciesType.FLOWERING_ORNAMENTAL]: [
      new THREE.Color(0x4a7c28), // Vibrant green
      new THREE.Color(0x5a8d31), // Fresh green
      new THREE.Color(0x6a9e3a), // Bright green
      new THREE.Color(0x7aaf43)  // Spring green
    ]
  };

  static createAdvancedFoliageMaterial(
    species: BushSpeciesConfig,
    layerIndex: number,
    variationIndex: number = 0,
    season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer'
  ): THREE.MeshPhysicalMaterial {
    const variation = this.generateMaterialVariation(species, layerIndex, variationIndex, season);
    
    return new THREE.MeshPhysicalMaterial({
      color: variation.baseColor,
      roughness: variation.roughness,
      metalness: variation.metalness,
      transparent: false, // Force main foliage to be fully opaque
      opacity: 1.0, // Force full opacity for main foliage
      transmission: 0, // Disable transmission for main foliage
      thickness: 0, // Disable thickness for main foliage
      ior: 1.0, // Standard IOR for opaque materials
      side: THREE.DoubleSide,
      // Enhanced for subsurface scattering
      clearcoat: 0.1,
      clearcoatRoughness: 0.8,
    });
  }

  private static generateMaterialVariation(
    species: BushSpeciesConfig,
    layerIndex: number,
    variationIndex: number,
    season: string
  ): MaterialVariation {
    const baseColors = this.SPECIES_BASE_COLORS[species.type];
    const baseColor = baseColors[variationIndex % baseColors.length].clone();
    
    // Apply seasonal variation
    if (species.seasonalVariation) {
      this.applySeasonalVariation(baseColor, season);
    }
    
    // Apply age and health variation
    const age = Math.random();
    const health = 0.7 + Math.random() * 0.3;
    
    // Age darkens the color slightly
    baseColor.multiplyScalar(1.0 - age * 0.15);
    
    // Health affects saturation
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.s *= health;
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    
    // Layer variation - inner layers are darker
    const layerDarkening = layerIndex * 0.05;
    baseColor.multiplyScalar(1.0 - layerDarkening);
    
    return {
      baseColor,
      roughness: 0.8 + Math.random() * 0.15, // 0.8-0.95
      metalness: 0.0,
      opacity: 0.85 + Math.random() * 0.1, // 0.85-0.95
      transmission: 0.15 + Math.random() * 0.25, // 0.15-0.4 for subsurface
      thickness: 0.2 + Math.random() * 0.4, // 0.2-0.6
      ior: 1.4 + Math.random() * 0.1, // 1.4-1.5 (plant material)
      age,
      health
    };
  }

  private static applySeasonalVariation(color: THREE.Color, season: string): void {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    switch (season) {
      case 'spring':
        hsl.h += 0.02; // Slightly more yellow-green
        hsl.s *= 1.1; // More saturated
        hsl.l *= 1.05; // Slightly brighter
        break;
      case 'summer':
        // Base colors, no change
        break;
      case 'autumn':
        hsl.h -= 0.05; // Shift toward brown/red
        hsl.s *= 0.8; // Less saturated
        hsl.l *= 0.9; // Slightly darker
        break;
      case 'winter':
        hsl.s *= 0.6; // Much less saturated
        hsl.l *= 0.8; // Darker
        break;
    }
    
    color.setHSL(hsl.h, hsl.s, hsl.l);
  }

  static createFlowerMaterial(species: BushSpeciesConfig): THREE.MeshPhysicalMaterial {
    const flowerColors: Record<BushSpeciesType, THREE.Color[]> = {
      [BushSpeciesType.DENSE_ROUND]: [new THREE.Color(0xffffff)], // White
      [BushSpeciesType.SPRAWLING_GROUND]: [new THREE.Color(0xffff99)], // Pale yellow
      [BushSpeciesType.TALL_UPRIGHT]: [new THREE.Color(0xcc99ff)], // Light purple
      [BushSpeciesType.WILD_BERRY]: [new THREE.Color(0xffcccc)], // Pink
      [BushSpeciesType.FLOWERING_ORNAMENTAL]: [
        new THREE.Color(0xff6699), // Pink
        new THREE.Color(0x6699ff), // Blue
        new THREE.Color(0xffcc33), // Yellow
        new THREE.Color(0xff9933)  // Orange
      ]
    };
    
    const colors = flowerColors[species.type];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9,
      transmission: 0.1,
      thickness: 0.1,
      ior: 1.3,
    });
  }

  static createBerryMaterial(species: BushSpeciesConfig): THREE.MeshPhysicalMaterial {
    const berryColors: Record<BushSpeciesType, THREE.Color[]> = {
      [BushSpeciesType.DENSE_ROUND]: [new THREE.Color(0x8B0000)], // Dark red
      [BushSpeciesType.SPRAWLING_GROUND]: [new THREE.Color(0x4169E1)], // Blue
      [BushSpeciesType.TALL_UPRIGHT]: [new THREE.Color(0x800080)], // Purple
      [BushSpeciesType.WILD_BERRY]: [
        new THREE.Color(0xDC143C), // Crimson
        new THREE.Color(0x8B0000), // Dark red
        new THREE.Color(0x4B0082)  // Indigo
      ],
      [BushSpeciesType.FLOWERING_ORNAMENTAL]: [new THREE.Color(0xFF6347)] // Orange
    };
    
    const colors = berryColors[species.type];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.2,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
      clearcoat: 0.8, // Glossy berry surface
      clearcoatRoughness: 0.1,
    });
  }

  static createStemMaterial(species: BushSpeciesConfig, age: number = 0.5): THREE.MeshPhysicalMaterial {
    const baseColor = new THREE.Color(0x4a3c2a);
    
    // Age affects color - older stems are grayer
    baseColor.lerp(new THREE.Color(0x555555), age * 0.3);
    
    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: 0.9 + Math.random() * 0.1,
      metalness: 0.0,
    });
  }
}
