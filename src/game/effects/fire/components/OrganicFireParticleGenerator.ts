import * as THREE from 'three';
import { FireShader } from '../shaders/FireShader';
import { FireParticleConfig } from '../types/FireTypes';

export class OrganicFireParticleGenerator {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private particleSystems: Map<string, THREE.Points> = new Map();
  private materials: Map<string, THREE.ShaderMaterial> = new Map();
  private totalTime: number = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
    console.log('🔥 OrganicFireParticleGenerator created at position:', this.position);
  }

  public addOrganicParticleType(name: string, config: FireParticleConfig): void {
    console.log(`🔥 Creating organic ${name} particle system with ${config.count} particles`);
    
    // Create shader material for this particle type
    const material = FireShader.createFireMaterial();
    
    // Configure material based on particle type
    if (name === 'flames') {
      material.uniforms.particleSize.value = 40.0;
      material.uniforms.intensity.value = 1.2;
      material.uniforms.windStrength.value = 1.0;
      material.uniforms.opacity.value = 0.9;
    } else if (name === 'smoke') {
      material.uniforms.particleSize.value = 60.0;
      material.uniforms.intensity.value = 0.4;
      material.uniforms.windStrength.value = 1.5;
      material.uniforms.opacity.value = 0.3;
      material.blending = THREE.NormalBlending;
    } else if (name === 'embers') {
      material.uniforms.particleSize.value = 20.0;
      material.uniforms.intensity.value = 1.5;
      material.uniforms.windStrength.value = 0.6;
      material.uniforms.opacity.value = 1.0;
    }
    
    this.materials.set(name, material);
    this.createOrganicParticleSystem(name, config, material);
  }

  private createOrganicParticleSystem(name: string, config: FireParticleConfig, material: THREE.ShaderMaterial): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const velocities = new Float32Array(config.count * 3);
    const lifetimes = new Float32Array(config.count);
    const ages = new Float32Array(config.count);
    const uvs = new Float32Array(config.count * 2);

    // Initialize particles
    for (let i = 0; i < config.count; i++) {
      this.resetParticleData(i, name, config, positions, velocities, lifetimes, ages);
      
      // Set UV coordinates
      uvs[i * 2] = 0.5;
      uvs[i * 2 + 1] = 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { name, config };
    
    this.particleSystems.set(name, particleSystem);
    this.scene.add(particleSystem);
    
    console.log(`🔥 Created ${name} particle system with ${config.count} particles, added to scene`);
  }

  public update(deltaTime: number): void {
    this.totalTime += deltaTime;
    
    console.log(`🔥 Updating fire particles, deltaTime: ${deltaTime.toFixed(4)}, totalTime: ${this.totalTime.toFixed(2)}, systems: ${this.particleSystems.size}`);
    
    // Update all shader materials with accumulated time
    for (const [name, material] of this.materials.entries()) {
      FireShader.updateShaderTime(material, this.totalTime);
    }

    let totalParticlesUpdated = 0;

    // Update particle physics
    for (const [name, particleSystem] of this.particleSystems.entries()) {
      const { config } = particleSystem.userData;
      const positions = particleSystem.geometry.attributes.position as THREE.BufferAttribute;
      const velocities = particleSystem.geometry.attributes.velocity as THREE.BufferAttribute;
      const lifetimes = particleSystem.geometry.attributes.lifetime as THREE.BufferAttribute;
      const ages = particleSystem.geometry.attributes.age as THREE.BufferAttribute;

      let particlesUpdated = 0;

      for (let i = 0; i < config.count; i++) {
        // Update age
        ages.array[i] += deltaTime;

        // Reset particle if expired
        if (ages.array[i] >= lifetimes.array[i]) {
          this.resetParticleData(i, name, config, positions, velocities, lifetimes, ages);
          particlesUpdated++;
        } else {
          // Update position with enhanced organic motion
          const turbulenceX = Math.sin(this.totalTime * 2.0 + i * 0.5) * 0.1;
          const turbulenceZ = Math.cos(this.totalTime * 1.8 + i * 0.3) * 0.08;
          
          positions.array[i * 3] += (velocities.array[i * 3] + turbulenceX) * deltaTime;
          positions.array[i * 3 + 1] += velocities.array[i * 3 + 1] * deltaTime;
          positions.array[i * 3 + 2] += (velocities.array[i * 3 + 2] + turbulenceZ) * deltaTime;

          // Apply velocity damping
          velocities.array[i * 3] *= 0.98;
          velocities.array[i * 3 + 2] *= 0.98;
          
          particlesUpdated++;
        }
      }

      // Mark attributes as needing update
      positions.needsUpdate = true;
      velocities.needsUpdate = true;
      ages.needsUpdate = true;
      lifetimes.needsUpdate = true;
      
      totalParticlesUpdated += particlesUpdated;
    }
    
    if (totalParticlesUpdated > 0) {
      console.log(`🔥 Updated ${totalParticlesUpdated} total particles across all systems`);
    }
  }

  private resetParticleData(
    index: number, 
    name: string, 
    config: FireParticleConfig,
    positions: Float32Array,
    velocities: Float32Array,
    lifetimes: Float32Array,
    ages: Float32Array
  ): void {
    // Reset to base position with organic variation
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.8) * config.spread * 0.3;
    
    positions[index * 3] = this.position.x + Math.cos(angle) * radius;
    positions[index * 3 + 1] = this.position.y + Math.random() * 0.1;
    positions[index * 3 + 2] = this.position.z + Math.sin(angle) * radius;

    // Reset velocity with enhanced patterns
    if (name === 'flames') {
      velocities[index * 3] = (Math.random() - 0.5) * 0.3;
      velocities[index * 3 + 1] = Math.random() * config.speed + 0.8;
      velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.3;
    } else if (name === 'smoke') {
      velocities[index * 3] = (Math.random() - 0.5) * 0.6;
      velocities[index * 3 + 1] = Math.random() * config.speed + 0.4;
      velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.6;
    } else if (name === 'embers') {
      const emberAngle = Math.random() * Math.PI * 2;
      const emberForce = Math.random() * 0.8 + 0.2;
      velocities[index * 3] = Math.cos(emberAngle) * emberForce;
      velocities[index * 3 + 1] = Math.random() * config.speed + 0.2;
      velocities[index * 3 + 2] = Math.sin(emberAngle) * emberForce;
    }

    ages[index] = 0;
    lifetimes[index] = config.lifetime * (0.8 + Math.random() * 0.4);
  }

  public setIntensity(intensity: number): void {
    for (const material of this.materials.values()) {
      FireShader.setShaderIntensity(material, intensity);
    }
  }

  public dispose(): void {
    for (const particleSystem of this.particleSystems.values()) {
      this.scene.remove(particleSystem);
      particleSystem.geometry.dispose();
      if (particleSystem.material instanceof THREE.Material) {
        particleSystem.material.dispose();
      }
    }
    
    for (const material of this.materials.values()) {
      material.dispose();
    }
    
    this.particleSystems.clear();
    this.materials.clear();
    console.log('🔥 Enhanced organic fire particle systems disposed');
  }
}
