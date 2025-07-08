
import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';
import { InstanceLODManager } from './InstanceLODManager';

export interface RegionLODInfo {
  currentLODLevel: number;
  lastPlayerDistance: number;
  needsRegeneration: boolean;
}

export class LODManager {
  // VEGETATION-OPTIMIZED LOD DISTANCES - Fixed for proper close-range visibility
  private lodDistances: number[] = [100, 200, 300, 350]; // Proper vegetation LOD ranges
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
    // VEGETATION LOD FIX: Complete culling only beyond fog visibility
    if (distance > this.fogVisibilityRange) return 0.0; // Complete culling beyond fog (400+ units)
    
    // PLAYER-CENTRIC PROTECTION: Full density within 50 units
    if (distance < 50) return 1.0 * this.currentPerformanceLevel;
    
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
      
      // FIXED: Only apply transparency when approaching fog wall (250+ units)
      const newLodDensity = this.calculateLODDensity(distanceToPlayer);
      if (instancedMesh.userData.lodLevel !== newLodDensity && shouldBeVisible) {
        instancedMesh.userData.lodLevel = newLodDensity;
        // Only apply transparency reduction when distance > 250 units (approaching fog wall)
        if (instancedMesh.material && distanceToPlayer > 250) {
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            // Gentle opacity reduction only near fog wall (250-400 units)
            const fadeProgress = (distanceToPlayer - 250) / (this.fogVisibilityRange - 250);
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.3, 1.0 - (fadeProgress * 0.7));
          }
        } else if (instancedMesh.material && distanceToPlayer <= 250) {
          // Ensure close vegetation is fully opaque
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = 1.0;
          }
        }
      }
    }
    
    // EXTENDED ground grass distance (60% of fog range instead of 30%)
    const groundRenderDistance = Math.min(maxDistance * 0.6, this.fogVisibilityRange * 0.6); // Increased to 60% of fog range (240 units)
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
