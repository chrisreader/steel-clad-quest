
import * as THREE from 'three';

export class EnhancedTextureGenerator {
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
    
    // Create realistic base color variations
    const baseR = (baseColor >> 16) & 255;
    const baseG = (baseColor >> 8) & 255;
    const baseB = baseColor & 255;
    
    // Base earth/dirt layer
    const earthColor = worn ? '#8B7355' : '#6B4423';
    ctx.fillStyle = earthColor;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add soil variation
    for (let i = 0; i < 200; i++) {
      const brightness = 0.8 + Math.random() * 0.4;
      const earthR = parseInt(earthColor.slice(1, 3), 16) * brightness;
      const earthG = parseInt(earthColor.slice(3, 5), 16) * brightness;
      const earthB = parseInt(earthColor.slice(5, 7), 16) * brightness;
      
      ctx.fillStyle = `rgba(${earthR}, ${earthG}, ${earthB}, 0.6)`;
      ctx.fillRect(
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * 8 + 2,
        Math.random() * 8 + 2
      );
    }
    
    // Generate realistic grass patches
    const grassDensity = worn ? density * 0.6 : density;
    const grassCount = Math.floor(grassDensity * 1500);
    
    for (let i = 0; i < grassCount; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      
      // Create grass color variation
      const colorVar = (Math.random() - 0.5) * variation;
      const seasonalVar = Math.random() * 0.2;
      
      const grassR = Math.max(0, Math.min(255, baseR + colorVar * 100 - seasonalVar * 50));
      const grassG = Math.max(0, Math.min(255, baseG + colorVar * 80 + seasonalVar * 30));
      const grassB = Math.max(0, Math.min(255, baseB + colorVar * 60 - seasonalVar * 40));
      
      // Draw individual grass blades with natural shapes
      this.drawGrassBlade(ctx, x, y, grassR, grassG, grassB);
    }
    
    // Add dirt paths if worn
    if (worn) {
      this.addDirtPaths(ctx);
    }
    
    // Add small rocks and debris
    this.addNaturalDebris(ctx);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    return texture;
  }
  
  /**
   * Draws a realistic grass blade
   */
  private static drawGrassBlade(
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
    
    // Create gradient for blade
    const gradient = ctx.createLinearGradient(0, 0, 0, -bladeHeight);
    gradient.addColorStop(0, `rgba(${r * 0.7}, ${g * 0.7}, ${b * 0.7}, 0.9)`); // Darker base
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.8)`); // Main color
    gradient.addColorStop(1, `rgba(${r * 1.2}, ${g * 1.2}, ${b * 0.8}, 0.6)`); // Lighter tip
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, -bladeHeight/2, bladeWidth/2, bladeHeight/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Adds natural dirt paths and worn areas
   */
  private static addDirtPaths(ctx: CanvasRenderingContext2D): void {
    const pathCount = Math.random() * 3 + 1;
    
    for (let i = 0; i < pathCount; i++) {
      const startX = Math.random() * 512;
      const startY = Math.random() * 512;
      const endX = Math.random() * 512;
      const endY = Math.random() * 512;
      
      ctx.strokeStyle = 'rgba(139, 115, 85, 0.6)';
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
   * Adds small rocks, twigs, and natural debris
   */
  private static addNaturalDebris(ctx: CanvasRenderingContext2D): void {
    // Small rocks
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 4 + 1;
      
      ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${95 + Math.random() * 40}, ${90 + Math.random() * 30}, 0.8)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Twigs and small debris
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const length = Math.random() * 8 + 3;
      const angle = Math.random() * Math.PI * 2;
      
      ctx.strokeStyle = `rgba(${101 + Math.random() * 40}, ${67 + Math.random() * 30}, ${33 + Math.random() * 20}, 0.7)`;
      ctx.lineWidth = Math.random() * 2 + 0.5;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
  }
  
  /**
   * Creates a normal map for grass texture to add surface detail
   */
  static createGrassNormalMap(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base normal (pointing up)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grass blade normal variations
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3 + 1;
      
      // Random normal direction for grass blades
      const normalX = Math.random() * 50 + 103; // Red channel (X normal)
      const normalY = Math.random() * 50 + 103; // Green channel (Y normal)
      const normalZ = Math.random() * 30 + 225; // Blue channel (Z normal, mostly up)
      
      ctx.fillStyle = `rgba(${normalX}, ${normalY}, ${normalZ}, 0.6)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
}
