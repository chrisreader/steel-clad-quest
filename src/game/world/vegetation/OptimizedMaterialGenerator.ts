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

    const baseColors = this.getVibrantSpeciesColors(species.type);
    const color = baseColors[layerIndex % baseColors.length].clone();
    
    // Apply vibrant color variation
    this.applyVibrantColorVariation(color, layerIndex, species);

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6 + Math.random() * 0.2, // 0.6-0.8 for more realistic sheen
      metalness: 0.0,
      transparent: false, // Remove transparency for better performance
      side: THREE.FrontSide, // Use front side only for better performance
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  private static getVibrantSpeciesColors(species: BushSpeciesType): THREE.Color[] {
    switch (species) {
      case BushSpeciesType.DENSE_ROUND:
        return [
          new THREE.Color(0x6b9d4a), // Vibrant spring green
          new THREE.Color(0x7fb055), // Bright forest green
          new THREE.Color(0x8fc460), // Fresh lime green
          new THREE.Color(0x5d8f3f), // Rich grass green
          new THREE.Color(0x77a64b)  // Lush meadow green
        ];
      case BushSpeciesType.SPRAWLING_GROUND:
        return [
          new THREE.Color(0x8fa862), // Light sage green
          new THREE.Color(0xa3bd70), // Warm olive green
          new THREE.Color(0xb6d27e), // Bright olive
          new THREE.Color(0x94af66), // Fresh herb green
          new THREE.Color(0x7f9958)  // Natural green
        ];
      case BushSpeciesType.TALL_UPRIGHT:
        return [
          new THREE.Color(0x4a7f32), // Deep vibrant green
          new THREE.Color(0x5a9542), // Pine needle green
          new THREE.Color(0x6aab52), // Woodland green
          new THREE.Color(0x548540), // Forest canopy green
          new THREE.Color(0x4d8838)  // Emerald green
        ];
      case BushSpeciesType.WILD_BERRY:
        return [
          new THREE.Color(0x6a8f48), // Berry bush green
          new THREE.Color(0x7ba354), // Fresh berry leaf
          new THREE.Color(0x8cb760), // Vibrant leaf green
          new THREE.Color(0x5c7f3e), // Deep berry green
          new THREE.Color(0x71944c)  // Natural berry foliage
        ];
      case BushSpeciesType.FLOWERING_ORNAMENTAL:
        return [
          new THREE.Color(0x7db045), // Bright ornamental green
          new THREE.Color(0x8ec955), // Spring bloom green
          new THREE.Color(0x9fe265), // Fresh flower green
          new THREE.Color(0x6f9f3f), // Rich garden green
          new THREE.Color(0x85b54a)  // Lush ornamental green
        ];
      default:
        return [new THREE.Color(0x7fb055)];
    }
  }

  private static applyVibrantColorVariation(
    color: THREE.Color, 
    layerIndex: number, 
    species: BushSpeciesConfig
  ): void {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    // Make outer layers brighter, inner layers slightly darker but still vibrant
    const lightnessMod = layerIndex === 0 ? 0.08 : -layerIndex * 0.02;
    hsl.l = Math.max(0.3, Math.min(0.75, hsl.l + lightnessMod)); // Keep it bright
    
    // Increase saturation for more vibrant colors
    hsl.s = Math.min(1.0, hsl.s + 0.1);
    
    // Add slight random variation while keeping it vibrant
    hsl.h += (Math.random() - 0.5) * 0.015; // ±0.75% hue variation
    hsl.s += (Math.random() - 0.5) * 0.08;  // ±4% saturation variation
    hsl.l += (Math.random() - 0.5) * 0.04;  // ±2% lightness variation
    
    // Clamp values to keep them vibrant
    hsl.s = Math.max(0.4, Math.min(1.0, hsl.s)); // Keep saturation high
    hsl.l = Math.max(0.3, Math.min(0.75, hsl.l)); // Keep lightness in vibrant range
    
    color.setHSL(hsl.h, hsl.s, hsl.l);
  }

  static createEnhancedStemMaterial(): THREE.MeshStandardMaterial {
    const cacheKey = 'enhanced_stem_material';
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    // More natural brown colors
    const brownVariations = [
      new THREE.Color(0x5d4e3a), // Warm brown
      new THREE.Color(0x4a3c2a), // Standard brown
      new THREE.Color(0x6b5d4a), // Light brown
      new THREE.Color(0x3e2f1f)  // Dark brown
    ];
    
    const baseColor = brownVariations[Math.floor(Math.random() * brownVariations.length)];

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.85 + Math.random() * 0.1, // 0.85-0.95
      metalness: 0.0,
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  static createEnhancedBerryMaterial(): THREE.MeshStandardMaterial {
    const cacheKey = 'enhanced_berry_material';
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    // More varied berry colors
    const berryColors = [
      new THREE.Color(0xDC143C), // Crimson
      new THREE.Color(0x8B0000), // Dark red
      new THREE.Color(0x4169E1), // Royal blue
      new THREE.Color(0x800080), // Purple
      new THREE.Color(0xFF6347), // Tomato red
      new THREE.Color(0x9370DB)  // Medium purple
    ];
    
    const baseColor = berryColors[Math.floor(Math.random() * berryColors.length)];

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.2 + Math.random() * 0.1, // 0.2-0.3 for glossy berries
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  static createFlowerMaterial(): THREE.MeshStandardMaterial {
    const cacheKey = 'flower_material_' + Math.floor(Math.random() * 6);
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const flowerColors = [
      new THREE.Color(0xFFB6C1), // Light pink
      new THREE.Color(0xFFFFE0), // Light yellow
      new THREE.Color(0xE6E6FA), // Lavender
      new THREE.Color(0xFFFAF0), // Floral white
      new THREE.Color(0xFF69B4), // Hot pink
      new THREE.Color(0xFFD700)  // Gold
    ];
    
    const baseColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.4,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85,
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  // Legacy methods for compatibility
  static createSimpleStemMaterial(): THREE.MeshStandardMaterial {
    return this.createEnhancedStemMaterial();
  }

  static createSimpleBerryMaterial(): THREE.MeshStandardMaterial {
    return this.createEnhancedBerryMaterial();
  }

  static dispose(): void {
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();
  }
}
