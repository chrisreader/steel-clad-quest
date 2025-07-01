import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';
import { InstanceLODManager } from './InstanceLODManager';

export interface RegionLODInfo {
  currentLODLevel: number;
  lastPlayerDistance: number;
  needsRegeneration: boolean;
}

export class LODManager {
  // IMPROVED: Increased distances to reduce pop-in while maintaining performance
  private lodDistances: number[] = [50, 100, 150, 200]; // Increased from [30, 60, 100, 140]
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 1; // Reduced from 3 for faster response
  
  private regionLODState: Map<string, RegionLODInfo> = new Map();
  private readonly LOD_REGENERATION_THRESHOLD: number = 0.5;
  private readonly POSITION_UPDATE_THRESHOLD: number = 3; // Reduced for better responsiveness

  private instanceLODManager: InstanceLODManager = new InstanceLODManager();

  // Player velocity tracking
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastPlayerUpdateTime: number = 0;

  public calculateLODDensity(distance: number): number {
    // IMPROVED: Better density curve to maintain visual quality
    if (distance < this.lodDistances[0]) return 1.0;
    if (distance < this.lodDistances[1]) return 0.8; // Increased from 0.7
    if (distance < this.lodDistances[2]) return 0.5; // Increased from 0.4
    if (distance < this.lodDistances[3]) return 0.2; // Increased from 0.15
    return 0.0; // Complete culling beyond 200 units
  }

  public updateVisibility(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number
  ): void {
    this.grassCullingUpdateCounter++;
    
    // Update velocity calculation more frequently
    const now = performance.now();
    if (this.lastPlayerUpdateTime === 0 || now - this.lastPlayerUpdateTime > 100) { // More frequent updates
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
    
    // IMPROVED: Increased render distances to prevent pop-in
    const tallGrassMaxDistance = Math.min(maxDistance * 0.8, 180); // Increased from 120
    const groundGrassMaxDistance = Math.min(maxDistance * 0.6, 120); // Increased from 80
    
    // Update tall grass with improved culling
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
      
      // Update instances for closer grass more frequently
      if (shouldBeVisible && shouldUpdateInstances && distanceToPlayer <= 100) { // Increased from 60
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
    
    // Ground grass with improved culling
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
      
      // Update instances for closer ground grass
      if (shouldBeVisible && shouldUpdateInstances && distanceToPlayer <= 60) { // Increased from 40
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
    
    // Much less frequent logging
    if ((visibilityChanges > 0 || instanceUpdates > 0) && this.grassCullingUpdateCounter % 300 === 0) {
      console.log(`🌱 LOD: ${visibilityChanges} visibility, ${instanceUpdates} instance updates`);
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
