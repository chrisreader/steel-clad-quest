
import * as THREE from 'three';

export class TextureGenerator {
  public static createWoodTexture(color: number = 0x8B4513): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = `rgb(${color >> 16 & 0xFF}, ${color >> 8 & 0xFF}, ${color & 0xFF})`;
    ctx.fillRect(0, 0, size, size);
    
    // Add wood grain lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    return texture;
  }
  
  public static createMetalTexture(color: number = 0xC0C0C0): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = `rgb(${color >> 16 & 0xFF}, ${color >> 8 & 0xFF}, ${color & 0xFF})`;
    ctx.fillRect(0, 0, size, size);
    
    // Add noise
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const value = Math.random() * 30 - 15;
        ctx.fillStyle = `rgba(${value}, ${value}, ${value}, 0.1)`;
        ctx.fillRect(i, j, 1, 1);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    return texture;
  }
}
