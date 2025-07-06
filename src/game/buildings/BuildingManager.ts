
import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TavernBuilding } from './TavernBuilding';
import { CastleBuilding } from './CastleBuilding';
import { HumanCampBuilding } from './HumanCampBuilding';
import { PhysicsManager } from '../engine/PhysicsManager';
import { SafeZoneManager } from '../systems/SafeZoneManager';
import { AudioManager } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';
import { DistanceLODManager } from '../systems/DistanceLODManager';
import { ChestInteractionSystem } from '../systems/ChestInteractionSystem';

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
  private lodManager: DistanceLODManager;

  private audioManager: AudioManager | null = null;
  private effectsManager: EffectsManager | null = null;
  private chestInteractionSystem: ChestInteractionSystem | null = null;

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.lodManager = new DistanceLODManager();
    
    // Create default safe zone config for tavern area
    this.safeZoneManager = new SafeZoneManager({
      minX: -20,
      maxX: 20,
      minZ: -20,
      maxZ: 20
    });
  }

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }

  public setEffectsManager(effectsManager: EffectsManager): void {
    this.effectsManager = effectsManager;
  }

  public setChestInteractionSystem(chestInteractionSystem: ChestInteractionSystem): void {
    this.chestInteractionSystem = chestInteractionSystem;
  }

  public createBuilding(config: BuildingConfig): BaseBuilding | null {
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
          }
          if (this.chestInteractionSystem) {
            building.setChestInteractionSystem(this.chestInteractionSystem);
          }
        }
        break;
      default:
        return null;
    }

    if (building) {
      const buildingGroup = building.create();
      const buildingId = config.id || this.generateBuildingId(config.type);
      this.buildings.set(buildingId, building);
      
      // Add to LOD system for performance management
      this.lodManager.addLODObject(
        buildingId,
        buildingGroup,
        config.position,
        (distance) => this.updateBuildingLOD(building, distance),
        () => building.dispose()
      );
      
      return building;
    }

    return null;
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // Update LOD system first
    if (playerPosition) {
      this.lodManager.updatePlayerPosition(playerPosition);
    }
    this.lodManager.update();
    
    // Only update active/nearby buildings
    for (const building of this.buildings.values()) {
      if ('update' in building && typeof building.update === 'function') {
        building.update(deltaTime, playerPosition);
      }
    }
  }

  public updateTimeOfDay(gameTime: number, timePhases: any): void {
    // Update time-aware buildings (like human camps with fireplaces)
    for (const building of this.buildings.values()) {
      if ('updateTimeOfDay' in building && typeof building.updateTimeOfDay === 'function') {
        building.updateTimeOfDay(gameTime, timePhases);
      }
    }
  }

  public destroyBuilding(id: string): void {
    const building = this.buildings.get(id);
    if (building) {
      this.lodManager.removeLODObject(id);
      building.dispose();
      this.buildings.delete(id);
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

  // PERFORMANCE: Handle building LOD based on distance
  private updateBuildingLOD(building: BaseBuilding, distance: number): void {
    if (building instanceof HumanCampBuilding) {
      const category = this.lodManager.getDistanceCategory(distance);
      
      switch (category) {
        case 'near':
          // Full detail - all NPCs and effects active
          break;
        case 'medium':
          // Reduced detail - fewer effects
          building.getBuildingGroup().visible = true;
          break;
        case 'far':
          // Minimal detail - static only
          building.getBuildingGroup().visible = true;
          break;
        case 'culled':
          // Completely hidden
          building.getBuildingGroup().visible = false;
          break;
      }
    }
  }

  public dispose(): void {
    this.lodManager.dispose();
    
    for (const building of this.buildings.values()) {
      building.dispose();
    }
    this.buildings.clear();
  }
}
