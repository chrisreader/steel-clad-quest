
import * as THREE from 'three';

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private mountElement: HTMLDivElement;
  
  // Camera controls
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private mouseSensitivity: number = 0.002;
  private maxPitch: number = Math.PI / 2 - 0.1;
  
  // Debug state
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    this.clock = new THREE.Clock();
  }
  
  public initialize(): void {
    console.log("🎨 [RenderEngine] Initializing...");
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.mountElement.clientWidth / this.mountElement.clientHeight,
      0.1,
      1000
    );
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.mountElement.clientWidth, this.mountElement.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Attach to DOM
    this.mountElement.appendChild(this.renderer.domElement);
    
    // Setup canvas properties
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.outline = 'none';
    
    console.log("🎨 [RenderEngine] Initialized successfully");
  }
  
  public setupFirstPersonCamera(playerPosition: THREE.Vector3): void {
    this.camera.position.set(playerPosition.x, playerPosition.y + 1.7, playerPosition.z);
    this.cameraRotation.pitch = 0;
    this.cameraRotation.yaw = 0;
    this.updateCameraRotation();
    
    console.log("🎨 [RenderEngine] First-person camera setup completed");
  }
  
  public handleMouseLook(deltaX: number, deltaY: number): void {
    this.cameraRotation.yaw -= deltaX * this.mouseSensitivity;
    this.cameraRotation.pitch -= deltaY * this.mouseSensitivity;
    this.cameraRotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.cameraRotation.pitch));
    
    this.updateCameraRotation();
  }
  
  private updateCameraRotation(): void {
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotation.pitch);
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.yaw);
    const finalQuaternion = new THREE.Quaternion().multiplyQuaternions(yawQuaternion, pitchQuaternion);
    
    this.camera.quaternion.copy(finalQuaternion);
  }
  
  public updateFirstPersonCamera(playerPosition: THREE.Vector3): void {
    this.camera.position.set(playerPosition.x, playerPosition.y + 1.7, playerPosition.z);
  }
  
  public render(): void {
    this.renderCount++;
    const now = performance.now();
    
    // Log every 60 frames (roughly 1 second)
    if (this.renderCount % 60 === 0) {
      const fps = this.renderCount / ((now - this.lastRenderTime) / 1000) * 60;
      console.log("🎨 [RenderEngine] Rendering:", {
        frame: this.renderCount,
        fps: fps.toFixed(1),
        cameraPos: this.camera.position,
        sceneChildren: this.scene.children.length
      });
      this.lastRenderTime = now;
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  public getDeltaTime(): number {
    return Math.min(this.clock.getDelta(), 0.1);
  }
  
  public getCameraRotation(): { pitch: number; yaw: number } {
    return { ...this.cameraRotation };
  }
  
  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }
  
  // Getters
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public dispose(): void {
    console.log("🎨 [RenderEngine] Disposing...");
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    
    console.log("🎨 [RenderEngine] Disposed successfully");
  }
}
