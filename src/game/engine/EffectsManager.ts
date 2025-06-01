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
    console.log('Effects Manager initialized with advanced features');
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
          if (effect.userData.type === 'slash') {
            const progress = effect.userData.age / effect.userData.duration;
            effect.scale.x = 1 + progress * 2;
            const material = (effect as THREE.Mesh).material as THREE.MeshBasicMaterial;
            material.opacity = 0.9 * (1 - progress);
          } else if (effect.userData.type === 'swoosh') {
            const progress = effect.userData.age / effect.userData.duration;
            const material = (effect as THREE.Line).material as THREE.LineBasicMaterial;
            material.opacity = 0.8 * (1 - progress);
            effect.scale.setScalar(1 + progress * 0.5);
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
    const slashGeometry = new THREE.PlaneGeometry(1.5, 0.2);
    const slashMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    const slash = new THREE.Mesh(slashGeometry, slashMaterial);
    slash.position.copy(position);
    slash.position.y += 0.5;
    slash.rotation.z = Math.random() * Math.PI;
    
    slash.userData = {
      type: 'slash',
      age: 0,
      duration: 400
    };
    
    this.scene.add(slash);
    this.effects.set(`slash_${Date.now()}_${Math.random()}`, slash);
  }
  
  public createDamageEffect(position: THREE.Vector3): void {
    for (let i = 0; i < 8; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.05);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF3333,
        transparent: true,
        opacity: 1
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      particle.position.y += 1;
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      
      this.scene.add(particle);
      
      particle.userData = {
        type: 'damage_particle',
        age: 0,
        duration: 800,
        velocity: velocity
      };
      
      this.effects.set(`damage_${Date.now()}_${Math.random()}`, particle);
      
      // Update function for this specific particle
      const updateParticle = (deltaTime: number) => {
        if (particle.userData.age >= particle.userData.duration) return;
        
        particle.position.add(velocity.clone().multiplyScalar(deltaTime));
        velocity.y -= 9.8 * deltaTime; // Gravity
        
        const progress = particle.userData.age / particle.userData.duration;
        particleMaterial.opacity = 1 - progress;
      };
      
      // Store the update function in userData for use in main update loop
      particle.userData.update = updateParticle;
    }
  }
  
  public createHitEffect(position: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createExplosion(this.scene, position);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
    
    // Add camera shake
    this.shakeCamera(0.1);
  }
  
  public createBloodEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createBloodSplatter(this.scene, position, direction);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  public createSwooshEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(direction.x * 0.5, direction.y * 0.5 + 0.5, direction.z * 0.5),
      new THREE.Vector3(direction.x, direction.y, direction.z)
    );

    const points = curve.getPoints(20);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8
    });

    const swoosh = new THREE.Line(geometry, material);
    swoosh.position.copy(position);
    
    swoosh.userData = {
      type: 'swoosh',
      age: 0,
      duration: 300
    };
    
    this.scene.add(swoosh);
    this.effects.set(`swoosh_${Date.now()}_${Math.random()}`, swoosh);
  }
  
  public createSwordTrail(positions: THREE.Vector3[]): THREE.Line | null {
    if (positions.length < 2) return null;
    
    const geometry = new THREE.BufferGeometry().setFromPoints(positions);
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8
    });
    
    const trail = new THREE.Line(geometry, material);
    this.scene.add(trail);
    
    trail.userData = {
      type: 'sword_trail',
      age: 0,
      duration: 300
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
    const light = new THREE.PointLight(0xFF6600, 1, 6);
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
      
      // Flicker intensity
      light.intensity = 1 + Math.random() * 0.3;
    };
    
    // Store the update function in userData
    light.userData.update = updateLight;
  }
  
  public createDustCloud(position: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createDustCloud(this.scene, position);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  // Legacy methods for backward compatibility
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

    setTimeout(() => {
      this.scene.remove(particles);
    }, 1000);
  }
  
  public shakeCamera(intensity: number): void {
    this.cameraShakeIntensity = intensity;
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
