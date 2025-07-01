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

  private updateCounter: number = 0;
  private readonly UPDATE_INTERVAL: number = 2; // Update every 2nd frame

  constructor(scene: THREE.Scene, audioManager: AudioManager, position: THREE.Vector3, config: FireConfig) {
    this.scene = scene;
    this.audioManager = audioManager;
    this.position = position.clone();
    this.config = config;
  }

  public start(): void {
    if (this.isActive) return;

    // Reduce console logging for performance
    if (Math.random() < 0.1) { // Only log 10% of the time
      console.log('🔥 Starting enhanced organic fire effects at position:', this.position);
    }

    // Initialize ONLY organic particle generator - no static fire system
    this.particleGenerator = new OrganicFireParticleGenerator(this.scene, this.position);
    
    // Reduce particle counts for better performance while maintaining visual quality
    const flameConfig = { ...FIREPLACE_PARTICLE_CONFIGS.flames };
    flameConfig.count = Math.floor(this.config.particleCount * 0.4); // Reduced from 0.55
    this.particleGenerator.addParticleType('flames', flameConfig);

    if (this.config.smokeEnabled) {
      const smokeConfig = { ...FIREPLACE_PARTICLE_CONFIGS.smoke };
      smokeConfig.count = Math.floor(this.config.particleCount * 0.25); // Reduced from 0.33
      this.particleGenerator.addParticleType('smoke', smokeConfig);
    }

    const emberConfig = { ...FIREPLACE_PARTICLE_CONFIGS.embers };
    emberConfig.count = Math.floor(this.config.emberCount * 0.7); // Reduced ember count
    this.particleGenerator.addParticleType('embers', emberConfig);

    // Initialize lighting system (unchanged for visual quality)
    const lightConfig: FireLightConfig = {
      color: this.config.lightColor,
      baseIntensity: this.config.lightIntensity,
      maxIntensity: this.config.lightIntensity * 1.5,
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
    
    // Reduce console logging for performance
    if (Math.random() < 0.1) { // Only log 10% of the time
      console.log('🔥 Fire effects system initialized with performance optimizations');
    }
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.updateCounter++;
    
    // Update particle generator every frame for smooth animation
    if (this.particleGenerator) {
      this.particleGenerator.update(deltaTime);
    }

    // Update lighting system less frequently for performance
    if (this.lightingSystem && this.updateCounter % this.UPDATE_INTERVAL === 0) {
      this.lightingSystem.update(deltaTime * this.UPDATE_INTERVAL);
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
