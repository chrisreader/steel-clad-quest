import * as THREE from 'three';

export class RealisticMaterialGenerator {
  private static readonly FOLIAGE_COLORS = [
    '#2d4a2b', // Dark forest green
    '#3c5e2e', // Earthy dark green
    '#486d34', // Medium forest green
    '#547a3a', // Olive green
    '#4a6b32', // Deep woodland green
    '#5c7a45', // Lighter forest green
    '#3d5c2f', // Rich woodland green
  ];

  private static readonly SEASONAL_VARIATIONS = {
    spring: { hue: 0.28, saturation: 0.8, lightness: 0.5 },
    summer: { hue: 0.25, saturation: 0.7, lightness: 0.4 },
    autumn: { hue: 0.15, saturation: 0.6, lightness: 0.38 },
    winter: { hue: 0.22, saturation: 0.4, lightness: 0.32 }
  };

  /**
   * Creates realistic foliage material with age, health, and environmental factors
   */
  static createAdvancedFoliageMaterial(
    bushIndex: number = 0,
    layerIndex: number = 0,
    ageCategory: 'young' | 'mature' | 'old' = 'mature',
    healthLevel: 'vibrant' | 'healthy' | 'stressed' = 'healthy',
    season: keyof typeof RealisticMaterialGenerator.SEASONAL_VARIATIONS = 'summer'
  ): THREE.MeshStandardMaterial {
    const baseColor = this.FOLIAGE_COLORS[bushIndex % this.FOLIAGE_COLORS.length];
    const color = new THREE.Color(baseColor);
    
    // Apply seasonal variation
    const seasonal = this.SEASONAL_VARIATIONS[season];
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    // Layer variation for depth
    const layerVariation = (layerIndex * 0.02) - 0.01;
    hsl.h = seasonal.hue + layerVariation;
    hsl.s = seasonal.saturation;
    hsl.l = seasonal.lightness;
    
    // Apply age modifications
    switch (ageCategory) {
      case 'young':
        hsl.s *= 1.1; // More vibrant
        hsl.l *= 1.05; // Slightly brighter
        break;
      case 'old':
        hsl.s *= 0.8; // Less saturated
        hsl.l *= 0.9; // Darker
        hsl.h += 0.02; // Shift toward brown
        break;
      case 'mature':
      default:
        // Base values
        break;
    }
    
    // Apply health modifications
    switch (healthLevel) {
      case 'vibrant':
        hsl.s *= 1.15;
        hsl.l *= 1.1;
        break;
      case 'stressed':
        hsl.s *= 0.7;
        hsl.l *= 0.85;
        hsl.h += 0.03; // Shift toward yellow-brown
        break;
      case 'healthy':
      default:
        // Base values
        break;
    }
    
    // Add random variation
    hsl.s += (Math.random() - 0.5) * 0.1;
    hsl.l += (Math.random() - 0.5) * 0.05;
    
    color.setHSL(hsl.h, Math.max(0, hsl.s), Math.max(0, hsl.l));

    // Determine material properties based on age and health
    let roughness = 0.85 + Math.random() * 0.1;
    let opacity = 0.92 + Math.random() * 0.06;
    
    if (ageCategory === 'old') {
      roughness += 0.05; // Older foliage is rougher
      opacity -= 0.02; // Slightly more transparent
    }
    
    if (healthLevel === 'stressed') {
      opacity -= 0.05; // Stressed plants are less dense
    }

    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: Math.min(0.95, roughness),
      metalness: 0.05 + Math.random() * 0.05,
      transparent: true,
      opacity: Math.max(0.85, opacity),
      side: THREE.DoubleSide,
    });
  }

  /**
   * Legacy method for compatibility
   */
  static createFoliageMaterial(
    bushIndex: number = 0,
    layerIndex: number = 0,
    season: keyof typeof RealisticMaterialGenerator.SEASONAL_VARIATIONS = 'summer'
  ): THREE.MeshStandardMaterial {
    return this.createAdvancedFoliageMaterial(bushIndex, layerIndex, 'mature', 'healthy', season);
  }

  /**
   * Creates realistic stem material
   */
  static createStemMaterial(): THREE.MeshStandardMaterial {
    const stemColors = ['#4a3c2a', '#5d4e3a', '#6b5d4a'];
    const baseColor = stemColors[Math.floor(Math.random() * stemColors.length)];
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.9,
      metalness: 0.0,
    });
  }

  /**
   * Creates berry/flower material
   */
  static createBerryMaterial(): THREE.MeshStandardMaterial {
    const berryColors = [
      '#8B0000', // Dark red berries
      '#DC143C', // Crimson berries
      '#4169E1', // Blue flowers
      '#9370DB', // Purple berries
      '#FF6347'  // Orange berries
    ];
    
    const color = berryColors[Math.floor(Math.random() * berryColors.length)];
    
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9,
    });
  }
}
