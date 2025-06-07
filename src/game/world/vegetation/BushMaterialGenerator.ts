
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
      flatShading: false, // CRITICAL: Ensure smooth shading
      side: THREE.DoubleSide, // Render both sides for fuller appearance
    });

    // Add enhanced surface detail for organic appearance
    this.addOrganicSurfaceDetail(material, bushType);
    
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

    // Add random variation with smoother transitions
    const variationAmount = 0.12 * variation; // Reduced for more subtle variation
    color.offsetHSL(
      (Math.random() - 0.5) * variationAmount * 0.3, // Reduced hue variation
      (Math.random() - 0.5) * variationAmount * 0.8, // Saturation variation
      (Math.random() - 0.5) * variationAmount * 0.6 // Lightness variation
    );

    return color;
  }

  private static addOrganicSurfaceDetail(material: THREE.MeshStandardMaterial, bushType: string): void {
    // Create enhanced normal variation to simulate organic leaf texture
    const canvas = document.createElement('canvas');
    canvas.width = 64; // Increased resolution for smoother appearance
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Generate organic noise pattern for normal map
    const imageData = ctx.createImageData(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        
        // Multi-scale noise for organic surface detail
        const noise1 = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.5;
        const noise2 = Math.sin(x * 0.5) * Math.cos(y * 0.4) * 0.3;
        const noise3 = Math.random() * 0.2;
        
        const combinedNoise = (noise1 + noise2 + noise3) * 0.4;
        const normalValue = 128 + combinedNoise * 60; // Smoother normal variation
        
        imageData.data[i] = Math.max(0, Math.min(255, normalValue));     // R
        imageData.data[i + 1] = Math.max(0, Math.min(255, normalValue)); // G  
        imageData.data[i + 2] = 255;   // B (Z component)
        imageData.data[i + 3] = 255;   // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(3, 3); // Increased repeat for finer detail
    normalTexture.generateMipmaps = true;
    normalTexture.minFilter = THREE.LinearMipmapLinearFilter;
    normalTexture.magFilter = THREE.LinearFilter;
    
    material.normalMap = normalTexture;
    material.normalScale = new THREE.Vector2(0.4, 0.4); // Slightly stronger normal effect
    
    // Add roughness variation for more realistic surface
    this.addRoughnessMap(material);
  }

  private static addRoughnessMap(material: THREE.MeshStandardMaterial): void {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(32, 32);
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Create subtle roughness variation
      const roughnessNoise = 0.7 + Math.random() * 0.3; // Range 0.7-1.0
      const value = Math.floor(roughnessNoise * 255);
      
      imageData.data[i] = value;     // R
      imageData.data[i + 1] = value; // G
      imageData.data[i + 2] = value; // B
      imageData.data[i + 3] = 255;   // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const roughnessTexture = new THREE.CanvasTexture(canvas);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(2, 2);
    
    material.roughnessMap = roughnessTexture;
  }

  public static createStemMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.4, 0.25), // Brown stem
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false // Ensure smooth shading for stems too
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
      opacity: 0.9,
      flatShading: false // Smooth berries
    });
  }
}
