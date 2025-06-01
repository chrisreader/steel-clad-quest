
import * as THREE from 'three';

export class EffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private particles: THREE.Group[] = [];

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  public createBloodEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleGroup = new THREE.Group();
    
    const particleGeometry = new THREE.SphereGeometry(0.05);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
    
    for (let i = 0; i < 5; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      
      const velocity = direction.clone().multiplyScalar(Math.random() * 5 + 2);
      velocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ));
      
      (particle as any).velocity = velocity;
      particleGroup.add(particle);
    }
    
    this.scene.add(particleGroup);
    this.particles.push(particleGroup);
    
    // Remove after 2 seconds
    setTimeout(() => {
      this.scene.remove(particleGroup);
      const index = this.particles.indexOf(particleGroup);
      if (index > -1) {
        this.particles.splice(index, 1);
      }
    }, 2000);
  }

  public createSwordSlashEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    const slashGeometry = new THREE.PlaneGeometry(0.1, 2);
    const slashMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.8 
    });
    
    const slash = new THREE.Mesh(slashGeometry, slashMaterial);
    slash.position.copy(position);
    slash.lookAt(position.clone().add(direction));
    
    this.scene.add(slash);
    
    // Fade out animation
    const fadeOut = () => {
      slashMaterial.opacity -= 0.05;
      if (slashMaterial.opacity <= 0) {
        this.scene.remove(slash);
      } else {
        requestAnimationFrame(fadeOut);
      }
    };
    
    setTimeout(fadeOut, 100);
  }

  public createAttackEffect(position: THREE.Vector3): void {
    this.createSwordSlashEffect(position, new THREE.Vector3(1, 0, 0));
  }

  public createHitEffect(position: THREE.Vector3): void {
    this.createBloodEffect(position, new THREE.Vector3(0, 1, 0));
  }

  public createExplosion(position: THREE.Vector3): void {
    const particleGroup = new THREE.Group();
    
    const particleGeometry = new THREE.SphereGeometry(0.1);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    
    for (let i = 0; i < 10; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      );
      
      (particle as any).velocity = velocity;
      particleGroup.add(particle);
    }
    
    this.scene.add(particleGroup);
    this.particles.push(particleGroup);
    
    // Remove after 3 seconds
    setTimeout(() => {
      this.scene.remove(particleGroup);
      const index = this.particles.indexOf(particleGroup);
      if (index > -1) {
        this.particles.splice(index, 1);
      }
    }, 3000);
  }

  public update(deltaTime: number): void {
    // Update particle systems
    this.particles.forEach(particleGroup => {
      particleGroup.children.forEach(particle => {
        const velocity = (particle as any).velocity;
        if (velocity) {
          particle.position.add(velocity.clone().multiplyScalar(deltaTime));
          velocity.y -= 9.8 * deltaTime; // Gravity
        }
      });
    });
  }

  public dispose(): void {
    this.particles.forEach(particleGroup => {
      this.scene.remove(particleGroup);
    });
    this.particles = [];
  }
}
