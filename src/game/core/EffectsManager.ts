import * as THREE from 'three';

export class EffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    
    console.log("✨ [EffectsManager] Initialized");
  }
  
  public createAttackEffect(position: THREE.Vector3, color: number): void {
    const geometry = new THREE.SphereGeometry(0.2, 12, 12);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    this.scene.add(sphere);
    
    // Animate the sphere
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / 500;
      
      if (progress >= 1) {
        this.scene.remove(sphere);
        geometry.dispose();
        material.dispose();
        return;
      }
      
      sphere.scale.setScalar(1 + progress * 2);
      sphere.material.opacity = 1 - progress;
      (sphere.material as THREE.MeshBasicMaterial).transparent = true;
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  public createHitEffect(position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.3, 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    this.scene.add(sphere);
    
    // Animate the sphere
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / 400;
      
      if (progress >= 1) {
        this.scene.remove(sphere);
        geometry.dispose();
        material.dispose();
        return;
      }
      
      sphere.scale.setScalar(1 + progress * 3);
      sphere.material.opacity = 0.8 * (1 - progress);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  public createBloodEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.04, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0x8B0000 });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      this.scene.add(particle);
      
      // Randomize the particle direction slightly
      const randomX = (Math.random() - 0.5) * 0.2;
      const randomY = Math.random() * 0.3;
      const randomZ = (Math.random() - 0.5) * 0.2;
      
      const particleDirection = new THREE.Vector3(
        direction.x + randomX,
        direction.y + randomY,
        direction.z + randomZ
      ).normalize().multiplyScalar(0.3);
      
      // Animate the particle
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 600;
        
        if (progress >= 1) {
          this.scene.remove(particle);
          geometry.dispose();
          material.dispose();
          return;
        }
        
        particle.position.add(particleDirection);
        particle.material.opacity = 1 - progress;
        (particle.material as THREE.MeshBasicMaterial).transparent = true;
        
        requestAnimationFrame(animate);
      };
      
      animate();
    }
  }
  
  public createExplosion(position: THREE.Vector3, color: number): void {
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: color });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      this.scene.add(particle);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.4;
      
      const particleDirection = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 0.3
      );
      
      // Animate the particle
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 700;
        
        if (progress >= 1) {
          this.scene.remove(particle);
          geometry.dispose();
          material.dispose();
          return;
        }
        
        particle.position.add(particleDirection);
        particle.material.opacity = 1 - progress;
        (particle.material as THREE.MeshBasicMaterial).transparent = true;
        
        requestAnimationFrame(animate);
      };
      
      animate();
    }
  }
  
  public createMagicTrail(startPosition: THREE.Vector3, endPosition: THREE.Vector3, color: number): void {
    const lineMaterial = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    const points = [startPosition, endPosition];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(line);
    
    // Animate the trail fading out
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / 500;
      
      if (progress >= 1) {
        this.scene.remove(line);
        lineGeometry.dispose();
        lineMaterial.dispose();
        return;
      }
      
      lineMaterial.opacity = 0.5 * (1 - progress);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  public dispose(): void {
    console.log("✨ [EffectsManager] Disposing...");
  }
}
