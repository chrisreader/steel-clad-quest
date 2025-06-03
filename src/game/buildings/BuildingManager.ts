
import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';
import { BaseBuilding } from './BaseBuilding';
import { TavernBuilding } from './TavernBuilding';
import { CastleBuilding } from './CastleBuilding';
import { SafeZoneManager } from '../systems/SafeZoneManager';

export type BuildingType = 'tavern' | 'castle';

export interface BuildingConfig {
  type: BuildingType;
  position: THREE.Vector3;
  options?: any;
}

export class BuildingManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private buildings: Map<string, BaseBuilding> = new Map();
  private safeZoneManager: SafeZoneManager | null = null;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log('🏗️ BuildingManager initialized');
  }
  
  public createBuilding(config: BuildingConfig): BaseBuilding {
    const buildingId = `${config.type}_${config.position.x}_${config.position.z}_${Date.now()}`;
    
    let building: BaseBuilding;
    
    switch (config.type) {
      case 'tavern':
        building = new TavernBuilding(this.scene, this.physicsManager, config.position);
        // Initialize safe zone for tavern
        this.initializeSafeZone(config.position);
        break;
        
      case 'castle':
        building = new CastleBuilding(this.scene, this.physicsManager, config.position, config.options);
        break;
        
      default:
        throw new Error(`Unknown building type: ${config.type}`);
    }
    
    building.create();
    this.buildings.set(buildingId, building);
    
    console.log(`🏗️ Created ${config.type} with ID: ${buildingId}`);
    return building;
  }
  
  private initializeSafeZone(tavernPosition: THREE.Vector3): void {
    // Create safe zone around the tavern (15x15 area centered on tavern)
    const safeZoneConfig = {
      minX: tavernPosition.x - 7.5,
      maxX: tavernPosition.x + 7.5,
      minZ: tavernPosition.z - 7.5,
      maxZ: tavernPosition.z + 7.5
    };
    
    this.safeZoneManager = new SafeZoneManager(safeZoneConfig);
    console.log('🛡️ Safe zone initialized around tavern');
  }
  
  public getSafeZoneManager(): SafeZoneManager | null {
    return this.safeZoneManager;
  }
  
  public getBuilding(buildingId: string): BaseBuilding | undefined {
    return this.buildings.get(buildingId);
  }
  
  public getAllBuildings(): BaseBuilding[] {
    return Array.from(this.buildings.values());
  }
  
  public removeBuilding(buildingId: string): void {
    const building = this.buildings.get(buildingId);
    if (building) {
      building.dispose();
      this.buildings.delete(buildingId);
      console.log(`🗑️ Removed building: ${buildingId}`);
    }
  }
  
  public dispose(): void {
    console.log('🗑️ Disposing BuildingManager');
    
    for (const [id, building] of this.buildings.entries()) {
      building.dispose();
    }
    this.buildings.clear();
    
    this.safeZoneManager = null;
    console.log('🗑️ BuildingManager disposed');
  }
}
