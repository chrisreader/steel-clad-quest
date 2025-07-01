
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
  // IMPROVED: Increased distances to reduce pop-in
  private lodDistances: number[] = [40, 80, 130, 180]; // Increased from [25, 50, 90, 120]
  private readonly DENSITY_UPDATE_THRESHOLD = 0.08; // Reduced for better responsiveness
  private readonly POSITION_UPDATE_THRESHOLD = 2; // Reduced for better responsiveness
  private readonly CULLING_DISTANCE = 200; // Increased from 140
  private readonly UPDATE_THROTTLE = 50; // Reduced from 100 for better responsiveness

  public calculateInstanceLODDensity(distance: number): number {
    if (distance >= this.CULLING_DISTANCE) return 0.0;
    if (distance < this.lodDistances[0]) return 1.0;
    if (distance < this.lodDistances[1]) return 0.7; // Improved from 0.6
    if (distance < this.lodDistances[2]) return 0.4; // Improved from 0.3
    if (distance < this.lodDistances[3]) return 0.15; // Improved from 0.1
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
      const originalCount = Math.min(instancedMesh.count, 100); // Increased from 80 for better quality
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

    // More responsive throttling
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

    // Calculate new visible instance count
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
