
import * as THREE from 'three';

export interface InstanceLODInfo {
  originalInstanceCount: number;
  currentVisibleCount: number;
  lastLODLevel: number;
  instanceMatrices: THREE.Matrix4[];
  distanceFromPlayer: number;
}

export class InstanceLODManager {
  private regionInstanceData: Map<string, InstanceLODInfo> = new Map();
  private lodDistances: number[] = [50, 100, 150, 200]; // More granular distances
  private readonly DENSITY_UPDATE_THRESHOLD = 0.15; // Lower threshold for smoother updates
  private readonly POSITION_UPDATE_THRESHOLD = 5; // Much lower threshold

  public calculateInstanceLODDensity(distance: number): number {
    if (distance < this.lodDistances[0]) return 1.0;
    if (distance < this.lodDistances[1]) return 0.8;
    if (distance < this.lodDistances[2]) return 0.5;
    if (distance < this.lodDistances[3]) return 0.25;
    return 0.1; // Minimum density for very distant areas
  }

  public updateInstanceVisibility(
    instancedMesh: THREE.InstancedMesh,
    regionKey: string,
    playerPosition: THREE.Vector3
  ): boolean {
    const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
    if (!regionCenter) return false;

    const distanceToPlayer = playerPosition.distanceTo(regionCenter);
    const targetLODDensity = this.calculateInstanceLODDensity(distanceToPlayer);
    
    let lodInfo = this.regionInstanceData.get(regionKey);
    
    // Initialize LOD info if not exists
    if (!lodInfo) {
      const originalCount = instancedMesh.count;
      const matrices: THREE.Matrix4[] = [];
      
      // Store original instance matrices
      for (let i = 0; i < originalCount; i++) {
        const matrix = new THREE.Matrix4();
        instancedMesh.getMatrixAt(i, matrix);
        matrices.push(matrix);
      }
      
      lodInfo = {
        originalInstanceCount: originalCount,
        currentVisibleCount: originalCount,
        lastLODLevel: 1.0,
        instanceMatrices: matrices,
        distanceFromPlayer: distanceToPlayer
      };
      
      this.regionInstanceData.set(regionKey, lodInfo);
    }

    // Check if significant change in distance or LOD level
    const distanceChange = Math.abs(lodInfo.distanceFromPlayer - distanceToPlayer);
    const lodChange = Math.abs(lodInfo.lastLODLevel - targetLODDensity);
    
    if (distanceChange < this.POSITION_UPDATE_THRESHOLD && lodChange < this.DENSITY_UPDATE_THRESHOLD) {
      return false; // No significant change
    }

    // Calculate new visible instance count
    const targetVisibleCount = Math.max(1, Math.floor(lodInfo.originalInstanceCount * targetLODDensity));
    
    if (targetVisibleCount !== lodInfo.currentVisibleCount) {
      this.updateInstanceCount(instancedMesh, lodInfo, targetVisibleCount);
      lodInfo.currentVisibleCount = targetVisibleCount;
      lodInfo.lastLODLevel = targetLODDensity;
      lodInfo.distanceFromPlayer = distanceToPlayer;
      
      console.log(`🌱 LOD: Updated ${regionKey} instances: ${targetVisibleCount}/${lodInfo.originalInstanceCount} (${targetLODDensity.toFixed(2)})`);
      return true;
    }

    return false;
  }

  private updateInstanceCount(
    instancedMesh: THREE.InstancedMesh,
    lodInfo: InstanceLODInfo,
    targetCount: number
  ): void {
    // Use distance-based selection for which instances to show
    const playerPos = instancedMesh.userData.lastPlayerPosition as THREE.Vector3;
    
    if (playerPos) {
      // Calculate distances for each instance and sort by proximity
      const instanceDistances = lodInfo.instanceMatrices.map((matrix, index) => {
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(matrix);
        return {
          index,
          distance: position.distanceTo(playerPos),
          matrix
        };
      });

      // Sort by distance (closest first) and take the target count
      instanceDistances.sort((a, b) => a.distance - b.distance);
      const selectedInstances = instanceDistances.slice(0, targetCount);

      // Update the instanced mesh with selected instances
      instancedMesh.count = targetCount;
      
      for (let i = 0; i < targetCount; i++) {
        instancedMesh.setMatrixAt(i, selectedInstances[i].matrix);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
    } else {
      // Fallback: just use the first N instances
      instancedMesh.count = targetCount;
      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public clearRegionData(regionKey: string): void {
    this.regionInstanceData.delete(regionKey);
  }

  public updatePlayerPosition(playerPosition: THREE.Vector3): void {
    // Store player position for distance calculations
    for (const [regionKey, lodInfo] of this.regionInstanceData.entries()) {
      lodInfo.distanceFromPlayer = playerPosition.distanceTo(lodInfo.distanceFromPlayer as any);
    }
  }
}
