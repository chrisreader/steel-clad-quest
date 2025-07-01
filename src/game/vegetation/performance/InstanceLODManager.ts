
import * as THREE from 'three';

export interface InstanceLODInfo {
  originalInstanceCount: number;
  currentVisibleCount: number;
  lastLODLevel: number;
  instanceMatrices: THREE.Matrix4[];
  distanceFromPlayer: number;
  lastUpdateTime: number;
}

export class InstanceLODManager {
  private regionInstanceData: Map<string, InstanceLODInfo> = new Map();
  // ENHANCED: More aggressive LOD distances
  private lodDistances: number[] = [25, 50, 100, 150]; // Tighter distances
  private readonly DENSITY_UPDATE_THRESHOLD = 0.08; // Lower for smoother transitions
  private readonly POSITION_UPDATE_THRESHOLD = 2; // More responsive
  private readonly CULLING_DISTANCE = 180; // Reduced from 200
  private readonly UPDATE_THROTTLE = 50; // ms between updates per region

  public calculateInstanceLODDensity(distance: number): number {
    if (distance >= this.CULLING_DISTANCE) return 0.0;
    if (distance < this.lodDistances[0]) return 1.0;
    if (distance < this.lodDistances[1]) return 0.6; // More aggressive
    if (distance < this.lodDistances[2]) return 0.3; // Even more aggressive
    if (distance < this.lodDistances[3]) return 0.1; // Very sparse
    return 0.0;
  }

  public updateInstanceVisibility(
    instancedMesh: THREE.InstancedMesh,
    regionKey: string,
    playerPosition: THREE.Vector3
  ): boolean {
    const regionCenter = instancedMesh.userData.centerPosition as THREE.Vector3;
    if (!regionCenter) return false;

    const distanceToPlayer = playerPosition.distanceTo(regionCenter);
    
    // Immediate culling for very distant regions
    if (distanceToPlayer > this.CULLING_DISTANCE) {
      if (instancedMesh.visible) {
        instancedMesh.visible = false;
        return true;
      }
      return false;
    }
    
    const now = performance.now();
    let lodInfo = this.regionInstanceData.get(regionKey);
    
    // Initialize LOD info if not exists
    if (!lodInfo) {
      const originalCount = instancedMesh.count;
      const matrices: THREE.Matrix4[] = [];
      
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
        distanceFromPlayer: distanceToPlayer,
        lastUpdateTime: now
      };
      
      this.regionInstanceData.set(regionKey, lodInfo);
    }

    // Throttle updates per region
    if (now - lodInfo.lastUpdateTime < this.UPDATE_THROTTLE) {
      return false;
    }

    const targetLODDensity = this.calculateInstanceLODDensity(distanceToPlayer);
    
    // Ensure mesh is visible for distances within culling range
    if (!instancedMesh.visible && distanceToPlayer <= this.CULLING_DISTANCE) {
      instancedMesh.visible = true;
    }

    // Check for significant changes
    const distanceChange = Math.abs(lodInfo.distanceFromPlayer - distanceToPlayer);
    const lodChange = Math.abs(lodInfo.lastLODLevel - targetLODDensity);
    
    if (distanceChange < this.POSITION_UPDATE_THRESHOLD && lodChange < this.DENSITY_UPDATE_THRESHOLD) {
      return false;
    }

    // Calculate new visible instance count with more aggressive reduction
    const targetVisibleCount = Math.max(0, Math.floor(lodInfo.originalInstanceCount * targetLODDensity));
    
    if (targetVisibleCount !== lodInfo.currentVisibleCount) {
      this.updateInstanceCountOptimized(instancedMesh, lodInfo, targetVisibleCount);
      lodInfo.currentVisibleCount = targetVisibleCount;
      lodInfo.lastLODLevel = targetLODDensity;
      lodInfo.distanceFromPlayer = distanceToPlayer;
      lodInfo.lastUpdateTime = now;
      
      if (targetVisibleCount === 0) {
        instancedMesh.visible = false;
      }
      
      return true;
    }

    return false;
  }

  private updateInstanceCountOptimized(
    instancedMesh: THREE.InstancedMesh,
    lodInfo: InstanceLODInfo,
    targetCount: number
  ): void {
    if (targetCount === 0) {
      instancedMesh.count = 0;
      instancedMesh.instanceMatrix.needsUpdate = true;
      return;
    }

    // ENHANCED: Smarter instance selection based on distance and importance
    const playerPos = instancedMesh.userData.lastPlayerPosition as THREE.Vector3;
    
    if (playerPos) {
      // Calculate distances and importance scores
      const instanceData = lodInfo.instanceMatrices.map((matrix, index) => {
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(matrix);
        const distance = position.distanceTo(playerPos);
        
        // Add some randomness to avoid patterns
        const randomFactor = Math.sin(index * 0.1) * 0.1;
        const importanceScore = 1 / (distance + 1) + randomFactor;
        
        return { index, distance, matrix, importance: importanceScore };
      });

      // Sort by importance (closer + randomness = higher importance)
      instanceData.sort((a, b) => b.importance - a.importance);
      const selectedInstances = instanceData.slice(0, targetCount);

      // Update the instanced mesh
      instancedMesh.count = targetCount;
      
      for (let i = 0; i < targetCount; i++) {
        instancedMesh.setMatrixAt(i, selectedInstances[i].matrix);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
    } else {
      // Fallback: use first N instances
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

  public getPerformanceMetrics(): { 
    totalRegions: number; 
    totalInstances: number; 
    culledRegions: number;
    averageLOD: number;
  } {
    let totalInstances = 0;
    let culledRegions = 0;
    let totalLOD = 0;
    let regionCount = 0;
    
    for (const lodInfo of this.regionInstanceData.values()) {
      totalInstances += lodInfo.currentVisibleCount;
      if (lodInfo.currentVisibleCount === 0) {
        culledRegions++;
      }
      totalLOD += lodInfo.lastLODLevel;
      regionCount++;
    }
    
    return {
      totalRegions: this.regionInstanceData.size,
      totalInstances,
      culledRegions,
      averageLOD: regionCount > 0 ? totalLOD / regionCount : 0
    };
  }
}
