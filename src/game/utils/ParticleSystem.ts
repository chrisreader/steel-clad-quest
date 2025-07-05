import * as THREE from 'three';

interface ParticleOptions {
  position: THREE.Vector3;
  count: number;
  duration: number;
  size?: number;
  sizeVariation?: number;
  speed?: number;
  speedVariation?: number;
  color?: THREE.Color | string | number;
  colorVariation?: number;
  gravity?: number;
  texture?: THREE.Texture;
  direction?: THREE.Vector3;
  spread?: number;
  opacity?: number;
  fadeIn?: number;
  fadeOut?: number;
  rotationSpeed?: number;
  particleType?: string; // NEW: Add particle type for texture selection
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  opacity: number;
  age: number;
  rotation: number;
  rotationSpeed: number;
  active: boolean;
  life?: number;
  maxLife?: number;
  gravity?: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.SpriteMaterial | THREE.ShaderMaterial;
  private sprites: THREE.Sprite[] = [];
  private options: ParticleOptions;
  private startTime: number;
  private isActive: boolean;
  private bloodTexture: THREE.Texture | null = null;
  private windTexture: THREE.Texture | null = null; // NEW: Wind texture for sword swoosh
  private featherTexture: THREE.Texture | null = null; // NEW: Feather texture for bird kills
  
  constructor(scene: THREE.Scene, options: ParticleOptions) {
    this.scene = scene;
    this.options = {
      ...{
        count: 100,
        duration: 1000,
        size: 0.1,
        sizeVariation: 0.05,
        speed: 1,
        speedVariation: 0.5,
        color: 0xffffff,
        colorVariation: 0.2,
        gravity: 0.5,
        direction: new THREE.Vector3(0, 1, 0),
        spread: 0.5,
        opacity: 1,
        fadeIn: 0.1,
        fadeOut: 0.3,
        rotationSpeed: 0,
        particleType: 'blood' // Default to blood type
      },
      ...options
    };
    
    this.particles = [];
    this.startTime = 0;
    this.isActive = false;
    this.sprites = [];
    
    this.createBloodTexture();
    this.createWindTexture(); // NEW: Create wind texture
    this.createFeatherTexture(); // NEW: Create feather texture
    this.initParticles();
    this.createSprites();
  }
  
  private createBloodTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Create circular blood droplet texture
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(139, 0, 0, 1)');
    gradient.addColorStop(0.7, 'rgba(100, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(80, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    
    this.bloodTexture = new THREE.CanvasTexture(canvas);
    this.bloodTexture.needsUpdate = true;
  }
  
