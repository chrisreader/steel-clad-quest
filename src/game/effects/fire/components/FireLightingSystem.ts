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
    // PERFORMANCE: Simplified to single primary light for camps
    const primaryLight = new THREE.PointLight(
      this.config.color,
      3.0, // Reduced from 10.0
      25   // Reduced from 50
    );
    primaryLight.position.copy(this.position);
    primaryLight.position.y += 0.5;
    primaryLight.castShadow = false; // Disabled for performance
    
    this.lights.push(primaryLight);
    this.scene.add(primaryLight);

    console.log('🔥 Optimized fire lighting system created for performance');
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.config.flickerSpeed;

    // Get time-adjusted intensity
    let adjustedBaseIntensity = this.config.baseIntensity;
    if (this.gameTimePhases) {
      adjustedBaseIntensity = this.timeAwareIntensity.getAdjustedIntensity(this.currentGameTime, this.gameTimePhases);
    }

    // PERFORMANCE: Simple single light flickering
    const primaryLight = this.lights[0];
    if (primaryLight) {
      const flicker = Math.sin(this.time * 2.5) * 0.1;
      primaryLight.intensity = Math.max(
        2.0, // Minimum
        Math.min(
          4.0, // Maximum
          3.0 + flicker * (adjustedBaseIntensity / this.config.baseIntensity)
        )
      );
    }
  }

  public setIntensity(multiplier: number): void {
    // PERFORMANCE: Simple intensity setting for single light
    const light = this.lights[0];
    if (light) {
      light.intensity = Math.max(2.0, 3.0 * multiplier);
    }
    
    this.timeAwareIntensity = new TimeAwareFireIntensity(this.config.baseIntensity * multiplier);
  }

  public dispose(): void {
    for (const light of this.lights) {
      this.scene.remove(light);
    }
    this.lights = [];
    console.log('🔥 Optimized fire lighting system disposed');
  }
}
