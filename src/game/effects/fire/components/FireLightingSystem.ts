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
    // 1. Primary ULTRA-BRIGHT fire light (10.0 intensity, 50 units)
    const primaryLight = new THREE.PointLight(
      this.config.color,
      10.0, // Massively increased from 5.0
      50
    );
    primaryLight.position.copy(this.position);
    primaryLight.position.y += 0.5;
    primaryLight.castShadow = this.config.castShadow;
    
    if (primaryLight.castShadow) {
      primaryLight.shadow.mapSize.width = 4096; // Increased shadow quality
      primaryLight.shadow.mapSize.height = 4096;
      primaryLight.shadow.bias = -0.0005;
      primaryLight.shadow.camera.near = 0.1;
      primaryLight.shadow.camera.far = 50;
    }

    this.lights.push(primaryLight);
    this.scene.add(primaryLight);

    // 2. MASSIVE doorway spillover light positioned at tavern entrance
    const doorwayLight = new THREE.PointLight(
      this.config.color,
      8.0, // Very bright for dramatic spillover
      80 // Huge range for landscape coverage
    );
    doorwayLight.position.set(this.position.x, this.position.y + 2, this.position.z + 6); // At doorway
    doorwayLight.castShadow = true;
    
    if (doorwayLight.castShadow) {
      doorwayLight.shadow.mapSize.width = 2048;
      doorwayLight.shadow.mapSize.height = 2048;
      doorwayLight.shadow.bias = -0.0003;
      doorwayLight.shadow.camera.near = 0.1;
      doorwayLight.shadow.camera.far = 80;
    }

    this.lights.push(doorwayLight);
    this.scene.add(doorwayLight);

    // 3. ULTRA-MASSIVE atmospheric beacon light (100+ unit range)
    const atmosphericBeacon = new THREE.PointLight(
      this.config.color,
      6.0, // Strong atmospheric presence
      120 // Extreme range for distant visibility
    );
    atmosphericBeacon.position.copy(this.position);
    atmosphericBeacon.position.y += 4.0; // High elevation for beacon effect
    atmosphericBeacon.castShadow = false; // Pure atmosphere

    this.lights.push(atmosphericBeacon);
    this.scene.add(atmosphericBeacon);

    // 4. Ground-level landscape spillover light
    const groundSpillover = new THREE.PointLight(
      this.config.color,
      7.0, // Very bright for ground illumination
      75 // Wide ground coverage
    );
    groundSpillover.position.copy(this.position);
    groundSpillover.position.y = 0.2; // Just above ground
    groundSpillover.castShadow = true;

    if (groundSpillover.castShadow) {
      groundSpillover.shadow.mapSize.width = 1024;
      groundSpillover.shadow.mapSize.height = 1024;
      groundSpillover.shadow.bias = -0.0002;
      groundSpillover.shadow.camera.near = 0.1;
      groundSpillover.shadow.camera.far = 75;
    }

    this.lights.push(groundSpillover);
    this.scene.add(groundSpillover);

    // 5. Enhanced volumetric atmospheric light (massive range)
    const volumetricLight = new THREE.PointLight(
      this.config.color,
      5.0, // Strong volumetric presence
      100 // Extreme atmospheric reach
    );
    volumetricLight.position.copy(this.position);
    volumetricLight.position.y += 0.8;
    volumetricLight.castShadow = false;

    this.lights.push(volumetricLight);
    this.scene.add(volumetricLight);

    // 6. Elevated chimney glow effect
    const chimneyGlow = new THREE.PointLight(
      0xFF7700, // Slightly more orange for chimney effect
      4.0,
      90 // Wide chimney glow coverage
    );
    chimneyGlow.position.copy(this.position);
    chimneyGlow.position.y += 8.0; // High above tavern roof
    chimneyGlow.castShadow = false;

    this.lights.push(chimneyGlow);
    this.scene.add(chimneyGlow);

    // 7. Enhanced ember sparkle light with extended range
    const emberLight = new THREE.PointLight(
      0xFF4400,
      3.0, // Reduced to not compete with main lights
      40
    );
    emberLight.position.copy(this.position);
    emberLight.position.y += 1.0;
    emberLight.castShadow = false;

    this.lights.push(emberLight);
    this.scene.add(emberLight);

    // 8. Rim lighting for object definition
    const rimLight = new THREE.PointLight(
      0xFFAA33,
      2.5, // Balanced for object definition
      35
    );
    rimLight.position.copy(this.position);
    rimLight.position.y += 0.2;
    rimLight.castShadow = false;

    this.lights.push(rimLight);
    this.scene.add(rimLight);

    console.log('🔥 MASSIVE fire lighting system created - extreme landscape coverage (120+ unit range with 10.0 intensity)');
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.config.flickerSpeed;

    // Get time-adjusted intensity
    let adjustedBaseIntensity = this.config.baseIntensity;
    if (this.gameTimePhases) {
      adjustedBaseIntensity = this.timeAwareIntensity.getAdjustedIntensity(this.currentGameTime, this.gameTimePhases);
    }

    // Primary ultra-bright light with enhanced flickering
    const primaryLight = this.lights[0];
    if (primaryLight) {
      const flicker1 = Math.sin(this.time * 2.5) * 0.2;
      const flicker2 = Math.sin(this.time * 4.1) * 0.1;
      const flicker3 = Math.sin(this.time * 6.3) * 0.08;
      
      const intensityVariation = flicker1 + flicker2 + flicker3;
      primaryLight.intensity = Math.max(
        8.0, // Minimum very bright
        Math.min(
          12.0, // Maximum extremely bright
          10.0 + intensityVariation * (adjustedBaseIntensity / this.config.baseIntensity)
        )
      );

      primaryLight.position.x = this.position.x + Math.sin(this.time * 3) * 0.04;
      primaryLight.position.z = this.position.z + Math.cos(this.time * 2.7) * 0.04;
    }

    // Doorway spillover light with dramatic flickering
    const doorwayLight = this.lights[1];
    if (doorwayLight) {
      const doorwayFlicker = Math.sin(this.time * 2.2) * 0.15;
      doorwayLight.intensity = Math.max(
        6.0, // Minimum bright spillover
        8.0 + doorwayFlicker * (adjustedBaseIntensity / this.config.baseIntensity)
      );
      
      // Subtle position variation for realism
      doorwayLight.position.x = this.position.x + Math.sin(this.time * 1.8) * 0.02;
    }

    // Atmospheric beacon with slow breathing
    const atmosphericBeacon = this.lights[2];
    if (atmosphericBeacon) {
      const beaconFlicker = Math.sin(this.time * 1.5) * 0.1;
      atmosphericBeacon.intensity = Math.max(
        4.0,
        6.0 + beaconFlicker * (adjustedBaseIntensity / this.config.baseIntensity)
      );
    }

    // Ground spillover with synchronized variation
    const groundSpillover = this.lights[3];
    if (groundSpillover) {
      const groundFlicker = Math.sin(this.time * 2.0) * 0.12;
      groundSpillover.intensity = Math.max(
        5.0,
        7.0 + groundFlicker * (adjustedBaseIntensity / this.config.baseIntensity)
      );
    }

    // Update remaining lights with enhanced effects
    const volumetricLight = this.lights[4];
    if (volumetricLight) {
      const volumetricFlicker = Math.sin(this.time * 1.2) * 0.08;
      volumetricLight.intensity = Math.max(
        3.0,
        5.0 + volumetricFlicker * (adjustedBaseIntensity / this.config.baseIntensity)
      );
    }

    // Chimney glow with gentle variation
    const chimneyGlow = this.lights[5];
    if (chimneyGlow) {
      const chimneyFlicker = Math.sin(this.time * 0.8) * 0.06;
      chimneyGlow.intensity = Math.max(
        2.5,
        4.0 + chimneyFlicker * (adjustedBaseIntensity / this.config.baseIntensity)
      );
    }

    // Enhanced ember light dramatic sparkles
    const emberLight = this.lights[6];
    if (emberLight) {
      const emberFlicker = Math.sin(this.time * 8.7) * Math.sin(this.time * 3.2) * 0.1;
      emberLight.intensity = Math.max(0, 3.0 + emberFlicker * (adjustedBaseIntensity / this.config.baseIntensity));
      
      if (Math.random() < 0.15) {
        emberLight.position.x = this.position.x + (Math.random() - 0.5) * 0.6;
        emberLight.position.z = this.position.z + (Math.random() - 0.5) * 0.6;
      }
    }

    // Rim light subtle movement
    const rimLight = this.lights[7];
    if (rimLight) {
      const rimFlicker = Math.sin(this.time * 2.1) * 0.03;
      rimLight.intensity = Math.max(
        1.5,
        2.5 + rimFlicker * (adjustedBaseIntensity / this.config.baseIntensity)
      );
    }
  }

  public setIntensity(multiplier: number): void {
    // Apply multiplier to base intensities but keep them very high
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      if (i === 0) light.intensity = Math.max(8.0, 10.0 * multiplier); // Primary
      if (i === 1) light.intensity = Math.max(6.0, 8.0 * multiplier);  // Doorway
      if (i === 2) light.intensity = Math.max(4.0, 6.0 * multiplier);  // Beacon
      if (i === 3) light.intensity = Math.max(5.0, 7.0 * multiplier);  // Ground
    }
    
    this.timeAwareIntensity = new TimeAwareFireIntensity(this.config.baseIntensity * multiplier);
  }

  public dispose(): void {
    for (const light of this.lights) {
      this.scene.remove(light);
    }
    this.lights = [];
    console.log('🔥 MASSIVE fire lighting system disposed');
  }
}
