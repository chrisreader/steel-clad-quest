
import * as THREE from 'three';

export class FrustumCuller {
  private frustum = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();

  public updateFrustum(camera: THREE.Camera): void {
    this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  public isObjectVisible(object: THREE.Object3D): boolean {
    // Update world matrix if needed
    if (object.matrixWorldNeedsUpdate) {
      object.updateMatrixWorld();
    }

    // Get bounding sphere for frustum test
    const geometry = (object as THREE.Mesh).geometry;
    if (!geometry) return true; // Assume visible if no geometry

    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere();
    }

    if (!geometry.boundingSphere) return true;

    // Transform bounding sphere to world space
    const sphere = geometry.boundingSphere.clone();
    sphere.applyMatrix4(object.matrixWorld);

    return this.frustum.intersectsSphere(sphere);
  }

  public cullObjects(objects: THREE.Object3D[]): { visible: THREE.Object3D[]; culled: THREE.Object3D[] } {
    const visible: THREE.Object3D[] = [];
    const culled: THREE.Object3D[] = [];

    for (const object of objects) {
      if (this.isObjectVisible(object)) {
        visible.push(object);
        object.visible = true;
      } else {
        culled.push(object);
        object.visible = false;
      }
    }

    return { visible, culled };
  }
}
