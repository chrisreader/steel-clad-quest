import * as THREE from 'three';

export class PredictiveLoader {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private preloadedObjects = new Map<string, { object: THREE.Object3D; timestamp: number }>();
  private readonly PRELOAD_DISTANCE = 30; // units ahead of camera
  private readonly PRELOAD_ANGLE = Math.PI / 3; // 60 degrees
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private lastCameraDirection = new THREE.Vector3();
  private frustumCache = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  public update(deltaTime: number): void {
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    // Only update if camera direction changed significantly
    if (this.lastCameraDirection.distanceTo(cameraDirection) < 0.1) return;
    
    this.lastCameraDirection.copy(cameraDirection);
    
    // Update frustum for predictive checks
    this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustumCache.setFromProjectionMatrix(this.cameraMatrix);
    
    this.preloadObjectsInDirection(cameraDirection);
    this.cleanupExpiredObjects();
  }

  private preloadObjectsInDirection(direction: THREE.Vector3): void {
    const cameraPosition = this.camera.position;
    const predictedPosition = cameraPosition.clone().add(direction.clone().multiplyScalar(this.PRELOAD_DISTANCE));
    
    // Find objects that will likely be visible soon
    this.scene.traverse((object) => {
      if (this.shouldPreload(object, cameraPosition, direction, predictedPosition)) {
        const key = this.getObjectKey(object);
        this.preloadedObjects.set(key, {
          object,
          timestamp: performance.now()
        });
        
        // Ensure object is loaded/visible
        if (!object.visible && this.isInPreloadCone(object.position, cameraPosition, direction)) {
          object.visible = true;
        }
      }
    });
  }

  private shouldPreload(
    object: THREE.Object3D,
    cameraPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    predictedPos: THREE.Vector3
  ): boolean {
    // Skip UI objects and already visible close objects
    if (object.userData.isUI || object.position.distanceTo(cameraPos) < 20) return false;
    
    // Check if object is in the predicted direction
    return this.isInPreloadCone(object.position, cameraPos, cameraDir) ||
           object.position.distanceTo(predictedPos) < 40;
  }

  private isInPreloadCone(objectPos: THREE.Vector3, cameraPos: THREE.Vector3, cameraDir: THREE.Vector3): boolean {
    const toObject = objectPos.clone().sub(cameraPos).normalize();
    const angle = toObject.dot(cameraDir);
    return angle > Math.cos(this.PRELOAD_ANGLE / 2);
  }

  private cleanupExpiredObjects(): void {
    const now = performance.now();
    for (const [key, data] of this.preloadedObjects.entries()) {
      if (now - data.timestamp > this.CACHE_DURATION) {
        this.preloadedObjects.delete(key);
      }
    }
  }

  private getObjectKey(object: THREE.Object3D): string {
    return `${object.uuid}_${object.position.x.toFixed(1)}_${object.position.z.toFixed(1)}`;
  }

  public dispose(): void {
    this.preloadedObjects.clear();
  }
}