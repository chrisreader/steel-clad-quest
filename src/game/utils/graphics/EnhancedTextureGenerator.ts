
import * as THREE from 'three';

export class EnhancedTextureGenerator {
  // Realistic color palettes based on natural observations
  private static readonly REALISTIC_COLORS = {
    grass: {
      spring: [
        { r: 85, g: 145, b: 95 },   // Fresh spring green
        { r: 95, g: 155, b: 85 },   // Bright new growth
        { r: 75, g: 135, b: 75 },   // Deeper spring green
        { r: 105, g: 165, b: 95 },  // Light spring green
      ],
      summer: [
        { r: 65, g: 120, b: 55 },   // Mature summer green
        { r: 75, g: 130, b: 65 },   // Standard grass green
        { r: 55, g: 110, b: 45 },   // Deep summer green
        { r: 85, g: 140, b: 75 },   // Lighter summer green
      ],
      autumn: [
        { r: 95, g: 115, b: 45 },   // Yellowing grass
        { r: 85, g: 105, b: 35 },   // Brown-green transition
        { r: 105, g: 125, b: 55 },  // Golden grass
        { r: 75, g: 95, b: 25 },    // Dried grass
      ],
      worn: [
        { r: 85, g: 95, b: 45 },    // Sparse worn grass
        { r: 95, g: 105, b: 55 },   // Patchy grass
        { r: 65, g: 85, b: 35 },    // Stressed grass
      ]
    },
    soil: {
      rich: [
        { r: 101, g: 67, b: 33 },   // Rich dark soil
        { r: 111, g: 77, b: 43 },   // Medium brown soil
        { r: 91, g: 57, b: 23 },    // Deep earth
        { r: 121, g: 87, b: 53 },   // Lighter brown soil
      ],
      sandy: [
        { r: 139, g: 115, b: 85 },  // Sandy soil
        { r: 149, g: 125, b: 95 },  // Light sandy soil
        { r: 129, g: 105, b: 75 },  // Darker sandy soil
        { r: 159, g: 135, b: 105 }, // Very light sandy soil
      ],
      clay: [
        { r: 85, g: 75, b: 65 },    // Clay soil
        { r: 95, g: 85, b: 75 },    // Light clay
        { r: 75, g: 65, b: 55 },    // Dark clay
        { r: 105, g: 95, b: 85 },   // Weathered clay
      ]
    },
    rocks: [
      { r: 120, g: 115, b: 110 },   // Limestone gray
      { r: 95, g: 90, b: 85 },      // Dark granite
      { r: 135, g: 125, b: 115 },   // Light sandstone
      { r: 85, g: 75, b: 70 },      // Dark shale
      { r: 145, g: 140, b: 130 },   // Weathered stone
    ],
    debris: [
      { r: 101, g: 67, b: 33 },     // Brown twig
      { r: 111, g: 77, b: 43 },     // Light brown bark
      { r: 81, g: 57, b: 23 },      // Dark wood
      { r: 91, g: 71, b: 41 },      // Weathered wood
    ]
  };

  /**
   * Creates highly realistic grass texture with natural variations
   */
  static createRealisticGrassTexture(
    baseColor: number = 0x4A7C59,
    variation: number = 0.3,
    density: number = 0.8,
    worn: boolean = false
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Determine season and soil type based on base color
    const season = this.determineSeasonFromColor(baseColor);
    const soilType = worn ? 'sandy' : 'rich';
    
    // Create realistic base soil layer
    this.createRealisticSoilBase(ctx, soilType, 512, 512);
    
    // Generate realistic grass patches
    const grassDensity = worn ? density * 0.6 : density;
    const grassCount = Math.floor(grassDensity * 1200);
    
    for (let i = 0; i < grassCount; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      
      // Select realistic grass color
      const grassColors = worn ? this.REALISTIC_COLORS.grass.worn : this.REALISTIC_COLORS.grass[season];
      const baseGrassColor = grassColors[Math.floor(Math.random() * grassColors.length)];
      
      // Add natural variation
      const colorVar = (Math.random() - 0.5) * variation * 60;
      const grassR = Math.max(20, Math.min(255, baseGrassColor.r + colorVar));
      const grassG = Math.max(30, Math.min(255, baseGrassColor.g + colorVar * 0.8));
      const grassB = Math.max(15, Math.min(255, baseGrassColor.b + colorVar * 0.6));
      
      // Draw individual grass blades with natural shapes
      this.drawRealisticGrassBlade(ctx, x, y, grassR, grassG, grassB);
    }
    
    // Add dirt paths if worn
    if (worn) {
      this.addRealisticDirtPaths(ctx, soilType);
    }
    
    // Add natural debris with realistic colors
    this.addRealisticNaturalDebris(ctx);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    return texture;
  }
  
  /**
   * Creates realistic soil base with proper color variations
   */
  private static createRealisticSoilBase(
    ctx: CanvasRenderingContext2D, 
    soilType: 'rich' | 'sandy' | 'clay',
    width: number,
    height: number
  ): void {
    const soilColors = this.REALISTIC_COLORS.soil[soilType];
    const primarySoil = soilColors[0];
    
    // Base soil layer
    ctx.fillStyle = `rgb(${primarySoil.r}, ${primarySoil.g}, ${primarySoil.b})`;
    ctx.fillRect(0, 0, width, height);
    
    // Add realistic soil variation
    for (let i = 0; i < 250; i++) {
      const soilColor = soilColors[Math.floor(Math.random() * soilColors.length)];
      const brightness = 0.85 + Math.random() * 0.3;
      
      const varR = Math.max(10, Math.min(255, soilColor.r * brightness));
      const varG = Math.max(10, Math.min(255, soilColor.g * brightness));
      const varB = Math.max(10, Math.min(255, soilColor.b * brightness));
      
      ctx.fillStyle = `rgba(${varR}, ${varG}, ${varB}, 0.7)`;
      ctx.fillRect(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 8 + 2,
        Math.random() * 8 + 2
      );
    }
  }
  
