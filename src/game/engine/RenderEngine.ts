
import * as THREE from 'three';
import { PredictiveLoader } from '../utils/PredictiveLoader';
import { PerformanceCache } from '../utils/PerformanceCache';
import { AdaptivePerformanceManager } from '../utils/AdaptivePerformanceManager';

export class RenderEngine {
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
  private mouseVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private smoothedMouseDelta: { x: number; y: number } = { x: 0, y: 0 };
  
  // FIXED: Consistent camera height
  private readonly CAMERA_HEIGHT_OFFSET: number = 1.6; // Standard eye height
  
  // Performance optimizations
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private lastCullingUpdate: number = 0;
  private readonly CULLING_UPDATE_INTERVAL: number = 100; // More reasonable culling interval
  
  // Advanced performance systems
  private predictiveLoader: PredictiveLoader | null = null;
  private performanceManager: AdaptivePerformanceManager = new AdaptivePerformanceManager();
  private preWarmObjects: Set<THREE.Object3D> = new Set();
  private hysteresisMargin: number = 5; // Units of hysteresis for object visibility
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    this.clock = new THREE.Clock();
  }
  
  public initialize(): void {
    console.log("🎨 [RenderEngine] Initializing with performance optimizations...");
    
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
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.mountElement.clientWidth, this.mountElement.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Attach to DOM
    this.mountElement.appendChild(this.renderer.domElement);
    
    // Setup canvas properties
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.outline = 'none';
    
    // Initialize predictive loader
    this.predictiveLoader = new PredictiveLoader(this.camera, this.scene);
    
    console.log("🎨 [RenderEngine] Initialized with performance optimizations");
  }
  
  public setupFirstPersonCamera(playerPosition: THREE.Vector3): void {
    // Position camera at consistent eye level
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
    
    console.log("📹 [RenderEngine] First-person camera positioned with consistent height offset:", this.camera.position);
  }
  
  public handleMouseLook(deltaX: number, deltaY: number): void {
    // Apply mouse smoothing using exponential moving average
    this.smoothedMouseDelta.x = this.smoothedMouseDelta.x * (1 - this.smoothingFactor) + deltaX * this.smoothingFactor;
    this.smoothedMouseDelta.y = this.smoothedMouseDelta.y * (1 - this.smoothingFactor) + deltaY * this.smoothingFactor;
    
    // Update target rotation with smoothed input
    this.targetRotation.yaw -= this.smoothedMouseDelta.x * this.mouseSensitivity;
    this.targetRotation.pitch -= this.smoothedMouseDelta.y * this.mouseSensitivity;
    this.targetRotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.targetRotation.pitch));
    
    // Interpolate towards target rotation for ultra-smooth movement
    const lerpFactor = 0.2; // Adjust for responsiveness vs smoothness
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
    // Keep camera positioned at consistent eye level relative to player
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
    // Skip frustum culling for InstancedMesh (like grass) to avoid complexity
    if (object instanceof THREE.InstancedMesh) return true;
    
    // Hierarchical culling - check parent objects first for performance
    if (object.parent && object.parent !== this.scene && !this.isObjectInFrustum(object.parent)) {
      return false;
    }
    
    // Pre-warm objects - keep objects just outside frustum loaded
    const distance = PerformanceCache.getCachedDistance(this.camera.position, object.position);
    if (this.preWarmObjects.has(object) && distance < 250) {
      return true; // Keep pre-warmed objects visible longer
    }
    
    // Fast bounding sphere pre-check before expensive frustum test
    if (object instanceof THREE.Mesh && object.geometry) {
      const sphere = object.geometry.boundingSphere;
      if (sphere) {
        // Adaptive distance culling based on performance
        const maxDistance = this.performanceManager.getGrassRenderDistance() * 2;
        if (distance > maxDistance) return false;
        
        const worldSphere = sphere.clone().applyMatrix4(object.matrixWorld);
        const inFrustum = this.frustum.intersectsSphere(worldSphere);
        
        // Add hysteresis to prevent flickering
        if (inFrustum || distance < this.hysteresisMargin) {
          this.preWarmObjects.add(object);
          return true;
        } else if (distance > this.hysteresisMargin * 2) {
          this.preWarmObjects.delete(object);
          return false;
        }
        
        return object.visible; // Maintain current state in hysteresis zone
      }
    }
    
    return true; // Default to visible if no bounding info or not a mesh
  }
  
  public render(): void {
    this.renderCount++;
    const deltaTime = this.getDeltaTime();
    
    // Update performance management
    this.performanceManager.update();
    
    // Update predictive loader for object pre-loading
    if (this.predictiveLoader) {
      this.predictiveLoader.update(deltaTime);
    }
    
    // Update frustum culling with ultra-responsive timing
    this.updateFrustumCulling();
    
    // Apply optimized frustum culling to scene objects
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        object.visible = this.isObjectInFrustum(object);
      }
    });
    
    // Performance-responsive logging (every 900 frames for smooth performance)
    if (this.renderCount % 900 === 0) {
      const avgFPS = this.performanceManager.getAverageFPS();
      console.log("🎨 [RenderEngine] Advanced Performance:", {
        frame: this.renderCount,
        avgFPS: avgFPS.toFixed(1),
        quality: this.performanceManager.getQualityLevel().toFixed(2),
        preWarmObjects: this.preWarmObjects.size,
        grassDistance: this.performanceManager.getGrassRenderDistance()
      });
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
  
  public getPerformanceManager(): AdaptivePerformanceManager {
    return this.performanceManager;
  }

  public dispose(): void {
    console.log("🎨 [RenderEngine] Disposing...");
    
    if (this.predictiveLoader) {
      this.predictiveLoader.dispose();
    }
    
    PerformanceCache.clearAll();
    this.preWarmObjects.clear();
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    
    console.log("🎨 [RenderEngine] Disposed successfully");
  }
}
