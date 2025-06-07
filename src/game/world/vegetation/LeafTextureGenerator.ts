
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
      });
    }
    return this.leafMaterial;
  }

  private static createLeafTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, 64, 64);

    // Create leaf shape with alpha
    ctx.fillStyle = '#4a7c28';
    ctx.beginPath();
    
    // Draw leaf shape
    ctx.moveTo(32, 4);
    ctx.bezierCurveTo(45, 10, 50, 25, 45, 40);
    ctx.bezierCurveTo(40, 50, 35, 55, 32, 60);
    ctx.bezierCurveTo(29, 55, 24, 50, 19, 40);
    ctx.bezierCurveTo(14, 25, 19, 10, 32, 4);
    ctx.closePath();
    ctx.fill();

    // Add leaf vein
    ctx.strokeStyle = '#2d5016';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(32, 56);
    ctx.stroke();

    // Add side veins
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const y = 18 + i * 12;
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(25 + i, y + 5);
      ctx.moveTo(32, y);
      ctx.lineTo(39 - i, y + 5);
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
