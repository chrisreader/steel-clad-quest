
import * as THREE from 'three';

export class RealisticMaterialGenerator {
  private static readonly FOLIAGE_COLORS = [
    '#2d4a2b', // Dark forest green
    '#3c5e2e', // Earthy dark green
    '#486d34', // Medium forest green
    '#547a3a', // Olive green
    '#4a6b32', // Deep woodland green
  ];

  private static readonly SEASONAL_VARIATIONS = {
    spring: { hue: 0.25, saturation: 0.7, lightness: 0.45 },
    summer: { hue: 0.28, saturation: 0.6, lightness: 0.4 },
    autumn: { hue: 0.15, saturation: 0.5, lightness: 0.35 },
    winter: { hue: 0.22, saturation: 0.4, lightness: 0.3 }
  };

  /**
   * Creates realistic foliage material with MeshPhysicalMaterial and subsurface scattering
   */
  static createFoliageMaterial(
    bushIndex: number = 0,
    layerIndex: number = 0,
    season: keyof typeof RealisticMaterialGenerator.SEASONAL_VARIATIONS = 'summer'
  ): THREE.MeshPhysicalMaterial {
    const baseColor = this.FOLIAGE_COLORS[bushIndex % this.FOLIAGE_COLORS.length];
    const color = new THREE.Color(baseColor);
    
    // Apply seasonal variation with HSL
    const seasonal = this.SEASONAL_VARIATIONS[season];
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    // Vary color slightly for each layer and add organic variation
    const layerVariation = (layerIndex * 0.02) - 0.01;
    const organicVariation = (Math.random() - 0.5) * 0.03;
    
    hsl.h = seasonal.hue + layerVariation + organicVariation;
    hsl.s = seasonal.saturation + (Math.random() - 0.5) * 0.1;
    hsl.l = seasonal.lightness + (Math.random() - 0.5) * 0.05;
    
    color.setHSL(hsl.h, hsl.s, hsl.l);

    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.8 + Math.random() * 0.15, // 0.8 - 0.95
      metalness: 0.05 + Math.random() * 0.05, // 0.05 - 0.1
      transparent: true,
      opacity: 0.9 + Math.random() * 0.08, // 0.9 - 0.98
      side: THREE.DoubleSide,
      // Subsurface scattering for realistic plant lighting
      transmission: 0.2 + Math.random() * 0.2, // 0.2 - 0.4
      thickness: 0.3 + Math.random() * 0.3, // 0.3 - 0.6
    });
  }

  /**
   * Creates leaf material with alpha testing and natural transparency
   */
  static createLeafMaterial(
    bushIndex: number = 0,
    leafTexture: THREE.Texture
  ): THREE.MeshStandardMaterial {
    const baseColor = this.FOLIAGE_COLORS[bushIndex % this.FOLIAGE_COLORS.length];
    const color = new THREE.Color(baseColor);
    
    // Slightly brighter for individual leaves
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l = Math.min(0.6, hsl.l + 0.1);
    color.setHSL(hsl.h, hsl.s, hsl.l);

    return new THREE.MeshStandardMaterial({
      map: leafTexture,
      color: color,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.0,
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
