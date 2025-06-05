
import * as THREE from 'three';
import { RockVariation } from './RockVariations';

export class RockMaterials {
  private static materialCache = new Map<string, THREE.MeshStandardMaterial>();

  static createRockMaterial(variation: RockVariation, shape: string): THREE.MeshStandardMaterial {
    const cacheKey = `${variation.name}_${shape}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!.clone();
    }

    const baseColor = this.getBaseColor(variation, shape);
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: this.getRoughness(variation, shape),
      metalness: this.getMetalness(variation, shape),
      map: this.createRockTexture(variation, shape)
    });

    this.materialCache.set(cacheKey, material);
    return material.clone();
  }

  private static getBaseColor(variation: RockVariation, shape: string): number {
    const colorVariations = {
      angular: [0x8B7355, 0x696969, 0x708090],
      rounded: [0xA0522D, 0x8B7765, 0x9F8170],
      jagged: [0x2F4F4F, 0x696969, 0x778899],
      smooth: [0xD2B48C, 0xBC9A6A, 0xF5DEB3],
      crystalline: [0xE6E6FA, 0xD8BFD8, 0xDDA0DD],
      weathered: [0x8B7D6B, 0x9C8E7A, 0xA0956D],
      stratified: [0x8B7355, 0x8B8680, 0x708090],
      fractured: [0x696969, 0x2F4F4F, 0x708090]
    };

    const colors = colorVariations[shape as keyof typeof colorVariations] || colorVariations.rounded;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private static getRoughness(variation: RockVariation, shape: string): number {
    const roughnessMap = {
      angular: 0.9,
      rounded: 0.7,
      jagged: 1.0,
      smooth: 0.3,
      crystalline: 0.1,
      weathered: 0.8,
      stratified: 0.6,
      fractured: 0.95
    };

    const baseRoughness = roughnessMap[shape as keyof typeof roughnessMap] || 0.7;
    return baseRoughness + (Math.random() - 0.5) * 0.2;
  }

  private static getMetalness(variation: RockVariation, shape: string): number {
    const metalnessMap = {
      angular: 0.1,
      rounded: 0.05,
      jagged: 0.15,
      smooth: 0.02,
      crystalline: 0.3,
      weathered: 0.0,
      stratified: 0.1,
      fractured: 0.2
    };

    return metalnessMap[shape as keyof typeof metalnessMap] || 0.1;
  }

  private static createRockTexture(variation: RockVariation, shape: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base texture
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 512, 512);

    // Add surface complexity based on variation
    const complexity = variation.surfaceComplexity.min + 
      Math.random() * (variation.surfaceComplexity.max - variation.surfaceComplexity.min);

    this.addTextureDetails(ctx, shape, complexity);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  private static addTextureDetails(ctx: CanvasRenderingContext2D, shape: string, complexity: number): void {
    const detailCount = Math.floor(complexity * 100);

    for (let i = 0; i < detailCount; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 10 + 2;
      
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100 + 50)}, ${Math.floor(Math.random() * 100 + 50)}, ${Math.floor(Math.random() * 100 + 50)}, 0.5)`;
      
      switch (shape) {
        case 'angular':
        case 'jagged':
          this.drawAngularDetail(ctx, x, y, size);
          break;
        case 'smooth':
        case 'rounded':
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'stratified':
          ctx.fillRect(x, y, size * 3, size * 0.5);
          break;
        default:
          ctx.fillRect(x, y, size, size);
      }
    }
  }

  private static drawAngularDetail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y + size * 0.3);
    ctx.lineTo(x + size * 0.3, y + size);
    ctx.closePath();
    ctx.fill();
  }

  static dispose(): void {
    for (const material of this.materialCache.values()) {
      material.dispose();
      if (material.map) material.map.dispose();
    }
    this.materialCache.clear();
  }
}
