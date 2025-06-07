
import * as THREE from 'three';

export class RealisticBushMaterialGenerator {
  private static currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  
  public static setCurrentSeason(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    this.currentSeason = season;
  }

  public static createSpeciesMaterial(
    species: any,
    growthStage: 'juvenile' | 'mature' | 'old',
    variation: number = 0,
    weatherEffects: boolean = false
  ): THREE.MeshStandardMaterial {
    // Get seasonal colors
    const seasonalColors = species.seasonalColors[this.currentSeason];
    const baseColor = seasonalColors[Math.floor(Math.random() * seasonalColors.length)].clone();
    
    // Apply growth stage effects
    this.applyGrowthStageColorEffects(baseColor, growthStage);
    
    // Apply variation
    this.applyColorVariation(baseColor, variation);
    
    // Apply weather effects if enabled
    if (weatherEffects) {
      this.applyWeatherEffects(baseColor);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.8 + Math.random() * 0.15,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9 + Math.random() * 0.08,
    });

    // Add realistic surface details
    this.addAdvancedSurfaceDetail(material, species, growthStage);
    
    return material;
  }

  private static applyGrowthStageColorEffects(color: THREE.Color, growthStage: 'juvenile' | 'mature' | 'old'): void {
    switch (growthStage) {
      case 'juvenile':
        // Young plants are often brighter and more vibrant
        color.offsetHSL(0.02, 0.1, 0.05);
        break;
      case 'mature':
        // Mature plants have rich, full colors
        break;
      case 'old':
        // Old plants may be slightly faded or have brown edges
        color.offsetHSL(-0.01, -0.05, -0.02);
        break;
    }
  }

  private static applyColorVariation(color: THREE.Color, variation: number): void {
    const variationAmount = 0.12 * variation;
    color.offsetHSL(
      (Math.random() - 0.5) * variationAmount * 0.3, // Subtle hue variation
      (Math.random() - 0.5) * variationAmount * 0.8, // More saturation variation
      (Math.random() - 0.5) * variationAmount * 0.6  // Moderate lightness variation
    );
  }

  private static applyWeatherEffects(color: THREE.Color): void {
    if (Math.random() < 0.3) { // 30% chance of weather effects
      // Simulate dust, moisture, or sun bleaching
      const effectType = Math.random();
      
      if (effectType < 0.4) {
        // Dust accumulation - slightly desaturated and darker
        color.offsetHSL(0, -0.1, -0.05);
      } else if (effectType < 0.7) {
        // Moisture - slightly darker and more saturated
        color.offsetHSL(0, 0.05, -0.03);
      } else {
        // Sun bleaching - lighter and less saturated
        color.offsetHSL(0, -0.08, 0.04);
      }
    }
  }

  private static addAdvancedSurfaceDetail(
    material: THREE.MeshStandardMaterial, 
    species: any,
    growthStage: 'juvenile' | 'mature' | 'old'
  ): void {
    // Create high-quality surface texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Base surface color
    ctx.fillStyle = '#80a060';
    ctx.fillRect(0, 0, 64, 64);
    
    // Create realistic leaf texture patterns
    this.generateLeafTexture(ctx, species, growthStage);
    
    const surfaceTexture = new THREE.CanvasTexture(canvas);
    surfaceTexture.wrapS = THREE.RepeatWrapping;
    surfaceTexture.wrapT = THREE.RepeatWrapping;
    surfaceTexture.repeat.set(3, 3);
    
    // Enhanced normal mapping
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 64;
    normalCanvas.height = 64;
    const normalCtx = normalCanvas.getContext('2d')!;
    
    this.generateNormalMap(normalCtx, species);
    
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(3, 3);
    
    material.map = surfaceTexture;
    material.normalMap = normalTexture;
    material.normalScale = new THREE.Vector2(0.4, 0.4);
    
    // Add subsurface scattering effect for realism
    if (this.currentSeason === 'spring' || this.currentSeason === 'summer') {
      material.transparent = true;
      material.opacity = 0.95;
    }
  }

  private static generateLeafTexture(
    ctx: CanvasRenderingContext2D, 
    species: any,
    growthStage: 'juvenile' | 'mature' | 'old'
  ): void {
    const imageData = ctx.createImageData(64, 64);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 64;
      const y = Math.floor((i / 4) / 64);
      
      // Create leaf-like patterns
      const leafPattern = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.3;
      const veinPattern = Math.sin(x * 0.8) * Math.sin(y * 0.6) * 0.1;
      const noisePattern = (Math.random() - 0.5) * 0.2;
      
      const intensity = 0.7 + leafPattern + veinPattern + noisePattern;
      const clampedIntensity = Math.max(0.3, Math.min(1, intensity));
      
      // Apply growth stage effects to texture
      let stageMultiplier = 1;
      switch (growthStage) {
        case 'juvenile':
          stageMultiplier = 1.1; // Brighter
          break;
        case 'old':
          stageMultiplier = 0.9; // Slightly faded
          break;
      }
      
      const finalIntensity = clampedIntensity * stageMultiplier;
      const value = Math.floor(finalIntensity * 255);
      
      data[i] = value * 0.6;     // R (green-tinted)
      data[i + 1] = value;       // G
      data[i + 2] = value * 0.4; // B (green-tinted)
      data[i + 3] = 255;         // A
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  private static generateNormalMap(ctx: CanvasRenderingContext2D, species: any): void {
    const imageData = ctx.createImageData(64, 64);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 64;
      const y = Math.floor((i / 4) / 64);
      
      // Create normal map for surface detail
      const normalX = Math.sin(x * 0.3) * 0.5 + 0.5;
      const normalY = Math.cos(y * 0.3) * 0.5 + 0.5;
      const normalZ = 0.8; // Mostly pointing up
      
      data[i] = Math.floor(normalX * 255);     // R (X normal)
      data[i + 1] = Math.floor(normalY * 255); // G (Y normal)
      data[i + 2] = Math.floor(normalZ * 255); // B (Z normal)
      data[i + 3] = 255;                       // A
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  public static createRealisticStemMaterial(species: any): THREE.MeshStandardMaterial {
    // Species-specific bark colors and textures
    const barkColor = new THREE.Color().setHSL(
      0.08 + Math.random() * 0.04, // Brown hue with variation
      0.3 + Math.random() * 0.2,   // Moderate saturation
      0.2 + Math.random() * 0.15   // Dark
    );
    
    return new THREE.MeshStandardMaterial({
      color: barkColor,
      roughness: 0.9 + Math.random() * 0.08,
      metalness: 0.0,
      transparent: false
    });
  }

  public static createSeasonalBerryMaterial(
    berryType: 'red' | 'blue' | 'purple' | 'white',
    ripeness: number = 1.0
  ): THREE.MeshStandardMaterial {
    let color: THREE.Color;
    
    switch (berryType) {
      case 'red':
        color = new THREE.Color().setHSL(0, 0.8 * ripeness, 0.4 + ripeness * 0.2);
        break;
      case 'blue':
        color = new THREE.Color().setHSL(0.6, 0.7 * ripeness, 0.3 + ripeness * 0.2);
        break;
      case 'purple':
        color = new THREE.Color().setHSL(0.8, 0.6 * ripeness, 0.3 + ripeness * 0.15);
        break;
      case 'white':
        color = new THREE.Color().setHSL(0, 0, 0.8 + ripeness * 0.15);
        break;
    }
      
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2 - ripeness * 0.1, // Riper berries are shinier
      metalness: 0.0,
      transparent: true,
      opacity: 0.85 + ripeness * 0.1
    });
  }
}
