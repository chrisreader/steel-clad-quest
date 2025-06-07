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
    // Primary fire light with massive range to cover entire tavern (40 units)
    const primaryLight = new THREE.PointLight(
      this.config.color,
      this.config.baseIntensity,
      40 // Covers entire tavern + 15 units outside
    );
    primaryLight.position.copy(this.position);
    primaryLight.position.y += 0.5;
    primaryLight.castShadow = this.config.castShadow;
    
    if (primaryLight.castShadow) {
      primaryLight.shadow.mapSize.width = 2048;
      primaryLight.shadow.mapSize.height = 2048;
      primaryLight.shadow.bias = -0.0005;
      primaryLight.shadow.camera.near = 0.1;
      primaryLight.shadow.camera.far = 40; // Match light distance
    }

    this.lights.push(primaryLight);
    this.scene.add(primaryLight);

    // Large ambient glow light for tavern-wide soft illumination (35 units)
    const ambientLight = new THREE.PointLight(
      this.config.color,
      this.config.baseIntensity * 0.6,
      35 // 40 * 0.875 for softer coverage
    );
    ambientLight.position.copy(this.position);
    ambientLight.position.y += 0.3;
    ambientLight.castShadow = true;
    
    if (ambientLight.castShadow) {
      ambientLight.shadow.mapSize.width = 1024;
      ambientLight.shadow.mapSize.height = 1024;
      ambientLight.shadow.bias = -0.0003;
      ambientLight.shadow.camera.near = 0.1;
      ambientLight.shadow.camera.far = 35; // Match light distance
    }

    this.lights.push(ambientLight);
    this.scene.add(ambientLight);

    // Massive volumetric atmospheric light for exterior glow (50 units)
    const volumetricLight = new THREE.PointLight(
      this.config.color,
      this.config.baseIntensity * 0.8,
      50 // 40 * 1.25 for maximum atmospheric reach
    );
    volumetricLight.position.copy(this.position);
    volumetricLight.position.y += 0.8;
    volumetricLight.castShadow = false; // For atmosphere only

    this.lights.push(volumetricLight);
    this.scene.add(volumetricLight);

    // Enhanced ember sparkle light with extended range (30 units)
    const emberLight = new THREE.PointLight(
      0xFF4400,
      this.config.baseIntensity * 0.4,
      30 // 40 * 0.75 for good sparkle coverage
    );
    emberLight.position.copy(this.position);
    emberLight.position.y += 1.0;
    emberLight.castShadow = false;

    this.lights.push(emberLight);
    this.scene.add(emberLight);

    // Rim lighting for tavern-wide object definition (25 units)
    const rimLight = new THREE.PointLight(
      0xFFAA33,
      this.config.baseIntensity * 0.3,
      25 // 40 * 0.625 for object definition
    );
    rimLight.position.copy(this.position);
    rimLight.position.y += 0.2;
    rimLight.castShadow = false;

    this.lights.push(rimLight);
    this.scene.add(rimLight);

    console.log('🔥 Massive fire lighting system created - covers entire tavern + exterior (50 unit range)');
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.config.flickerSpeed;

    // Primary light enhanced flickering with realistic pattern
    const primaryLight = this.lights[0];
    if (primaryLight) {
      const flicker1 = Math.sin(this.time * 2.5) * 0.15;
      const flicker2 = Math.sin(this.time * 4.1) * 0.08;
      const flicker3 = Math.sin(this.time * 6.3) * 0.05;
      
      const intensityVariation = flicker1 + flicker2 + flicker3;
      primaryLight.intensity = Math.max(
        this.config.baseIntensity * 0.8,
        Math.min(
          this.config.maxIntensity,
          this.config.baseIntensity + intensityVariation
        )
      );

      // Enhanced position flickering for more realism
      primaryLight.position.x = this.position.x + Math.sin(this.time * 3) * 0.03;
      primaryLight.position.z = this.position.z + Math.cos(this.time * 2.7) * 0.03;
    }

    // Ambient light synchronized variation
    const ambientLight = this.lights[1];
    if (ambientLight) {
      const ambientFlicker = Math.sin(this.time * 1.8) * 0.04;
      ambientLight.intensity = this.config.baseIntensity * 0.6 + ambientFlicker;
    }

    // Volumetric light slow atmospheric breathing
    const volumetricLight = this.lights[2];
    if (volumetricLight) {
      const volumetricFlicker = Math.sin(this.time * 1.2) * 0.06;
      volumetricLight.intensity = this.config.baseIntensity * 0.8 + volumetricFlicker;
    }

    // Enhanced ember light dramatic sparkles
    const emberLight = this.lights[3];
    if (emberLight) {
      const emberFlicker = Math.sin(this.time * 8.7) * Math.sin(this.time * 3.2) * 0.08;
      emberLight.intensity = Math.max(0, this.config.baseIntensity * 0.4 + emberFlicker);
      
      // More dynamic ember position changes
      if (Math.random() < 0.15) {
        emberLight.position.x = this.position.x + (Math.random() - 0.5) * 0.6;
        emberLight.position.z = this.position.z + (Math.random() - 0.5) * 0.6;
      }
    }

    // Rim light subtle movement
    const rimLight = this.lights[4];
    if (rimLight) {
      const rimFlicker = Math.sin(this.time * 2.1) * 0.02;
      rimLight.intensity = this.config.baseIntensity * 0.3 + rimFlicker;
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
    console.log('🔥 Massive fire lighting system disposed');
  }
}
