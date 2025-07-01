
import * as THREE from 'three';
import { GradientDensity } from '../../utils/math/GradientDensity';
import { InstanceLODManager } from './InstanceLODManager';

export interface RegionLODInfo {
  currentLODLevel: number;
  lastPlayerDistance: number;
  needsRegeneration: boolean;
}

export class LODManager {
  // ENHANCED: More aggressive LOD distances for better performance
  private lodDistances: number[] = [30, 60, 120, 180]; // Tighter distances
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private grassCullingUpdateCounter: number = 0;
  private readonly GRASS_CULLING_UPDATE_INTERVAL: number = 2; // More frequent for responsiveness
  
  private regionLODState: Map<string, RegionLODInfo> = new Map();
  private readonly LOD_REGENERATION_THRESHOLD: number = 0.3;
  private readonly POSITION_UPDATE_THRESHOLD: number = 3;

  // Enhanced instance-level LOD manager
  private instanceLODManager: InstanceLODManager = new InstanceLODManager();

  // PERFORMANCE: Predictive loading based on player movement
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastPlayerUpdateTime: number = 0;

  public calculateLODDensity(distance: number): number {
    // More aggressive LOD for better performance
    if (distance < this.lodDistances[0]) return 1.0;
    if (distance < this.lodDistances[1]) return 0.75;
    if (distance < this.lodDistances[2]) return 0.5;
    if (distance < this.lodDistances[3]) return 0.25;
    return 0.0; // Complete culling beyond 180 units
  }

  public updateVisibility(
    playerPosition: THREE.Vector3,
    grassInstances: Map<string, THREE.InstancedMesh>,
    groundGrassInstances: Map<string, THREE.InstancedMesh>,
    maxDistance: number
  ): void {
    this.grassCullingUpdateCounter++;
    
    // Calculate player velocity for predictive loading
    const now = performance.now();
    if (this.lastPlayerUpdateTime > 0) {
      const deltaTime = (now - this.lastPlayerUpdateTime) / 1000;
      this.playerVelocity.subVectors(playerPosition, this.lastPlayerPosition).divideScalar(deltaTime);
    }
    this.lastPlayerUpdateTime = now;
    
    const playerMovement = this.lastPlayerPosition.distanceTo(playerPosition);
    const shouldUpdateInstances = playerMovement > this.POSITION_UPDATE_THRESHOLD;
    
    this.lastPlayerPosition.copy(playerPosition);
    
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
    
    // ENHANCED: Frustum-based culling with camera direction
    const playerDirection = this.playerVelocity.length() > 0.1 
      ? this.playerVelocity.clone().normalize() 
      : new THREE.Vector3(0, 0, -1);
    
    // Update tall grass with enhanced culling
    for (const [regionKey, instancedMesh] of grassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      // PERFORMANCE: Directional culling - prioritize regions in movement direction
      const directionToRegion = regionCenter.clone().sub(playerPosition).normalize();
      const alignmentWithMovement = directionToRegion.dot(playerDirection);
      
      // Adjust max distance based on alignment
      const adjustedMaxDistance = alignmentWithMovement > 0 
        ? maxDistance 
        : maxDistance * 0.7; // Reduce distance for regions behind player
      
      const shouldBeVisible = distanceToPlayer <= adjustedMaxDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        visibilityChanges++;
      }
      
      // Enhanced instance-level LOD
      if (shouldBeVisible && shouldUpdateInstances) {
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
      
      // Dynamic material opacity based on LOD
      const newLodDensity = this.calculateLODDensity(distanceToPlayer);
      if (instancedMesh.userData.lodLevel !== newLodDensity && shouldBeVisible) {
        instancedMesh.userData.lodLevel = newLodDensity;
        if (instancedMesh.material && newLodDensity < 0.8) {
          (instancedMesh.material as THREE.ShaderMaterial).transparent = true;
          if ((instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity) {
            (instancedMesh.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.max(0.3, newLodDensity);
          }
        }
      }
    }
    
    // Ground grass with more aggressive culling
    const groundRenderDistance = Math.min(maxDistance * 0.6, 120);
    for (const [regionKey, instancedMesh] of groundGrassInstances.entries()) {
      const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
      const distanceToPlayer = playerPosition.distanceTo(regionCenter);
      
      const shouldBeVisible = distanceToPlayer <= groundRenderDistance;
      
      if (instancedMesh.visible !== shouldBeVisible) {
        instancedMesh.visible = shouldBeVisible;
        visibilityChanges++;
      }
      
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
    
    // Reduced logging frequency
    if ((visibilityChanges > 0 || instanceUpdates > 0) && this.grassCullingUpdateCounter % 30 === 0) {
      console.log(`🌱 ENHANCED LOD: ${visibilityChanges} visibility, ${instanceUpdates} instance updates`);
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
