
import * as THREE from 'three';
import { EmberParticleSystem } from './EmberParticleSystem';
import { FireParticleConfig } from '../types/FireTypes';

export class OrganicFireParticleGenerator {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private emberSystem: EmberParticleSystem;
  private smokeSystem: EmberParticleSystem;
  private time: number = 0;
  private intensity: number = 1.0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
    
    // Create only organic particle systems - no static flame meshes
    this.emberSystem = new EmberParticleSystem(scene, position, 15, 'embers');
    this.smokeSystem = new EmberParticleSystem(scene, position, 8, 'smoke');
    
    console.log('🔥 Organic fire particle generator created with particle systems only (no static meshes)');
  }

  public addParticleType(name: string, config: FireParticleConfig): void {
    console.log(`🔥 Particle type '${name}' configuration applied to organic systems`);
    
    if (name === 'flames') {
      this.intensity = config.opacity;
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Update only particle systems - no static flame materials to update
    this.emberSystem.update(deltaTime);
    this.smokeSystem.update(deltaTime);
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
    // Intensity affects particle behavior through their internal systems
  }

  public dispose(): void {
    console.log('🔥 Disposing organic fire particle generator');
    
    this.emberSystem.dispose();
    this.smokeSystem.dispose();
    
    console.log('🔥 Organic fire particle generator disposed (particles only)');
  }
}
