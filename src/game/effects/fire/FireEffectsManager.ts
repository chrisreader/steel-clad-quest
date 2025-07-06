
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
  
  private particleGenerator: OrganicFireParticleGenerator | null = null;
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

    // Initialize optimized particle generator
    this.particleGenerator = new OrganicFireParticleGenerator(this.scene, this.position);
    
    // PERFORMANCE: Significantly reduced particle counts (using already optimized FIREPLACE_PARTICLE_CONFIGS)
    const flameConfig = { ...FIREPLACE_PARTICLE_CONFIGS.flames };
    flameConfig.count = Math.floor(this.config.particleCount * 0.2); // Reduced from 0.45
    this.particleGenerator.addParticleType('flames', flameConfig);

    if (this.config.smokeEnabled) {
      const smokeConfig = { ...FIREPLACE_PARTICLE_CONFIGS.smoke };
      smokeConfig.count = Math.floor(this.config.particleCount * 0.15); // Reduced from 0.25
      this.particleGenerator.addParticleType('smoke', smokeConfig);
    }

    const emberConfig = { ...FIREPLACE_PARTICLE_CONFIGS.embers };
    emberConfig.count = Math.max(1, this.config.emberCount * 0.3); // Reduced from 0.6
    this.particleGenerator.addParticleType('embers', emberConfig);

    // PERFORMANCE: Optimized single light system
    const lightConfig: FireLightConfig = {
      color: this.config.lightColor,
      baseIntensity: this.config.lightIntensity * 0.4, // Reduced from 0.6
      maxIntensity: this.config.lightIntensity * 0.6, // Reduced from 0.8
      flickerSpeed: this.config.flickerSpeed,
      distance: this.config.lightDistance * 0.4, // Reduced from 0.7
      castShadow: false // Disabled for performance
    };
    this.lightingSystem = new FireLightingSystem(this.scene, this.position, lightConfig);

    // Initialize sound manager
    const soundConfig: FireSoundConfig = {
      volume: 0.2, // Reduced volume
      loop: true,
      fadeInTime: 2.0,
      fadeOutTime: 1.0,
      distanceModel: 'inverse'
    };
    this.soundManager = new FireSoundManager(this.audioManager, soundConfig);
    this.soundManager.start();

    this.isActive = true;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    if (this.particleGenerator) {
      this.particleGenerator.update(deltaTime);
    }

    if (this.lightingSystem) {
      this.lightingSystem.update(deltaTime);
    }
  }

  public updateTimeOfDay(gameTime: number, timePhases: any): void {
    if (this.lightingSystem) {
      this.lightingSystem.setGameTime(gameTime, timePhases);
    }
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = intensity;
    
    if (this.particleGenerator) {
      this.particleGenerator.setIntensity(intensity);
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

    if (this.particleGenerator) {
      this.particleGenerator.dispose();
      this.particleGenerator = null;
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
    console.log('🔥 Fire effects stopped');
  }

  public dispose(): void {
    this.stop();
  }

  public isRunning(): boolean {
    return this.isActive;
  }
}
