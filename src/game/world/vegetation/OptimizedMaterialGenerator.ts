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
      roughness: 0.5 + Math.random() * 0.15, // 0.5-0.65 for better light reflection
      metalness: 0.0,
      transparent: false, // Remove transparency for better performance
      side: THREE.DoubleSide, // DoubleSide for consistent lighting
      emissive: new THREE.Color(color).multiplyScalar(0.05), // Subtle self-illumination
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  private static getVibrantSpeciesColors(species: BushSpeciesType): THREE.Color[] {
    switch (species) {
      case BushSpeciesType.DENSE_ROUND:
        return [
          new THREE.Color(0x9dd470), // Ultra-bright spring green
          new THREE.Color(0xb8e085), // Luminous forest green
          new THREE.Color(0xc8f090), // Brilliant lime green
          new THREE.Color(0x8cb85f), // Vivid grass green
          new THREE.Color(0xa8d470)  // Radiant meadow green
        ];
      case BushSpeciesType.SPRAWLING_GROUND:
        return [
          new THREE.Color(0xb8d485), // Brilliant sage green
          new THREE.Color(0xd0e890), // Luminous olive green
          new THREE.Color(0xe8f8a0), // Ultra-bright olive
          new THREE.Color(0xc0d580), // Radiant herb green
          new THREE.Color(0xa8c470)  // Vibrant natural green
        ];
      case BushSpeciesType.TALL_UPRIGHT:
        return [
          new THREE.Color(0x70b850), // Bright vibrant green
          new THREE.Color(0x85d065), // Luminous pine needle green
          new THREE.Color(0x9ae875), // Brilliant woodland green
          new THREE.Color(0x78c058), // Radiant forest canopy green
          new THREE.Color(0x70c050)  // Bright emerald green
        ];
      case BushSpeciesType.WILD_BERRY:
        return [
          new THREE.Color(0x90c468), // Bright berry bush green
          new THREE.Color(0xa8d975), // Luminous berry leaf
          new THREE.Color(0xc0e885), // Ultra-vibrant leaf green
          new THREE.Color(0x85b860), // Brilliant berry green
          new THREE.Color(0x98d070)  // Radiant berry foliage
        ];
      case BushSpeciesType.FLOWERING_ORNAMENTAL:
        return [
          new THREE.Color(0xa8e065), // Ultra-bright ornamental green
          new THREE.Color(0xc0f875), // Brilliant spring bloom green
          new THREE.Color(0xd8ff90), // Luminous flower green
          new THREE.Color(0x98d860), // Radiant garden green
          new THREE.Color(0xb0e570)  // Ultra-lush ornamental green
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
    const lightnessMod = layerIndex === 0 ? 0.15 : -layerIndex * 0.01;
    hsl.l = Math.max(0.55, Math.min(0.85, hsl.l + lightnessMod)); // Ultra-bright range
    
    // Increase saturation for more vibrant colors
    hsl.s = Math.min(1.0, hsl.s + 0.2);
    
    // Add slight random variation while keeping it vibrant
    hsl.h += (Math.random() - 0.5) * 0.015; // ±0.75% hue variation
    hsl.s += (Math.random() - 0.5) * 0.08;  // ±4% saturation variation
    hsl.l += (Math.random() - 0.5) * 0.04;  // ±2% lightness variation
    
    // Clamp values to keep them vibrant
    hsl.s = Math.max(0.6, Math.min(1.0, hsl.s)); // Higher saturation floor
    hsl.l = Math.max(0.55, Math.min(0.85, hsl.l)); // Ultra-bright lightness range
    
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
