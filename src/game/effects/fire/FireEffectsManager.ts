import * as THREE from 'three';
import { OrganicFireParticleGenerator } from './components/OrganicFireParticleGenerator';
import { FireLightingSystem } from './components/FireLightingSystem';
import { FireSoundManager } from './components/FireSoundManager';
import { FireConfig, FireLightConfig, FireSoundConfig, FIREPLACE_PARTICLE_CONFIGS } from './types/FireTypes';
import { AudioManager } from '../../engine/AudioManager';

export class FireEffectsManager {
  private scene: THREE.Scene;
  private audioManager: AudioManager;
  private position: THREE.Vector3;
  private config: FireConfig;
  
  private organicParticleGenerator: OrganicFireParticleGenerator | null = null;
  private lightingSystem: FireLightingSystem | null = null;
  private soundManager: FireSoundManager | null = null;
  
  private isActive: boolean = false;

  constructor(scene: THREE.Scene, audioManager: AudioManager, position: THREE.Vector3, config: FireConfig) {
    this.scene = scene;
    this.audioManager = audioManager;
    this.position = position.clone();
    this.config = config;
  }

  public start(): void {
    if (this.isActive) return;

    console.log('🔥 Starting enhanced organic fire effects with dancing animation at position:', this.position);

    // Initialize organic particle generator with enhanced realistic dancing flames
    this.organicParticleGenerator = new OrganicFireParticleGenerator(this.scene, this.position);
    
    // Add different particle types with enhanced organic motion and increased counts
    const flameConfig = { ...FIREPLACE_PARTICLE_CONFIGS.flames };
    flameConfig.count = Math.floor(this.config.particleCount * 0.6); // 60% flames for better visibility
    flameConfig.speed = 2.5; // Increased speed for more dynamic movement
    this.organicParticleGenerator.addOrganicParticleType('flames', flameConfig);

    if (this.config.smokeEnabled) {
      const smokeConfig = { ...FIREPLACE_PARTICLE_CONFIGS.smoke };
      smokeConfig.count = Math.floor(this.config.particleCount * 0.25); // 25% smoke
      smokeConfig.speed = 1.5; // Enhanced smoke movement
      this.organicParticleGenerator.addOrganicParticleType('smoke', smokeConfig);
    }

    const emberConfig = { ...FIREPLACE_PARTICLE_CONFIGS.embers };
    emberConfig.count = this.config.emberCount + 5; // More embers for effect
    emberConfig.speed = 0.8; // Slightly faster embers
    this.organicParticleGenerator.addOrganicParticleType('embers', emberConfig);

    // Initialize lighting system with enhanced flickering
    const lightConfig: FireLightConfig = {
      color: this.config.lightColor,
      baseIntensity: this.config.lightIntensity,
      maxIntensity: this.config.lightIntensity * 1.4, // More dramatic flickering
      flickerSpeed: this.config.flickerSpeed * 1.2, // Faster flicker
      distance: this.config.lightDistance,
      castShadow: true
    };
    this.lightingSystem = new FireLightingSystem(this.scene, this.position, lightConfig);

    // Initialize sound manager
    const soundConfig: FireSoundConfig = {
      volume: 0.3,
      loop: true,
      fadeInTime: 2.0,
      fadeOutTime: 1.0,
      distanceModel: 'inverse'
    };
    this.soundManager = new FireSoundManager(this.audioManager, soundConfig);
    this.soundManager.start();

    this.isActive = true;
    console.log('🔥 Enhanced organic fire effects system fully initialized with grass-like dancing flames');
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    if (this.organicParticleGenerator) {
      this.organicParticleGenerator.update(deltaTime);
    }

    if (this.lightingSystem) {
      this.lightingSystem.update(deltaTime);
    }
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = intensity;
    
    if (this.organicParticleGenerator) {
      this.organicParticleGenerator.setIntensity(intensity);
    }
    
    if (this.lightingSystem) {
      this.lightingSystem.setIntensity(intensity);
    }
    
    if (this.soundManager) {
      this.soundManager.updateVolume(0.3 * intensity);
    }
  }

  public stop(): void {
    if (!this.isActive) return;

    if (this.organicParticleGenerator) {
      this.organicParticleGenerator.dispose();
      this.organicParticleGenerator = null;
    }

    if (this.lightingSystem) {
      this.lightingSystem.dispose();
      this.lightingSystem = null;
    }

    if (this.soundManager) {
      this.soundManager.dispose();
      this.soundManager = null;
    }

    this.isActive = false;
    console.log('🔥 Enhanced organic fire effects stopped');
  }

  public dispose(): void {
    this.stop();
  }

  public isRunning(): boolean {
    return this.isActive;
  }
}
