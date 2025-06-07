
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

    const baseColors = this.getEnhancedSpeciesColors(species.type);
    const color = baseColors[layerIndex % baseColors.length].clone();
    
    // Apply natural color variation
    this.applyNaturalColorVariation(color, layerIndex, species);

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.75 + Math.random() * 0.2, // 0.75-0.95 for natural variation
      metalness: 0.0,
      transparent: true,
      opacity: 0.9 + Math.random() * 0.08, // 0.9-0.98
      side: THREE.DoubleSide,
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  private static getEnhancedSpeciesColors(species: BushSpeciesType): THREE.Color[] {
    switch (species) {
      case BushSpeciesType.DENSE_ROUND:
        return [
          new THREE.Color(0x3d5e2d), // Rich forest green
          new THREE.Color(0x4a7c34), // Vibrant green
          new THREE.Color(0x5a8d3e), // Bright spring green
          new THREE.Color(0x476b32), // Natural green
          new THREE.Color(0x3c5a2c)  // Deep shade green
        ];
      case BushSpeciesType.SPRAWLING_GROUND:
        return [
          new THREE.Color(0x5c7d44), // Sage green
          new THREE.Color(0x6e8f56), // Light olive
          new THREE.Color(0x7ea062), // Warm green
          new THREE.Color(0x6a8450), // Earthy green
          new THREE.Color(0x54733e)  // Muted green
        ];
      case BushSpeciesType.TALL_UPRIGHT:
        return [
          new THREE.Color(0x2e5b1e), // Deep forest green
          new THREE.Color(0x3d6c2d), // Pine green
          new THREE.Color(0x4c7d3c), // Natural woodland
          new THREE.Color(0x426a36), // Dark leaf green
          new THREE.Color(0x385f2a)  // Shadow green
        ];
      case BushSpeciesType.WILD_BERRY:
        return [
          new THREE.Color(0x4a6b32), // Berry bush green
          new THREE.Color(0x547a3a), // Fresh green
          new THREE.Color(0x5e8444), // Vibrant leaf green
          new THREE.Color(0x3e5a2e), // Deep berry leaf
          new THREE.Color(0x4d7035)  // Mixed green
        ];
      case BushSpeciesType.FLOWERING_ORNAMENTAL:
        return [
          new THREE.Color(0x5a8d31), // Bright ornamental green
          new THREE.Color(0x6a9e3a), // Spring bloom green
          new THREE.Color(0x7aaf43), // Fresh flower green
          new THREE.Color(0x4f7e2d), // Rich garden green
          new THREE.Color(0x659240)  // Lush green
        ];
      default:
        return [new THREE.Color(0x4a7c28)];
    }
  }

  private static applyNaturalColorVariation(
    color: THREE.Color, 
    layerIndex: number, 
    species: BushSpeciesConfig
  ): void {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    // Outer layers are brighter, inner layers darker
    const lightnessMod = layerIndex === 0 ? 0.05 : -layerIndex * 0.03;
    hsl.l = Math.max(0.1, Math.min(0.8, hsl.l + lightnessMod));
    
    // Add slight random variation
    hsl.h += (Math.random() - 0.5) * 0.02; // ±1% hue variation
    hsl.s += (Math.random() - 0.5) * 0.1;  // ±5% saturation variation
    hsl.l += (Math.random() - 0.5) * 0.05; // ±2.5% lightness variation
    
    // Clamp values
    hsl.s = Math.max(0.1, Math.min(1.0, hsl.s));
    hsl.l = Math.max(0.1, Math.min(0.8, hsl.l));
    
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
