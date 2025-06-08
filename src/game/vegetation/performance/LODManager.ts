
import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';

export class LODManager {
  // OPTIMIZED: More aggressive LOD distances for better performance
  private lodDistances: number[] = [60, 120, 180, 240]; // Reduced from [75, 150, 225, 300]
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  // OPTIMIZED: Increased update interval for better performance
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 8; // Increased from 5

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
    this.lastPlayerPosition.copy(playerPosition);
    
    if (this.grassCullingUpdateCounter >= this.GRASS_CULLING_UPDATE_INTERVAL) {
      this.updateGrassVisibility(playerPosition, grassInstances, groundGrassInstances, maxDistance);
      this.grassCullingUpdateCounter = 0;
    }
  }

  private updateGrassVisibility(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number
  ): void {
    let hiddenCount = 0;
    let visibleCount = 0;
    
    // Update tall grass visibility
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
    }
    
    // OPTIMIZED: Reduce logging frequency for performance
    if ((hiddenCount > 0 || visibleCount > 0) && this.grassCullingUpdateCounter % 20 === 0) {
      console.log(`🌱 LOD: ${visibleCount} regions shown, ${hiddenCount} regions hidden`);
    }
  }

  public getLastPlayerPosition(): THREE.Vector3 {
    return this.lastPlayerPosition.clone();
  }
}
