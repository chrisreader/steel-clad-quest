import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';
import { InstanceLODManager } from './InstanceLODManager';

export interface RegionLODInfo {
  currentLODLevel: number;
  lastPlayerDistance: number;
  needsRegeneration: boolean;
}

export class LODManager {
  // BALANCED: Moderate distances for good performance with less pop-in
  private lodDistances: number[] = [30, 60, 100, 140]; // Increased from ultra-aggressive values
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 3; // Reduced from 5 for better responsiveness
  
  private regionLODState: Map<string, RegionLODInfo> = new Map();
  private readonly LOD_REGENERATION_THRESHOLD: number = 0.5;
  private readonly POSITION_UPDATE_THRESHOLD: number = 5; // Reduced for better responsiveness

  private instanceLODManager: InstanceLODManager = new InstanceLODManager();

  // Player velocity tracking
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastPlayerUpdateTime: number = 0;

  public calculateLODDensity(distance: number): number {
    // BALANCED: Less aggressive density reduction
    if (distance < this.lodDistances[0]) return 1.0;
    if (distance < this.lodDistances[1]) return 0.7; // Increased from 0.5
    if (distance < this.lodDistances[2]) return 0.4; // Increased from 0.2
    if (distance < this.lodDistances[3]) return 0.15; // Increased from 0.1
    return 0.0; // Complete culling beyond 140 units
  }

  public updateVisibility(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number
  ): void {
    this.grassCullingUpdateCounter++;
    
    // Update velocity calculation
    const now = performance.now();
    if (this.lastPlayerUpdateTime === 0 || now - this.lastPlayerUpdateTime > 200) { // More frequent updates
      const deltaTime = (now - this.lastPlayerUpdateTime) / 1000;
      if (deltaTime > 0) {
        this.playerVelocity.subVectors(playerPosition, this.lastPlayerPosition).divideScalar(deltaTime);
      }
      this.lastPlayerUpdateTime = now;
    }
    
    const playerMovement = this.lastPlayerPosition.distanceTo(playerPosition);
    const shouldUpdateInstances = playerMovement > this.POSITION_UPDATE_THRESHOLD;
    
    this.lastPlayerPosition.copy(playerPosition);
    
    // More frequent grass visibility updates
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      this.updateGrassVisibilityOptimized(playerPosition, grassInstances, groundGrassInstances, maxDistance, shouldUpdateInstances);
      this.grassCullingUpdateCounter = 0;
    }
  }

  private updateGrassVisibilityOptimized(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number,
    shouldUpdateInstances: boolean
  ): void {
    let visibilityChanges = 0;
    let instanceUpdates = 0;
    
    // BALANCED: Moderate render distances to prevent pop-in
    const tallGrassMaxDistance = Math.min(maxDistance * 0.7, 120); // Increased from 80
    const groundGrassMaxDistance = Math.min(maxDistance * 0.5, 80); // Increased from 50
    
    // Update tall grass with balanced culling
    for (const [regionKey, instancedMesh] of grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= tallGrassMaxDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        if (!shouldBeVisible) {
          instancedMesh.count = 0;
        }
        visibilityChanges++;
      }
      
      // Update instances for moderate distance grass
      if (shouldBeVisible && shouldUpdateInstances && distanceToPlayer <= 60) { // Increased from 40
        instancedMesh.userData.lastPlayerPosition = playerPosition.clone();
        
        const updated = this.instanceLODManager.updateInstanceVisibility(
          instancedMesh, 
          regionKey, 
          playerPosition
        );
        
        if (updated) {
          instanceUpdates++;
        }
      }
    }
    
    // Ground grass with balanced culling
    for (const [regionKey, instancedMesh] of groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundGrassMaxDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        if (!shouldBeVisible) {
          instancedMesh.count = 0;
        }
        visibilityChanges++;
      }
      
      // Update instances for moderate distance ground grass
      if (shouldBeVisible && shouldUpdateInstances && distanceToPlayer <= 40) { // Increased from 25
        instancedMesh.userData.lastPlayerPosition = playerPosition.clone();
        
        const updated = this.instanceLODManager.updateInstanceVisibility(
          instancedMesh, 
          regionKey + '_ground', 
          playerPosition
        );
        
        if (updated) {
          instanceUpdates++;
        }
      }
    }
    
    // Reduced logging frequency but keep some feedback
    if ((visibilityChanges > 0 || instanceUpdates > 0) && this.grassCullingUpdateCounter % 50 === 0) {
      console.log(`🌱 BALANCED LOD: ${visibilityChanges} visibility, ${instanceUpdates} instance updates`);
    }
  }

  public getPendingRegenerations(): string[] {
    return [];
  }

  public markRegionRegenerated(regionKey: string): void {
    // No longer needed
  }

  public getLastPlayerPosition(): THREE.Vector3 {
    return this.lastPlayerPosition.clone();
  }

  public clearRegionLODState(regionKey: string): void {
    this.regionLODState.delete(regionKey);
    this.regionLODState.delete(regionKey + '_ground');
    this.instanceLODManager.clearRegionData(regionKey);
    this.instanceLODManager.clearRegionData(regionKey + '_ground');
  }

  public getPlayerVelocity(): THREE.Vector3 {
    return this.playerVelocity.clone();
  }
}
