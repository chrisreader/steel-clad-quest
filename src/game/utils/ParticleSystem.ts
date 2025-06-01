import * as THREE from 'three';

export class ParticleSystem {
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial | THREE.ShaderMaterial;
  private particles: THREE.Points;
  private particleCount: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private maxLifetime: number;
  private isActive: boolean = false;
  
  constructor(
    scene: THREE.Scene,
    particleCount: number,
    material: THREE.PointsMaterial | THREE.ShaderMaterial,
    maxLifetime: number = 2000
  ) {
    this.scene = scene;
    this.particleCount = particleCount;
    this.material = material;
    this.maxLifetime = maxLifetime;
    
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(particleCount * 3);
    this.velocities = new Float32Array(particleCount * 3);
    this.lifetimes = new Float32Array(particleCount);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particles = new THREE.Points(this.geometry, this.material);
  }
  
  public start(): void {
    this.isActive = true;
    this.scene.add(this.particles);
  }
  
  public stop(): void {
    this.isActive = false;
    this.scene.remove(this.particles);
  }
  
  public update(): void {
    if (!this.isActive) return;
    
    const deltaTime = 16; // Assume 60fps
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // Update lifetime
      this.lifetimes[i] -= deltaTime;
      
      if (this.lifetimes[i] <= 0) {
        this.respawnParticle(i);
      }
      
      // Update position
      this.positions[i3] += this.velocities[i3] * deltaTime * 0.001;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime * 0.001;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime * 0.001;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }
  
  protected respawnParticle(index: number): void {
    // Override in subclasses
  }
  
  public static createWindSwoosh(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    const particleCount = 30;
    const material = new THREE.PointsMaterial({
      color: 0xEEEEEE,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 300);
    
    // Initialize wind swoosh particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start particles along the sword path
      const t = i / particleCount;
      system.positions[i3] = position.x + direction.x * t * 1.5;
      system.positions[i3 + 1] = position.y + Math.random() * 0.3 - 0.15;
      system.positions[i3 + 2] = position.z + direction.z * t * 1.5;
      
      // Add wind-like velocity
      const windSpeed = 3 + Math.random() * 2;
      system.velocities[i3] = direction.x * windSpeed + (Math.random() - 0.5) * 2;
      system.velocities[i3 + 1] = (Math.random() - 0.5) * 1;
      system.velocities[i3 + 2] = direction.z * windSpeed + (Math.random() - 0.5) * 2;
      
      system.lifetimes[i] = 200 + Math.random() * 100;
    }
    
    // Override respawn to not respawn particles (one-time effect)
    system.respawnParticle = (index: number) => {
      system.lifetimes[index] = -1; // Don't respawn
    };
    
    return system;
  }
  
  public static createBloodSpray(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3, intensity: number = 1): ParticleSystem {
    const particleCount = Math.floor(20 * intensity);
    const material = new THREE.PointsMaterial({
      color: 0x8B0000,
      size: 0.03,
      transparent: true,
      opacity: 0.8
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 1000);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x;
      system.positions[i3 + 1] = position.y;
      system.positions[i3 + 2] = position.z;
      
      const spread = 0.5;
      system.velocities[i3] = direction.x * 2 + (Math.random() - 0.5) * spread;
      system.velocities[i3 + 1] = direction.y * 2 + (Math.random() - 0.5) * spread;
      system.velocities[i3 + 2] = direction.z * 2 + (Math.random() - 0.5) * spread;
      
      system.lifetimes[i] = 800 + Math.random() * 400;
    }
    
    return system;
  }
  
  public static createBloodDroplets(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    const particleCount = 15;
    const material = new THREE.PointsMaterial({
      color: 0x660000,
      size: 0.02,
      transparent: true,
      opacity: 0.9
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 1500);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x;
      system.positions[i3 + 1] = position.y;
      system.positions[i3 + 2] = position.z;
      
      system.velocities[i3] = direction.x * 1.5 + (Math.random() - 0.5) * 0.8;
      system.velocities[i3 + 1] = direction.y * 1.5 + Math.random() * 0.5;
      system.velocities[i3 + 2] = direction.z * 1.5 + (Math.random() - 0.5) * 0.8;
      
      system.lifetimes[i] = 1200 + Math.random() * 600;
    }
    
    return system;
  }
  
  public static createDirectionalBloodSpray(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3, intensity: number): ParticleSystem {
    const particleCount = Math.floor(25 * intensity);
    const material = new THREE.PointsMaterial({
      color: 0x8B0000,
      size: 0.04,
      transparent: true,
      opacity: 0.8
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 1200);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x;
      system.positions[i3 + 1] = position.y;
      system.positions[i3 + 2] = position.z;
      
      system.velocities[i3] = direction.x * 3 + (Math.random() - 0.5) * 0.5;
      system.velocities[i3 + 1] = direction.y * 3 + (Math.random() - 0.5) * 0.5;
      system.velocities[i3 + 2] = direction.z * 3 + (Math.random() - 0.5) * 0.5;
      
      system.lifetimes[i] = 1000 + Math.random() * 400;
    }
    
    return system;
  }
  
  public static createBloodTrail(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    const particleCount = 10;
    const material = new THREE.PointsMaterial({
      color: 0x8B0000,
      size: 0.03,
      transparent: true,
      opacity: 0.6
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 800);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x;
      system.positions[i3 + 1] = position.y;
      system.positions[i3 + 2] = position.z;
      
      system.velocities[i3] = direction.x * 1 + (Math.random() - 0.5) * 0.3;
      system.velocities[i3 + 1] = direction.y * 1 + (Math.random() - 0.5) * 0.3;
      system.velocities[i3 + 2] = direction.z * 1 + (Math.random() - 0.5) * 0.3;
      
      system.lifetimes[i] = 600 + Math.random() * 400;
    }
    
    return system;
  }
  
