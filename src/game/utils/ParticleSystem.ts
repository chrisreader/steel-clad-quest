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
    
    // Create particles positioned along the sword path from top-right to bottom-left
    const particles: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1); // 0 to 1
      const pathIndex = Math.floor(t * (pathLength - 1));
      const nextIndex = Math.min(pathIndex + 1, pathLength - 1);
      
      // Interpolate between path points for smooth distribution
      const localT = (t * (pathLength - 1)) - pathIndex;
      const position = swordPath[pathIndex].clone().lerp(swordPath[nextIndex], localT);
      
      // Add slight random offset perpendicular to swing direction
      const perpendicular = new THREE.Vector3(-swingDirection.z, 0, swingDirection.x).normalize();
      position.add(perpendicular.multiplyScalar((Math.random() - 0.5) * 0.1));
      
      particles.push(position);
    }
    
    // Use the middle of the path as the spawn point
    const avgPosition = particles.reduce((sum, pos) => sum.add(pos), new THREE.Vector3()).divideScalar(particles.length);
    
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
    // Create particles at key points along the sword path
    const streakCount = Math.min(10, swordPath.length);
    const streakPositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < streakCount; i++) {
      const t = i / (streakCount - 1);
      const pathIndex = Math.floor(t * (swordPath.length - 1));
      streakPositions.push(swordPath[pathIndex].clone());
    }
    
    // Use the starting position of the sword path
    const startPosition = swordPath[0] || new THREE.Vector3();
    
    return new ParticleSystem(scene, {
      position: startPosition,
      count: streakCount,
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
    const particles: Particle[] = [];
    
    // Create flame particles
    for (let i = 0; i < particleCount * 0.6; i++) {
      particles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0,
          (Math.random() - 0.5) * 0.8
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 2.0 + 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        color: new THREE.Color().setHSL(
          0.08 + Math.random() * 0.05, // Orange to red hue
          0.9,
          0.5 + Math.random() * 0.3
        ),
        size: 0.2 + Math.random() * 0.3,
        life: 1.0 + Math.random() * 0.8,
        maxLife: 1.0 + Math.random() * 0.8,
        gravity: -0.2
      });
    }
    
    // Create smoke particles
    for (let i = 0; i < particleCount * 0.4; i++) {
      particles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.6
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          Math.random() * 1.5 + 0.5,
          (Math.random() - 0.5) * 0.3
        ),
        color: new THREE.Color(0x888888),
        size: 0.4 + Math.random() * 0.4,
        life: 2.0 + Math.random() * 1.5,
        maxLife: 2.0 + Math.random() * 1.5,
        gravity: -0.05
      });
    }
    
    const system = new ParticleSystem(scene, particles);
    system.setBlending(THREE.AdditiveBlending);
    
    console.log(`🔥 Campfire particle system created with ${particles.length} particles`);
    return system;
  }
  
  public static createFireEmbers(scene: THREE.Scene, position: THREE.Vector3, count: number = 15): ParticleSystem {
    console.log(`🔥 Creating fire embers system with ${count} embers`);
    
    const particles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      particles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.0,
          Math.random() * 0.3,
          (Math.random() - 0.5) * 1.0
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          Math.random() * 1.0 + 0.2,
          (Math.random() - 0.5) * 0.8
        ),
        color: new THREE.Color().setHSL(
          0.05 + Math.random() * 0.03, // Orange ember color
          1.0,
          0.6 + Math.random() * 0.2
        ),
        size: 0.05 + Math.random() * 0.08,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 1.5 + Math.random() * 1.0,
        gravity: -0.1
      });
    }
    
    const system = new ParticleSystem(scene, particles);
    system.setBlending(THREE.AdditiveBlending);
    
    console.log(`🔥 Fire embers system created with ${particles.length} ember particles`);
    return system;
  }
}
