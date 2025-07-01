import * as THREE from 'three';
import { ParticleSystem } from '../utils/ParticleSystem';
import { SwordTrailEffect } from '../effects/SwordTrailEffect';

export class EffectsManager {
  private scene: THREE.Scene;
  private particleSystems: ParticleSystem[] = [];
  private effects: Map<string, THREE.Object3D> = new Map();
  private swordTrailEffects: SwordTrailEffect[] = [];
  private cameraShakeIntensity: number = 0;
  private cameraShakeDecay: number = 0.9;
  private cameraOriginalPosition: THREE.Vector3 = new THREE.Vector3();
  private camera: THREE.Camera;
  private isFirstPersonMode: boolean = true; // Add flag to disable camera shake in first-person
  
  constructor(scene: THREE.Scene, camera?: THREE.Camera) {
    this.scene = scene;
    this.camera = camera || new THREE.Camera();
    if (camera) {
      this.cameraOriginalPosition.copy(camera.position);
    }
    console.log('Effects Manager initialized with first-person compatible effects');
  }
  
  public setFirstPersonMode(enabled: boolean): void {
    this.isFirstPersonMode = enabled;
    // Reset camera shake when switching modes
    if (enabled && this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = 0;
      if (this.camera) {
        this.camera.position.copy(this.cameraOriginalPosition);
      }
    }
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
    
    // FIXED: Only apply camera shake in third-person mode to prevent first-person conflicts
    if (!this.isFirstPersonMode && this.cameraShakeIntensity > 0.001) {
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity;
      
      this.camera.position.x = this.cameraOriginalPosition.x + shakeX;
      this.camera.position.y = this.cameraOriginalPosition.y + shakeY;
      
      this.cameraShakeIntensity *= this.cameraShakeDecay;
    } else if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = 0;
      // Don't reset camera position in first-person mode - let MovementSystem handle it
      if (!this.isFirstPersonMode && this.camera) {
        this.camera.position.copy(this.cameraOriginalPosition);
      }
    }
    
    // Update time-based effects with improved cleanup
    this.effects.forEach((effect, key) => {
      if (effect.userData.duration) {
        effect.userData.age += deltaTime * 1000;
        
        if (effect.userData.age >= effect.userData.duration) {
          // Proper cleanup with geometry disposal and type guards
          console.log(`🩸 [EffectsManager] Removing expired effect: ${effect.userData.type} after ${effect.userData.age}ms`);
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
      depthWrite: false,
      opacity: 0.8 // Set initial opacity to match fade calculation
    });
    
    const decal = new THREE.Mesh(geometry, material);
    decal.position.copy(position);
    decal.position.y = 0.01; // Slightly above ground
    decal.rotation.x = -Math.PI / 2; // Lay flat on ground
    
    const decalKey = `blood_decal_${Date.now()}_${Math.random()}`;
    
    decal.userData = {
      type: 'blood_decal',
      age: 0,
      duration: 8000,
      update: (deltaTime: number) => {
        const progress = decal.userData.age / decal.userData.duration;
        
        // Start fading at 50% progress for smoother transition
        if (progress > 0.5) {
          const fadeProgress = (progress - 0.5) / 0.5; // 0 to 1 over the last 50%
          const newOpacity = 0.8 * (1 - fadeProgress);
          material.opacity = Math.max(0, newOpacity);
          
          // Debug logging every 2 seconds
          if (Math.floor(decal.userData.age / 2000) > Math.floor((decal.userData.age - deltaTime * 1000) / 2000)) {
            console.log(`🩸 [EffectsManager] Blood decal ${decalKey} - Progress: ${(progress * 100).toFixed(1)}%, Opacity: ${material.opacity.toFixed(2)}`);
          }
        }
      }
    };
    
    this.scene.add(decal);
    this.effects.set(decalKey, decal);
    
    console.log(`🩸 [EffectsManager] Created blood decal ${decalKey} at position:`, position, `with ${decal.userData.duration}ms duration`);
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
    
    // FIXED: Reduced camera shake intensity and disabled in first-person mode
    if (!this.isFirstPersonMode) {
      this.shakeCamera(0.02 * intensity); // Reduced from 0.04
    }
  }
  
  // UPDATED: Enhanced sword swoosh effect using trail system
  public createSwordSwooshEffect(swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): void {
    if (swordPath.length < 2) {
      console.log("🌪️ [EffectsManager] Insufficient sword path data for swoosh effect");
      return;
    }
    
    console.log("🌪️ [EffectsManager] Creating trail-based sword swoosh effect following blade path");
    console.log("🌪️ [EffectsManager] Sword path points:", swordPath.length);
    console.log("🌪️ [EffectsManager] Path start:", swordPath[0]);
    console.log("🌪️ [EffectsManager] Path end:", swordPath[swordPath.length - 1]);
    
    // Create trail-based effect that follows the sword path
    const trailEffect = new SwordTrailEffect(this.scene);
    trailEffect.createTrailFromPath(swordPath, swingDirection);
    this.swordTrailEffects.push(trailEffect);
    
    // Clean up old trail effects
    this.cleanupOldTrailEffects();
    
    console.log("🌪️ [EffectsManager] Trail-based sword swoosh effect created");
  }
  
  private cleanupOldTrailEffects(): void {
    // Remove trail effects older than 1 second
    const now = Date.now();
    this.swordTrailEffects = this.swordTrailEffects.filter(effect => {
      // Trail effects will dispose themselves after their lifetime
      return true; // Let them manage their own cleanup
    });
  }
  
  // LEGACY METHODS UPDATED - REMOVED SLASH TRAIL EFFECTS
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
    
    // FIXED: Reduced shake and disabled in first-person
    if (!this.isFirstPersonMode) {
      this.shakeCamera(0.01); // Reduced from 0.02
    }
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
    // FIXED: Only apply camera shake in third-person mode
    if (!this.isFirstPersonMode) {
      this.cameraShakeIntensity = Math.min(intensity, 0.03); // Reduced max intensity
      if (this.camera) {
        this.cameraOriginalPosition.copy(this.camera.position);
      }
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
    
    // Clear trail effects
    this.swordTrailEffects.forEach(effect => {
      effect.dispose();
    });
    this.swordTrailEffects = [];
    
    this.cameraShakeIntensity = 0;
    if (this.camera && !this.isFirstPersonMode) {
      this.camera.position.copy(this.cameraOriginalPosition);
    }
  }
  
  public dispose(): void {
    this.clearEffects();
  }
}
