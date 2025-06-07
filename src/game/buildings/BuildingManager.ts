import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TavernBuilding } from './TavernBuilding';
import { CastleBuilding } from './CastleBuilding';
import { PhysicsManager } from '../engine/PhysicsManager';
import { SafeZoneManager } from '../systems/SafeZoneManager';
import { AudioManager } from '../engine/AudioManager';

export interface BuildingConfig {
  type: 'tavern' | 'castle';
  position: THREE.Vector3;
  id?: string;
}

export class BuildingManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private buildings: Map<string, BaseBuilding> = new Map();
  private safeZoneManager: SafeZoneManager;

  private audioManager: AudioManager | null = null;

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.safeZoneManager = new SafeZoneManager(scene);
    console.log('BuildingManager initialized');
  }

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
    console.log('🔊 AudioManager set for BuildingManager');
  }

  public createBuilding(config: BuildingConfig): BaseBuilding | null {
    console.log(`🏗️ Creating building of type: ${config.type} at position:`, config.position);

    let building: BaseBuilding | null = null;

    switch (config.type) {
      case 'tavern':
        building = new TavernBuilding(this.scene, this.physicsManager, config.position);
        if (building instanceof TavernBuilding && this.audioManager) {
          building.setAudioManager(this.audioManager);
        }
        break;
      case 'castle':
        building = new CastleBuilding(this.scene, this.physicsManager, config.position);
        break;
      default:
        console.warn(`🏗️ Unknown building type: ${config.type}`);
        return null;
    }

    if (building) {
      const buildingGroup = building.create();
      this.buildings.set(config.id || this.generateBuildingId(config.type), building);
      
      console.log(`🏗️ Building created successfully: ${building.getBuildingName()}`);
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
      console.log(`🔥 Building destroyed: ${building.getBuildingName()}`);
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
    this.safeZoneManager.dispose();
    console.log('BuildingManager disposed');
  }
}
