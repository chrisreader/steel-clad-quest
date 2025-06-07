
import * as THREE from 'three';
import { FireParticleGenerator } from './components/FireParticleGenerator';
import { FireLightingSystem } from './components/FireLightingSystem';
import { FireSoundManager } from './components/FireSoundManager';
import { FireConfig, FireLightConfig, FireSoundConfig, FIREPLACE_PARTICLE_CONFIGS } from './types/FireTypes';
import { AudioManager } from '../../engine/AudioManager';

export class FireEffectsManager {
  private scene: THREE.Scene;
  private audioManager: AudioManager;
  private position: THREE.Vector3;
  private config: FireConfig;
  
  private particleGenerator: FireParticleGenerator | null = null;
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

    console.log('🔥 Starting fire effects at position:', this.position);

    // Initialize particle generator
    this.particleGenerator = new FireParticleGenerator(this.scene, this.position);
    
    // Add different particle types based on config
    const flameConfig = { ...FIREPLACE_PARTICLE_CONFIGS.flames };
    flameConfig.count = Math.floor(this.config.particleCount * 0.55); // 55% flames
    this.particleGenerator.addParticleType('flames', flameConfig);

    if (this.config.smokeEnabled) {
      const smokeConfig = { ...FIREPLACE_PARTICLE_CONFIGS.smoke };
      smokeConfig.count = Math.floor(this.config.particleCount * 0.33); // 33% smoke
      this.particleGenerator.addParticleType('smoke', smokeConfig);
    }

    const emberConfig = { ...FIREPLACE_PARTICLE_CONFIGS.embers };
    emberConfig.count = this.config.emberCount;
    this.particleGenerator.addParticleType('embers', emberConfig);

    // Initialize lighting system
    const lightConfig: FireLightConfig = {
      color: this.config.lightColor,
      baseIntensity: this.config.lightIntensity,
      maxIntensity: this.config.lightIntensity * 1.3,
      flickerSpeed: this.config.flickerSpeed,
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
    console.log('🔥 Fire effects system fully initialized');
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

  public setIntensity(intensity: number): void {
    this.config.intensity = intensity;
    
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
