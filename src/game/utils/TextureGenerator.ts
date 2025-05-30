
import * as THREE from 'three';

export class TextureGenerator {
  public static createGrassTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;

    // Create grass texture
    context.fillStyle = '#228B22';
    context.fillRect(0, 0, 256, 256);
    
    // Add some variation
    for (let i = 0; i < 1000; i++) {
      context.fillStyle = `hsl(${120 + Math.random() * 20}, 50%, ${30 + Math.random() * 20}%)`;
      context.fillRect(
        Math.random() * 256,
        Math.random() * 256,
        Math.random() * 4,
        Math.random() * 4
      );
    }

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public static createWoodTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;

    // Create wood texture
    context.fillStyle = '#8B4513';
    context.fillRect(0, 0, 256, 256);
    
    // Add wood grain
    for (let i = 0; i < 50; i++) {
      context.strokeStyle = `rgba(139, 69, 19, ${0.3 + Math.random() * 0.4})`;
      context.lineWidth = 1 + Math.random() * 3;
      context.beginPath();
      context.moveTo(0, Math.random() * 256);
      context.lineTo(256, Math.random() * 256);
      context.stroke();
    }

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public static createStoneTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;

    // Create stone texture
    context.fillStyle = '#696969';
    context.fillRect(0, 0, 256, 256);
    
    // Add stone details
    for (let i = 0; i < 200; i++) {
      context.fillStyle = `rgba(105, 105, 105, ${0.5 + Math.random() * 0.5})`;
      context.fillRect(
        Math.random() * 256,
        Math.random() * 256,
        Math.random() * 8,
        Math.random() * 8
      );
    }

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
}
