
import * as THREE from 'three';

export interface LODLevel {
  distance: number;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  visible: boolean;
}

export class LODManager {
  private lodObjects = new Map<string, {
    object: THREE.Object3D;
    levels: LODLevel[];
    originalGeometry: THREE.BufferGeometry;
    originalMaterial: THREE.Material;
  }>();

  private camera: THREE.Camera | null = null;

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public addLODObject(
    id: string, 
    object: THREE.Object3D, 
    levels: LODLevel[]
  ): void {
    const mesh = object as THREE.Mesh;
    this.lodObjects.set(id, {
      object,
      levels,
      originalGeometry: mesh.geometry,
      originalMaterial: mesh.material as THREE.Material
    });
  }

  public updateLOD(): void {
    if (!this.camera) return;

    for (const [id, lodData] of this.lodObjects.entries()) {
      const distance = this.camera.position.distanceTo(lodData.object.position);
      const mesh = lodData.object as THREE.Mesh;

      // Find appropriate LOD level
      let selectedLevel = lodData.levels[0];
      for (const level of lodData.levels) {
        if (distance >= level.distance) {
          selectedLevel = level;
        } else {
          break;
        }
      }

      // Apply LOD level
      if (selectedLevel.geometry && mesh.geometry !== selectedLevel.geometry) {
        mesh.geometry = selectedLevel.geometry;
      }

      if (selectedLevel.material && mesh.material !== selectedLevel.material) {
        mesh.material = selectedLevel.material;
      }

      mesh.visible = selectedLevel.visible;
    }
  }

  public removeLODObject(id: string): void {
    this.lodObjects.delete(id);
  }

  public clear(): void {
    this.lodObjects.clear();
  }
}
