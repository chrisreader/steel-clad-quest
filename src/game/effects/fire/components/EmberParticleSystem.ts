
import * as THREE from 'three';

interface EmberParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

export class EmberParticleSystem {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private particles: EmberParticle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private time: number = 0;
  private emberCount: number;

  constructor(scene: THREE.Scene, position: THREE.Vector3, emberCount: number = 20) {
    this.scene = scene;
    this.position = position.clone();
    this.emberCount = emberCount;
    
    this.initializeParticles();
    this.createGeometry();
    this.createMaterial();
    this.createPoints();
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.emberCount; i++) {
      this.particles.push({
        position: this.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 1.0 + 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        age: Math.random() * 5,
        maxAge: 3 + Math.random() * 4,
        size: 0.02 + Math.random() * 0.04,
        color: new THREE.Color().setHSL(0.08 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.3),
        active: true
      });
    }
  }

  private createGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.emberCount * 3);
    const colors = new Float32Array(this.emberCount * 3);
    const sizes = new Float32Array(this.emberCount);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  private createMaterial(): void {
    this.material = new THREE.PointsMaterial({
      size: 0.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false
    });
  }

  private createPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      if (!particle.active) continue;
      
      // Update age
      particle.age += deltaTime;
      
      // Reset particle if expired
      if (particle.age >= particle.maxAge) {
        particle.position.copy(this.position);
        particle.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0,
          (Math.random() - 0.5) * 0.8
        ));
        particle.velocity.set(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 1.0 + 0.5,
          (Math.random() - 0.5) * 0.5
        );
        particle.age = 0;
        particle.maxAge = 3 + Math.random() * 4;
      }
      
      // Apply physics
      particle.velocity.y -= 0.2 * deltaTime; // Gravity
      particle.velocity.multiplyScalar(0.98); // Air resistance
      
      // Add wind effect
      particle.velocity.x += Math.sin(this.time * 2 + i) * 0.1 * deltaTime;
      particle.velocity.z += Math.cos(this.time * 1.5 + i) * 0.1 * deltaTime;
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      
      // Update attributes
      const i3 = i * 3;
      positions[i3] = particle.position.x;
      positions[i3 + 1] = particle.position.y;
      positions[i3 + 2] = particle.position.z;
      
      // Fade out over time
      const ageRatio = particle.age / particle.maxAge;
      const alpha = Math.max(0, 1 - ageRatio);
      
      colors[i3] = particle.color.r * alpha;
      colors[i3 + 1] = particle.color.g * alpha;
      colors[i3 + 2] = particle.color.b * alpha;
      
      sizes[i] = particle.size * alpha;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
