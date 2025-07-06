
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

    console.log('🔥 Starting enhanced organic fire effects at position:', this.position);

    // Initialize ONLY organic particle generator - no static fire system
    this.particleGenerator = new OrganicFireParticleGenerator(this.scene, this.position);
    
    // PERFORMANCE: Reduced particle counts for better performance
    const flameConfig = { ...FIREPLACE_PARTICLE_CONFIGS.flames };
    flameConfig.count = Math.floor(this.config.particleCount * 0.3); // Reduced from 0.55
    this.particleGenerator.addParticleType('flames', flameConfig);

    if (this.config.smokeEnabled) {
      const smokeConfig = { ...FIREPLACE_PARTICLE_CONFIGS.smoke };
      smokeConfig.count = Math.floor(this.config.particleCount * 0.2); // Reduced from 0.33
      this.particleGenerator.addParticleType('smoke', smokeConfig);
    }

    const emberConfig = { ...FIREPLACE_PARTICLE_CONFIGS.embers };
    emberConfig.count = Math.max(1, this.config.emberCount * 0.3); // Significantly reduced
    this.particleGenerator.addParticleType('embers', emberConfig);

    // PERFORMANCE: Reduced lighting system for better performance
    const lightConfig: FireLightConfig = {
      color: this.config.lightColor,
      baseIntensity: this.config.lightIntensity * 0.3, // Reduced from 1.0
      maxIntensity: this.config.lightIntensity * 0.5, // Reduced from 1.5
      flickerSpeed: this.config.flickerSpeed,
      distance: this.config.lightDistance * 0.4, // Reduced from 1.0
      castShadow: false // Disabled shadows for performance
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
    console.log('🔥 Massive fire effects system fully initialized - lights entire tavern + exterior with time-aware intensity');
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
