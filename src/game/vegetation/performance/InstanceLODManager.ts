
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
  // AGGRESSIVE LOD distances - Phase 2 FPS optimization
  private lodDistances: number[] = [10, 20, 35, 60]; // Drastically reduced from [40, 80, 120, 200]
  private readonly DENSITY_UPDATE_THRESHOLD = 0.1; // Lower threshold for smoother updates
  private readonly POSITION_UPDATE_THRESHOLD = 3; // Lower threshold for responsiveness
  private readonly CULLING_DISTANCE = 60; // Aggressive culling - reduced from 200

  public calculateInstanceLODDensity(distance: number): number {
    if (distance >= this.CULLING_DISTANCE) return 0.0; // Complete culling beyond 60 units
    if (distance < this.lodDistances[0]) return 1.0;    // 0-10 units: full density
    if (distance < this.lodDistances[1]) return 0.5;    // 10-20 units: 50% density (more aggressive)
    if (distance < this.lodDistances[2]) return 0.2;    // 20-35 units: 20% density (very aggressive)
    if (distance < this.lodDistances[3]) return 0.05;   // 35-60 units: 5% density (ultra sparse)
    return 0.0; // Complete culling
  }

  public updateInstanceVisibility(
    instancedMesh: THREE.InstancedMesh,
    regionKey: string,
    playerPosition: THREE.Vector3
  ): boolean {
    const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
    if (!regionCenter) return false;

    const distanceToPlayer = playerPosition.distanceTo(regionCenter);
    
    // Immediate culling for distant regions
    if (distanceToPlayer > this.CULLING_DISTANCE) {
      if (instancedMesh.visible) {
        instancedMesh.visible = false;
        console.log(`🌱 LOD: Culled ${regionKey} at distance ${distanceToPlayer.toFixed(1)}`);
        return true;
      }
      return false;
    }
    
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

    // Ensure mesh is visible for distances within culling range
    if (!instancedMesh.visible && distanceToPlayer <= this.CULLING_DISTANCE) {
      instancedMesh.visible = true;
    }

    // Check if significant change in distance or LOD level
    const distanceChange = Math.abs(lodInfo.distanceFromPlayer - distanceToPlayer);
    const lodChange = Math.abs(lodInfo.lastLODLevel - targetLODDensity);
    
    if (distanceChange < this.POSITION_UPDATE_THRESHOLD && lodChange < this.DENSITY_UPDATE_THRESHOLD) {
      return false; // No significant change
    }

    // Calculate new visible instance count
    const targetVisibleCount = Math.max(0, Math.floor(lodInfo.originalInstanceCount * targetLODDensity));
    
    if (targetVisibleCount !== lodInfo.currentVisibleCount) {
      this.updateInstanceCount(instancedMesh, lodInfo, targetVisibleCount);
      lodInfo.currentVisibleCount = targetVisibleCount;
      lodInfo.lastLODLevel = targetLODDensity;
      lodInfo.distanceFromPlayer = distanceToPlayer;
      
      if (targetVisibleCount === 0) {
        instancedMesh.visible = false;
      }
      
      console.log(`🌱 LOD: Updated ${regionKey} instances: ${targetVisibleCount}/${lodInfo.originalInstanceCount} (${targetLODDensity.toFixed(2)}) at ${distanceToPlayer.toFixed(1)}u`);
      return true;
    }

    return false;
  }

  private updateInstanceCount(
    instancedMesh: THREE.InstancedMesh,
    lodInfo: InstanceLODInfo,
    targetCount: number
  ): void {
    if (targetCount === 0) {
      instancedMesh.count = 0;
      instancedMesh.instanceMatrix.needsUpdate = true;
      return;
    }

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

  public getTotalManagedInstances(): number {
    let total = 0;
    for (const lodInfo of this.regionInstanceData.values()) {
      total += lodInfo.currentVisibleCount;
    }
    return total;
  }

  public getPerformanceMetrics(): { totalRegions: number; totalInstances: number; culledRegions: number } {
    let totalInstances = 0;
    let culledRegions = 0;
    
    for (const lodInfo of this.regionInstanceData.values()) {
      totalInstances += lodInfo.currentVisibleCount;
      if (lodInfo.currentVisibleCount === 0) {
        culledRegions++;
      }
    }
    
    return {
      totalRegions: this.regionInstanceData.size,
      totalInstances,
      culledRegions
    };
  }
}