  /**
   * Draws a realistic grass blade with natural colors and shape
   */
  private static drawRealisticGrassBlade(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number
  ): void {
    const bladeHeight = Math.random() * 6 + 2;
    const bladeWidth = Math.random() * 1.5 + 0.5;
    const bendAngle = (Math.random() - 0.5) * 0.3;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bendAngle);
    
    // Create realistic gradient for blade
    const gradient = ctx.createLinearGradient(0, 0, 0, -bladeHeight);
    
    // Darker base (soil contact)
    gradient.addColorStop(0, `rgba(${r * 0.6}, ${g * 0.7}, ${b * 0.5}, 0.9)`);
    // Main color (middle section)
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.85)`);
    gradient.addColorStop(0.7, `rgba(${r * 1.1}, ${g * 1.05}, ${b * 0.9}, 0.8)`);
    // Lighter tip (sun exposure)
    gradient.addColorStop(1, `rgba(${Math.min(255, r * 1.3)}, ${Math.min(255, g * 1.2)}, ${Math.min(255, b * 1.1)}, 0.6)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, -bladeHeight/2, bladeWidth/2, bladeHeight/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Adds natural dirt paths with realistic soil colors
   */
  private static addRealisticDirtPaths(ctx: CanvasRenderingContext2D, soilType: string): void {
    const pathCount = Math.random() * 3 + 1;
    const soilColors = this.REALISTIC_COLORS.soil[soilType as keyof typeof this.REALISTIC_COLORS.soil];
    
    for (let i = 0; i < pathCount; i++) {
      const startX = Math.random() * 512;
      const startY = Math.random() * 512;
      const endX = Math.random() * 512;
      const endY = Math.random() * 512;
      
      const pathSoil = soilColors[Math.floor(Math.random() * soilColors.length)];
      ctx.strokeStyle = `rgba(${pathSoil.r + 20}, ${pathSoil.g + 15}, ${pathSoil.b + 10}, 0.8)`;
      ctx.lineWidth = Math.random() * 20 + 10;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      // Create curved path
      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 100;
      const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 100;
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
    }
  }
  
  /**
   * Adds rocks, twigs, and natural debris with realistic colors
   */
  private static addRealisticNaturalDebris(ctx: CanvasRenderingContext2D): void {
    // Small rocks with realistic stone colors
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 4 + 1;
      
      const rockColor = this.REALISTIC_COLORS.rocks[Math.floor(Math.random() * this.REALISTIC_COLORS.rocks.length)];
      const brightness = 0.8 + Math.random() * 0.4;
      
      const rockR = Math.max(50, Math.min(255, rockColor.r * brightness));
      const rockG = Math.max(50, Math.min(255, rockColor.g * brightness));
      const rockB = Math.max(50, Math.min(255, rockColor.b * brightness));
      
      ctx.fillStyle = `rgba(${rockR}, ${rockG}, ${rockB}, 0.85)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add subtle highlight for realism
      ctx.fillStyle = `rgba(${Math.min(255, rockR + 25)}, ${Math.min(255, rockG + 20)}, ${Math.min(255, rockB + 15)}, 0.4)`;
      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Twigs and small debris with natural wood colors
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const length = Math.random() * 8 + 3;
      const angle = Math.random() * Math.PI * 2;
      
      const debrisColor = this.REALISTIC_COLORS.debris[Math.floor(Math.random() * this.REALISTIC_COLORS.debris.length)];
      const brightness = 0.7 + Math.random() * 0.5;
      
      const debrisR = Math.max(30, Math.min(255, debrisColor.r * brightness));
      const debrisG = Math.max(25, Math.min(255, debrisColor.g * brightness));
      const debrisB = Math.max(20, Math.min(255, debrisColor.b * brightness));
      
      ctx.strokeStyle = `rgba(${debrisR}, ${debrisG}, ${debrisB}, 0.75)`;
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
  }
  
  /**
   * Determines season based on base color input
   */
  private static determineSeasonFromColor(baseColor: number): 'spring' | 'summer' | 'autumn' {
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    
    // Analyze color temperature and saturation
    if (g > r + 20 && g > b + 30) {
      return r < 80 ? 'summer' : 'spring';
    } else if (r > g + 10) {
      return 'autumn';
    } else {
      return 'summer';
    }
  }
  
  /**
   * Creates a normal map for grass texture to add surface detail
   */
  static createGrassNormalMap(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base normal (pointing up) - more neutral base
    ctx.fillStyle = 'rgb(128, 128, 240)';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grass blade normal variations with more subtle colors
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3 + 1;
      
      // More subtle normal direction variations
      const normalX = Math.random() * 30 + 113; // Red channel (X normal)
      const normalY = Math.random() * 30 + 113; // Green channel (Y normal)
      const normalZ = Math.random() * 20 + 235; // Blue channel (Z normal, mostly up)
      
      ctx.fillStyle = `rgba(${normalX}, ${normalY}, ${normalZ}, 0.5)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
}
