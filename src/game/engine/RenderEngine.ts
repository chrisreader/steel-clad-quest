import * as THREE from 'three';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { FrustumCuller } from '../performance/FrustumCuller';
import { LODManager } from '../performance/LODManager';

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private mountElement: HTMLDivElement;
  
  // Performance optimization components
  private performanceMonitor = new PerformanceMonitor();
  private frustumCuller = new FrustumCuller();
  private lodManager = new LODManager();
  
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
  
  // Performance state
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  private adaptiveQuality: boolean = true;
  private qualityLevel: number = 1.0; // 0.5 to 1.0
  
  // Grass-specific tracking
  private grassInstances: THREE.InstancedMesh[] = [];
  
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
    
    // Set up camera layers - ignore layer 1 (invisible to player)
    this.camera.layers.enable(0); // Default layer - visible
    this.camera.layers.disable(1); // Layer 1 - invisible to player (torso)
    
    // Create renderer with performance-optimized settings
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: this.qualityLevel > 0.7, // Adaptive antialiasing
      powerPreference: "high-performance"
    });
    this.renderer.setSize(this.mountElement.clientWidth, this.mountElement.clientHeight);
    this.renderer.shadowMap.enabled = this.qualityLevel > 0.5;
    this.renderer.shadowMap.type = this.qualityLevel > 0.8 ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    
    // Performance-optimized renderer settings
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Set pixel ratio based on quality level
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qualityLevel * 2));
    
    // Attach to DOM
    this.mountElement.appendChild(this.renderer.domElement);
    
    // Setup canvas properties
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.outline = 'none';
    
    // Initialize performance components
    this.lodManager.setCamera(this.camera);
    
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
  
  public render(): void {
    this.renderCount++;
    
    // Update performance monitoring
    this.performanceMonitor.update();
    
    // Adaptive quality based on performance
    if (this.adaptiveQuality) {
      this.updateAdaptiveQuality();
    }
    
    // Update frustum culling
    this.frustumCuller.updateFrustum(this.camera);
    
    // Update LOD system
    this.lodManager.updateLOD();
    
    // Perform frustum culling on scene objects (EXCLUDING grass instances)
    const cullableObjects: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry && !(child instanceof THREE.InstancedMesh)) {
        cullableObjects.push(child);
      }
    });
    
    const { visible, culled } = this.frustumCuller.cullObjects(cullableObjects);
    
    // Handle grass instances separately with distance-based culling
    this.updateGrassVisibility();
    
    // Update performance metrics
    this.performanceMonitor.updateRenderMetrics(
      this.renderer.info.render.calls,
      visible.length + this.getVisibleGrassCount(),
      culled.length
    );
    
    // Reduced frequency logging for better performance
    if (this.renderCount % 300 === 0) { // Every 5 seconds at 60fps
      const metrics = this.performanceMonitor.getMetrics();
      console.log("🎨 [RenderEngine] Performance:", {
        fps: metrics.fps,
        frameTime: metrics.frameTime.toFixed(2) + 'ms',
        visible: metrics.visibleObjects,
        culled: metrics.culledObjects,
        quality: this.qualityLevel.toFixed(2),
        memory: metrics.memoryUsage.toFixed(1) + 'MB'
      });
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  private updateGrassVisibility(): void {
    const maxGrassDistance = 150; // Reduced from default to improve performance
    const cameraPosition = this.camera.position;
    
    // Update grass instances based on distance
    this.scene.traverse((child) => {
      if (child instanceof THREE.InstancedMesh && child.userData.isGrass) {
        const distance = cameraPosition.distanceTo(child.position);
        
        if (distance > maxGrassDistance) {
          child.visible = false;
        } else {
          child.visible = true;
          
          // Apply distance-based opacity for smooth transition
          const opacity = Math.max(0.1, 1 - (distance / maxGrassDistance));
          if (child.material instanceof THREE.ShaderMaterial) {
            if (child.material.uniforms.opacity) {
              child.material.uniforms.opacity.value = opacity;
            }
          }
        }
      }
    });
  }
  
  private getVisibleGrassCount(): number {
    let count = 0;
    this.scene.traverse((child) => {
      if (child instanceof THREE.InstancedMesh && child.userData.isGrass && child.visible) {
        count += child.count;
      }
    });
    return count;
  }
  
  public registerGrassInstance(instance: THREE.InstancedMesh): void {
    instance.userData.isGrass = true;
    this.grassInstances.push(instance);
  }
  
  private updateAdaptiveQuality(): void {
    const metrics = this.performanceMonitor.getMetrics();
    
    if (metrics.fps > 0) { // Only adjust if we have valid FPS data
      if (this.performanceMonitor.shouldReduceQuality() && this.qualityLevel > 0.5) {
        this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
        this.applyQualitySettings();
        console.log("🎨 [RenderEngine] Reduced quality to", this.qualityLevel.toFixed(2));
      } else if (this.performanceMonitor.shouldIncreaseQuality() && this.qualityLevel < 1.0) {
        this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
        this.applyQualitySettings();
        console.log("🎨 [RenderEngine] Increased quality to", this.qualityLevel.toFixed(2));
      }
    }
  }
  
  private applyQualitySettings(): void {
    // Update shadow quality
    this.renderer.shadowMap.enabled = this.qualityLevel > 0.5;
    this.renderer.shadowMap.type = this.qualityLevel > 0.8 ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    
    // Update pixel ratio
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qualityLevel * 2));
  }
  
  public addLODObject(id: string, object: THREE.Object3D, lodLevels: any[]): void {
    this.lodManager.addLODObject(id, object, lodLevels);
  }
  
  public getPerformanceMetrics(): any {
    return this.performanceMonitor.getMetrics();
  }
  
  public setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQuality = enabled;
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
    
    this.lodManager.clear();
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    
    console.log("🎨 [RenderEngine] Disposed successfully");
  }
}
