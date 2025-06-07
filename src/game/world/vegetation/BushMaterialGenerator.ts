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
      roughness: 0.85 + Math.random() * 0.1,
      metalness: 0.0,
      transparent: false, // Keep solid
      opacity: 1.0,
      flatShading: false,
      vertexColors: true,
      side: THREE.DoubleSide, // Render both sides to hide any remaining gaps
      depthWrite: true, // Ensure proper depth writing
      depthTest: true,
    });

    // Add enhanced surface textures for gap hiding
    this.addDenseFoliageTextures(material, bushType);
    
    return material;
  }

  public static createSolidCoreMaterial(
    baseColor: THREE.Color,
    bushType: string,
    variation: number = 0
  ): THREE.MeshStandardMaterial {
    // Create a darker, more muted version of the base color for the core
    const coreColor = baseColor.clone();
    coreColor.offsetHSL(0, -0.2, -0.3); // Darker and less saturated
    
    // Apply type-specific adjustments
    switch (bushType) {
      case 'low_shrub':
        coreColor.offsetHSL(0, -0.1, -0.2);
        break;
      case 'medium_bush':
        coreColor.offsetHSL(0, -0.15, -0.25);
        break;
      case 'tall_bush':
        coreColor.offsetHSL(0, -0.2, -0.3);
        break;
    }

    // Add slight variation
    const variationAmount = 0.1 * variation;
    coreColor.offsetHSL(
      (Math.random() - 0.5) * variationAmount * 0.1,
      (Math.random() - 0.5) * variationAmount * 0.2,
      (Math.random() - 0.5) * variationAmount * 0.2
    );

    const material = new THREE.MeshStandardMaterial({
      color: coreColor,
      roughness: 0.9,
      metalness: 0.0,
      transparent: false,
      opacity: 1.0,
      flatShading: false,
      side: THREE.FrontSide, // Only front side for performance
      depthWrite: true,
      depthTest: true,
    });

    return material;
  }

  private static getColorVariation(baseColor: THREE.Color, bushType: string, variation: number): THREE.Color {
    const color = baseColor.clone();
    
    switch (bushType) {
      case 'low_shrub':
        color.offsetHSL(0.01, -0.15, -0.08);
        break;
      case 'medium_bush':
        color.offsetHSL(0, 0.1, 0);
        break;
      case 'tall_bush':
        color.offsetHSL(-0.01, 0.12, -0.12);
        break;
    }

    const variationAmount = 0.15 * variation;
    color.offsetHSL(
      (Math.random() - 0.5) * variationAmount * 0.2,
      (Math.random() - 0.5) * variationAmount * 0.3,
      (Math.random() - 0.5) * variationAmount * 0.3
    );

    return color;
  }

  private static addDenseFoliageTextures(material: THREE.MeshStandardMaterial, bushType: string): void {
    // Create high-resolution foliage normal map with gap-hiding properties
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Higher resolution for better detail
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(256, 256);
    
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const index = (y * 256 + x) * 4;
        
        // Create dense leaf pattern that helps hide gaps
        const leafPattern1 = Math.sin(x * 0.2) * Math.cos(y * 0.18) * 0.4;
        const leafPattern2 = Math.sin(x * 0.12 + y * 0.12) * 0.3;
        const microDetail = Math.sin(x * 0.6) * Math.sin(y * 0.5) * 0.2;
        const gapFiller = Math.sin(x * 0.8 + y * 0.8) * 0.15; // Additional detail to mask gaps
        
        const combinedPattern = leafPattern1 + leafPattern2 + microDetail + gapFiller;
        const normalValue = 128 + combinedPattern * 25;
        
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
    normalTexture.repeat.set(6, 6); // Denser tiling for better coverage
    
    material.normalMap = normalTexture;
    material.normalScale = new THREE.Vector2(0.8, 0.8); // Enhanced for visual density
    
    // Add enhanced roughness variation
    this.addEnhancedRoughnessMap(material, bushType);
    
    // Add ambient occlusion effect to simulate depth
    this.addAmbientOcclusionMap(material);
  }

  private static addEnhancedRoughnessMap(material: THREE.MeshStandardMaterial, bushType: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(128, 128);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Enhanced foliage roughness with variation
      const foliageRoughness = 0.75 + Math.sin(i * 0.015) * Math.cos(i * 0.012) * 0.2;
      const roughnessValue = Math.floor(Math.max(0, Math.min(1, foliageRoughness)) * 255);
      
      imageData.data[i] = roughnessValue;     // R
      imageData.data[i + 1] = roughnessValue; // G
      imageData.data[i + 2] = roughnessValue; // B
      imageData.data[i + 3] = 255;           // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const roughnessTexture = new THREE.CanvasTexture(canvas);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(4, 4);
    
    material.roughnessMap = roughnessTexture;
  }

  private static addAmbientOcclusionMap(material: THREE.MeshStandardMaterial): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(64, 64);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Simulate ambient occlusion for depth perception
      const aoValue = 0.3 + Math.sin(i * 0.02) * Math.cos(i * 0.025) * 0.4;
      const aoIntensity = Math.floor(Math.max(0, Math.min(1, aoValue)) * 255);
      
      imageData.data[i] = aoIntensity;     // R
      imageData.data[i + 1] = aoIntensity; // G
      imageData.data[i + 2] = aoIntensity; // B
      imageData.data[i + 3] = 255;         // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const aoTexture = new THREE.CanvasTexture(canvas);
    aoTexture.wrapS = THREE.RepeatWrapping;
    aoTexture.wrapT = THREE.RepeatWrapping;
    aoTexture.repeat.set(2, 2);
    
    material.aoMap = aoTexture;
    material.aoMapIntensity = 0.5; // Moderate AO effect
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
