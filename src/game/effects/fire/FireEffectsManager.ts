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

    console.log('🔥 Starting fire effects with improved visibility at position:', this.position);

    // Initialize organic particle generator
    this.organicParticleGenerator = new OrganicFireParticleGenerator(this.scene, this.position);
    
    // Add flame particles with increased count for visibility
    const flameConfig = { ...FIREPLACE_PARTICLE_CONFIGS.flames };
    flameConfig.count = Math.max(60, Math.floor(this.config.particleCount * 0.8));
    console.log(`🔥 Adding ${flameConfig.count} flame particles`);
    this.organicParticleGenerator.addOrganicParticleType('flames', flameConfig);

    if (this.config.smokeEnabled) {
      const smokeConfig = { ...FIREPLACE_PARTICLE_CONFIGS.smoke };
      smokeConfig.count = Math.max(30, Math.floor(this.config.particleCount * 0.4));
      console.log(`🔥 Adding ${smokeConfig.count} smoke particles`);
      this.organicParticleGenerator.addOrganicParticleType('smoke', smokeConfig);
    }

    const emberConfig = { ...FIREPLACE_PARTICLE_CONFIGS.embers };
    emberConfig.count = Math.max(20, this.config.emberCount);
    console.log(`🔥 Adding ${emberConfig.count} ember particles`);
    this.organicParticleGenerator.addOrganicParticleType('embers', emberConfig);

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
    console.log('🔥 Fire effects system active with enhanced visibility');
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
    console.log('🔥 Fire effects stopped');
  }

  public dispose(): void {
    this.stop();
  }

  public isRunning(): boolean {
    return this.isActive;
  }
}
