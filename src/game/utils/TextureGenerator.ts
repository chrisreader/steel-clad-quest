
import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Creates a wood texture with customizable properties
   */
  static createWoodTexture(
    baseColor: number = 0xD2691E,
    grainCount: number = 20,
    grainOpacity: number = 0.3
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base color
    ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 256, 256);
    
    // Wood grain
    for (let i = 0; i < grainCount; i++) {
      const opacity = Math.random() * 0.4 + grainOpacity;
      ctx.strokeStyle = `rgba(210, 180, 140, ${opacity})`;
      ctx.lineWidth = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * 256);
      ctx.lineTo(256, Math.random() * 256);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a stone texture with customizable properties
   */
  static createStoneTexture(
    baseColor: number = 0xA0A0A0,
    detailCount: number = 100,
    detailIntensity: number = 0.2
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base color
    ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 256, 256);
    
    // Stone details
    for (let i = 0; i < detailCount; i++) {
      const brightness = Math.random() * 0.4 + 0.6;
      ctx.fillStyle = `rgba(${brightness * 255}, ${brightness * 255}, ${brightness * 255}, ${detailIntensity})`;
      ctx.fillRect(
        Math.random() * 256, 
        Math.random() * 256, 
        Math.random() * 8 + 2, 
        Math.random() * 8 + 2
      );
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a grass texture with customizable properties
   */
  static createGrassTexture(
    baseColor: number = 0x32CD32,
    detailCount: number = 200,
    variation: number = 40
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base color
    ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 256, 256);
    
    // Grass variation
    for (let i = 0; i < detailCount; i++) {
      const hue = 100 + Math.random() * variation;
      const sat = 50 + Math.random() * 30;
      const light = 40 + Math.random() * 40;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
      ctx.fillRect(
        Math.random() * 256, 
        Math.random() * 256, 
        Math.random() * 4 + 1, 
        Math.random() * 4 + 1
      );
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a metal texture with customizable properties
   */
  static createMetalTexture(
    baseColor: number = 0xE0E0E0,
    scratchCount: number = 30,
    scratchOpacity: number = 0.3
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Base color
    ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 128, 128);
    
    // Metal scratches
    for (let i = 0; i < scratchCount; i++) {
      ctx.strokeStyle = `rgba(200, 200, 200, ${Math.random() * scratchOpacity})`;
      ctx.lineWidth = Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 128, Math.random() * 128);
      ctx.lineTo(Math.random() * 128, Math.random() * 128);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a water texture with customizable properties
   */
  static createWaterTexture(
    baseColor: number = 0x4169E1,
    waveCount: number = 50,
    timeOffset: number = 0
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base color
    ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 256, 256);
    
    // Water waves
    for (let i = 0; i < waveCount; i++) {
      const x = i * (256 / waveCount);
      const hue = 210 + Math.sin(x / 30 + timeOffset) * 10;
      const sat = 70 + Math.sin(x / 20 + timeOffset) * 10;
      const light = 60 + Math.sin(x / 10 + timeOffset) * 10;
      
      ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.3)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let y = 0; y < 256; y += 5) {
        const offset = Math.sin(y / 20 + timeOffset) * 5;
        if (y === 0) {
          ctx.moveTo(x + offset, y);
        } else {
          ctx.lineTo(x + offset, y);
        }
      }
      
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a fire texture with customizable properties
   */
  static createFireTexture(
    intensity: number = 1.0,
    speed: number = 1.0,
    timeOffset: number = 0
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    
    // Gradient for fire
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, `rgba(255, 255, 0, ${0.9 * intensity})`);
    gradient.addColorStop(0.3, `rgba(255, 120, 0, ${0.8 * intensity})`);
    gradient.addColorStop(0.6, `rgba(200, 0, 0, ${0.6 * intensity})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    // Fire effect
    for (let x = 0; x < 256; x += 4) {
      const height = 150 + Math.sin(x / 10 + timeOffset * speed) * 20 + Math.sin(x / 5 + timeOffset * speed * 2) * 10;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, 256 - height, 4, height);
    }
    
    // Add some particles/embers
    for (let i = 0; i < 50 * intensity; i++) {
      const particleSize = Math.random() * 3 + 1;
      const x = Math.random() * 256;
      const y = 256 - Math.random() * 200;
      const alpha = Math.random() * 0.7 + 0.3;
      
      ctx.fillStyle = `rgba(255, ${Math.random() * 200 + 55}, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a sky texture with day/night cycle support
   */
  static createSkyTexture(
    timeOfDay: number = 0.5, // 0-1, 0 = midnight, 0.5 = noon
    cloudCoverage: number = 0.3,
    starDensity: number = 0.001
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Time of day determines sky color
    let skyColor;
    let horizonColor;
    let cloudColor;
    
    if (timeOfDay < 0.25) { // Night
      const nightProgress = 1 - (timeOfDay / 0.25);
      skyColor = `rgb(0, 10, ${30 + nightProgress * 40})`;
      horizonColor = `rgb(10, 20, ${40 + nightProgress * 30})`;
      cloudColor = `rgba(20, 30, 50, ${0.5 * nightProgress})`;
    } else if (timeOfDay < 0.3) { // Dawn
      const dawnProgress = (timeOfDay - 0.25) / 0.05;
      skyColor = `rgb(${dawnProgress * 100}, ${dawnProgress * 50}, ${40 + dawnProgress * 160})`;
      horizonColor = `rgb(${100 + dawnProgress * 155}, ${50 + dawnProgress * 100}, ${70 + dawnProgress * 100})`;
      cloudColor = `rgba(${180 + dawnProgress * 75}, ${100 + dawnProgress * 100}, ${100 + dawnProgress * 100}, 0.6)`;
    } else if (timeOfDay < 0.7) { // Day
      const dayProgress = (timeOfDay - 0.3) / 0.4;
      const intensity = Math.sin(dayProgress * Math.PI);
      skyColor = `rgb(80, ${130 + intensity * 125}, ${200 + intensity * 55})`;
      horizonColor = `rgb(${180 + intensity * 75}, ${180 + intensity * 75}, ${180 + intensity * 75})`;
      cloudColor = `rgba(255, 255, 255, ${0.7 + intensity * 0.3})`;
    } else if (timeOfDay < 0.75) { // Dusk
      const duskProgress = (timeOfDay - 0.7) / 0.05;
      skyColor = `rgb(${100 - duskProgress * 100}, ${150 - duskProgress * 100}, ${200 - duskProgress * 100})`;
      horizonColor = `rgb(${255 - duskProgress * 100}, ${150 - duskProgress * 50}, ${100 - duskProgress * 30})`;
      cloudColor = `rgba(${255 - duskProgress * 100}, ${150 - duskProgress * 50}, ${100 - duskProgress * 50}, 0.6)`;
    } else { // Night
      const nightProgress = (timeOfDay - 0.75) / 0.25;
      skyColor = `rgb(${10 - nightProgress * 10}, ${20 - nightProgress * 10}, ${50 - nightProgress * 20})`;
      horizonColor = `rgb(${50 - nightProgress * 40}, ${30 - nightProgress * 10}, ${70 - nightProgress * 30})`;
      cloudColor = `rgba(20, 30, 50, ${0.5 * nightProgress})`;
    }
    
    // Create gradient for sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, skyColor);
    gradient.addColorStop(1, horizonColor);
    
    // Draw sky
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars at night
    if (timeOfDay < 0.3 || timeOfDay > 0.7) {
      const starCount = Math.floor(canvas.width * canvas.height * starDensity);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      
      for (let i = 0; i < starCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.7; // Stars only in the upper part
        const size = Math.random() * 2 + 0.5;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw sun or moon
    const celestialBodySize = canvas.width * 0.05;
    let celestialBodyX, celestialBodyY;
    
    if (timeOfDay >= 0.25 && timeOfDay <= 0.75) {
      // Sun position based on time of day
      const sunProgress = (timeOfDay - 0.25) / 0.5; // 0 to 1 for sun's arc
      celestialBodyX = canvas.width * sunProgress;
      celestialBodyY = canvas.height * 0.2 - Math.sin(sunProgress * Math.PI) * canvas.height * 0.6;
      
      // Draw sun
      const sunGradient = ctx.createRadialGradient(
        celestialBodyX, celestialBodyY, 0,
        celestialBodyX, celestialBodyY, celestialBodySize
      );
      sunGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
      sunGradient.addColorStop(0.3, 'rgba(255, 200, 50, 1)');
      sunGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(celestialBodyX, celestialBodyY, celestialBodySize * 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Moon position
      const moonProgress = timeOfDay < 0.25 ? (0.25 - timeOfDay) / 0.25 : (timeOfDay - 0.75) / 0.25;
      celestialBodyX = canvas.width * moonProgress;
      celestialBodyY = canvas.height * 0.2 - Math.sin(moonProgress * Math.PI) * canvas.height * 0.4;
      
      // Draw moon
      ctx.fillStyle = 'rgba(220, 220, 240, 0.9)';
      ctx.beginPath();
      ctx.arc(celestialBodyX, celestialBodyY, celestialBodySize * 0.7, 0, Math.PI * 2);
      ctx.fill();
      
      // Moon craters
      ctx.fillStyle = 'rgba(200, 200, 220, 0.8)';
      for (let i = 0; i < 5; i++) {
        const craterX = celestialBodyX + (Math.random() - 0.5) * celestialBodySize * 0.8;
        const craterY = celestialBodyY + (Math.random() - 0.5) * celestialBodySize * 0.8;
        const craterSize = Math.random() * celestialBodySize * 0.2 + celestialBodySize * 0.05;
        
        ctx.beginPath();
        ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw clouds
    ctx.fillStyle = cloudColor;
    const cloudCount = Math.floor(canvas.width / 200 * cloudCoverage);
    
    for (let i = 0; i < cloudCount; i++) {
      const cloudX = Math.random() * canvas.width;
      const cloudY = canvas.height * (0.2 + Math.random() * 0.3);
      const cloudWidth = 100 + Math.random() * 200;
      const cloudHeight = 30 + Math.random() * 50;
      
      for (let j = 0; j < 5; j++) {
        const blobX = cloudX + (Math.random() - 0.5) * cloudWidth * 0.5;
        const blobY = cloudY + (Math.random() - 0.5) * cloudHeight * 0.5;
        const blobRadius = cloudWidth * 0.2 + Math.random() * cloudWidth * 0.1;
        
        ctx.beginPath();
        ctx.arc(blobX, blobY, blobRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a smoke/fog texture
   */
  static createSmokeTexture(
    density: number = 0.5,
    color: number = 0xCCCCCC
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Convert color to RGB
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    // Create perlin-like noise
    const octaves = 4;
    const particles = Math.floor(50 * density);
    
    for (let i = 0; i < particles; i++) {
      const size = Math.random() * 50 + 30;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const alpha = Math.random() * 0.2 + 0.05;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.transparent = true;
    return texture;
  }
}