  public static createPainFeedback(scene: THREE.Scene, position: THREE.Vector3): ParticleSystem {
    const particleCount = 20;
    const material = new THREE.PointsMaterial({
      color: 0xFF0000,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 500);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x + (Math.random() - 0.5) * 0.5;
      system.positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
      system.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5;
      
      system.velocities[i3] = (Math.random() - 0.5) * 2;
      system.velocities[i3 + 1] = Math.random() * 2;
      system.velocities[i3 + 2] = (Math.random() - 0.5) * 2;
      
      system.lifetimes[i] = 400 + Math.random() * 200;
    }
    
    return system;
  }
  
  public static createFireball(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3): ParticleSystem {
    const particleCount = 50;
    const material = new THREE.PointsMaterial({
      color: 0xFF4400,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 1000);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x;
      system.positions[i3 + 1] = position.y;
      system.positions[i3 + 2] = position.z;
      
      system.velocities[i3] = direction.x * 8 + (Math.random() - 0.5) * 2;
      system.velocities[i3 + 1] = direction.y * 8 + (Math.random() - 0.5) * 2;
      system.velocities[i3 + 2] = direction.z * 8 + (Math.random() - 0.5) * 2;
      
      system.lifetimes[i] = 800 + Math.random() * 400;
    }
    
    return system;
  }
  
  public static createDustCloud(scene: THREE.Scene, position: THREE.Vector3): ParticleSystem {
    const particleCount = 30;
    const material = new THREE.PointsMaterial({
      color: 0x8B7355,
      size: 0.1,
      transparent: true,
      opacity: 0.4
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 2000);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x + (Math.random() - 0.5) * 2;
      system.positions[i3 + 1] = position.y + Math.random() * 0.5;
      system.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 2;
      
      system.velocities[i3] = (Math.random() - 0.5) * 1;
      system.velocities[i3 + 1] = Math.random() * 2;
      system.velocities[i3 + 2] = (Math.random() - 0.5) * 1;
      
      system.lifetimes[i] = 1500 + Math.random() * 1000;
    }
    
    return system;
  }
  
  public static createExplosion(scene: THREE.Scene, position: THREE.Vector3, color: number = 0xFFFFFF, intensity: number = 1): ParticleSystem {
    const particleCount = Math.floor(60 * intensity);
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.1,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 1500);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      system.positions[i3] = position.x;
      system.positions[i3 + 1] = position.y;
      system.positions[i3 + 2] = position.z;
      
      const speed = 5 * intensity;
      system.velocities[i3] = (Math.random() - 0.5) * speed;
      system.velocities[i3 + 1] = (Math.random() - 0.5) * speed;
      system.velocities[i3 + 2] = (Math.random() - 0.5) * speed;
      
      system.lifetimes[i] = 1000 + Math.random() * 1000;
    }
    
    return system;
  }
  
  public static createRealisticSwordSwoosh(scene: THREE.Scene, swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): ParticleSystem {
    const particleCount = 50;
    const material = new THREE.PointsMaterial({
      color: 0xE8E8E8,
      size: 0.03,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    
    const system = new ParticleSystem(scene, particleCount, material, 300);
    
    // Create particles along the sword path with realistic wind displacement
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles along the sword path
      const pathProgress = i / particleCount;
      let basePosition: THREE.Vector3;
      
      if (swordPath.length >= 2) {
        // Interpolate along the actual sword path
        const segmentIndex = Math.floor(pathProgress * (swordPath.length - 1));
        const localProgress = (pathProgress * (swordPath.length - 1)) - segmentIndex;
        
        if (segmentIndex < swordPath.length - 1) {
          const start = swordPath[segmentIndex];
          const end = swordPath[segmentIndex + 1];
          basePosition = start.clone().lerp(end, localProgress);
        } else {
          basePosition = swordPath[swordPath.length - 1].clone();
        }
      } else if (swordPath.length === 1) {
        basePosition = swordPath[0].clone();
      } else {
        basePosition = new THREE.Vector3(0, 0, 0);
      }
      
      // Add wind displacement perpendicular to swing direction
      const perpendicular = new THREE.Vector3()
        .crossVectors(swingDirection, new THREE.Vector3(0, 1, 0))
        .normalize();
      
      const windOffset = perpendicular.clone()
        .multiplyScalar((Math.random() - 0.5) * 0.15);
      
      basePosition.add(windOffset);
      
      // Set particle position
      system.positions[i3] = basePosition.x;
      system.positions[i3 + 1] = basePosition.y + (Math.random() - 0.5) * 0.1;
      system.positions[i3 + 2] = basePosition.z;
      
      // Set velocity to follow the swing direction with wind-like turbulence
      const baseVelocity = swingDirection.clone().multiplyScalar(3 + Math.random() * 2);
      const turbulence = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 1.5
      );
      
      const finalVelocity = baseVelocity.add(turbulence);
      
      system.velocities[i3] = finalVelocity.x;
      system.velocities[i3 + 1] = finalVelocity.y;
      system.velocities[i3 + 2] = finalVelocity.z;
      
      // Stagger lifetimes for more realistic fading
      system.lifetimes[i] = 250 + Math.random() * 100;
    }
    
    // Override respawn to not respawn particles (one-time effect)
    system.respawnParticle = (index: number) => {
      system.lifetimes[index] = -1; // Don't respawn
    };
    
    return system;
  }
  
  public dispose(): void {
    this.stop();
    this.geometry.dispose();
    this.material.dispose();
  }
}
