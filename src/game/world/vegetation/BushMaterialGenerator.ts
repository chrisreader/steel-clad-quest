
import * as THREE from 'three';

export class BushMaterialGenerator {
  public static createRealisticBushMaterial(
    baseColor: THREE.Color,
    bushType: string,
    variation: number = 0
  ): THREE.MeshStandardMaterial {
    // Create color variations based on bush type and variation
    const colorVariation = this.getColorVariation(baseColor, bushType, variation);
    
    const material = new THREE.MeshStandardMaterial({
      color: colorVariation,
      roughness: 0.85 + Math.random() * 0.1, // Slightly varied roughness
      metalness: 0.0,
      transparent: true,
      opacity: 0.92 + Math.random() * 0.06, // Slight opacity variation
    });

    // Add subtle normal map variation for surface detail
    this.addSurfaceDetail(material, bushType);
    
    return material;
  }

  private static getColorVariation(baseColor: THREE.Color, bushType: string, variation: number): THREE.Color {
    const color = baseColor.clone();
    
    // Apply type-specific color adjustments
    switch (bushType) {
      case 'low_shrub':
        // Slightly more yellow/brown tint for ground-level shrubs
        color.offsetHSL(0.02, -0.1, -0.05);
        break;
      case 'medium_bush':
        // Standard green
        break;
      case 'tall_bush':
        // Slightly darker and more saturated for mature bushes
        color.offsetHSL(0, 0.1, -0.1);
        break;
    }

    // Add random variation
    const variationAmount = 0.15 * variation;
    color.offsetHSL(
      (Math.random() - 0.5) * variationAmount * 0.5, // Hue variation
      (Math.random() - 0.5) * variationAmount, // Saturation variation
      (Math.random() - 0.5) * variationAmount * 0.8 // Lightness variation
    );

    return color;
  }

  private static addSurfaceDetail(material: THREE.MeshStandardMaterial, bushType: string): void {
    // Create subtle normal variation to simulate leaf texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Generate noise pattern for normal map
    const imageData = ctx.createImageData(32, 32);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random();
      const value = 128 + (noise - 0.5) * 50; // Subtle normal variation
      
      imageData.data[i] = value;     // R
      imageData.data[i + 1] = value; // G  
      imageData.data[i + 2] = 255;   // B (Z component)
      imageData.data[i + 3] = 255;   // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(2, 2);
    
    material.normalMap = normalTexture;
    material.normalScale = new THREE.Vector2(0.3, 0.3); // Subtle normal effect
  }

  public static createStemMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.4, 0.25), // Brown stem
      roughness: 0.95,
      metalness: 0.0
    });
  }

  public static createBerryMaterial(berryType: 'red' | 'blue'): THREE.MeshStandardMaterial {
    const color = berryType === 'red' 
      ? new THREE.Color().setHSL(0, 0.8, 0.5)   // Red berries
      : new THREE.Color().setHSL(0.6, 0.7, 0.4); // Blue berries
      
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9
    });
  }
}