  private createWindTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Create white circular wind particle texture
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // White center
    gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.5)'); // Light gray
    gradient.addColorStop(1, 'rgba(220, 220, 220, 0)'); // Transparent edge
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    
    this.windTexture = new THREE.CanvasTexture(canvas);
    this.windTexture.needsUpdate = true;
  }
  
  private createFeatherTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Create feather-like texture with elongated shape
    ctx.fillStyle = 'rgba(40, 40, 40, 0.9)'; // Dark gray feather
    ctx.beginPath();
    ctx.ellipse(16, 16, 12, 6, 0, 0, Math.PI * 2); // Elongated ellipse
    ctx.fill();
    
    // Add feather details
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(16, 28);
    ctx.stroke();
    
    // Add feather barbs
    for (let i = 6; i <= 26; i += 4) {
      ctx.beginPath();
      ctx.moveTo(10, i);
      ctx.lineTo(22, i);
      ctx.stroke();
    }
    
    this.featherTexture = new THREE.CanvasTexture(canvas);
    this.featherTexture.needsUpdate = true;
  }
  
  private initParticles(): void {
    this.particles = [];
    
    for (let i = 0; i < this.options.count; i++) {
      const direction = this.options.direction!.clone();
      
      if (this.options.spread! > 0) {
        direction.x += (Math.random() - 0.5) * this.options.spread!;
        direction.y += (Math.random() - 0.5) * this.options.spread!;
        direction.z += (Math.random() - 0.5) * this.options.spread!;
        direction.normalize();
      }
      
      const speed = this.options.speed! + (Math.random() - 0.5) * this.options.speedVariation!;
      
      const particle: Particle = {
        position: this.options.position.clone(),
        velocity: direction.multiplyScalar(speed),
        size: this.options.size! + (Math.random() - 0.5) * this.options.sizeVariation!,
        color: new THREE.Color(this.options.color),
        opacity: 0,
        age: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * this.options.rotationSpeed!,
        active: true
      };
      
      if (this.options.colorVariation! > 0) {
        particle.color.r += (Math.random() - 0.5) * this.options.colorVariation!;
        particle.color.g += (Math.random() - 0.5) * this.options.colorVariation!;
        particle.color.b += (Math.random() - 0.5) * this.options.colorVariation!;
      }
      
      this.particles.push(particle);
    }
  }
  
  private createSprites(): void {
    this.sprites = [];
    
    // Select appropriate texture based on particle type
    let selectedTexture = this.bloodTexture; // Default
    if (this.options.particleType === 'wind') {
      selectedTexture = this.windTexture;
    } else if (this.options.particleType === 'feather') {
      selectedTexture = this.featherTexture;
    }
    
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      const material = new THREE.SpriteMaterial({
        map: selectedTexture,
        transparent: true,
        opacity: particle.opacity,
        color: particle.color,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      
      const sprite = new THREE.Sprite(material);
      sprite.scale.setScalar(particle.size * 2);
      sprite.position.copy(particle.position);
      sprite.visible = false;
      
      // CRITICAL FIX: Ensure sprite has proper matrix initialization
      sprite.matrixAutoUpdate = true;
      sprite.updateMatrix();
      sprite.updateMatrixWorld(true);
      
      this.sprites.push(sprite);
    }
  }
  
  public start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.startTime = Date.now();
    
    // Add sprites to scene with proper matrix updates
    this.sprites.forEach(sprite => {
      // Ensure matrix is properly initialized before adding to scene
      sprite.updateMatrix();
      sprite.updateMatrixWorld(true);
      this.scene.add(sprite);
    });
    
    this.initParticles();
  }
  
  public stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove sprites from scene and dispose materials
    this.sprites.forEach(sprite => {
      this.scene.remove(sprite);
      if (sprite.material) {
        sprite.material.dispose();
      }
    });
  }
  
  public update(): void {
    if (!this.isActive) return;
    
    const now = Date.now();
    const elapsed = now - this.startTime;
    
    if (elapsed >= this.options.duration) {
      this.stop();
      return;
    }
    
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const sprite = this.sprites[i];
      
      if (!particle.active || !sprite) continue;
      
      // OPTIMIZED: Update particle physics every 3 frames for better performance
      const updatePhysics = (particle.age % 48) < 16; // Every third frame
      if (updatePhysics) {
        particle.age += 48; // Triple increment to maintain timing
      } else {
        particle.age += 16; // Normal increment
      }
      const particleProgress = particle.age / this.options.duration;
      
      // Calculate opacity with fade in/out
      if (particleProgress < this.options.fadeIn!) {
        particle.opacity = particleProgress / this.options.fadeIn! * this.options.opacity!;
      } else if (particleProgress > (1 - this.options.fadeOut!)) {
        particle.opacity = (1 - (particleProgress - (1 - this.options.fadeOut!)) / this.options.fadeOut!) * this.options.opacity!;
      } else {
        particle.opacity = this.options.opacity!;
      }
      
      // PHASE 3: Update physics only when updatePhysics is true
      if (updatePhysics) {
        particle.rotation += particle.rotationSpeed;
        particle.velocity.y -= this.options.gravity! * 0.016;
        particle.position.add(particle.velocity.clone().multiplyScalar(0.016));
      }
      
      // OPTIMIZED: Skip matrix updates for nearly invisible particles + batching
      if (particle.opacity > 0.015) { // Slightly higher threshold
        sprite.position.copy(particle.position);
        sprite.material.opacity = particle.opacity;
        sprite.material.rotation = particle.rotation;
        sprite.visible = true;
        
        // Update matrix only when physics updated (every 3 frames)
        if (updatePhysics) {
          sprite.updateMatrix();
          sprite.updateMatrixWorld(true);
        }
      } else {
        sprite.visible = false;
      }
      
      // Scale down over time for more realism
      const sizeMultiplier = 1 - particleProgress * 0.3;
      sprite.scale.setScalar(particle.size * 2 * sizeMultiplier);
    }
  }
  
  // Enhanced realistic blood effects with improved textures
  static createBloodSpray(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3, intensity: number = 1): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: Math.floor(30 * intensity),
      duration: 1200,
      size: 0.08, // Increased size for visibility
      sizeVariation: 0.04,
      speed: 4 * intensity,
      speedVariation: 2,
      color: 0x8B0000,
      colorVariation: 0.15,
      gravity: 8,
      direction: direction,
      spread: 0.6,
      opacity: 0.9,
      fadeIn: 0.05,
      fadeOut: 0.4
    });
  }
  
  static createBloodDroplets(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 20,
      duration: 2000,
      size: 0.12, // Increased size for visibility
      sizeVariation: 0.06,
      speed: 2,
      speedVariation: 1.5,
      color: 0x660000,
      colorVariation: 0.1,
      gravity: 12,
      direction: direction,
      spread: 0.8,
      opacity: 0.95,
      fadeIn: 0.02,
      fadeOut: 0.2
    });
  }
  
  static createDirectionalBloodSpray(scene: THREE.Scene, position: THREE.Vector3, arrowDirection: THREE.Vector3, intensity: number): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: Math.floor(30 * intensity),
      duration: 1500,
      size: 0.05,
      sizeVariation: 0.025,
      speed: 6 * intensity,
      speedVariation: 1,
      color: 0x8B0000,
      colorVariation: 0.1,
      gravity: 10,
      direction: arrowDirection,
      spread: 0.3,
      opacity: 0.9,
      fadeIn: 0.03,
      fadeOut: 0.3
    });
  }
  
  static createBloodTrail(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 15,
      duration: 800,
      size: 0.03,
      sizeVariation: 0.015,
      speed: 1,
      speedVariation: 0.5,
      color: 0x4A0000,
      colorVariation: 0.05,
      gravity: 6,
      direction: direction,
      spread: 0.15,
      opacity: 0.8,
      fadeIn: 0.1,
      fadeOut: 0.5
    });
  }
  
  // UPDATED: Enhanced wind swoosh effect that follows sword blade path
  static createWindSwoosh(scene: THREE.Scene, swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): ParticleSystem {
    // Calculate particles distributed along the sword path
    const pathLength = swordPath.length;
    const particleCount = Math.max(15, Math.min(30, pathLength * 2)); // Scale with path detail
    
    // Use the middle of the path as the spawn point
    const avgPosition = swordPath.reduce((sum, pos) => sum.add(pos.clone()), new THREE.Vector3()).divideScalar(swordPath.length);
    
    return new ParticleSystem(scene, {
      position: avgPosition,
      count: particleCount,
      duration: 400, // Slightly longer duration
      size: 0.04,
      sizeVariation: 0.02,
      speed: 1.5,
      speedVariation: 0.8,
      color: 0xFFFFFF, // Pure white
      colorVariation: 0.05, // Minimal variation to keep it white
      gravity: 0.05, // Very light gravity
      direction: swingDirection.clone().normalize(),
      spread: 0.4,
      opacity: 0.8,
      fadeIn: 0.03,
      fadeOut: 0.7,
      particleType: 'wind' // Use wind texture
    });
  }
  
  // UPDATED: Air streaks that follow the sword blade more precisely
  static createAirStreaks(scene: THREE.Scene, swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): ParticleSystem {
    // Use the starting position of the sword path
    const startPosition = swordPath[0] || new THREE.Vector3();
    
    return new ParticleSystem(scene, {
      position: startPosition,
      count: Math.min(10, swordPath.length),
      duration: 300,
      size: 0.03,
      sizeVariation: 0.015,
      speed: 2.0,
      speedVariation: 0.5,
      color: 0xF8F8F8, // Very light gray-white
      colorVariation: 0.02, // Keep it mostly white
      gravity: 0.02,
      direction: swingDirection.clone().normalize(),
      spread: 0.25,
      opacity: 0.7,
      fadeIn: 0.02,
      fadeOut: 0.8,
      particleType: 'wind' // Use wind texture
    });
  }
  
  static createMetallicSparks(scene: THREE.Scene, position: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 35,
      duration: 600,
      size: 0.04,
      sizeVariation: 0.02,
      speed: 5,
      speedVariation: 3,
      color: 0xFFDD44,
      colorVariation: 0.3,
      gravity: 4,
      direction: new THREE.Vector3(0, 0.8, 0),
      spread: 1,
      opacity: 0.8,
      fadeIn: 0.02,
      fadeOut: 0.7
    });
  }
  
  static createPainFeedback(scene: THREE.Scene, position: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 20,
      duration: 500,
      size: 0.12,
      sizeVariation: 0.06,
      speed: 0.5,
      speedVariation: 0.3,
      color: 0xFF0000,
      colorVariation: 0.2,
      gravity: 0.1,
      direction: new THREE.Vector3(0, 1, 0),
      spread: 0.8,
      opacity: 0.6,
      fadeIn: 0.1,
      fadeOut: 0.8
    });
  }
  
  static createExplosion(scene: THREE.Scene, position: THREE.Vector3, color: THREE.Color | string | number = 0xFF5500, scale: number = 1): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: Math.floor(50 * scale),
      duration: 800,
      size: 0.1 * scale,
      sizeVariation: 0.05 * scale,
      speed: 3 * scale,
      speedVariation: 1.5 * scale,
      color: color,
      colorVariation: 0.2,
      gravity: 2,
      direction: new THREE.Vector3(0, 1, 0),
      spread: 1,
      opacity: 0.7,
      fadeIn: 0.1,
      fadeOut: 0.4
    });
  }
  
  static createImpactBurst(scene: THREE.Scene, position: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 25,
      duration: 400,
      size: 0.08,
      sizeVariation: 0.04,
      speed: 4,
      speedVariation: 2,
      color: 0xFFAA44,
      colorVariation: 0.3,
      gravity: 1,
      direction: new THREE.Vector3(0, 0.5, 0),
      spread: 0.8,
      opacity: 0.8,
      fadeIn: 0.05,
      fadeOut: 0.6
    });
  }
  
  static createBloodSplatter(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 30,
      duration: 600,
      size: 0.06,
      sizeVariation: 0.03,
      speed: 2,
      speedVariation: 1,
      color: 0x880000,
      colorVariation: 0.1,
      gravity: 6,
      direction: direction,
      spread: 0.4,
      opacity: 0.9,
      fadeIn: 0.05,
      fadeOut: 0.3
    });
  }
  
  static createDustCloud(scene: THREE.Scene, position: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 20,
      duration: 1500,
      size: 0.15,
      sizeVariation: 0.1,
      speed: 0.5,
      speedVariation: 0.3,
      color: 0xCCBB99,
      colorVariation: 0.1,
      gravity: 0.05,
      direction: new THREE.Vector3(0, 1, 0),
      spread: 0.6,
      opacity: 0.4,
      fadeIn: 0.3,
      fadeOut: 0.5
    });
  }
  
  static createSwordTrail(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 15,
      duration: 250,
      size: 0.12,
      sizeVariation: 0.04,
      speed: 0.3,
      speedVariation: 0.1,
      color: 0xCCCCCC,
      colorVariation: 0,
      gravity: 0,
      direction: direction,
      spread: 0.1,
      opacity: 0.6,
      fadeIn: 0.1,
      fadeOut: 0.7
    });
  }
  
  static createFireball(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 40,
      duration: 800,
      size: 0.2,
      sizeVariation: 0.08,
      speed: 0.2,
      speedVariation: 0.1,
      color: 0xFF6600,
      colorVariation: 0.3,
      gravity: -0.3,
      direction: direction,
      spread: 0.15,
      opacity: 0.7,
      fadeIn: 0.1,
      fadeOut: 0.5,
      rotationSpeed: 1
    });
  }
  
  public static createCampfire(scene: THREE.Scene, position: THREE.Vector3, intensity: number = 1.0): ParticleSystem {
    console.log('🔥 Creating campfire particle system at position:', position);
    
    const particleCount = Math.floor(40 * intensity);
    
    // Create flame particles using standard ParticleOptions
    return new ParticleSystem(scene, {
      position: position,
      count: particleCount,
      duration: 5000, // Long duration for continuous fire
      size: 0.3,
      sizeVariation: 0.2,
      speed: 1.0,
      speedVariation: 0.5,
      color: 0xFF6600, // Orange flame color
      colorVariation: 0.3,
      gravity: -0.2, // Negative gravity for upward movement
      direction: new THREE.Vector3(0, 1, 0),
      spread: 0.8,
      opacity: 0.8,
      fadeIn: 0.1,
      fadeOut: 0.4,
      rotationSpeed: 2
    });
  }
  
  public static createFireEmbers(scene: THREE.Scene, position: THREE.Vector3, count: number = 15): ParticleSystem {
    console.log(`🔥 Creating fire embers system with ${count} embers`);
    
    return new ParticleSystem(scene, {
      position: position,
      count: count,
      duration: 3000,
      size: 0.08,
      sizeVariation: 0.04,
      speed: 0.8,
      speedVariation: 0.4,
      color: 0xFF4400, // Bright orange ember
      colorVariation: 0.2,
      gravity: -0.1,
      direction: new THREE.Vector3(0, 1, 0),
      spread: 1.0,
      opacity: 0.9,
      fadeIn: 0.05,
      fadeOut: 0.6,
      rotationSpeed: 1
    });
  }
  
  // NEW: Feather particle system for bird kills
  static createFeatherBurst(scene: THREE.Scene, position: THREE.Vector3, hitDirection: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 20, // Moderate amount of feathers
      duration: 2500, // Longer duration for realistic float
      size: 0.15, // Larger than blood particles
      sizeVariation: 0.08,
      speed: 1.5,
      speedVariation: 1.2,
      color: 0x2A2A2A, // Dark gray for crow feathers
      colorVariation: 0.1,
      gravity: 0.8, // Lighter gravity for floating effect
      direction: hitDirection,
      spread: 0.9, // Wide spread for natural feather burst
      opacity: 0.9,
      fadeIn: 0.1,
      fadeOut: 0.6,
      rotationSpeed: 3, // High rotation for tumbling feathers
      particleType: 'feather'
    });
  }
  
  // NEW: Smaller feather puff for aerial bird hits
  static createFeatherPuff(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 12,
      duration: 1800,
      size: 0.12,
      sizeVariation: 0.06,
      speed: 2.0,
      speedVariation: 1.0,
      color: 0x1A1A1A, // Slightly darker
      colorVariation: 0.15,
      gravity: 1.2,
      direction: direction,
      spread: 0.7,
      opacity: 0.8,
      fadeIn: 0.05,
      fadeOut: 0.5,
      rotationSpeed: 4,
      particleType: 'feather'
    });
  }
}
