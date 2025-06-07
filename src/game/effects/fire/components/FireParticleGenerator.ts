
import * as THREE from 'three';
import { FireParticleConfig } from '../types/FireTypes';

export class FireParticleGenerator {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private particles: THREE.Points[] = [];
  private particleConfigs: Map<string, FireParticleConfig> = new Map();
  private time: number = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
  }

  public addParticleType(name: string, config: FireParticleConfig): void {
    this.particleConfigs.set(name, config);
    this.createParticleSystem(name, config);
  }

  private createParticleSystem(name: string, config: FireParticleConfig): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const velocities = new Float32Array(config.count * 3);
    const lifetimes = new Float32Array(config.count);
    const sizes = new Float32Array(config.count);

    // Initialize particles
    for (let i = 0; i < config.count; i++) {
      // Position
      positions[i * 3] = this.position.x + (Math.random() - 0.5) * config.spread;
      positions[i * 3 + 1] = this.position.y;
      positions[i * 3 + 2] = this.position.z + (Math.random() - 0.5) * config.spread;

      // Velocity based on particle type
      if (name === 'flames') {
        velocities[i * 3] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 1] = Math.random() * config.speed + 0.5;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      } else if (name === 'smoke') {
        velocities[i * 3] = (Math.random() - 0.5) * 0.3;
        velocities[i * 3 + 1] = Math.random() * config.speed + 0.2;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      } else if (name === 'embers') {
        velocities[i * 3] = (Math.random() - 0.5) * 0.8;
        velocities[i * 3 + 1] = Math.random() * config.speed + 0.1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      }

      lifetimes[i] = Math.random() * config.lifetime;
      sizes[i] = config.size * (0.8 + Math.random() * 0.4);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create material based on particle type
    let material: THREE.PointsMaterial;
    
    if (name === 'flames') {
      material = new THREE.PointsMaterial({
        color: config.color,
        size: config.size,
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
    } else if (name === 'smoke') {
      material = new THREE.PointsMaterial({
        color: config.color,
        size: config.size,
        transparent: true,
        opacity: config.opacity * 0.6,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
    } else {
      material = new THREE.PointsMaterial({
        color: config.color,
        size: config.size,
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
    }

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { name, config, age: 0 };
    
    this.particles.push(particleSystem);
    this.scene.add(particleSystem);
    
    console.log(`🔥 Created ${name} particle system with ${config.count} particles`);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    for (const particleSystem of this.particles) {
      const { config } = particleSystem.userData;
      const positions = particleSystem.geometry.attributes.position;
      const velocities = particleSystem.geometry.attributes.velocity;
      const lifetimes = particleSystem.geometry.attributes.lifetime;

      for (let i = 0; i < config.count; i++) {
        // Update lifetime
        lifetimes.array[i] -= deltaTime;

        // Reset particle if it's expired
        if (lifetimes.array[i] <= 0) {
          lifetimes.array[i] = config.lifetime;
          positions.array[i * 3] = this.position.x + (Math.random() - 0.5) * config.spread;
          positions.array[i * 3 + 1] = this.position.y;
          positions.array[i * 3 + 2] = this.position.z + (Math.random() - 0.5) * config.spread;
        } else {
          // Update position based on velocity
          positions.array[i * 3] += velocities.array[i * 3] * deltaTime;
          positions.array[i * 3 + 1] += velocities.array[i * 3 + 1] * deltaTime;
          positions.array[i * 3 + 2] += velocities.array[i * 3 + 2] * deltaTime;

          // Add some turbulence for realism
          if (particleSystem.userData.name === 'flames') {
            positions.array[i * 3] += Math.sin(this.time * 3 + i) * 0.1 * deltaTime;
            positions.array[i * 3 + 2] += Math.cos(this.time * 2 + i) * 0.1 * deltaTime;
          }
        }
      }

      positions.needsUpdate = true;
      lifetimes.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const particleSystem of this.particles) {
      this.scene.remove(particleSystem);
      particleSystem.geometry.dispose();
      if (particleSystem.material instanceof THREE.Material) {
        particleSystem.material.dispose();
      }
    }
    this.particles = [];
    console.log('🔥 Fire particle systems disposed');
  }
}
