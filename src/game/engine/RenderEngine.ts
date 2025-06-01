
import * as THREE from 'three';
import { PhysicsManager } from './PhysicsManager';

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private mountElement: HTMLDivElement;
  private physicsManager: PhysicsManager | null = null;
  
  // Camera controls with smoothing
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private targetRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private mouseSensitivity: number = 0.003; // Increased from 0.002 for better responsiveness
  private maxPitch: number = Math.PI / 2 - 0.1;
  private smoothingFactor: number = 0.15; // For exponential smoothing
  
  // Mouse smoothing
  private mouseVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private smoothedMouseDelta: { x: number; y: number } = { x: 0, y: 0 };
  
  // Debug state
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    this.clock = new THREE.Clock();
  }
  
  public setPhysicsManager(physicsManager: PhysicsManager): void {
    this.physicsManager = physicsManager;
    console.log("🎨 [RenderEngine] Physics manager set for camera collision");
  }
  
  public initialize(): void {
    console.log("🎨 [RenderEngine] Initializing...");
    
    // Create scene
    this.scene = new THREE.Scene();
    // Remove hardcoded background to allow skybox to be visible
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
    
    console.log("🎨 [RenderEngine] Initialized with skybox background support");
  }
  
  public setupFirstPersonCamera(playerPosition: THREE.Vector3): void {
    // Position camera at head level to avoid torso clipping
    this.camera.position.set(
      playerPosition.x, 
      playerPosition.y + 1.2,
      playerPosition.z - 0.05
    );
    this.cameraRotation.pitch = 0;
    this.cameraRotation.yaw = 0;
    this.targetRotation.pitch = 0;
    this.targetRotation.yaw = 0;
    this.updateCameraRotation();
    
    console.log("📹 [RenderEngine] First-person camera positioned with smooth controls:", this.camera.position);
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
    // Calculate desired camera position
    const desiredCameraPosition = new THREE.Vector3(
      playerPosition.x, 
      playerPosition.y + 1.2,
      playerPosition.z - 0.05
    );
    
    // Check for camera collision if physics manager is available
    if (this.physicsManager) {
      const currentCameraPosition = this.camera.position.clone();
      const cameraRadius = 0.2; // Increased radius for better collision detection
      
      // First check if we can move the camera to the desired position
      const primarySafePosition = this.physicsManager.checkPlayerMovement(
        currentCameraPosition, 
        desiredCameraPosition, 
        cameraRadius
      );
      
      // If the primary position is blocked, try multiple fallback positions
      let finalCameraPosition = primarySafePosition;
      
      // Check if the camera position is too far from the desired position (indicates collision)
      const distanceFromDesired = primarySafePosition.distanceTo(desiredCameraPosition);
      if (distanceFromDesired > 0.3) {
        // Try pulling the camera back along the view direction
        const viewDirection = new THREE.Vector3();
        this.camera.getWorldDirection(viewDirection);
        viewDirection.negate(); // Reverse direction to pull back
        
        const fallbackPositions = [
          desiredCameraPosition.clone().add(viewDirection.clone().multiplyScalar(0.2)),
          desiredCameraPosition.clone().add(viewDirection.clone().multiplyScalar(0.5)),
          desiredCameraPosition.clone().add(viewDirection.clone().multiplyScalar(1.0)),
          playerPosition.clone().add(new THREE.Vector3(0, 1.2, 0)) // Last resort: directly above player
        ];
        
        // Test each fallback position
        for (const fallbackPos of fallbackPositions) {
          const testPosition = this.physicsManager.checkPlayerMovement(
            currentCameraPosition, 
            fallbackPos, 
            cameraRadius
          );
          
          const testDistance = testPosition.distanceTo(fallbackPos);
          if (testDistance < 0.1) { // Position is mostly clear
            finalCameraPosition = testPosition;
            break;
          }
        }
      }
      
      // Use safe position
      this.camera.position.copy(finalCameraPosition);
      
      // Additional safety check: ensure camera doesn't go too far from player
      const distanceFromPlayer = this.camera.position.distanceTo(playerPosition);
      if (distanceFromPlayer > 3.0) {
        // If camera gets pushed too far, pull it back towards player
        const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, this.camera.position).normalize();
        this.camera.position.copy(playerPosition.clone().add(directionToPlayer.multiplyScalar(-1.0)));
        this.camera.position.y = playerPosition.y + 1.2; // Maintain head level
      }
      
      // Final collision check for the camera position to prevent any remaining clipping
      const finalCheck = this.physicsManager.checkSphereCollision(this.camera.position, cameraRadius);
      if (finalCheck) {
        // If still colliding, push camera away from collision
        const collisionCenter = finalCheck.box.getCenter(new THREE.Vector3());
        const pushDirection = new THREE.Vector3().subVectors(this.camera.position, collisionCenter).normalize();
        this.camera.position.copy(collisionCenter.clone().add(pushDirection.multiplyScalar(cameraRadius + 0.3)));
        this.camera.position.y = Math.max(this.camera.position.y, playerPosition.y + 0.5); // Keep camera above ground
      }
    } else {
      // Fallback: use desired position without collision checking
      this.camera.position.copy(desiredCameraPosition);
    }
  }
  
  public render(): void {
    this.renderCount++;
    const now = performance.now();
    
    // Log every 60 frames (roughly 1 second)
    if (this.renderCount % 60 === 0) {
      const fps = this.renderCount / ((now - this.lastRenderTime) / 1000) * 60;
      console.log("🎨 [RenderEngine] Rendering with smooth camera controls:", {
        frame: this.renderCount,
        fps: fps.toFixed(1),
        cameraPos: this.camera.position,
        sceneChildren: this.scene.children.length,
        cameraLayers: this.camera.layers.mask
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
