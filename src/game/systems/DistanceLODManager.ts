import * as THREE from 'three';

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
  
  // Performance thresholds
  private readonly NEAR_DISTANCE = 50;
  private readonly MEDIUM_DISTANCE = 100;
  private readonly FAR_DISTANCE = 200;
  private readonly CULL_DISTANCE = 300;

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

  public update(): void {
    for (const [id, lodObject] of this.objects.entries()) {
      const distance = this.playerPosition.distanceTo(lodObject.position);
      lodObject.lastDistance = distance;

      // Culling - completely disable very distant objects
      if (distance > this.CULL_DISTANCE) {
        if (lodObject.isActive) {
          lodObject.object.visible = false;
          lodObject.isActive = false;
          console.log(`🔍 [LOD] Culled object ${id} at distance ${distance.toFixed(1)}`);
        }
        continue;
      }

      // Re-enable objects coming back into range
      if (!lodObject.isActive && distance <= this.CULL_DISTANCE) {
        lodObject.object.visible = true;
        lodObject.isActive = true;
        console.log(`🔍 [LOD] Re-enabled object ${id} at distance ${distance.toFixed(1)}`);
      }

      // Call custom update function with distance for LOD logic
      if (lodObject.updateFunction && lodObject.isActive) {
        lodObject.updateFunction(distance);
      }
    }
  }

  public getDistanceCategory(distance: number): 'near' | 'medium' | 'far' | 'culled' {
    if (distance > this.CULL_DISTANCE) return 'culled';
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