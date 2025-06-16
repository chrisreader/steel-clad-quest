
import * as THREE from 'three';
import { Player } from '../entities/Player';
import { InputManager } from '../engine/InputManager';
import { PhysicsManager } from '../engine/PhysicsManager';
import { TerrainSurfaceDetector } from '../utils/terrain/TerrainSurfaceDetector';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer';

export class OptimizedMovementSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private player: Player;
  private inputManager: InputManager;
  private physicsManager: PhysicsManager;
  private surfaceDetector: TerrainSurfaceDetector;
  private isSprintActivatedByDoubleTap: boolean = false;
  private frameCount: number = 0;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    player: Player,
    inputManager: InputManager,
    physicsManager: PhysicsManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.inputManager = inputManager;
    this.physicsManager = physicsManager;
    
    this.surfaceDetector = new TerrainSurfaceDetector(physicsManager);
    
    console.log("🏃 [OptimizedMovementSystem] Enhanced with performance optimizations");
    
    this.setupSprintHandler();
  }
  
  private setupSprintHandler(): void {
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type } = customEvent.detail;
      
      if (type === 'doubleTapForward') {
        this.isSprintActivatedByDoubleTap = true;
        this.player.startSprint();
      }
    });
  }
  
  public update(deltaTime: number): void {
    this.frameCount++;
    
    // Use PerformanceOptimizer for terrain cache clearing
    if (PerformanceOptimizer.shouldUpdateTerrainCache()) {
      this.physicsManager.clearTerrainCache();
    }
    
    // Reduced debug logging frequency using PerformanceOptimizer
    if (PerformanceOptimizer.shouldLogPerformance()) {
      const currentPos = this.player.getPosition();
      const terrainData = this.physicsManager.getTerrainDataAtPosition(currentPos);
      console.log(`🏔️ OPTIMIZED MOVEMENT: Pos(${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)}) | Terrain: ${terrainData.height.toFixed(2)}`);
    }
    
    // Handle movement input
    const moveDirection = new THREE.Vector3();
    let hasMovementInput = false;
    
    // Check movement keys
    const forwardPressed = this.inputManager.isActionPressed('moveForward');
    const backwardPressed = this.inputManager.isActionPressed('moveBackward');
    const leftPressed = this.inputManager.isActionPressed('moveLeft');
    const rightPressed = this.inputManager.isActionPressed('moveRight');
    
    if (forwardPressed) {
      moveDirection.z -= 1;
      hasMovementInput = true;
    }
    if (backwardPressed) {
      moveDirection.z += 1;
      hasMovementInput = true;
    }
    if (leftPressed) {
      moveDirection.x -= 1;
      hasMovementInput = true;
    }
    if (rightPressed) {
      moveDirection.x += 1;
      hasMovementInput = true;
    }
    
    // Handle sprint logic
    if (this.isSprintActivatedByDoubleTap) {
      if (forwardPressed && !backwardPressed) {
        if (!this.player.getSprinting()) {
          this.player.startSprint();
        }
      } else {
        this.isSprintActivatedByDoubleTap = false;
        this.player.stopSprint();
      }
    }
    
    // Apply optimized collision-aware movement
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Performance-adjusted movement speed
      let speed = 5.0;
      if (this.player.getSprinting() && forwardPressed && !backwardPressed) {
        speed = 25.0;
      }
      
      // Transform movement direction relative to camera rotation
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      
      const rightVector = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
      const forwardVector = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
      
      // Apply movement relative to camera orientation
      const worldMoveDirection = new THREE.Vector3();
      worldMoveDirection.addScaledVector(forwardVector, -moveDirection.z);
      worldMoveDirection.addScaledVector(rightVector, moveDirection.x);
      worldMoveDirection.normalize();
      
      // Get current position and calculate target position
      const currentPosition = this.player.getPosition();
      const surfaceData = this.surfaceDetector.getSurfaceDataAtPosition(currentPosition);
      
      // Calculate movement with slope adjustment
      let adjustedSpeed = speed;
      if (surfaceData.slopeAngle > 15) {
        const slopeSpeedMultiplier = Math.max(0.3, 1.0 - (surfaceData.slopeAngle - 15) / 45);
        adjustedSpeed = speed * slopeSpeedMultiplier;
      }
      
      // Calculate target position
      const movementVector = worldMoveDirection.clone().multiplyScalar(adjustedSpeed * deltaTime);
      const targetPosition = currentPosition.clone().add(movementVector);
      
      // Use PhysicsManager's optimized collision-aware movement
      const finalPosition = this.physicsManager.checkPlayerMovement(currentPosition, targetPosition, 0.5);
      
      // Apply the collision-checked position
      this.player.setPosition(finalPosition);
      
      // Reduced collision logging frequency
      if (this.frameCount % 180 === 0) { // Every 3 seconds instead of every 0.5 seconds
        const moved = !finalPosition.equals(targetPosition);
        if (moved) {
          console.log("🏔️ OPTIMIZED COLLISION: Movement blocked by terrain/objects");
        }
      }
    }
    
    // Stop sprint if no forward movement with optimized check frequency
    if (this.frameCount % 6 === 0) { // Check every 6 frames instead of every frame
      if (this.player.getSprinting() && (!this.inputManager.isActionPressed('moveForward') || this.inputManager.isActionPressed('moveBackward'))) {
        this.player.stopSprint();
        this.isSprintActivatedByDoubleTap = false;
      }
    }
  }
  
  public checkInTavern(): boolean {
    const playerPos = this.player.getPosition();
    return Math.abs(playerPos.x) < 10 && Math.abs(playerPos.z) < 10;
  }
  
  public dispose(): void {
    console.log("🏃 [OptimizedMovementSystem] Disposing...");
  }
}
