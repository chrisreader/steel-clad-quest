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
        rotationSpeed: 0
      },
      ...options
    };
    
    this.particles = [];
    this.startTime = 0;
    this.isActive = false;
    this.sprites = [];
    
    this.createBloodTexture();
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
    
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      const material = new THREE.SpriteMaterial({
        map: this.bloodTexture,
        transparent: true,
        opacity: particle.opacity,
        color: particle.color,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      
      const sprite = new THREE.Sprite(material);
      sprite.scale.setScalar(particle.size * 2); // Make sprites more visible
      sprite.position.copy(particle.position);
      sprite.visible = false; // Start invisible
      
      this.sprites.push(sprite);
    }
  }
  
  public start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.startTime = Date.now();
    
    // Add sprites to scene
    this.sprites.forEach(sprite => {
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
      
      particle.age += 16;
      const particleProgress = particle.age / this.options.duration;
      
      // Calculate opacity with fade in/out
      if (particleProgress < this.options.fadeIn!) {
        particle.opacity = particleProgress / this.options.fadeIn! * this.options.opacity!;
      } else if (particleProgress > (1 - this.options.fadeOut!)) {
        particle.opacity = (1 - (particleProgress - (1 - this.options.fadeOut!)) / this.options.fadeOut!) * this.options.opacity!;
      } else {
        particle.opacity = this.options.opacity!;
      }
      
      // Update physics
      particle.rotation += particle.rotationSpeed;
      particle.velocity.y -= this.options.gravity! * 0.016;
      particle.position.add(particle.velocity.clone().multiplyScalar(0.016));
      
      // Update sprite
      sprite.position.copy(particle.position);
      sprite.material.opacity = particle.opacity;
      sprite.material.rotation = particle.rotation;
      sprite.visible = particle.opacity > 0.01;
      
      // Scale down over time for more realism
      const sizeMultiplier = 1 - particleProgress * 0.3;
      sprite.scale.setScalar(particle.size * 2 * sizeMultiplier);
    }
  }
  
  // NEW: Wind trail effect for sword swooshes
  static createWindTrail(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 12,
      duration: 300,
      size: 0.04,
      sizeVariation: 0.02,
      speed: 1.5,
      speedVariation: 0.8,
      color: 0xBBCCDD,
      colorVariation: 0.1,
      gravity: 0.1,
      direction: direction,
      spread: 0.3,
      opacity: 0.3,
      fadeIn: 0.1,
      fadeOut: 0.6
    });
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
  
  static createMetallicGleam(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 20,
      duration: 400,
      size: 0.08,
      sizeVariation: 0.04,
      speed: 1.5,
      speedVariation: 0.8,
      color: 0xCCCCFF,
      colorVariation: 0.1,
      gravity: 0.2,
      direction: direction,
      spread: 0.2,
      opacity: 0.7,
      fadeIn: 0.05,
      fadeOut: 0.6,
      rotationSpeed: 3
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
}
