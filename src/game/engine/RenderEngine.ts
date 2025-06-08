import * as THREE from 'three';
import { PerformanceMonitor } from '../utils/performance/PerformanceMonitor';
import { MemoryManager } from '../utils/performance/MemoryManager';

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private mountElement: HTMLDivElement;
  
  // Performance systems
  private performanceMonitor: PerformanceMonitor;
  private memoryManager: MemoryManager;
  
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
  
  // Enhanced performance optimizations
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private lastCullingUpdate: number = 0;
  private readonly CULLING_UPDATE_INTERVAL: number = 50; // Update culling every 50ms for better performance
  
  // Frame rate adaptive rendering
  private targetFPS: number = 60;
  private frameSkipThreshold: number = 30;
  private shouldSkipFrame: boolean = false;
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    this.clock = new THREE.Clock();
    this.performanceMonitor = new PerformanceMonitor();
    this.memoryManager = new MemoryManager();
    
    // Setup performance monitoring
    this.performanceMonitor.onUpdate((fps, frameTime) => {
      this.shouldSkipFrame = fps < this.frameSkipThreshold;
      if (this.renderCount % 300 === 0) {
        console.log(`🎨 [RenderEngine] Performance: ${fps.toFixed(1)} FPS, ${frameTime.toFixed(2)}ms frame time`);
        console.log(`🧠 [MemoryManager] Stats:`, this.memoryManager.getStats());
      }
    });
  }
  
  public initialize(): void {
    console.log("🎨 [RenderEngine] Initializing with enhanced performance optimizations...");
    
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
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    });
    
    this.renderer.setSize(this.mountElement.clientWidth, this.mountElement.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Performance optimizations
    this.renderer.info.autoReset = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    
    // Attach to DOM
    this.mountElement.appendChild(this.renderer.domElement);
    
    // Setup canvas properties
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.outline = 'none';
    
    console.log("🎨 [RenderEngine] Enhanced performance optimizations initialized");
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
    // Enhanced frustum culling with distance-based optimizations
    if (object instanceof THREE.InstancedMesh) {
      // For instanced meshes like grass, use simpler distance-based culling
      const distance = object.position.distanceTo(this.camera.position);
      return distance < 300; // Adjust based on performance
    }
    
    // Enhanced sphere-based frustum culling
    if (object instanceof THREE.Mesh && object.geometry) {
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      
      const sphere = object.geometry.boundingSphere;
      if (sphere) {
        const worldSphere = sphere.clone().applyMatrix4(object.matrixWorld);
        return this.frustum.intersectsSphere(worldSphere);
      }
    }
    
    return true; // Default to visible if no bounding info
  }
  
  public render(): void {
    this.renderCount++;
    this.performanceMonitor.update();
    this.memoryManager.update();
    
    // Skip heavy operations if performance is poor
    if (this.shouldSkipFrame && this.renderCount % 2 === 0) {
      return; // Skip every other frame if FPS is low
    }
    
    // Update frustum culling less frequently for performance
    this.updateFrustumCulling();
    
    // Apply enhanced frustum culling with distance-based optimizations
    let culledObjects = 0;
    let visibleObjects = 0;
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        const wasVisible = object.visible;
        object.visible = this.isObjectInFrustum(object);
        
        if (wasVisible && !object.visible) culledObjects++;
        if (object.visible) visibleObjects++;
      }
    });
    
    // Reset renderer info for accurate statistics
    this.renderer.info.reset();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // Performance logging with enhanced metrics
    if (this.renderCount % 300 === 0) {
      const renderInfo = this.renderer.info.render;
      console.log("🎨 [RenderEngine] Render stats:", {
        frame: this.renderCount,
        fps: this.performanceMonitor.getFPS().toFixed(1),
        frameTime: this.performanceMonitor.getAverageFrameTime().toFixed(2) + 'ms',
        triangles: renderInfo.triangles,
        calls: renderInfo.calls,
        visibleObjects,
        culledObjects
      });
    }
  }
  
  public getDeltaTime(): number {
    return Math.min(this.clock.getDelta(), 0.1);
  }
  
  public getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }
  
  public getMemoryManager(): MemoryManager {
    return this.memoryManager;
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
    console.log("🎨 [RenderEngine] Disposing with enhanced cleanup...");
    
    this.memoryManager.dispose();
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    
    console.log("🎨 [RenderEngine] Enhanced disposal completed successfully");
  }
}
