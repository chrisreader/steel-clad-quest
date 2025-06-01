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
    console.log('Effects Manager initialized with realistic combat effects');
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
    
    // Update time-based effects with improved cleanup
    this.effects.forEach((effect, key) => {
      if (effect.userData.duration) {
        effect.userData.age += deltaTime * 1000;
        
        if (effect.userData.age >= effect.userData.duration) {
          // Proper cleanup with geometry disposal and type guards
          this.disposeEffectSafely(effect);
          this.scene.remove(effect);
          this.effects.delete(key);
        } else {
          if (effect.userData.update) {
            effect.userData.update(deltaTime);
          }
        }
      }
    });
  }
  
  private disposeEffectSafely(effect: THREE.Object3D): void {
    // Type guard for Mesh objects
    if (effect instanceof THREE.Mesh) {
      if (effect.geometry) {
        effect.geometry.dispose();
      }
      if (effect.material) {
        if (Array.isArray(effect.material)) {
          effect.material.forEach(mat => mat.dispose());
        } else {
          effect.material.dispose();
        }
      }
    }
    
    // Type guard for Line objects
    if (effect instanceof THREE.Line) {
      if (effect.geometry) {
        effect.geometry.dispose();
      }
      if (effect.material) {
        if (Array.isArray(effect.material)) {
          effect.material.forEach(mat => mat.dispose());
        } else {
          effect.material.dispose();
        }
      }
    }
  }
  
  public createSwordSwooshEffect(startPosition: THREE.Vector3, endPosition: THREE.Vector3, direction: THREE.Vector3): void {
    // Create wind-like swoosh effect that follows the sword blade
    const swooshGroup = new THREE.Group();
    
    // Create multiple wind streak lines for swoosh effect
    const numStreaks = 5;
    const streakLength = 0.8;
    
    for (let i = 0; i < numStreaks; i++) {
      const points = [];
      const offset = (i - numStreaks / 2) * 0.1;
      
      // Create curved wind streak points
      for (let j = 0; j <= 8; j++) {
        const t = j / 8;
        const pos = startPosition.clone().lerp(endPosition, t);
        
        // Add wind-like curvature
        const perpendicular = new THREE.Vector3()
          .crossVectors(direction, new THREE.Vector3(0, 1, 0))
          .normalize()
          .multiplyScalar(offset);
        
        const windCurve = Math.sin(t * Math.PI) * 0.2;
        pos.add(perpendicular);
        pos.y += windCurve;
        
        points.push(pos);
      }
      
      // Create line geometry for streak
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xCCCCCC,
        transparent: true,
        opacity: 0.6 - i * 0.1, // Fade outer streaks
        linewidth: 2
      });
      
      const streak = new THREE.Line(geometry, material);
      swooshGroup.add(streak);
    }
    
    // Add wind particles for enhanced effect
    const windParticles = ParticleSystem.createWindSwoosh(this.scene, startPosition, direction);
    windParticles.start();
    this.particleSystems.push(windParticles);
    
    swooshGroup.userData = {
      type: 'sword_swoosh',
      age: 0,
      duration: 200, // Quick 200ms effect
      update: (deltaTime: number) => {
        const progress = swooshGroup.userData.age / swooshGroup.userData.duration;
        
        // Fade out the swoosh
        swooshGroup.children.forEach((child, index) => {
          if (child instanceof THREE.Line && child.material) {
            const material = child.material as THREE.LineBasicMaterial;
            material.opacity = (0.6 - index * 0.1) * (1 - progress);
          }
        });
        
        // Slight movement with the wind
        swooshGroup.position.add(direction.clone().multiplyScalar(deltaTime * 2));
      }
    };
    
    this.scene.add(swooshGroup);
    this.effects.set(`sword_swoosh_${Date.now()}`, swooshGroup);
    
    console.log("🌪️ [EffectsManager] Created sword swoosh wind effect");
  }
  
  public createRealisticBloodEffect(position: THREE.Vector3, direction: THREE.Vector3, intensity: number = 1): void {
    // Create blood spray with proper physics
    const bloodSpray = ParticleSystem.createBloodSpray(this.scene, position, direction, intensity);
    bloodSpray.start();
    this.particleSystems.push(bloodSpray);
    
    // Create blood droplets
    const bloodDroplets = ParticleSystem.createBloodDroplets(this.scene, position, direction);
    bloodDroplets.start();
    this.particleSystems.push(bloodDroplets);
    
    // Create blood stain decal
    this.createBloodDecal(position, intensity);
  }
  
  private createBloodDecal(position: THREE.Vector3, intensity: number): void {
    const decalSize = 0.3 + intensity * 0.2;
    const geometry = new THREE.PlaneGeometry(decalSize, decalSize);
    
    // Create blood stain texture procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Create gradient blood stain
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(139, 0, 0, 0.8)');
    gradient.addColorStop(0.6, 'rgba(100, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(80, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: false
    });
    
    const decal = new THREE.Mesh(geometry, material);
    decal.position.copy(position);
    decal.position.y = 0.01; // Slightly above ground
    decal.rotation.x = -Math.PI / 2; // Lay flat on ground
    
    decal.userData = {
      type: 'blood_decal',
      age: 0,
      duration: 8000,
      update: (deltaTime: number) => {
        const progress = decal.userData.age / decal.userData.duration;
        if (progress > 0.7) {
          material.opacity = 0.8 * (1 - (progress - 0.7) / 0.3);
        }
      }
    };
    
    this.scene.add(decal);
    this.effects.set(`blood_decal_${Date.now()}`, decal);
  }
  
  public createArrowBloodEffect(position: THREE.Vector3, arrowDirection: THREE.Vector3, damage: number): void {
    // Create directional blood spray based on arrow trajectory
    const sprayDirection = arrowDirection.clone().normalize();
    const intensity = Math.min(damage / 50, 2); // Scale with damage
    
    // Main blood spray in arrow direction
    const bloodSpray = ParticleSystem.createDirectionalBloodSpray(this.scene, position, sprayDirection, intensity);
    bloodSpray.start();
    this.particleSystems.push(bloodSpray);
    
    // Blood trail particles
    const bloodTrail = ParticleSystem.createBloodTrail(this.scene, position, sprayDirection);
    bloodTrail.start();
    this.particleSystems.push(bloodTrail);
    
    // Create wound effect at entry point
    this.createWoundEffect(position, intensity);
  }
  
  private createWoundEffect(position: THREE.Vector3, intensity: number): void {
    const woundSize = 0.05 + intensity * 0.03;
    const geometry = new THREE.SphereGeometry(woundSize, 8, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8B0000,
      transparent: true,
      opacity: 0.9
    });
    
    const wound = new THREE.Mesh(geometry, material);
    wound.position.copy(position);
    
    wound.userData = {
      type: 'wound_effect',
      age: 0,
      duration: 1500
    };
    
    this.scene.add(wound);
    this.effects.set(`wound_${Date.now()}`, wound);
    
    // Remove after duration
    setTimeout(() => {
      this.scene.remove(wound);
      this.effects.delete(`wound_${Date.now()}`);
    }, 1500);
  }
  
  public createPlayerDamageEffect(damageDirection: THREE.Vector3, intensity: number): void {
    // Create screen edge blood effect (this would need UI integration)
    console.log('Player damage effect triggered with intensity:', intensity);
    
    // Create pain feedback particles around player
    const painSystem = ParticleSystem.createPainFeedback(this.scene, new THREE.Vector3(0, 1.5, 0));
    painSystem.start();
    this.particleSystems.push(painSystem);
    
    // Enhanced camera shake for player damage
    this.shakeCamera(0.04 * intensity);
  }
  
  // Legacy methods updated - REMOVED slash trail effects
  public createAttackEffect(position: THREE.Vector3, color: number = 0xFF6B6B): void {
    // Empty method - no effects for empty attacks
    console.log("⚔️ [EffectsManager] Empty attack - no effects created");
  }
  
  public createDamageEffect(position: THREE.Vector3): void {
    // Use realistic blood effect for damage
    const direction = new THREE.Vector3(0, 0, 1);
    this.createRealisticBloodEffect(position, direction, 1);
  }
  
  public createHitEffect(position: THREE.Vector3): void {
    const bloodSpray = ParticleSystem.createBloodSpray(this.scene, position, new THREE.Vector3(0, 0, 1), 0.8);
    bloodSpray.start();
    this.particleSystems.push(bloodSpray);
    
    this.shakeCamera(0.02);
  }
  
  public createBloodEffect(position: THREE.Vector3, direction: THREE.Vector3): void {
    this.createRealisticBloodEffect(position, direction, 1);
  }
  
  public createSwordTrail(positions: THREE.Vector3[]): THREE.Line | null {
    // Return null - no sword trails
    return null;
  }
  
  public updateSwordTrail(trail: THREE.Line, positions: THREE.Vector3[]): void {
    // Empty method - no sword trails
  }
  
  public createFireball(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createFireball(this.scene, position, direction);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
    
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
    
    const updateLight = (deltaTime: number) => {
      if (light.userData.age >= light.userData.duration) return;
      
      light.position.add(direction.clone().multiplyScalar(light.userData.speed * deltaTime));
      light.intensity = 0.8 + Math.random() * 0.2;
    };
    
    light.userData.update = updateLight;
  }
  
  public createDustCloud(position: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createDustCloud(this.scene, position);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  public createLevelUpEffect(position: THREE.Vector3): void {
    const particleSystem = ParticleSystem.createExplosion(this.scene, position, 0xFFDD00, 0.8);
    particleSystem.start();
    this.particleSystems.push(particleSystem);
  }
  
  public shakeCamera(intensity: number): void {
    this.cameraShakeIntensity = Math.min(intensity, 0.05);
    if (this.camera) {
      this.cameraOriginalPosition.copy(this.camera.position);
    }
  }
  
  public clearEffects(): void {
    this.effects.forEach(effect => {
      // Proper cleanup with type guards
      this.disposeEffectSafely(effect);
      this.scene.remove(effect);
    });
    this.effects.clear();
    
    this.particleSystems.forEach(system => {
      system.stop();
    });
    this.particleSystems = [];
    
    this.cameraShakeIntensity = 0;
    if (this.camera) {
      this.camera.position.copy(this.cameraOriginalPosition);
    }
  }
  
  public dispose(): void {
    this.clearEffects();
  }
}
