
import * as THREE from 'three';

export class LeafTextureGenerator {
  private static leafTexture: THREE.Texture | null = null;
  private static leafMaterial: THREE.MeshStandardMaterial | null = null;
  private static leafGeometryCache = new Map<string, THREE.PlaneGeometry>();

  static getLeafTexture(): THREE.Texture {
    if (!this.leafTexture) {
      this.leafTexture = this.createEnhancedLeafTexture();
    }
    return this.leafTexture;
  }

  static getLeafMaterial(): THREE.MeshStandardMaterial {
    if (!this.leafMaterial) {
      this.leafMaterial = new THREE.MeshStandardMaterial({
        map: this.getLeafTexture(),
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
        roughness: 0.75,
        metalness: 0.0,
      });
    }
    return this.leafMaterial;
  }

  static getLeafGeometry(size: number): THREE.PlaneGeometry {
    const sizeKey = size.toFixed(2);
    
    if (!this.leafGeometryCache.has(sizeKey)) {
      // Create leaf-shaped geometry with slight variation
      const width = size;
      const height = size * (1.2 + Math.random() * 0.2); // 1.2-1.4 aspect ratio
      const geometry = new THREE.PlaneGeometry(width, height);
      this.leafGeometryCache.set(sizeKey, geometry);
    }
    
    return this.leafGeometryCache.get(sizeKey)!;
  }

  private static createEnhancedLeafTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Increased resolution
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, 128, 128);

    // Create enhanced leaf shape with better contrast
    const centerX = 64;
    const centerY = 64;
    
    // Create gradient for natural leaf coloring
    const gradient = ctx.createRadialGradient(centerX, centerY * 0.7, 0, centerX, centerY, 50);
    gradient.addColorStop(0, '#6B8E3D'); // Bright center
    gradient.addColorStop(0.6, '#4A7C28'); // Medium green
    gradient.addColorStop(1, '#2D5016'); // Dark edges
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    // Draw more realistic leaf shape
    ctx.moveTo(centerX, 10); // Top point
    ctx.bezierCurveTo(centerX + 25, 20, centerX + 35, 35, centerX + 30, 55); // Right curve
    ctx.bezierCurveTo(centerX + 25, 75, centerX + 15, 85, centerX + 8, 95); // Right bottom
    ctx.bezierCurveTo(centerX + 3, 105, centerX - 3, 110, centerX, 118); // Bottom point
    ctx.bezierCurveTo(centerX - 3, 110, centerX - 3, 105, centerX - 8, 95); // Left bottom
    ctx.bezierCurveTo(centerX - 15, 85, centerX - 25, 75, centerX - 30, 55); // Left curve
    ctx.bezierCurveTo(centerX - 35, 35, centerX - 25, 20, centerX, 10); // Left top
    ctx.closePath();
    ctx.fill();

    // Add central vein with better visibility
    ctx.strokeStyle = '#2D5016';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 15);
    ctx.lineTo(centerX, 110);
    ctx.stroke();

    // Add side veins for more detail
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#3C5E2E';
    for (let i = 0; i < 5; i++) {
      const y = 25 + i * 15;
      const offset = (i + 1) * 3;
      
      // Left side veins
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX - 8 - offset, y + 8);
      ctx.stroke();
      
      // Right side veins
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX + 8 + offset, y + 8);
      ctx.stroke();
    }

    // Add subtle texture with noise
    const imageData = ctx.getImageData(0, 0, 128, 128);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Add slight random variation to RGB channels
      if (data[i + 3] > 0) { // Only modify non-transparent pixels
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  static createVariedLeafMaterial(variation: number = 0): THREE.MeshStandardMaterial {
    // Create slight color variations for different leaves
    const baseColor = new THREE.Color(0x4a7c28);
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    
    // Apply variation
    hsl.h += (variation - 0.5) * 0.1; // ±5% hue variation
    hsl.s += (Math.random() - 0.5) * 0.2; // ±10% saturation variation
    hsl.l += (Math.random() - 0.5) * 0.1; // ±5% lightness variation
    
    // Clamp values
    hsl.s = Math.max(0.3, Math.min(1.0, hsl.s));
    hsl.l = Math.max(0.2, Math.min(0.7, hsl.l));
    
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);

    return new THREE.MeshStandardMaterial({
      map: this.getLeafTexture(),
      color: baseColor,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      roughness: 0.7 + Math.random() * 0.2,
      metalness: 0.0,
    });
  }

  static dispose(): void {
    if (this.leafTexture) {
      this.leafTexture.dispose();
      this.leafTexture = null;
    }
    if (this.leafMaterial) {
      this.leafMaterial.dispose();
      this.leafMaterial = null;
    }
    this.leafGeometryCache.forEach(geometry => geometry.dispose());
    this.leafGeometryCache.clear();
  }
}
