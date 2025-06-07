
import * as THREE from 'three';

export class DirtTextureGenerator {
  static createDirtTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base dirt color - dark brown
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add dirt variations and organic texture
    const dirtPatches = 80;
    for (let i = 0; i < dirtPatches; i++) {
      const brightness = 0.3 + Math.random() * 0.4;
      const earthTone = Math.random() * 40 + 20; // Brown variations
      ctx.fillStyle = `rgba(${earthTone + 30}, ${earthTone + 10}, ${earthTone}, ${brightness})`;
      
      const size = Math.random() * 12 + 4;
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add small charred spots from previous fires
    const charredSpots = 15;
    for (let i = 0; i < charredSpots; i++) {
      ctx.fillStyle = `rgba(20, 15, 10, ${0.6 + Math.random() * 0.3})`;
      
      const size = Math.random() * 6 + 2;
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add tiny debris (twigs, small stones)
    const debris = 25;
    for (let i = 0; i < debris; i++) {
      const debrisColor = Math.random() > 0.7 ? '#555555' : '#654321'; // Stones or twigs
      ctx.fillStyle = debrisColor;
      
      const width = Math.random() * 3 + 1;
      const height = Math.random() * 8 + 2;
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const rotation = Math.random() * Math.PI * 2;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillRect(-width/2, -height/2, width, height);
      ctx.restore();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2); // Tile the texture for more detail
    
    return texture;
  }
}
