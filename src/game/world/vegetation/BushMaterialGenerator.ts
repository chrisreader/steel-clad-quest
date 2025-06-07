
import * as THREE from 'three';

export class BushMaterialGenerator {
  public static createDenseFoliageMaterial(
    baseColor: THREE.Color,
    bushType: string,
    variation: number = 0
  ): THREE.MeshStandardMaterial {
    // Create color variations
    const colorVariation = this.getColorVariation(baseColor, bushType, variation);
    
    const material = new THREE.MeshStandardMaterial({
      color: colorVariation,
      roughness: 0.8 + Math.random() * 0.1,
      metalness: 0.0,
      transparent: false, // Remove transparency to prevent see-through gaps
      opacity: 1.0, // Full opacity
      flatShading: false, // Ensure smooth shading
      vertexColors: true, // Use vertex colors for natural variation
      side: THREE.DoubleSide, // Render both sides for dense foliage effect
    });

    // Add detailed surface textures
    this.addFoliageTextures(material, bushType);
    
    return material;
  }

  private static getColorVariation(baseColor: THREE.Color, bushType: string, variation: number): THREE.Color {
    const color = baseColor.clone();
    
    // Apply type-specific color adjustments
    switch (bushType) {
      case 'low_shrub':
        // More muted, earthy tones
        color.offsetHSL(0.01, -0.2, -0.1);
        break;
      case 'medium_bush':
        // Standard vibrant green
        color.offsetHSL(0, 0.1, 0);
        break;
      case 'tall_bush':
        // Darker, more mature foliage
        color.offsetHSL(-0.01, 0.15, -0.15);
        break;
    }

    // Add natural variation
    const variationAmount = 0.2 * variation;
    color.offsetHSL(
      (Math.random() - 0.5) * variationAmount * 0.3, // Subtle hue variation
      (Math.random() - 0.5) * variationAmount * 0.5, // Saturation variation
      (Math.random() - 0.5) * variationAmount * 0.4  // Lightness variation
    );

    return color;
  }

  private static addFoliageTextures(material: THREE.MeshStandardMaterial, bushType: string): void {
    // Create high-resolution foliage normal map
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Higher resolution for dense foliage
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(128, 128);
    
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const index = (y * 128 + x) * 4;
        
        // Create leaf-like surface variation
        const leafPattern1 = Math.sin(x * 0.3) * Math.cos(y * 0.25) * 0.4;
        const leafPattern2 = Math.sin(x * 0.15 + y * 0.15) * 0.3;
        const microDetail = Math.sin(x * 0.8) * Math.sin(y * 0.6) * 0.2;
        
        const combinedPattern = leafPattern1 + leafPattern2 + microDetail;
        const normalValue = 128 + combinedPattern * 30; // Enhanced detail
        
        imageData.data[index] = normalValue;     // R
        imageData.data[index + 1] = normalValue; // G  
        imageData.data[index + 2] = 255;         // B (Z component)
        imageData.data[index + 3] = 255;         // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(4, 4); // Dense tiling for foliage detail
    
    material.normalMap = normalTexture;
    material.normalScale = new THREE.Vector2(0.6, 0.6); // Enhanced normal effect
    
    // Add dense roughness variation
    this.addDenseRoughnessMap(material, bushType);
  }

  private static addDenseRoughnessMap(material: THREE.MeshStandardMaterial, bushType: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(64, 64);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Dense foliage roughness pattern
      const foliageRoughness = 0.7 + Math.sin(i * 0.02) * Math.cos(i * 0.015) * 0.2;
      const roughnessValue = Math.floor(foliageRoughness * 255);
      
      imageData.data[i] = roughnessValue;     // R
      imageData.data[i + 1] = roughnessValue; // G
      imageData.data[i + 2] = roughnessValue; // B
      imageData.data[i + 3] = 255;           // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const roughnessTexture = new THREE.CanvasTexture(canvas);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(3, 3);
    
    material.roughnessMap = roughnessTexture;
  }

  public static createStemMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.4, 0.25), // Brown stem
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false
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
      transparent: false, // Solid berries
      opacity: 1.0,
      flatShading: false
    });
  }
}
