import * as THREE from 'three';
import { FireLightConfig } from '../types/FireTypes';
import { TimeAwareFireIntensity } from './TimeAwareFireIntensity';

export class FireLightingSystem {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private lights: THREE.PointLight[] = [];
  private time: number = 0;
  private config: FireLightConfig;
  private timeAwareIntensity: TimeAwareFireIntensity;
  private currentGameTime: number = 0;
  private gameTimePhases: any = null;

  constructor(scene: THREE.Scene, position: THREE.Vector3, config: FireLightConfig) {
    this.scene = scene;
    this.position = position.clone();
    this.config = config;
    this.timeAwareIntensity = new TimeAwareFireIntensity(config.baseIntensity);
    this.createMassiveLightingSystem();
  }

  public setGameTime(gameTime: number, timePhases: any): void {
    this.currentGameTime = gameTime;
    this.gameTimePhases = timePhases;
  }

  private createMassiveLightingSystem(): void {
    // PERFORMANCE: Single optimized light for maximum performance
    
    // Single primary fire light - maximum strength with shadows
    const primaryLight = new THREE.PointLight(
      this.config.color,
      this.config.baseIntensity, // Use full config intensity
      this.config.distance        // Use full config distance
    );
    primaryLight.position.copy(this.position);
    primaryLight.position.y += 0.5;
    primaryLight.castShadow = this.config.castShadow; // Respect config setting
    
    this.lights.push(primaryLight);
    this.scene.add(primaryLight);

    console.log('🔥 Optimized single fire light created - maximum performance');
  }

  private updateCounter = 0;
  private cachedSin1 = 0;
  private cachedSin2 = 0;

  public update(deltaTime: number): void {
    this.time += deltaTime * this.config.flickerSpeed;
    this.updateCounter++;

    // Get time-adjusted intensity
    let adjustedBaseIntensity = this.config.baseIntensity;
    if (this.gameTimePhases) {
      adjustedBaseIntensity = this.timeAwareIntensity.getAdjustedIntensity(this.currentGameTime, this.gameTimePhases);
    }

    // Update flickering calculations only every 3 frames for performance
    if (this.updateCounter % 3 === 0) {
      this.cachedSin1 = Math.sin(this.time * 2.5) * 0.15;
      this.cachedSin2 = Math.sin(this.time * 4.1) * 0.08;
    }

    // Single optimized light update
    const primaryLight = this.lights[0];
    if (primaryLight) {
      const intensityVariation = this.cachedSin1 + this.cachedSin2;
      primaryLight.intensity = Math.max(
        adjustedBaseIntensity * 0.8, // Strong minimum based on config
        Math.min(
          this.config.maxIntensity, // Use config maximum
          adjustedBaseIntensity + intensityVariation * adjustedBaseIntensity * 0.3
        )
      );

      // Simplified position flicker - less frequent
      if (this.updateCounter % 5 === 0) {
        primaryLight.position.x = this.position.x + Math.sin(this.time * 3) * 0.02;
        primaryLight.position.z = this.position.z + Math.cos(this.time * 2.7) * 0.02;
      }
    }
  }

  public setIntensity(multiplier: number): void {
    // Strong light intensity setting using config values
    const primaryLight = this.lights[0];
    
    if (primaryLight) {
      primaryLight.intensity = Math.max(
        this.config.baseIntensity * 0.8, 
        this.config.baseIntensity * multiplier
      );
    }
    
    this.timeAwareIntensity = new TimeAwareFireIntensity(this.config.baseIntensity * multiplier);
  }

  public dispose(): void {
    for (const light of this.lights) {
      this.scene.remove(light);
    }
    this.lights = [];
    console.log('🔥 Balanced fire lighting system disposed');
  }
}
