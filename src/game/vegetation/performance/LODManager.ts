
import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';
import { InstanceLODManager } from './InstanceLODManager';

export interface RegionLODInfo {
  currentLODLevel: number;
  lastPlayerDistance: number;
  needsRegeneration: boolean;
}

export class LODManager {
  // FOG-SYNCHRONIZED LOD DISTANCES - Aligned with fog visibility
  private lodDistances: number[] = [50, 100, 150, 200]; // Fog-aware distances for massive world support
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 2; // HYPER-RESPONSIVE: Every 2 frames for fog-based culling
  
  // Fog-based performance tracking
  private fogVisibilityRange: number = 400;
  private currentPerformanceLevel: number = 1.0;
  
  private regionLODState: Map<string, RegionLODInfo> = new Map();
  private readonly LOD_REGENERATION_THRESHOLD: number = 0.5; // Ultra-aggressive LOD switching
  private readonly POSITION_UPDATE_THRESHOLD: number = 5; // Less responsive for better performance

  // NEW: Instance-level LOD manager for smooth density changes
  private instanceLODManager: InstanceLODManager = new InstanceLODManager();

  public calculateLODDensity(distance: number): number {
    // FOG-AWARE DENSITY: Aggressive culling beyond fog visibility
    if (distance > this.fogVisibilityRange) return 0.0; // Complete culling beyond fog
    
    return GradientDensity.calculateLODDensity(distance, this.lodDistances) * this.currentPerformanceLevel;
  }
  
  public setFogVisibilityRange(range: number): void {
    this.fogVisibilityRange = range;
    // Dynamically adjust LOD distances based on fog
    this.lodDistances = [
      range * 0.125,  // 12.5% of fog distance
      range * 0.25,   // 25% of fog distance  
      range * 0.375,  // 37.5% of fog distance
      range * 0.5     // 50% of fog distance
    ];
  }
  
  public setPerformanceLevel(level: number): void {
    this.currentPerformanceLevel = Math.max(0.1, Math.min(1.0, level));
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
        if (instancedMesh.material && newLodDensity < 0.8) { // ULTRA-AGGRESSIVE: Start opacity reduction much earlier
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.1, newLodDensity * 0.7); // More aggressive opacity reduction
          }
        }
      }
    }
    
    // FOG-SYNCHRONIZED ground grass distance (aggressive fog-based culling)
    const groundRenderDistance = Math.min(maxDistance * 0.4, this.fogVisibilityRange * 0.3); // Only 30% of fog range
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
    
    // ULTRA-AGGRESSIVE logging reduction (every 150 frames = 2.5 minutes)
    if ((visibilityChanges > 0 || instanceUpdates > 0) && this.grassCullingUpdateCounter % 150 === 0) {
      console.log(`🌱 ULTRA-LOD: ${visibilityChanges} visibility changes, ${instanceUpdates} instance updates`);
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
