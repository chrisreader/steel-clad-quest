import * as THREE from 'three';
import { FireShader } from '../shaders/FireShader';
import { FireParticleConfig } from '../types/FireTypes';

export class OrganicFireParticleGenerator {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private particleSystems: Map<string, THREE.Points> = new Map();
  private materials: Map<string, THREE.ShaderMaterial> = new Map();
  private time: number = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
  }

  public addOrganicParticleType(name: string, config: FireParticleConfig): void {
    console.log(`🔥 Creating organic ${name} particle system with ${config.count} particles`);
    
    // Create custom shader material for realistic flames
    const material = FireShader.createFireMaterial();
    
    // Adjust shader parameters based on particle type
    if (name === 'flames') {
      FireShader.setShaderIntensity(material, 1.2);
      FireShader.setWindEffect(material, 0.8, new THREE.Vector2(1, 0.3));
      material.uniforms.turbulenceSpeed.value = 3.0;
    } else if (name === 'smoke') {
      FireShader.setShaderIntensity(material, 0.4);
      FireShader.setWindEffect(material, 1.2, new THREE.Vector2(0.8, 1.0));
      material.uniforms.turbulenceSpeed.value = 1.5;
      
      // Override colors for smoke
      material.uniforms.opacity.value = 0.3;
      material.blending = THREE.NormalBlending;
    } else if (name === 'embers') {
      FireShader.setShaderIntensity(material, 1.5);
      FireShader.setWindEffect(material, 0.6, new THREE.Vector2(1.2, 0.8));
      material.uniforms.turbulenceSpeed.value = 2.0;
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

    // Initialize particles with organic distribution
    for (let i = 0; i < config.count; i++) {
      // Organic circular distribution for more natural flame base
      const angle = (i / config.count) * Math.PI * 2 + Math.random() * 0.5;
      const radius = Math.sqrt(Math.random()) * config.spread * 0.3;
      
      positions[i * 3] = this.position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = this.position.y + Math.random() * 0.2;
      positions[i * 3 + 2] = this.position.z + Math.sin(angle) * radius;

      // Organic velocity patterns
      if (name === 'flames') {
        velocities[i * 3] = (Math.random() - 0.5) * 0.3;
        velocities[i * 3 + 1] = Math.random() * config.speed + 0.8;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      } else if (name === 'smoke') {
        velocities[i * 3] = (Math.random() - 0.5) * 0.6;
        velocities[i * 3 + 1] = Math.random() * config.speed + 0.4;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      } else if (name === 'embers') {
        const emberAngle = Math.random() * Math.PI * 2;
        const emberForce = Math.random() * 0.8 + 0.2;
        velocities[i * 3] = Math.cos(emberAngle) * emberForce;
        velocities[i * 3 + 1] = Math.random() * config.speed + 0.2;
        velocities[i * 3 + 2] = Math.sin(emberAngle) * emberForce;
      }

      lifetimes[i] = config.lifetime * (0.8 + Math.random() * 0.4);
      ages[i] = Math.random() * lifetimes[i];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { name, config };
    
    this.particleSystems.set(name, particleSystem);
    this.scene.add(particleSystem);
    
    console.log(`🔥 Created organic ${name} particle system with realistic dancing flames`);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    console.log(`🔥 Updating fire particles, deltaTime: ${deltaTime}, time: ${this.time}`);
    
    // Update all shader materials with time
    for (const material of this.materials.values()) {
      FireShader.updateShaderTime(material, deltaTime);
    }

    // Update particle physics with organic motion
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
          this.resetParticle(i, name, config, positions, velocities, lifetimes, ages);
          particlesUpdated++;
        } else {
          // Update position with organic turbulence
          const turbulence = Math.sin(this.time * 2.0 + i * 0.5) * 0.1;
          
          positions.array[i * 3] += (velocities.array[i * 3] + turbulence) * deltaTime;
          positions.array[i * 3 + 1] += velocities.array[i * 3 + 1] * deltaTime;
          positions.array[i * 3 + 2] += (velocities.array[i * 3 + 2] + turbulence * 0.5) * deltaTime;

          // Add organic swaying motion
          const swayX = Math.sin(this.time * 1.5 + i * 0.3) * 0.05 * deltaTime;
          const swayZ = Math.cos(this.time * 1.2 + i * 0.4) * 0.05 * deltaTime;
          
          positions.array[i * 3] += swayX;
          positions.array[i * 3 + 2] += swayZ;

          // Slow down velocity over time for natural deceleration
          velocities.array[i * 3] *= 0.98;
          velocities.array[i * 3 + 2] *= 0.98;
          
          particlesUpdated++;
        }
      }

      // Mark attributes as needing update
      positions.needsUpdate = true;
      velocities.needsUpdate = true;
      ages.needsUpdate = true;
      
      console.log(`🔥 Updated ${particlesUpdated} ${name} particles`);
    }
  }

  private resetParticle(
    index: number, 
    name: string, 
    config: FireParticleConfig,
    positions: THREE.BufferAttribute,
    velocities: THREE.BufferAttribute,
    lifetimes: THREE.BufferAttribute,
    ages: THREE.BufferAttribute
  ): void {
    // Reset to base position with organic variation
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * config.spread * 0.3;
    
    positions.array[index * 3] = this.position.x + Math.cos(angle) * radius;
    positions.array[index * 3 + 1] = this.position.y + Math.random() * 0.1;
    positions.array[index * 3 + 2] = this.position.z + Math.sin(angle) * radius;

    // Reset velocity with organic patterns
    if (name === 'flames') {
      velocities.array[index * 3] = (Math.random() - 0.5) * 0.3;
      velocities.array[index * 3 + 1] = Math.random() * config.speed + 0.8;
      velocities.array[index * 3 + 2] = (Math.random() - 0.5) * 0.3;
    } else if (name === 'smoke') {
      velocities.array[index * 3] = (Math.random() - 0.5) * 0.6;
      velocities.array[index * 3 + 1] = Math.random() * config.speed + 0.4;
      velocities.array[index * 3 + 2] = (Math.random() - 0.5) * 0.6;
    } else if (name === 'embers') {
      const emberAngle = Math.random() * Math.PI * 2;
      const emberForce = Math.random() * 0.8 + 0.2;
      velocities.array[index * 3] = Math.cos(emberAngle) * emberForce;
      velocities.array[index * 3 + 1] = Math.random() * config.speed + 0.2;
      velocities.array[index * 3 + 2] = Math.sin(emberAngle) * emberForce;
    }

    ages.array[index] = 0;
    lifetimes.array[index] = config.lifetime * (0.8 + Math.random() * 0.4);
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
    console.log('🔥 Organic fire particle systems disposed');
  }
}
