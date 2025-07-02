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
      roughness: 0.8 + Math.random() * 0.15, // 0.8-0.95 for realistic matte foliage
      metalness: 0.0,
      transparent: false,
      side: THREE.DoubleSide,
      // Removed emissive for natural appearance
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  private static getVibrantSpeciesColors(species: BushSpeciesType): THREE.Color[] {
    switch (species) {
      case BushSpeciesType.DENSE_ROUND:
        return [
          new THREE.Color(0x6b8e23), // Realistic olive drab
          new THREE.Color(0x708238), // Natural forest green  
          new THREE.Color(0x7a8450), // Muted sage green
          new THREE.Color(0x556b2f), // Dark olive green
          new THREE.Color(0x6b7c32)  // Natural meadow green
        ];
      case BushSpeciesType.SPRAWLING_GROUND:
        return [
          new THREE.Color(0x8fbc8f), // Natural dark sea green
          new THREE.Color(0x7a9b7a), // Muted green
          new THREE.Color(0x698b69), // Dim gray green
          new THREE.Color(0x8b9d83), // Natural herb green
          new THREE.Color(0x6b8f6b)  // Realistic natural green
        ];
      case BushSpeciesType.TALL_UPRIGHT:
        return [
          new THREE.Color(0x228b22), // Realistic forest green
          new THREE.Color(0x32cd32), // Natural lime green
          new THREE.Color(0x2e8b57), // Sea green
          new THREE.Color(0x3cb371), // Medium sea green
          new THREE.Color(0x228b22)  // Classic forest green
        ];
      case BushSpeciesType.WILD_BERRY:
        return [
          new THREE.Color(0x6b8e23), // Natural olive drab
          new THREE.Color(0x7a8450), // Realistic leaf green
          new THREE.Color(0x8fbc8f), // Natural sea green
          new THREE.Color(0x556b2f), // Dark natural green
          new THREE.Color(0x6b7c32)  // Realistic foliage green
        ];
      case BushSpeciesType.FLOWERING_ORNAMENTAL:
        return [
          new THREE.Color(0x9acd32), // Natural yellow green
          new THREE.Color(0x7cfc00), // Bright lawn green
          new THREE.Color(0x32cd32), // Natural lime green
          new THREE.Color(0x6b8e23), // Olive drab green
          new THREE.Color(0x7a8450)  // Natural garden green
        ];
      default:
        return [new THREE.Color(0x6b8e23)];
    }
  }

  private static applyVibrantColorVariation(
    color: THREE.Color, 
    layerIndex: number, 
    species: BushSpeciesConfig
  ): void {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    // Natural lightness variation for realistic foliage
    const lightnessMod = layerIndex === 0 ? 0.05 : -layerIndex * 0.02;
    hsl.l = Math.max(0.25, Math.min(0.65, hsl.l + lightnessMod)); // Natural range
    
    // Moderate saturation for realistic colors
    hsl.s = Math.min(0.8, hsl.s + 0.1);
    
    // Add natural variation
    hsl.h += (Math.random() - 0.5) * 0.03; // ±1.5% hue variation
    hsl.s += (Math.random() - 0.5) * 0.15; // ±7.5% saturation variation  
    hsl.l += (Math.random() - 0.5) * 0.1;  // ±5% lightness variation
    
    // Clamp to natural ranges
    hsl.s = Math.max(0.3, Math.min(0.8, hsl.s)); // Natural saturation
    hsl.l = Math.max(0.25, Math.min(0.65, hsl.l)); // Natural lightness
    
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
