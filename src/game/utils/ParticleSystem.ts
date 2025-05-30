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
  private material: THREE.PointsMaterial | THREE.ShaderMaterial;
  private mesh: THREE.Points;
  private options: ParticleOptions;
  private startTime: number;
  private isActive: boolean;
  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;
  private opacityAttribute: THREE.BufferAttribute;
  private useShader: boolean;
  
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
    this.useShader = true; // Use shader material for better effects
    
    this.initParticles();
    this.createMesh();
  }
  
  private initParticles(): void {
    this.particles = [];
    
    for (let i = 0; i < this.options.count; i++) {
      const direction = this.options.direction!.clone();
      
      // Add random spread
      if (this.options.spread! > 0) {
        direction.x += (Math.random() - 0.5) * this.options.spread!;
        direction.y += (Math.random() - 0.5) * this.options.spread!;
        direction.z += (Math.random() - 0.5) * this.options.spread!;
        direction.normalize();
      }
      
      // Random speed
      const speed = this.options.speed! + (Math.random() - 0.5) * this.options.speedVariation!;
      
      // Create particle
      const particle: Particle = {
        position: this.options.position.clone(),
        velocity: direction.multiplyScalar(speed),
        size: this.options.size! + (Math.random() - 0.5) * this.options.sizeVariation!,
        color: new THREE.Color(this.options.color),
        opacity: 0, // Start at 0 for fade in
        age: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * this.options.rotationSpeed!,
        active: true
      };
      
      // Add color variation
      if (this.options.colorVariation! > 0) {
        particle.color.r += (Math.random() - 0.5) * this.options.colorVariation!;
        particle.color.g += (Math.random() - 0.5) * this.options.colorVariation!;
        particle.color.b += (Math.random() - 0.5) * this.options.colorVariation!;
      }
      
      this.particles.push(particle);
    }
  }
  
  private createMesh(): void {
    this.geometry = new THREE.BufferGeometry();
    
    // Create attributes
    const positions = new Float32Array(this.options.count * 3);
    const colors = new Float32Array(this.options.count * 3);
    const sizes = new Float32Array(this.options.count);
    const opacities = new Float32Array(this.options.count);
    
    // Initialize attributes
    for (let i = 0; i < this.options.count; i++) {
      const particle = this.particles[i];
      
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;
      
      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;
      
      sizes[i] = particle.size;
      opacities[i] = particle.opacity;
    }
    
    // Set attributes
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    this.opacityAttribute = new THREE.BufferAttribute(opacities, 1);
    
    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);
    this.geometry.setAttribute('opacity', this.opacityAttribute);
    
    // Create material
    if (this.useShader) {
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          texture: { value: this.options.texture || new THREE.Texture() },
          useTexture: { value: this.options.texture ? 1.0 : 0.0 }
        },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          varying float vOpacity;
          varying vec3 vColor;
          
          void main() {
            vColor = color;
            vOpacity = opacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D texture;
          uniform float useTexture;
          varying float vOpacity;
          varying vec3 vColor;
          
          void main() {
            vec4 texColor = vec4(1.0);
            if (useTexture > 0.5) {
              texColor = texture2D(texture, gl_PointCoord);
              if (texColor.a < 0.1) discard;
            } else {
              // Create circular particles
              vec2 uv = gl_PointCoord.xy - 0.5;
              float distance = length(uv);
              if (distance > 0.5) discard;
              texColor = vec4(1.0 - distance * 2.0);
            }
            gl_FragColor = vec4(vColor, vOpacity) * texColor;
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });
    } else {
      this.material = new THREE.PointsMaterial({
        size: this.options.size!,
        vertexColors: true,
        transparent: true,
        opacity: this.options.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        map: this.options.texture
      });
    }
    
    // Create mesh
    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false; // Prevent disappearing when out of camera frustum
  }
  
  public start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.startTime = Date.now();
    this.scene.add(this.mesh);
    this.initParticles(); // Reset particles
  }
  
  public stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.scene.remove(this.mesh);
  }
  
  public update(): void {
    if (!this.isActive) return;
    
    const now = Date.now();
    const elapsed = now - this.startTime;
    const elapsedNormalized = elapsed / this.options.duration;
    
    // Check if effect is complete
    if (elapsed >= this.options.duration) {
      this.stop();
      return;
    }
    
    // Update particles
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (!particle.active) continue;
      
      // Update age
      particle.age += 16; // Assuming 60fps, ~16ms per frame
      const particleProgress = particle.age / this.options.duration;
      
      // Update opacity based on fade in/out
      if (particleProgress < this.options.fadeIn!) {
        particle.opacity = particleProgress / this.options.fadeIn! * this.options.opacity!;
      } else if (particleProgress > (1 - this.options.fadeOut!)) {
        particle.opacity = (1 - (particleProgress - (1 - this.options.fadeOut!)) / this.options.fadeOut!) * this.options.opacity!;
      } else {
        particle.opacity = this.options.opacity!;
      }
      
      // Update rotation
      particle.rotation += particle.rotationSpeed;
      
      // Update velocity with gravity
      particle.velocity.y -= this.options.gravity! * 0.016; // Gravity effect
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(0.016));
      
      // Update buffers
      this.positionAttribute.setXYZ(i, particle.position.x, particle.position.y, particle.position.z);
      this.opacityAttribute.setX(i, particle.opacity);
    }
    
    // Mark attributes as needing update
    this.positionAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
  }
  
  // Create various pre-defined particle effects
  
  static createExplosion(scene: THREE.Scene, position: THREE.Vector3, color: THREE.Color | string | number = 0xFF5500, scale: number = 1): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 100 * scale,
      duration: 1000,
      size: 0.2 * scale,
      sizeVariation: 0.1 * scale,
      speed: 5 * scale,
      speedVariation: 2 * scale,
      color: color,
      colorVariation: 0.2,
      gravity: 3,
      direction: new THREE.Vector3(0, 1, 0),
      spread: 1,
      opacity: 0.8,
      fadeIn: 0.1,
      fadeOut: 0.3
    });
  }
  
  static createBloodSplatter(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 50,
      duration: 800,
      size: 0.15,
      sizeVariation: 0.1,
      speed: 3,
      speedVariation: 1.5,
      color: 0xAA0000,
      colorVariation: 0.1,
      gravity: 9,
      direction: direction,
      spread: 0.3,
      opacity: 0.9,
      fadeIn: 0.05,
      fadeOut: 0.2
    });
  }
  
  static createDustCloud(scene: THREE.Scene, position: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 30,
      duration: 2000,
      size: 0.3,
      sizeVariation: 0.2,
      speed: 1,
      speedVariation: 0.5,
      color: 0xCCBB99,
      colorVariation: 0.1,
      gravity: 0.1,
      direction: new THREE.Vector3(0, 1, 0),
      spread: 0.8,
      opacity: 0.6,
      fadeIn: 0.2,
      fadeOut: 0.4
    });
  }
  
  static createSwordTrail(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 20,
      duration: 300,
      size: 0.2,
      sizeVariation: 0.05,
      speed: 0.5,
      speedVariation: 0.2,
      color: 0xFFFFFF,
      colorVariation: 0,
      gravity: 0,
      direction: direction,
      spread: 0.1,
      opacity: 0.7,
      fadeIn: 0.1,
      fadeOut: 0.8
    });
  }
  
  static createFireball(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    return new ParticleSystem(scene, {
      position: position,
      count: 60,
      duration: 1000,
      size: 0.3,
      sizeVariation: 0.1,
      speed: 0.2,
      speedVariation: 0.1,
      color: 0xFF6600,
      colorVariation: 0.3,
      gravity: -0.5, // Negative gravity makes fire rise
      direction: direction,
      spread: 0.2,
      opacity: 0.8,
      fadeIn: 0.1,
      fadeOut: 0.5,
      rotationSpeed: 2
    });
  }
}
