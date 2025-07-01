
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
  // ULTRA AGGRESSIVE: Much shorter distances and more aggressive culling
  private lodDistances: number[] = [15, 30, 60, 80]; // Drastically reduced
  private readonly DENSITY_UPDATE_THRESHOLD = 0.15; // Higher threshold = less frequent updates
  private readonly POSITION_UPDATE_THRESHOLD = 5; // Less responsive but more performant
  private readonly CULLING_DISTANCE = 100; // Much shorter culling distance
  private readonly UPDATE_THROTTLE = 150; // Much longer throttle

  public calculateInstanceLODDensity(distance: number): number {
    if (distance >= this.CULLING_DISTANCE) return 0.0;
    if (distance < this.lodDistances[0]) return 1.0;
    if (distance < this.lodDistances[1]) return 0.4; // Much more aggressive
    if (distance < this.lodDistances[2]) return 0.15; // Very aggressive
    if (distance < this.lodDistances[3]) return 0.05; // Extremely sparse
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
    
    // Immediate culling for distant regions
    if (distanceToPlayer > this.CULLING_DISTANCE) {
      if (instancedMesh.visible) {
        instancedMesh.visible = false;
        instancedMesh.count = 0;
        return true;
      }
      return false;
    }
    
    const now = performance.now();
    let lodInfo = this.regionInstanceData.get(regionKey);
    
    // Initialize LOD info if not exists
    if (!lodInfo) {
      const originalCount = Math.min(instancedMesh.count, 50); // Cap at 50 instances max
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

    // Much more aggressive throttling
    if (now - lodInfo.lastUpdateTime < this.UPDATE_THROTTLE) {
      return false;
    }

    const targetLODDensity = this.calculateInstanceLODDensity(distanceToPlayer);
    
    // Ensure mesh is visible for distances within culling range
    if (!instancedMesh.visible && distanceToPlayer <= this.CULLING_DISTANCE) {
      instancedMesh.visible = true;
    }

    // Check for significant changes with higher thresholds
    const distanceChange = Math.abs(lodInfo.distanceFromPlayer - distanceToPlayer);
    const lodChange = Math.abs(lodInfo.lastLODLevel - targetLODDensity);
    
    if (distanceChange < this.POSITION_UPDATE_THRESHOLD && lodChange < this.DENSITY_UPDATE_THRESHOLD) {
      return false;
    }

    // Calculate new visible instance count with extreme reduction
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

    // Simple selection - just use first N instances for performance
    instancedMesh.count = targetCount;
    instancedMesh.instanceMatrix.needsUpdate = true;
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
