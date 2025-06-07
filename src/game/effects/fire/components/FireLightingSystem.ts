
import * as THREE from 'three';
import { FireLightConfig } from '../types/FireTypes';

export class FireLightingSystem {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private lights: THREE.PointLight[] = [];
  private time: number = 0;
  private config: FireLightConfig;

  constructor(scene: THREE.Scene, position: THREE.Vector3, config: FireLightConfig) {
    this.scene = scene;
    this.position = position.clone();
    this.config = config;
    this.createLights();
  }

  private createLights(): void {
    // Primary fire light with flickering
    const primaryLight = new THREE.PointLight(
      this.config.color,
      this.config.baseIntensity,
      this.config.distance
    );
    primaryLight.position.copy(this.position);
    primaryLight.position.y += 0.5;
    primaryLight.castShadow = this.config.castShadow;
    
    if (primaryLight.castShadow) {
      primaryLight.shadow.mapSize.width = 512;
      primaryLight.shadow.mapSize.height = 512;
      primaryLight.shadow.bias = -0.0001;
    }

    this.lights.push(primaryLight);
    this.scene.add(primaryLight);

    // Secondary ambient glow light
    const ambientLight = new THREE.PointLight(
      this.config.color,
      this.config.baseIntensity * 0.3,
      this.config.distance * 0.7
    );
    ambientLight.position.copy(this.position);
    ambientLight.position.y += 0.3;
    ambientLight.castShadow = false;

    this.lights.push(ambientLight);
    this.scene.add(ambientLight);

    // Ember sparkle light (very subtle)
    const emberLight = new THREE.PointLight(
      0xFF4400,
      this.config.baseIntensity * 0.1,
      this.config.distance * 0.4
    );
    emberLight.position.copy(this.position);
    emberLight.position.y += 0.8;
    emberLight.castShadow = false;

    this.lights.push(emberLight);
    this.scene.add(emberLight);

    console.log('🔥 Fire lighting system created with 3 lights');
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.config.flickerSpeed;

    // Primary light flickering with realistic pattern
    const primaryLight = this.lights[0];
    if (primaryLight) {
      const flicker1 = Math.sin(this.time * 2.5) * 0.1;
      const flicker2 = Math.sin(this.time * 4.1) * 0.05;
      const flicker3 = Math.sin(this.time * 6.3) * 0.03;
      
      const intensityVariation = flicker1 + flicker2 + flicker3;
      primaryLight.intensity = Math.max(
        this.config.baseIntensity * 0.7,
        Math.min(
          this.config.maxIntensity,
          this.config.baseIntensity + intensityVariation
        )
      );

      // Subtle position flickering for more realism
      primaryLight.position.x = this.position.x + Math.sin(this.time * 3) * 0.02;
      primaryLight.position.z = this.position.z + Math.cos(this.time * 2.7) * 0.02;
    }

    // Ambient light gentle variation
    const ambientLight = this.lights[1];
    if (ambientLight) {
      const ambientFlicker = Math.sin(this.time * 1.5) * 0.02;
      ambientLight.intensity = this.config.baseIntensity * 0.3 + ambientFlicker;
    }

    // Ember light random sparkles
    const emberLight = this.lights[2];
    if (emberLight) {
      const emberFlicker = Math.sin(this.time * 8.7) * Math.sin(this.time * 3.2) * 0.05;
      emberLight.intensity = Math.max(0, this.config.baseIntensity * 0.1 + emberFlicker);
      
      // Random ember position changes
      if (Math.random() < 0.1) {
        emberLight.position.x = this.position.x + (Math.random() - 0.5) * 0.5;
        emberLight.position.z = this.position.z + (Math.random() - 0.5) * 0.5;
      }
    }
  }

  public setIntensity(multiplier: number): void {
    this.config.baseIntensity *= multiplier;
    this.config.maxIntensity *= multiplier;
  }

  public dispose(): void {
    for (const light of this.lights) {
      this.scene.remove(light);
    }
    this.lights = [];
    console.log('🔥 Fire lighting system disposed');
  }
}
