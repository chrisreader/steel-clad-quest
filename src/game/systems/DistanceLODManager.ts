import * as THREE from 'three';
import { RENDER_DISTANCES, getMasterCullDistance } from '../config/RenderDistanceConfig';

export interface LODObject {
  object: THREE.Object3D;
  position: THREE.Vector3;
  updateFunction?: (distance: number) => void;
  disposeFunction?: () => void;
  isActive: boolean;
  lastDistance: number;
}

export class DistanceLODManager {
  private objects: Map<string, LODObject> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  
  // UNIFIED DISTANCES - No more hardcoded values, use centralized config
  private readonly NEAR_DISTANCE = RENDER_DISTANCES.LOD_NEAR;
  private readonly MEDIUM_DISTANCE = RENDER_DISTANCES.LOD_MEDIUM;
  private readonly FAR_DISTANCE = RENDER_DISTANCES.LOD_FAR;
  private readonly CULL_DISTANCE = RENDER_DISTANCES.MASTER_CULL_DISTANCE; // UNIFIED with all other systems

  public addLODObject(
    id: string, 
    object: THREE.Object3D, 
    position: THREE.Vector3,
    updateFunction?: (distance: number) => void,
    disposeFunction?: () => void
  ): void {
    this.objects.set(id, {
      object,
      position: position.clone(),
      updateFunction,
      disposeFunction,
      isActive: true,
      lastDistance: 0
    });
  }

  public removeLODObject(id: string): void {
    const lodObject = this.objects.get(id);
    if (lodObject && lodObject.disposeFunction) {
      lodObject.disposeFunction();
    }
    this.objects.delete(id);
  }

  public updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
  }

  public update(currentRingIndex: number = 0): void {
    // ADAPTIVE CULLING DISTANCE based on current ring
    const adaptiveCullDistance = getMasterCullDistance(currentRingIndex);
    
    for (const [id, lodObject] of this.objects.entries()) {
      const distance = this.playerPosition.distanceTo(lodObject.position);
      lodObject.lastDistance = distance;

      // CONSERVATIVE CULLING - use adaptive distance
      if (distance > adaptiveCullDistance) {
        if (lodObject.isActive) {
          lodObject.object.visible = false;
          lodObject.isActive = false;
          console.log(`🔍 [LOD] Culled object ${id} at distance ${distance.toFixed(1)} (limit: ${adaptiveCullDistance})`);
        }
        continue;
      }

      // Re-enable objects coming back into range
      if (!lodObject.isActive && distance <= adaptiveCullDistance) {
        lodObject.object.visible = true;
        lodObject.isActive = true;
        console.log(`🔍 [LOD] Re-enabled object ${id} at distance ${distance.toFixed(1)} (limit: ${adaptiveCullDistance})`);
      }

      // Call custom update function with distance for LOD logic
      if (lodObject.updateFunction && lodObject.isActive) {
        lodObject.updateFunction(distance);
      }
    }
  }

  public getDistanceCategory(distance: number, ringIndex: number = 0): 'near' | 'medium' | 'far' | 'culled' {
    const adaptiveCullDistance = getMasterCullDistance(ringIndex);
    if (distance > adaptiveCullDistance) return 'culled';
    if (distance > this.FAR_DISTANCE) return 'far';
    if (distance > this.MEDIUM_DISTANCE) return 'medium';
    return 'near';
  }

  public getActiveObjectCount(): number {
    return Array.from(this.objects.values()).filter(obj => obj.isActive).length;
  }

  public dispose(): void {
    for (const [id, lodObject] of this.objects.entries()) {
      if (lodObject.disposeFunction) {
        lodObject.disposeFunction();
      }
    }
    this.objects.clear();
    console.log('🔍 [LOD] DistanceLODManager disposed');
  }
}