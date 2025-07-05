
import * as THREE from 'three';
import { AdvancedVisibilityManager } from './AdvancedVisibilityManager';

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
  
  // Enhanced visibility management system
  private visibilityManager: AdvancedVisibilityManager | null = null;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  
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
    
    // Initialize advanced visibility management system
    this.visibilityManager = new AdvancedVisibilityManager(this.camera);
    
    console.log("🎨 [RenderEngine] Initialized with Smart Behind-Player Occlusion System");
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
    
    // Store player position for visibility system
    this.playerPosition.copy(playerPosition);
  }
  
  // Legacy methods kept for compatibility but now handled by AdvancedVisibilityManager
  private updateFrustumCulling(): void {
    // This is now handled by AdvancedVisibilityManager
    // Kept for backward compatibility but does nothing
  }
  
  private isObjectInFrustum(object: THREE.Object3D): boolean {
    // This is now handled by AdvancedVisibilityManager
    // Kept for backward compatibility
    return true;
  }
  
  public render(): void {
    this.renderCount++;
    const now = performance.now();
    
    // Use advanced visibility management for smart occlusion culling
    if (this.visibilityManager) {
      this.visibilityManager.update(this.scene, this.playerPosition);
    }
    
    // Performance logging with visibility stats
    if (this.renderCount % 3000 === 0) {
      const fps = 3000 / ((now - this.lastRenderTime) / 1000);
      let visibilityStats = {};
      
      if (this.visibilityManager) {
        visibilityStats = this.visibilityManager.getVisibilityStats();
      }
      
      console.log("🎨 [RenderEngine] SMART-OCCLUSION PERFORMANCE:", {
        frame: this.renderCount,
        fps: fps.toFixed(1),
        objects: this.scene.children.length,
        visibility: visibilityStats
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
    
    // Dispose visibility manager
    if (this.visibilityManager) {
      this.visibilityManager.dispose();
      this.visibilityManager = null;
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    
    console.log("🎨 [RenderEngine] Disposed successfully with Smart Behind-Player Occlusion System");
  }
}
