import * as THREE from 'three';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer';

export class OptimizedRenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private mountElement: HTMLDivElement;
  
  // Camera controls with smoothing
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private targetRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private mouseSensitivity: number = 0.003;
  private maxPitch: number = Math.PI / 2 - 0.1;
  private smoothingFactor: number = 0.15;
  
  // Mouse smoothing
  private smoothedMouseDelta: { x: number; y: number } = { x: 0, y: 0 };
  
  // FIXED: Consistent camera height
  private readonly CAMERA_HEIGHT_OFFSET: number = 1.6;
  
  // Optimized performance tracking
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private lastCullingUpdate: number = 0;
  private readonly CULLING_UPDATE_INTERVAL: number = 100;
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    this.clock = new THREE.Clock();
  }
  
  public initialize(): void {
    console.log("🎨 [OptimizedRenderEngine] Initializing with enhanced performance optimizations...");
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = null;
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.mountElement.clientWidth / this.mountElement.clientHeight,
      0.1,
      1000
    );
    
    // Set up camera layers
    this.camera.layers.enable(0);
    this.camera.layers.disable(1);
    
    // Create renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance" // Request high-performance GPU
    });
    this.renderer.setSize(this.mountElement.clientWidth, this.mountElement.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Performance optimizations
    this.renderer.info.autoReset = false; // Manually reset for better control
    
    // Attach to DOM
    this.mountElement.appendChild(this.renderer.domElement);
    
    // Setup canvas properties
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.outline = 'none';
    
    console.log("🎨 [OptimizedRenderEngine] Initialized successfully");
  }
  
  public setupFirstPersonCamera(playerPosition: THREE.Vector3): void {
    this.camera.position.set(
      playerPosition.x, 
      playerPosition.y + this.CAMERA_HEIGHT_OFFSET,
      playerPosition.z
    );
    this.cameraRotation.pitch = 0;
    this.cameraRotation.yaw = 0;
    this.targetRotation.pitch = 0;
    this.targetRotation.yaw = 0;
    this.updateCameraRotation();
  }
  
  public handleMouseLook(deltaX: number, deltaY: number): void {
    this.smoothedMouseDelta.x = this.smoothedMouseDelta.x * (1 - this.smoothingFactor) + deltaX * this.smoothingFactor;
    this.smoothedMouseDelta.y = this.smoothedMouseDelta.y * (1 - this.smoothingFactor) + deltaY * this.smoothingFactor;
    
    this.targetRotation.yaw -= this.smoothedMouseDelta.x * this.mouseSensitivity;
    this.targetRotation.pitch -= this.smoothedMouseDelta.y * this.mouseSensitivity;
    this.targetRotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.targetRotation.pitch));
    
    const lerpFactor = 0.2;
    this.cameraRotation.yaw = THREE.MathUtils.lerp(this.cameraRotation.yaw, this.targetRotation.yaw, lerpFactor);
    this.cameraRotation.pitch = THREE.MathUtils.lerp(this.cameraRotation.pitch, this.targetRotation.pitch, lerpFactor);
    
    this.updateCameraRotation();
  }
  
  private updateCameraRotation(): void {
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotation.pitch);
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.yaw);
    const finalQuaternion = new THREE.Quaternion().multiplyQuaternions(yawQuaternion, pitchQuaternion);
    
    this.camera.quaternion.copy(finalQuaternion);
  }
  
  public updateFirstPersonCamera(playerPosition: THREE.Vector3): void {
    this.camera.position.set(
      playerPosition.x, 
      playerPosition.y + this.CAMERA_HEIGHT_OFFSET,
      playerPosition.z
    );
  }
  
  private updateFrustumCulling(): void {
    const now = performance.now();
    if (now - this.lastCullingUpdate < this.CULLING_UPDATE_INTERVAL) return;
    
    this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    this.lastCullingUpdate = now;
  }
  
  private isObjectInFrustum(object: THREE.Object3D): boolean {
    // Enhanced frustum culling with InstancedMesh support
    if (object instanceof THREE.InstancedMesh) {
      // Use bounding box for InstancedMesh culling
      if (object.geometry && object.geometry.boundingBox) {
        const worldBoundingBox = object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
        return this.frustum.intersectsBox(worldBoundingBox);
      }
      return true; // Default to visible if no bounding info
    }
    
    if (object instanceof THREE.Mesh && object.geometry) {
      const sphere = object.geometry.boundingSphere;
      if (sphere) {
        const worldSphere = sphere.clone().applyMatrix4(object.matrixWorld);
        return this.frustum.intersectsSphere(worldSphere);
      }
    }
    
    return true;
  }
  
  public render(): void {
    this.renderCount++;
    PerformanceOptimizer.updateFrameCount();
    
    // Update frustum culling less frequently for performance
    this.updateFrustumCulling();
    
    // Apply optimized frustum culling
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group || object instanceof THREE.InstancedMesh) {
        object.visible = this.isObjectInFrustum(object);
      }
    });
    
    // Optimized performance logging
    if (PerformanceOptimizer.shouldLogPerformance()) {
      const now = performance.now();
      const fps = 600 / ((now - this.lastRenderTime) / 1000);
      console.log("🎨 [OptimizedRenderEngine] Performance:", {
        frame: this.renderCount,
        fps: fps.toFixed(1),
        objects: this.scene.children.length,
        mode: PerformanceOptimizer.getPerformanceMode()
      });
      this.lastRenderTime = now;
    }
    
    // Reset renderer info less frequently
    if (this.renderCount % 300 === 0) {
      this.renderer.info.reset();
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
    console.log("🎨 [OptimizedRenderEngine] Disposing...");
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    
    console.log("🎨 [OptimizedRenderEngine] Disposed successfully");
  }
}
