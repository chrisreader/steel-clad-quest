import * as THREE from 'three';
import { ParticleSystem } from '../utils/ParticleSystem';

export class EffectsManager {
  private scene: THREE.Scene;
  private particleSystems: ParticleSystem[] = [];
  private effects: Map<string, THREE.Object3D> = new Map();
  private cameraShakeIntensity: number = 0;
  private cameraShakeDecay: number = 0.9;
  private cameraOriginalPosition: THREE.Vector3 = new THREE.Vector3();
  private camera: THREE.Camera;
  
  constructor(scene: THREE.Scene, camera?: THREE.Camera) {
    this.scene = scene;
    this.camera = camera || new THREE.Camera();
    if (camera) {
      this.cameraOriginalPosition.copy(camera.position);
    }
    console.log('Effects Manager initialized with improved combat effects');
  }
  
  public update(deltaTime: number): void {
    // Update all particle systems
    this.particleSystems.forEach((system, index) => {
      system.update();
      
      // Remove inactive systems
      if (!(system as any).isActive) {
        this.particleSystems.splice(index, 1);
      }
    });
    
    // Update camera shake
    if (this.cameraShakeIntensity > 0.001) {
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity;
      
      this.camera.position.x = this.cameraOriginalPosition.x + shakeX;
      this.camera.position.y = this.cameraOriginalPosition.y + shakeY;
      
      this.cameraShakeIntensity *= this.cameraShakeDecay;
    } else if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = 0;
      this.camera.position.copy(this.cameraOriginalPosition);
    }
    
    // Update time-based effects
    this.effects.forEach((effect, key) => {
      if (effect.userData.duration) {
        effect.userData.age += deltaTime * 1000; // Convert to milliseconds
        
        if (effect.userData.age >= effect.userData.duration) {
          this.scene.remove(effect);
          this.effects.delete(key);
        } else {
          // Update based on effect type
          if (effect.userData.type === 'impact_flash') {
            const progress = effect.userData.age / effect.userData.duration;
            const material = (effect as THREE.Mesh).material as THREE.MeshBasicMaterial;
            material.opacity = 0.6 * (1 - progress);
            effect.scale.setScalar(0.2 + progress * 0.3);
          } else if (effect.userData.type === 'damage_particle' && effect.userData.update) {
            effect.userData.update(deltaTime);
          } else if (effect.userData.type === 'fireball_light' && effect.userData.update) {
            effect.userData.update(deltaTime);
          }
        }
      }
    });
  }
  
  public createAttackEffect(position: THREE.Vector3, color: number = 0xFF6B6B): void {
    // Create a small impact flash instead of large plane
    const flashGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    flash.position.y += 0.8;
    
    flash.userData = {
      type: 'impact_flash',
      age: 0,
      duration: 200
    };
    
    this.scene.add(flash);
    this.effects.set(`flash_${Date.now()}_${Math.random()}`, flash);
    
    // Add particle burst effect
    const impactSystem = ParticleSystem.createImpactBurst(this.scene, position);
    impactSystem.start();
    this.particleSystems.push(impactSystem);
    
    // Subtle camera shake
    this.shakeCamera(0.02);
  }
  
  public createDamageEffect(position: THREE.Vector3): void {
    // Create smaller, more numerous damage particles
    for (let i = 0; i < 12; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.03);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0, 0.8, 0.5 + Math.random() * 0.3), // Varied red tones
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      particle.position.y += 0.8 + Math.random() * 0.4;
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 3
      );
      
      this.scene.add(particle);
      
      particle.userData = {
        type: 'damage_particle',
        age: 0,
        duration: 600,
        velocity: velocity
      };
      
      this.effects.set(`damage_${Date.now()}_${Math.random()}`, particle);
      
      // Update function for this specific particle
      const updateParticle = (deltaTime: number) => {
        if (particle.userData.age >= particle.userData.duration) return;
        
        particle.position.add(velocity.clone().multiplyScalar(deltaTime));
        velocity.y -= 6 * deltaTime; // Gravity
        velocity.multiplyScalar(0.98); // Air resistance
        
        const progress = particle.userData.age / particle.userData.duration;
        particleMaterial.opacity = 0.8 * (1 - progress);
        
        // Shrink over time
        const scale = 1 - progress * 0.5;
        particle.scale.setScalar(scale);
      };
      
      particle.userData.update = updateParticle;
    }
  }
  
  public createHitEffect(position: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createExplosion(this.scene, position, 0xFF3366, 0.5);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
    
    // Very subtle camera shake
    this.shakeCamera(0.03);
  }
  
  public createBloodEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createBloodSplatter(this.scene, position, direction);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  public createSwooshEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    // Create a more subtle swoosh effect
    const particleSystem = ParticleSystem.createSwordTrail(this.scene, position, direction);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  public createSwordTrail(positions: THREE.Vector3[]): THREE.Line | null {
    if (positions.length < 2) return null;
    
    const geometry = new THREE.BufferGeometry().setFromPoints(positions);
    const material = new THREE.LineBasicMaterial({
      color: 0xCCCCCC,
      transparent: true,
      opacity: 0.4
    });
    
    const trail = new THREE.Line(geometry, material);
    this.scene.add(trail);
    
    trail.userData = {
      type: 'sword_trail',
      age: 0,
      duration: 150
    };
    
    this.effects.set(`trail_${Date.now()}`, trail);
    return trail;
  }
  
  public updateSwordTrail(trail: THREE.Line, positions: THREE.Vector3[]): void {
    if (!trail || positions.length < 2) return;
    
    const geometry = new THREE.BufferGeometry().setFromPoints(positions);
    trail.geometry.dispose();
    trail.geometry = geometry;
    
    // Reset age to keep trail alive
    trail.userData.age = 0;
  }
  
  public createFireball(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createFireball(this.scene, position, direction);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
    
    // Create a point light that follows the fireball
    const light = new THREE.PointLight(0xFF6600, 0.8, 4);
    light.position.copy(position);
    
    light.userData = {
      type: 'fireball_light',
      age: 0,
      duration: 1000,
      direction: direction.clone(),
      speed: 5
    };
    
    this.scene.add(light);
    this.effects.set(`fireball_light_${Date.now()}`, light);
    
    // Update function for this specific light
    const updateLight = (deltaTime: number) => {
      if (light.userData.age >= light.userData.duration) return;
      
      // Move light in direction
      light.position.add(direction.clone().multiplyScalar(light.userData.speed * deltaTime));
      
      // Gentle flicker
      light.intensity = 0.8 + Math.random() * 0.2;
    };
    
    light.userData.update = updateLight;
  }
  
  public createDustCloud(position: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createDustCloud(this.scene, position);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  // Legacy methods for backward compatibility
  public createLevelUpEffect(position: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createExplosion(this.scene, position, 0xFFDD00, 0.8);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  public shakeCamera(intensity: number): void {
    this.cameraShakeIntensity = Math.min(intensity, 0.05); // Cap shake intensity
    if (this.camera) {
      this.cameraOriginalPosition.copy(this.camera.position);
    }
  }
  
  public clearEffects(): void {
    // Clear all effects
    this.effects.forEach(effect => {
      this.scene.remove(effect);
    });
    this.effects.clear();
    
    // Clear all particle systems
    this.particleSystems.forEach(system => {
      system.stop();
    });
    this.particleSystems = [];
    
    // Reset camera shake
    this.cameraShakeIntensity = 0;
    if (this.camera) {
      this.camera.position.copy(this.cameraOriginalPosition);
    }
  }
  
  public dispose(): void {
    this.clearEffects();
  }
}
