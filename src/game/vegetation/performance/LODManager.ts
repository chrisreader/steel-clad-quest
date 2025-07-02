
import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';
import { InstanceLODManager } from './InstanceLODManager';

export interface RegionLODInfo {
  currentLODLevel: number;
  lastPlayerDistance: number;
  needsRegeneration: boolean;
}

export class LODManager {
  private lodDistances: number[] = [20, 40, 70, 120]; // Tighter LOD bands for better performance
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 5; // More stable updates
  
  private regionLODState: Map<string, RegionLODInfo> = new Map();
  private readonly LOD_REGENERATION_THRESHOLD: number = 0.3; // More aggressive LOD switching
  private readonly POSITION_UPDATE_THRESHOLD: number = 3; // More responsive updates

  // NEW: Instance-level LOD manager for smooth density changes
  private instanceLODManager: InstanceLODManager = new InstanceLODManager();

  public calculateLODDensity(distance: number): number {
    // Progressive quality reduction for better performance
    if (distance < this.lodDistances[0]) return 1.0;     // Full detail 0-20
    if (distance < this.lodDistances[1]) return 0.75;    // High detail 20-40
    if (distance < this.lodDistances[2]) return 0.5;     // Medium detail 40-70
    if (distance < this.lodDistances[3]) return 0.25;    // Low detail 70-120
    return 0.1; // Minimal detail beyond 120
  }

  public updateVisibility(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number
  ): void {
    this.grassCullingUpdateCounter++;
    
    // Check if player has moved significantly
    const playerMovement = this.lastPlayerPosition.distanceTo(playerPosition);
    const shouldUpdateInstances = playerMovement > this.POSITION_UPDATE_THRESHOLD;
    
    this.lastPlayerPosition.copy(playerPosition);
    
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      this.updateGrassVisibility(playerPosition, grassInstances, groundGrassInstances, maxDistance, shouldUpdateInstances);
      this.grassCullingUpdateCounter = 0;
    }
  }

  private updateGrassVisibility(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number,
    shouldUpdateInstances: boolean
  ): void {
    let visibilityChanges = 0;
    let instanceUpdates = 0;
    
    // Update tall grass visibility and instance-level LOD
    for (const [regionKey, instancedMesh] of grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= maxDistance;
      
      // Update visibility
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        visibilityChanges++;
      }
      
      // Update instance-level LOD for visible regions
      if (shouldBeVisible && shouldUpdateInstances) {
        // Store player position for instance distance calculations
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
      
      // Update material opacity for distant grass
      const newLodDensity = this.calculateLODDensity(distanceToPlayer);
      if (instancedMesh.userData.lodLevel !== newLodDensity && shouldBeVisible) {
        instancedMesh.userData.lodLevel = newLodDensity;
        if (instancedMesh.material && newLodDensity < 0.6) {
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.2, newLodDensity);
          }
        }
      }
    }
    
    // Update ground grass with similar logic but reduced distance
    const groundRenderDistance = Math.min(maxDistance * 0.7, 140);
    for (const [regionKey, instancedMesh] of groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        visibilityChanges++;
      }
      
      // Update ground grass instance LOD
      if (shouldBeVisible && shouldUpdateInstances) {
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
    
    // Log updates less frequently
    if ((visibilityChanges > 0 || instanceUpdates > 0) && this.grassCullingUpdateCounter % 15 === 0) {
      console.log(`🌱 LOD: ${visibilityChanges} visibility changes, ${instanceUpdates} instance updates`);
    }
  }

  // Remove regeneration methods as we're now using instance-level updates
  public getPendingRegenerations(): string[] {
    return []; // No longer using region regeneration
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
}
