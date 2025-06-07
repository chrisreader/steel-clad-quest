
import * as THREE from 'three';
import { FireEffectsManager } from './FireEffectsManager';
import { FireConfig, DEFAULT_FIRE_CONFIG } from './types/FireTypes';
import { AudioManager } from '../../engine/AudioManager';

export class FireSystem {
  private scene: THREE.Scene;
  private audioManager: AudioManager;
  private fires: Map<string, FireEffectsManager> = new Map();

  constructor(scene: THREE.Scene, audioManager: AudioManager) {
    this.scene = scene;
    this.audioManager = audioManager;
    console.log('🔥 Fire system initialized');
  }

  public createFire(id: string, position: THREE.Vector3, config: Partial<FireConfig> = {}): FireEffectsManager {
    if (this.fires.has(id)) {
      console.warn(`🔥 Fire with ID '${id}' already exists. Removing existing fire.`);
      this.removeFire(id);
    }

    const fireConfig = { ...DEFAULT_FIRE_CONFIG, ...config };
    const fireEffects = new FireEffectsManager(this.scene, this.audioManager, position, fireConfig);
    
    this.fires.set(id, fireEffects);
    fireEffects.start();
    
    console.log(`🔥 Created fire '${id}' at position:`, position);
    return fireEffects;
  }

  public getFire(id: string): FireEffectsManager | undefined {
    return this.fires.get(id);
  }

  public removeFire(id: string): boolean {
    const fire = this.fires.get(id);
    if (fire) {
      fire.dispose();
      this.fires.delete(id);
      console.log(`🔥 Removed fire '${id}'`);
      return true;
    }
    return false;
  }

  public update(deltaTime: number): void {
    for (const fire of this.fires.values()) {
      fire.update(deltaTime);
    }
  }

  public dispose(): void {
    for (const [id, fire] of this.fires.entries()) {
      fire.dispose();
    }
    this.fires.clear();
    console.log('🔥 Fire system disposed');
  }

  public getAllFires(): Map<string, FireEffectsManager> {
    return new Map(this.fires);
  }
}
