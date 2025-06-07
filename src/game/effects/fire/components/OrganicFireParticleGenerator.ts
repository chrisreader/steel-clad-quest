
import * as THREE from 'three';
import { FireShader } from '../shaders/FireShader';
import { FireParticleConfig } from '../types/FireTypes';

export class OrganicFireParticleGenerator {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private particleSystems: Map<string, THREE.Points> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private totalTime: number = 0;
  private useShaderMaterial: boolean = true;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
    console.log('🔥 OrganicFireParticleGenerator created at position:', this.position);
  }

  public addOrganicParticleType(name: string, config: FireParticleConfig): void {
    console.log(`🔥 Creating ${name} particle system with ${config.count} particles`);
    
    let material: THREE.Material;
    
    try {
      if (this.useShaderMaterial && name === 'flames') {
        // Use shader material for flames
        material = FireShader.createFireMaterial();
        this.configureShaderMaterial(material as THREE.ShaderMaterial, name);
      } else {
        // Use basic material for all others or as fallback
        material = FireShader.createBasicFireMaterial(name);
      }
    } catch (error) {
      console.warn(`🔥 Shader material failed for ${name}, using basic material:`, error);
      material = FireShader.createBasicFireMaterial(name);
    }
    
    this.materials.set(name, material);
    this.createParticleSystem(name, config, material);
  }

  private configureShaderMaterial(material: THREE.ShaderMaterial, name: string): void {
    if (name === 'flames') {
      material.uniforms.particleSize.value = 60.0;
      material.uniforms.intensity.value = 1.2;
      material.uniforms.windStrength.value = 1.0;
      material.uniforms.opacity.value = 0.9;
    }
  }

  private createParticleSystem(name: string, config: FireParticleConfig, material: THREE.Material): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const velocities = new Float32Array(config.count * 3);
    const lifetimes = new Float32Array(config.count);
    const ages = new Float32Array(config.count);

    // Initialize particles
    for (let i = 0; i < config.count; i++) {
      this.resetParticle(i, name, config, positions, velocities, lifetimes, ages);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { name, config };
    
    this.particleSystems.set(name, particleSystem);
    this.scene.add(particleSystem);
    
    console.log(`🔥 Created ${name} particle system, added to scene`);
  }

  private resetParticle(
    index: number, 
    name: string, 
    config: FireParticleConfig,
    positions: Float32Array,
    velocities: Float32Array,
    lifetimes: Float32Array,
    ages: Float32Array
  ): void {
    // Reset to base position with variation
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.5) * config.spread * 0.5;
    
    positions[index * 3] = this.position.x + Math.cos(angle) * radius;
    positions[index * 3 + 1] = this.position.y + Math.random() * 0.2;
    positions[index * 3 + 2] = this.position.z + Math.sin(angle) * radius;

    // Set velocity based on particle type
    if (name === 'flames') {
      velocities[index * 3] = (Math.random() - 0.5) * 0.5;
      velocities[index * 3 + 1] = Math.random() * config.speed + 1.0;
      velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.5;
    } else if (name === 'smoke') {
      velocities[index * 3] = (Math.random() - 0.5) * 0.8;
      velocities[index * 3 + 1] = Math.random() * config.speed + 0.6;
      velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.8;
    } else if (name === 'embers') {
      const emberAngle = Math.random() * Math.PI * 2;
      const emberForce = Math.random() * 1.0 + 0.3;
      velocities[index * 3] = Math.cos(emberAngle) * emberForce;
      velocities[index * 3 + 1] = Math.random() * config.speed + 0.3;
      velocities[index * 3 + 2] = Math.sin(emberAngle) * emberForce;
    }

    ages[index] = 0;
    lifetimes[index] = config.lifetime * (0.7 + Math.random() * 0.6);
  }

  public update(deltaTime: number): void {
    this.totalTime += deltaTime;
    
    // Update shader materials
    for (const [name, material] of this.materials.entries()) {
      if (material instanceof THREE.ShaderMaterial) {
        FireShader.updateShaderTime(material, this.totalTime);
      }
    }

    // Update particle physics
    for (const [name, particleSystem] of this.particleSystems.entries()) {
      const { config } = particleSystem.userData;
      const positions = particleSystem.geometry.attributes.position as THREE.BufferAttribute;
      const velocities = particleSystem.geometry.attributes.velocity as THREE.BufferAttribute;
      const lifetimes = particleSystem.geometry.attributes.lifetime as THREE.BufferAttribute;
      const ages = particleSystem.geometry.attributes.age as THREE.BufferAttribute;

      for (let i = 0; i < config.count; i++) {
        // Update age
        ages.array[i] += deltaTime;

        // Reset particle if expired
        if (ages.array[i] >= lifetimes.array[i]) {
          this.resetParticle(
            i, name, config,
            positions.array as Float32Array,
            velocities.array as Float32Array,
            lifetimes.array as Float32Array,
            ages.array as Float32Array
          );
        } else {
          // Update position - simple physics only (shader handles visual motion)
          positions.array[i * 3] += velocities.array[i * 3] * deltaTime;
          positions.array[i * 3 + 1] += velocities.array[i * 3 + 1] * deltaTime;
          positions.array[i * 3 + 2] += velocities.array[i * 3 + 2] * deltaTime;

          // Apply slight damping
          velocities.array[i * 3] *= 0.99;
          velocities.array[i * 3 + 2] *= 0.99;
        }
      }

      // Mark attributes as needing update
      positions.needsUpdate = true;
      velocities.needsUpdate = true;
      ages.needsUpdate = true;
      lifetimes.needsUpdate = true;
    }
  }

  public setIntensity(intensity: number): void {
    for (const material of this.materials.values()) {
      if (material instanceof THREE.ShaderMaterial) {
        FireShader.setShaderIntensity(material, intensity);
      }
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
    console.log('🔥 Fire particle systems disposed');
  }
}
