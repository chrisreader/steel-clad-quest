
import * as THREE from 'three';

export class RealisticMaterialGenerator {
  private static readonly FOLIAGE_COLORS = [
    '#4a7c59', // Brighter forest green
    '#5e8c64', // Earthy green
    '#6ba070', // Medium bright green
    '#78b47c', // Olive bright green
    '#6b9c6e', // Deep bright green
  ];

  private static readonly SEASONAL_VARIATIONS = {
    spring: { hue: 0.25, saturation: 0.7, lightness: 0.65 }, // Much brighter
    summer: { hue: 0.28, saturation: 0.6, lightness: 0.6 }, // Much brighter
    autumn: { hue: 0.15, saturation: 0.5, lightness: 0.55 }, // Much brighter
    winter: { hue: 0.22, saturation: 0.4, lightness: 0.5 } // Much brighter
  };

  /**
   * Creates realistic foliage material with natural variations
   */
  static createFoliageMaterial(
    bushIndex: number = 0,
    layerIndex: number = 0,
    season: keyof typeof RealisticMaterialGenerator.SEASONAL_VARIATIONS = 'summer'
  ): THREE.MeshStandardMaterial {
    const baseColor = this.FOLIAGE_COLORS[bushIndex % this.FOLIAGE_COLORS.length];
    const color = new THREE.Color(baseColor);
    
    // Apply seasonal variation
    const seasonal = this.SEASONAL_VARIATIONS[season];
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    // Vary color slightly for each layer
    const layerVariation = (layerIndex * 0.02) - 0.01;
    hsl.h = seasonal.hue + layerVariation;
    hsl.s = seasonal.saturation + (Math.random() - 0.5) * 0.1;
    hsl.l = seasonal.lightness + (Math.random() - 0.5) * 0.05;
    
    color.setHSL(hsl.h, hsl.s, hsl.l);

    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.85 + Math.random() * 0.1, // 0.85 - 0.95
      metalness: 0.05 + Math.random() * 0.05, // 0.05 - 0.1
      transparent: true,
      opacity: 0.92 + Math.random() * 0.06, // 0.92 - 0.98
      side: THREE.DoubleSide, // For better light interaction
    });
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
