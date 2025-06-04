
import * as THREE from 'three';
import { TavernBuilding } from '../buildings/TavernBuilding';
import { PhysicsManager } from '../engine/PhysicsManager';

export class Tavern {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private building: TavernBuilding | null = null;
  private isLoaded: boolean = false;

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
  }

  public async load(): Promise<void> {
    try {
      // Create the tavern building
      this.building = new TavernBuilding(this.scene, this.physicsManager, new THREE.Vector3(0, 0, 0));
      await this.building.initialize();
      
      this.isLoaded = true;
      console.log("🏠 [Tavern] Tavern loaded successfully");
    } catch (error) {
      console.error("🏠 [Tavern] Error loading tavern:", error);
      throw error;
    }
  }

  public isLoadedSuccessfully(): boolean {
    return this.isLoaded;
  }

  public getBuilding(): TavernBuilding | null {
    return this.building;
  }

  public dispose(): void {
    if (this.building) {
      this.building.dispose();
      this.building = null;
    }
    this.isLoaded = false;
    console.log("🏠 [Tavern] Tavern disposed");
  }
}
