
import * as THREE from 'three';
import { FogLayerManager } from './fog/FogLayerManager';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private layerManager: FogLayerManager;
  private timeOfDay: number = 0.25;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.layerManager = new FogLayerManager(scene);
    this.initializeFogSystem();
  }
  
  private initializeFogSystem(): void {
    console.log("🌫️ [VolumetricFogSystem] Initializing optimized fog system...");
    
    // Create all fog layers through the layer manager
    this.layerManager.createMainFogLayers();
    this.layerManager.createFogWalls();
    this.layerManager.createAtmosphericLayers();
    
    console.log("🌫️ [VolumetricFogSystem] Optimized fog system initialized successfully");
  }
  
  public update(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    // Delegate all update logic to the layer manager
    this.layerManager.updateLayers(deltaTime, timeOfDay, playerPosition);
  }
  
  public dispose(): void {
    console.log("🌫️ [VolumetricFogSystem] Disposing optimized fog system...");
    this.layerManager.dispose();
    console.log("🌫️ [VolumetricFogSystem] Disposed successfully");
  }
}
