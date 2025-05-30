
import * as THREE from 'three';

export class EffectsManager {
  private scene: THREE.Scene;
  private particles: THREE.Points[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('Effects Manager initialized');
  }

  public createHitEffect(position: THREE.Vector3): void {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = position.x + (Math.random() - 0.5) * 2;
      positions[i + 1] = position.y + (Math.random() - 0.5) * 2;
      positions[i + 2] = position.z + (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff4444,
      size: 0.1,
      transparent: true,
      opacity: 1
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.particles.push(particles);

    // Animate particles
    setTimeout(() => {
      this.scene.remove(particles);
      const index = this.particles.indexOf(particles);
      if (index > -1) {
        this.particles.splice(index, 1);
      }
    }, 500);
  }

  public createLevelUpEffect(position: THREE.Vector3): void {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = position.x + (Math.random() - 0.5) * 3;
      positions[i + 1] = position.y + Math.random() * 5;
      positions[i + 2] = position.z + (Math.random() - 0.5) * 3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffdd00,
      size: 0.2,
      transparent: true,
      opacity: 1
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    this.particles.push(particles);

    setTimeout(() => {
      this.scene.remove(particles);
      const index = this.particles.indexOf(particles);
      if (index > -1) {
        this.particles.splice(index, 1);
      }
    }, 1000);
  }

  public update(deltaTime: number): void {
    // Update particle effects if needed
    this.particles.forEach(particle => {
      particle.rotation.y += deltaTime;
    });
  }
}
