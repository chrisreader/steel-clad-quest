
import * as THREE from 'three';

export class LeafTextureGenerator {
  private static leafTexture: THREE.Texture | null = null;
  private static leafMaterial: THREE.MeshStandardMaterial | null = null;

  static getLeafTexture(): THREE.Texture {
    if (!this.leafTexture) {
      this.leafTexture = this.createLeafTexture();
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
        roughness: 0.8,
        metalness: 0.0,
        opacity: 0.95, // Increased opacity for better visibility
      });
    }
    return this.leafMaterial;
  }

  private static createLeafTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Increased resolution for better quality
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, 128, 128);

    // Create larger, more visible leaf shape
    ctx.fillStyle = '#4a7c28'; // Brighter green for better visibility
    ctx.beginPath();
    
    // Draw larger leaf shape
    ctx.moveTo(64, 8);
    ctx.bezierCurveTo(90, 20, 100, 50, 90, 80);
    ctx.bezierCurveTo(80, 100, 70, 110, 64, 120);
    ctx.bezierCurveTo(58, 110, 48, 100, 38, 80);
    ctx.bezierCurveTo(28, 50, 38, 20, 64, 8);
    ctx.closePath();
    ctx.fill();

    // Add prominent leaf vein
    ctx.strokeStyle = '#2d5016';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 16);
    ctx.lineTo(64, 112);
    ctx.stroke();

    // Add more visible side veins
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = 36 + i * 18;
      ctx.beginPath();
      ctx.moveTo(64, y);
      ctx.lineTo(48 + i * 2, y + 8);
      ctx.moveTo(64, y);
      ctx.lineTo(80 - i * 2, y + 8);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
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
  }
}
