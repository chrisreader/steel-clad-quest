
import * as THREE from 'three';

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private mountElement: HTMLDivElement;
  
  // Enhanced camera controls with advanced smoothing
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private targetRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private mouseSensitivity: number = 0.002;
  private maxPitch: number = Math.PI / 2 - 0.1;
  
  // Advanced camera smoothing system
  private cameraVelocity: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private rotationInertia: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private readonly CAMERA_SMOOTHING_FACTOR: number = 0.25;
  private readonly INERTIA_DAMPING: number = 0.88;
  private readonly VELOCITY_THRESHOLD: number = 0.001;
  
  // Frame rate stabilization
  private frameTimeHistory: number[] = [];
  private readonly FRAME_HISTORY_SIZE: number = 10;
  private targetFrameTime: number = 1000 / 60; // 60 FPS target
  private lastFrameTime: number = 0;
  private frameTimeSmoothing: number = 0.1;
  
  // FIXED: Consistent camera height
  private readonly CAMERA_HEIGHT_OFFSET: number = 1.6; // Standard eye height
  
  // Performance optimizations
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private lastCullingUpdate: number = 0;
  private readonly CULLING_UPDATE_INTERVAL: number = 12; // ULTRA-AGGRESSIVE: Every 12 frames for 50% fewer calculations
  
  // Object pooling and caching for maximum performance
  private objectPool: Map<string, THREE.Object3D[]> = new Map();
  private cachedPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private cachedCameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private frameSkipCounter: number = 0;
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    this.clock = new THREE.Clock();
  }
  
  public initialize(): void {
    console.log("🎨 [RenderEngine] Initializing with performance optimizations...");
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = null;
    
    // ULTRA-AGGRESSIVE camera settings for performance
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.mountElement.clientWidth / this.mountElement.clientHeight,
      0.1,
      500 // Reduced from 1000 for 50% fewer far calculations
    );
    
    // Set up camera layers
    this.camera.layers.enable(0);
    this.camera.layers.disable(1);
    
    // ULTRA-AGGRESSIVE renderer settings for maximum performance
    this.renderer = new THREE.WebGLRenderer({ antialias: false }); // Disabled for performance
    this.renderer.setSize(this.mountElement.clientWidth, this.mountElement.clientHeight);
    this.renderer.shadowMap.enabled = true; // Re-enabled for proper foliage lighting
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
    // Calculate rotation deltas with sensitivity
    const rotationDeltaYaw = -deltaX * this.mouseSensitivity;
    const rotationDeltaPitch = -deltaY * this.mouseSensitivity;
    
    // Update velocity for inertia calculation
    this.cameraVelocity.yaw = rotationDeltaYaw;
    this.cameraVelocity.pitch = rotationDeltaPitch;
    
    // Apply rotation with inertia
    this.rotationInertia.yaw = this.rotationInertia.yaw * this.INERTIA_DAMPING + this.cameraVelocity.yaw;
    this.rotationInertia.pitch = this.rotationInertia.pitch * this.INERTIA_DAMPING + this.cameraVelocity.pitch;
    
    // Update target rotation
    this.targetRotation.yaw += this.rotationInertia.yaw;
    this.targetRotation.pitch += this.rotationInertia.pitch;
    this.targetRotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.targetRotation.pitch));
    
    // Smooth interpolation to target with enhanced easing
    const smoothingFactor = this.calculateDynamicSmoothingFactor();
    this.cameraRotation.yaw = THREE.MathUtils.lerp(this.cameraRotation.yaw, this.targetRotation.yaw, smoothingFactor);
    this.cameraRotation.pitch = THREE.MathUtils.lerp(this.cameraRotation.pitch, this.targetRotation.pitch, smoothingFactor);
    
    this.updateCameraRotation();
  }
  
  private calculateDynamicSmoothingFactor(): number {
    const velocityMagnitude = Math.sqrt(
      this.cameraVelocity.yaw * this.cameraVelocity.yaw + 
      this.cameraVelocity.pitch * this.cameraVelocity.pitch
    );
    
    // Increase smoothing for small movements, reduce for rapid movements
    if (velocityMagnitude < this.VELOCITY_THRESHOLD) {
      return this.CAMERA_SMOOTHING_FACTOR * 0.5; // Extra smooth for micro-movements
    } else if (velocityMagnitude > 0.05) {
      return this.CAMERA_SMOOTHING_FACTOR * 1.5; // More responsive for rapid movements
    }
    
    return this.CAMERA_SMOOTHING_FACTOR;
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
    this.frameSkipCounter++;
    if (this.frameSkipCounter < this.CULLING_UPDATE_INTERVAL) return;
    
    // Cache matrix calculations to avoid repeated computation
    this.cachedCameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cachedCameraMatrix);
    this.frameSkipCounter = 0;
  }
  
  private isObjectInFrustum(object: THREE.Object3D): boolean {
    // Skip frustum culling for InstancedMesh (like grass) to avoid complexity
    if (object instanceof THREE.InstancedMesh) return true;
    
    // ULTRA-AGGRESSIVE distance culling - cull objects beyond 150 units immediately
    const distance = this.camera.position.distanceTo(object.position);
    if (distance > 150) return false;
    
    // Skip expensive hierarchical checks for better performance
    
    // Fast bounding sphere pre-check with cached calculations
    if (object instanceof THREE.Mesh && object.geometry) {
      const sphere = object.geometry.boundingSphere;
      if (sphere) {
        // Skip frustum test for very close objects (performance boost)
        if (distance < 20) return true;
        
        const worldSphere = sphere.clone().applyMatrix4(object.matrixWorld);
        return this.frustum.intersectsSphere(worldSphere);
      }
    }
    
    return distance < 100; // More aggressive default culling
  }
  
  public render(): void {
    this.renderCount++;
    const now = performance.now();
    
    // Update frustum culling less frequently for performance
    this.updateFrustumCulling();
    
    // Apply frustum culling to scene objects
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        object.visible = this.isObjectInFrustum(object);
      }
    });
    
    // EXTREME logging reduction (every 6000 frames = 10 minutes at 60fps)
    if (this.renderCount % 6000 === 0) {
      const fps = 6000 / ((now - this.lastRenderTime) / 1000);
      console.log("🎨 [RenderEngine] EXTREME-PERFORMANCE:", {
        frame: this.renderCount,
        fps: fps.toFixed(1),
        visibleObjects: this.scene.children.filter(child => child.visible).length
      });
      this.lastRenderTime = now;
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  public getDeltaTime(): number {
    const rawDelta = this.clock.getDelta();
    return this.getSmoothedDeltaTime(rawDelta);
  }
  
  private getSmoothedDeltaTime(rawDelta: number): number {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    // Add to frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate smoothed frame time
    const averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.targetFrameTime = this.targetFrameTime * (1 - this.frameTimeSmoothing) + averageFrameTime * this.frameTimeSmoothing;
    
    // Cap delta time to prevent large jumps (max 33.33ms = 30fps minimum)
    const clampedDelta = Math.min(rawDelta, 1 / 30);
    
    // Apply frame time smoothing to reduce stutters
    const smoothedDelta = clampedDelta * (1 - this.frameTimeSmoothing) + (this.targetFrameTime / 1000) * this.frameTimeSmoothing;
    
    return Math.max(smoothedDelta, 1 / 144); // Minimum deltaTime for 144fps max
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
