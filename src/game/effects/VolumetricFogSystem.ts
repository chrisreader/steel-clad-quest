
import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private fogColor: THREE.Color = new THREE.Color(0x87CEEB);
  private fogDensity: number = 0.002;
  private nearDistance: number = 5;
  private farDistance: number = 100;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  public initialize(): void {
    this.scene.fog = new THREE.FogExp2(this.fogColor, this.fogDensity);
    console.log("🌫️ [VolumetricFogSystem] Initialized");
  }

  public setColor(color: THREE.Color): void {
    this.fogColor = color;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = color;
    }
  }

  public setDensity(density: number): void {
    this.fogDensity = density;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = density;
    }
  }

  public setDistance(near: number, far: number): void {
    this.nearDistance = near;
    this.farDistance = far;
  }

  public update(deltaTime: number): void {
    // Update fog properties if needed
  }

  public dispose(): void {
    this.scene.fog = null;
    console.log("🌫️ [VolumetricFogSystem] Disposed");
  }
}
