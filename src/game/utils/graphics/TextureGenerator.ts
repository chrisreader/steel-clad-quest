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
   * Creates a realistic grass texture with natural colors and variations - FIXED VERSION
   */
  static createRealisticGrassTexture(
    baseColor: number = 0x3A7A3A,
    ringIndex: number = 0
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    // Reduced canvas size for better performance
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Extract RGB from base color for proper color integration
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    
    // Use the actual ring color as foundation instead of hardcoded values
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, 256, 256);
    
    // Reduced grass density to prevent overdraw and glitching
    const grassDensity = 300 + ringIndex * 50; // Reduced from 800+200
    
    // Create natural grass blades with directional strokes
    for (let i = 0; i < grassDensity; i++) {
      // Use base color as reference for natural grass variations
      const grassHue = this.rgbToHsl(r, g, b)[0] + Math.random() * 20 - 10; // Stay close to ring color
      const grassSat = 40 + Math.random() * 20 + ringIndex * 3;
      const grassLight = 30 + Math.random() * 25;
      
      ctx.fillStyle = `hsla(${grassHue}, ${grassSat}%, ${grassLight}%, ${0.4 + Math.random() * 0.3})`;
      
      // More natural grass blade shapes - vertical strokes
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const width = Math.random() * 1.5 + 0.5;
      const height = Math.random() * 3 + 1;
      
      // Draw vertical grass blades
      ctx.fillRect(x, y, width, height);
    }
    
    // Reduced dirt patches to prevent visual noise
    const dirtPatches = 30 - ringIndex * 3; // Reduced from 80-10
    for (let i = 0; i < dirtPatches; i++) {
      // Use soil color that complements the ring color
      const soilBrightness = Math.max(15, (r + g + b) / 3 * 0.4);
      ctx.fillStyle = `hsla(30, 30%, ${soilBrightness}%, 0.2)`;
      
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 4 + 2; // Smaller dirt patches
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Subtle grass clumps for depth
    const clumps = 20; // Reduced from 60
    for (let i = 0; i < clumps; i++) {
      const clumpHue = this.rgbToHsl(r, g, b)[0] + Math.random() * 15 - 7.5;
      const clumpLight = Math.max(10, (r + g + b) / 3 * 0.3);
      ctx.fillStyle = `hsla(${clumpHue}, 50%, ${clumpLight}%, 0.3)`;
      
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 3 + 1; // Smaller clumps
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    
    // Improved texture filtering to reduce glitching
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    
    // Remove duplicate texture repeat - let GroundMaterialUtils handle this
    
    return texture;
  }

  // Helper function to convert RGB to HSL
  private static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }
    
    return [h * 360, s * 100, l * 100];
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
   * Creates a sky texture with day/night cycle support - NO SUN OR MOON - DEEPER BLUE
   */
  static createSkyTexture(
    timeOfDay: number = 0.5, // 0-1, 0 = midnight, 0.5 = noon
    cloudCoverage: number = 0.3,
    starDensity: number = 0.001
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Time of day determines sky color - using DEEPER blue tones for day
    let skyColor;
    let horizonColor;
    
    if (timeOfDay < 0.25) { // Night
      const nightProgress = 1 - (timeOfDay / 0.25);
      skyColor = `rgb(15, 25, ${45 + nightProgress * 30})`; // Dark blue night sky
      horizonColor = `rgb(25, 35, ${55 + nightProgress * 25})`;
    } else if (timeOfDay < 0.3) { // Dawn
      const dawnProgress = (timeOfDay - 0.25) / 0.05;
      skyColor = `rgb(${70 + dawnProgress * 50}, ${90 + dawnProgress * 70}, ${150 + dawnProgress * 80})`; // Dawn blue
      horizonColor = `rgb(${180 + dawnProgress * 75}, ${120 + dawnProgress * 80}, ${100 + dawnProgress * 80})`;
    } else if (timeOfDay < 0.7) { // Day - MUCH DEEPER BLUE SKY
      const dayProgress = (timeOfDay - 0.3) / 0.4;
      const intensity = Math.sin(dayProgress * Math.PI);
      // DEEPER blue sky colors - much more saturated and realistic
      skyColor = `rgb(${40 + intensity * 20}, ${120 + intensity * 35}, ${180 + intensity * 20})`; // Much deeper azure blue
      horizonColor = `rgb(${90 + intensity * 30}, ${140 + intensity * 30}, ${160 + intensity * 20})`; // Deeper blue horizon
    } else if (timeOfDay < 0.75) { // Dusk
      const duskProgress = (timeOfDay - 0.7) / 0.05;
      skyColor = `rgb(${60 - duskProgress * 20}, ${120 - duskProgress * 40}, ${180 - duskProgress * 50})`; // Deeper dusk blue
      horizonColor = `rgb(${180 - duskProgress * 60}, ${130 - duskProgress * 30}, ${140 - duskProgress * 20})`;
    } else { // Night
      const nightProgress = (timeOfDay - 0.75) / 0.25;
      skyColor = `rgb(${20 - nightProgress * 5}, ${30 - nightProgress * 5}, ${60 - nightProgress * 15})`; // Deep night blue
      horizonColor = `rgb(${40 - nightProgress * 15}, ${45 - nightProgress * 10}, ${70 - nightProgress * 15})`;
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
    
    // NO SUN OR MOON - removed to prevent white blob
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a realistic wooden plank texture for chests
   */
  static createWoodenPlankTexture(
    baseColor: number = 0x8B4513,
    plankWidth: number = 80,
    plankVariation: number = 0.2
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base wood color
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw horizontal planks
    const plankCount = Math.floor(256 / plankWidth);
    for (let i = 0; i < plankCount; i++) {
      const plankY = i * plankWidth;
      const plankHeight = plankWidth - 2; // Small gap between planks
      
      // Vary each plank color slightly
      const variation = (Math.random() - 0.5) * plankVariation;
      const plankR = Math.max(0, Math.min(255, r + variation * 100));
      const plankG = Math.max(0, Math.min(255, g + variation * 80));
      const plankB = Math.max(0, Math.min(255, b + variation * 60));
      
      ctx.fillStyle = `rgb(${plankR}, ${plankG}, ${plankB})`;
      ctx.fillRect(0, plankY, 256, plankHeight);
      
      // Add wood grain lines
      for (let j = 0; j < 8; j++) {
        const grainY = plankY + (j / 8) * plankHeight;
        const grainOpacity = Math.random() * 0.3 + 0.1;
        ctx.strokeStyle = `rgba(${plankR * 0.8}, ${plankG * 0.8}, ${plankB * 0.8}, ${grainOpacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, grainY);
        ctx.lineTo(256, grainY + Math.random() * 4 - 2);
        ctx.stroke();
      }
      
      // Add plank edges (darker)
      ctx.strokeStyle = `rgba(${plankR * 0.6}, ${plankG * 0.6}, ${plankB * 0.6}, 0.8)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, plankY);
      ctx.lineTo(256, plankY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, plankY + plankHeight);
      ctx.lineTo(256, plankY + plankHeight);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Creates a realistic steel accent texture
   */
  static createSteelTexture(
    baseColor: number = 0x708090,
    scratches: number = 15,
    wear: number = 0.3
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Base steel color
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, 128, 128);
    
    // Add metallic scratches
    for (let i = 0; i < scratches; i++) {
      const scratchOpacity = Math.random() * 0.4 + 0.2;
      const brightness = Math.random() * 0.6 + 0.4;
      ctx.strokeStyle = `rgba(${r * brightness}, ${g * brightness}, ${b * brightness}, ${scratchOpacity})`;
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 128, Math.random() * 128);
      ctx.lineTo(Math.random() * 128, Math.random() * 128);
      ctx.stroke();
    }
    
    // Add wear patterns
    for (let i = 0; i < 20; i++) {
      const wearOpacity = Math.random() * wear * 0.3;
      const wearSize = Math.random() * 10 + 5;
      ctx.fillStyle = `rgba(${r * 0.7}, ${g * 0.7}, ${b * 0.7}, ${wearOpacity})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 128, Math.random() * 128, wearSize, 0, Math.PI * 2);
      ctx.fill();
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
    return texture;
  }
}
