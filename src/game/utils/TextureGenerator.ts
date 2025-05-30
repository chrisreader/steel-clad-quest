
import * as THREE from 'three';
import { TextureCache } from './TextureCache';

export class TextureGenerator {
  private static cache = TextureCache.getInstance();
  
  public static createGrassTexture(): THREE.Texture {
    return this.cache.getTexture('grass', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Simple grass texture
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#4a7c4a');
      gradient.addColorStop(1, '#2d5a2d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
      
      // Add some noise
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 50 + 30}, ${Math.random() * 80 + 100}, ${Math.random() * 50 + 30}, 0.3)`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      return texture;
    });
  }
  
  public static createWoodTexture(color?: number): THREE.Texture {
    const baseColor = color || 0x8B4513;
    return this.cache.getTexture(`wood_${baseColor}`, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Simple wood texture
      ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, 256, 256);
      
      // Wood grain lines
      for (let i = 0; i < 20; i++) {
        ctx.strokeStyle = `rgba(139, 69, 19, ${Math.random() * 0.5 + 0.2})`;
        ctx.lineWidth = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.moveTo(0, i * 12);
        ctx.lineTo(256, i * 12 + Math.random() * 20 - 10);
        ctx.stroke();
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    });
  }
  
  public static createMetalTexture(color?: number): THREE.Texture {
    const baseColor = color || 0x888888;
    return this.cache.getTexture(`metal_${baseColor}`, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Simple metal texture
      ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, 256, 256);
      
      // Metal scratches and highlights
      for (let i = 0; i < 30; i++) {
        const alpha = Math.random() * 0.3 + 0.1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.random() * 2 + 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.random() * 256, Math.random() * 256);
        ctx.lineTo(Math.random() * 256, Math.random() * 256);
        ctx.stroke();
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    });
  }
  
  public static createStoneTexture(): THREE.Texture {
    return this.cache.getTexture('stone', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // Simple stone texture
      ctx.fillStyle = '#696969';
      ctx.fillRect(0, 0, 256, 256);
      
      // Stone pattern
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 50 + 80}, ${Math.random() * 50 + 80}, ${Math.random() * 50 + 80}, 0.5)`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 8 + 2, Math.random() * 8 + 2);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    });
  }
  
  public static createSkyTexture(timeOfDay: number = 0.5): THREE.Texture {
    return this.cache.getTexture(`sky_${timeOfDay}`, () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#E0F6FF');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    });
  }
}
