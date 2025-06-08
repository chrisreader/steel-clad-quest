
import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';

export interface RegionLODInfo {
  currentLODLevel: number;
  lastPlayerDistance: number;
  needsRegeneration: boolean;
}

export class LODManager {
  // OPTIMIZED: More aggressive LOD distances for better performance
  private lodDistances: number[] = [60, 120, 180, 240]; // Reduced from [75, 150, 225, 300]
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  // OPTIMIZED: Increased update interval for better performance
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 8; // Increased from 5
  
  // NEW: Track LOD state for each region
  private regionLODState: Map<string, RegionLODInfo> = new Map();
  private readonly LOD_REGENERATION_THRESHOLD: number = 0.3; // Regenerate if LOD changes by more than 30%
  private readonly POSITION_UPDATE_THRESHOLD: number = 15; // Only check for updates when player moves 15+ units

  public calculateLODDensity(distance: number): number {
    return GradientDensity.calculateLODDensity(distance, this.lodDistances);
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
    const shouldCheckRegeneration = playerMovement > this.POSITION_UPDATE_THRESHOLD;
    
    this.lastPlayerPosition.copy(playerPosition);
    
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      this.updateGrassVisibility(playerPosition, grassInstances, groundGrassInstances, maxDistance, shouldCheckRegeneration);
      this.grassCullingUpdateCounter = 0;
    }
  }

  private updateGrassVisibility(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number,
    checkRegeneration: boolean
  ): void {
    let hiddenCount = 0;
    let visibleCount = 0;
    let regenerationRequests: string[] = [];
    
    // Update tall grass visibility and check for regeneration needs
    for (const [regionKey, instancedMesh] of grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= maxDistance;
      const newLodDensity = this.calculateLODDensity(distanceToPlayer);
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        if (shouldBeVisible) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
      }
      
      // Check if region needs regeneration
      if (checkRegeneration && shouldBeVisible) {
        const needsRegeneration = this.checkRegionRegeneration(regionKey, newLodDensity, distanceToPlayer);
        if (needsRegeneration) {
          regenerationRequests.push(regionKey);
        }
      }
      
      // OPTIMIZED: More aggressive opacity scaling for performance
      if (instancedMesh.userData.lodLevel !== newLodDensity && shouldBeVisible) {
        instancedMesh.userData.lodLevel = newLodDensity;
        if (instancedMesh.material && newLodDensity < 0.4) { // Increased threshold from 0.3
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            // More aggressive opacity reduction
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.1, newLodDensity * 0.8);
          }
        }
      }
    }
    
    // OPTIMIZED: Reduced ground grass render distance for better performance
    const groundRenderDistance = Math.min(maxDistance * 0.6, 120); // Reduced from 0.9 and capped at 120
    for (const [regionKey, instancedMesh] of groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
      }
      
      // Check ground grass regeneration too
      if (checkRegeneration && shouldBeVisible) {
        const newLodDensity = this.calculateLODDensity(distanceToPlayer);
        const needsRegeneration = this.checkRegionRegeneration(regionKey + '_ground', newLodDensity, distanceToPlayer);
        if (needsRegeneration && !regenerationRequests.includes(regionKey)) {
          regenerationRequests.push(regionKey);
        }
      }
    }
    
    // Store regeneration requests for the grass system to handle
    if (regenerationRequests.length > 0) {
      this.pendingRegenerations = regenerationRequests;
      console.log(`🌱 LOD: ${regenerationRequests.length} regions need regeneration`);
    }
    
    // OPTIMIZED: Reduce logging frequency for performance
    if ((hiddenCount > 0 || visibleCount > 0) && this.grassCullingUpdateCounter % 20 === 0) {
      console.log(`🌱 LOD: ${visibleCount} regions shown, ${hiddenCount} regions hidden`);
    }
  }

  private checkRegionRegeneration(regionKey: string, newLodDensity: number, currentDistance: number): boolean {
    const existing = this.regionLODState.get(regionKey);
    
    if (!existing) {
      // First time seeing this region
      this.regionLODState.set(regionKey, {
        currentLODLevel: newLodDensity,
        lastPlayerDistance: currentDistance,
        needsRegeneration: false
      });
      return false;
    }
    
    // Check if LOD level has changed significantly
    const lodDifference = Math.abs(existing.currentLODLevel - newLodDensity);
    const needsRegeneration = lodDifference > this.LOD_REGENERATION_THRESHOLD;
    
    if (needsRegeneration) {
      existing.currentLODLevel = newLodDensity;
      existing.lastPlayerDistance = currentDistance;
      existing.needsRegeneration = true;
    }
    
    return needsRegeneration;
  }

  // NEW: Store pending regeneration requests
  private pendingRegenerations: string[] = [];

  public getPendingRegenerations(): string[] {
    const pending = [...this.pendingRegenerations];
    this.pendingRegenerations = [];
    return pending;
  }

  public markRegionRegenerated(regionKey: string): void {
    const lodInfo = this.regionLODState.get(regionKey);
    if (lodInfo) {
      lodInfo.needsRegeneration = false;
    }
  }

  public getLastPlayerPosition(): THREE.Vector3 {
    return this.lastPlayerPosition.clone();
  }

  public clearRegionLODState(regionKey: string): void {
    this.regionLODState.delete(regionKey);
    this.regionLODState.delete(regionKey + '_ground');
  }
}
