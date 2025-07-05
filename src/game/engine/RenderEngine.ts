
import * as THREE from 'three';

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
  private readonly CULLING_UPDATE_INTERVAL: number = 6; // RESPONSIVE: Every 6 frames for smooth turning while maintaining performance
  
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
    
    // Fast bounding sphere pre-check before expensive frustum test
    if (object instanceof THREE.Mesh && object.geometry) {
      const sphere = object.geometry.boundingSphere;
      if (sphere) {
        // Quick distance check first (cheaper than frustum test)
        const distance = this.camera.position.distanceTo(object.position);
        if (distance > 200) return false; // Cull very distant objects immediately
        
        const worldSphere = sphere.clone().applyMatrix4(object.matrixWorld);
        return this.frustum.intersectsSphere(worldSphere);
      }
    }
    
    return true; // Default to visible if no bounding info or not a mesh
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
    
    // ULTRA-AGGRESSIVE logging reduction (every 3000 frames = 3 minutes at 60fps)
    if (this.renderCount % 3000 === 0) {
      const fps = 3000 / ((now - this.lastRenderTime) / 1000);
      console.log("🎨 [RenderEngine] ULTRA-PERFORMANCE:", {
        frame: this.renderCount,
        fps: fps.toFixed(1),
        objects: this.scene.children.length
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
