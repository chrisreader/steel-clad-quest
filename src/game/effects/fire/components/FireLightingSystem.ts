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
    // PERFORMANCE: Balanced lighting system - 2 lights for good visuals + performance
    
    // 1. Primary fire light with good intensity and range
    const primaryLight = new THREE.PointLight(
      this.config.color,
      5.0, // Increased from 3.0
      40   // Increased from 25
    );
    primaryLight.position.copy(this.position);
    primaryLight.position.y += 0.5;
    primaryLight.castShadow = this.config.castShadow;
    
    if (primaryLight.castShadow) {
      primaryLight.shadow.mapSize.width = 1024;
      primaryLight.shadow.mapSize.height = 1024;
      primaryLight.shadow.bias = -0.0005;
      primaryLight.shadow.camera.near = 0.1;
      primaryLight.shadow.camera.far = 40;
    }
    
    this.lights.push(primaryLight);
    this.scene.add(primaryLight);

    // 2. Secondary atmospheric light for glow effect
    const atmosphericLight = new THREE.PointLight(
      this.config.color,
      2.5, // Moderate intensity for atmosphere
      60   // Wider range for atmosphere
    );
    atmosphericLight.position.copy(this.position);
    atmosphericLight.position.y += 1.0;
    atmosphericLight.castShadow = false; // No shadows for atmosphere
    
    this.lights.push(atmosphericLight);
    this.scene.add(atmosphericLight);

    console.log('🔥 Balanced fire lighting system created - good visuals + performance');
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.config.flickerSpeed;

    // Get time-adjusted intensity
    let adjustedBaseIntensity = this.config.baseIntensity;
    if (this.gameTimePhases) {
      adjustedBaseIntensity = this.timeAwareIntensity.getAdjustedIntensity(this.currentGameTime, this.gameTimePhases);
    }

    // Primary light with enhanced flickering
    const primaryLight = this.lights[0];
    if (primaryLight) {
      const flicker1 = Math.sin(this.time * 2.5) * 0.15;
      const flicker2 = Math.sin(this.time * 4.1) * 0.08;
      
      const intensityVariation = flicker1 + flicker2;
      primaryLight.intensity = Math.max(
        3.5, // Minimum bright
        Math.min(
          6.5, // Maximum very bright
          5.0 + intensityVariation * (adjustedBaseIntensity / this.config.baseIntensity)
        )
      );

      // Subtle position flicker for realism
      primaryLight.position.x = this.position.x + Math.sin(this.time * 3) * 0.03;
      primaryLight.position.z = this.position.z + Math.cos(this.time * 2.7) * 0.03;
    }

    // Atmospheric light with gentle breathing
    const atmosphericLight = this.lights[1];
    if (atmosphericLight) {
      const atmosphericFlicker = Math.sin(this.time * 1.5) * 0.1;
      atmosphericLight.intensity = Math.max(
        1.5,
        2.5 + atmosphericFlicker * (adjustedBaseIntensity / this.config.baseIntensity)
      );
    }
  }

  public setIntensity(multiplier: number): void {
    // PERFORMANCE: Balanced intensity setting for both lights
    const primaryLight = this.lights[0];
    const atmosphericLight = this.lights[1];
    
    if (primaryLight) {
      primaryLight.intensity = Math.max(3.5, 5.0 * multiplier);
    }
    if (atmosphericLight) {
      atmosphericLight.intensity = Math.max(1.5, 2.5 * multiplier);
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
