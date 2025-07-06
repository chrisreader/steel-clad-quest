
import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TavernBuilding } from './TavernBuilding';
import { CastleBuilding } from './CastleBuilding';
import { HumanCampBuilding } from './HumanCampBuilding';
import { PhysicsManager } from '../engine/PhysicsManager';
import { SafeZoneManager } from '../systems/SafeZoneManager';
import { AudioManager } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';

export interface BuildingConfig {
  type: 'tavern' | 'castle' | 'human_camp';
  position: THREE.Vector3;
  id?: string;
  campConfig?: {
    size?: 'small' | 'medium' | 'large';
    npcCount?: number;
    hasRareChest?: boolean;
    tentCount?: number;
  };
}

export class BuildingManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private buildings: Map<string, BaseBuilding> = new Map();
  private safeZoneManager: SafeZoneManager;

  private audioManager: AudioManager | null = null;
  private effectsManager: EffectsManager | null = null;

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    // Create default safe zone config for tavern area
    this.safeZoneManager = new SafeZoneManager({
      minX: -20,
      maxX: 20,
      minZ: -20,
      maxZ: 20
    });
    console.log('BuildingManager initialized');
  }

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
    console.log('🔊 AudioManager set for BuildingManager');
  }

  public setEffectsManager(effectsManager: EffectsManager): void {
    this.effectsManager = effectsManager;
    console.log('✨ EffectsManager set for BuildingManager');
  }

  public createBuilding(config: BuildingConfig): BaseBuilding | null {
    console.log(`🏗️ Creating building of type: ${config.type} at position:`, config.position);

    let building: BaseBuilding | null = null;

    switch (config.type) {
      case 'tavern':
        building = new TavernBuilding(this.scene, this.physicsManager, config.position);
        if (building instanceof TavernBuilding) {
          if (this.audioManager) {
            building.setAudioManager(this.audioManager);
          }
          if (this.effectsManager) {
            building.setEffectsManager(this.effectsManager);
            console.log('🏗️ [BuildingManager] Tavern created with EffectsManager for NPC');
          } else {
            console.warn('🏗️ [BuildingManager] EffectsManager not set - tavern keeper NPC will not spawn');
          }
        }
        break;
      case 'castle':
        building = new CastleBuilding(this.scene, this.physicsManager, config.position);
        break;
      case 'human_camp':
        building = new HumanCampBuilding(this.scene, this.physicsManager, config.position, config.campConfig);
        if (building instanceof HumanCampBuilding) {
          if (this.audioManager) {
            building.setAudioManager(this.audioManager);
          }
          if (this.effectsManager) {
            building.setEffectsManager(this.effectsManager);
            console.log('🏕️ [BuildingManager] Human camp created with EffectsManager for NPCs');
          } else {
            console.warn('🏕️ [BuildingManager] EffectsManager not set - camp NPCs will not spawn');
          }
        }
        break;
      default:
        console.warn(`🏗️ Unknown building type: ${config.type}`);
        return null;
    }

    if (building) {
      const buildingGroup = building.create();
      this.buildings.set(config.id || this.generateBuildingId(config.type), building);
      
      console.log(`🏗️ Building created successfully: ${config.type}`);
      return building;
    }

    return null;
  }

  public update(deltaTime: number): void {
    for (const building of this.buildings.values()) {
      if ('update' in building && typeof building.update === 'function') {
        building.update(deltaTime);
      }
    }
  }

  public destroyBuilding(id: string): void {
    const building = this.buildings.get(id);
    if (building) {
      building.dispose();
      this.buildings.delete(id);
      console.log(`🔥 Building destroyed: ${id}`);
    } else {
      console.warn(`🔥 No building found with ID: ${id}`);
    }
  }

  public getBuilding(id: string): BaseBuilding | undefined {
    return this.buildings.get(id);
  }

  public getAllBuildings(): Map<string, BaseBuilding> {
    return new Map(this.buildings);
  }

  public getSafeZoneManager(): SafeZoneManager {
    return this.safeZoneManager;
  }

  private generateBuildingId(type: string): string {
    return `${type}_${Date.now()}`;
  }

  public dispose(): void {
    console.log('Disposing BuildingManager');
    for (const building of this.buildings.values()) {
      building.dispose();
    }
    this.buildings.clear();
    // SafeZoneManager doesn't have dispose method, so we just reset the reference
    console.log('BuildingManager disposed');
  }
}
