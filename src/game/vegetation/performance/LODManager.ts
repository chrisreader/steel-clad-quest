
import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';

export class LODManager {
  private lodDistances: number[] = [75, 150, 225, 300];
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 5;

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
      
      // Update LOD density for smooth transitions
      if (instancedMesh.userData.lodLevel !== newLodDensity && shouldBeVisible) {
        instancedMesh.userData.lodLevel = newLodDensity;
        if (instancedMesh.material && newLodDensity < 0.3) {
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.3, newLodDensity);
          }
        }
      }
    }
    
    // Update ground grass visibility
    const groundRenderDistance = maxDistance * 0.9;
    for (const [regionKey, instancedMesh] of groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
      }
    }
    
    if (hiddenCount > 0 || visibleCount > 0) {
      console.log(`🌱 LOD: ${visibleCount} regions shown, ${hiddenCount} regions hidden`);
    }
  }

  public getLastPlayerPosition(): THREE.Vector3 {
    return this.lastPlayerPosition.clone();
  }
}
