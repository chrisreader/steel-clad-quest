
import * as THREE from 'three';
import { Player } from '../entities/Player';
import { InputManager } from '../engine/InputManager';
import { PhysicsManager } from '../engine/PhysicsManager';
import { TerrainSurfaceDetector } from '../utils/terrain/TerrainSurfaceDetector';

export class MovementSystem {
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
    
    console.log("🏃 [MovementSystem] Enhanced with collision detection for trees and walls");
    
    this.setupSprintHandler();
  }
  
  private testInputManager(): void {
    console.log("🏃 [MovementSystem] Testing input manager:");
    console.log("🏃 [MovementSystem] - isActionPressed method:", typeof this.inputManager.isActionPressed);
    console.log("🏃 [MovementSystem] - moveForward test:", this.inputManager.isActionPressed('moveForward'));
    console.log("🏃 [MovementSystem] - Available key bindings:", this.inputManager.getKeyBindings());
  }
  
  private setupSprintHandler(): void {
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type } = customEvent.detail;
      
      if (type === 'doubleTapForward') {
        console.log("🏃 [MovementSystem] Double tap forward detected - starting sprint");
        this.isSprintActivatedByDoubleTap = true;
        this.player.startSprint();
      }
    });
  }
  
  public update(deltaTime: number): void {
    this.frameCount++;
    
    // Clear terrain cache periodically for performance
    if (this.frameCount % 300 === 0) {
      this.physicsManager.clearTerrainCache();
    }
    
    // Much less frequent debugging (every 300 frames instead of 60)
    if (this.frameCount % 300 === 0) {
      const currentPos = this.player.getPosition();
      console.log(`\n🏔️ === MOVEMENT DEBUG ===`);
      console.log(`🏔️ Player Position: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`);
      
      const terrainData = this.physicsManager.getTerrainDataAtPosition(currentPos);
      console.log(`🏔️ Terrain: height=${terrainData.height.toFixed(2)}, normal=(${terrainData.normal.x.toFixed(2)}, ${terrainData.normal.y.toFixed(2)}, ${terrainData.normal.z.toFixed(2)})`);
      console.log(`🏔️ === END DEBUG ===\n`);
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
    
    // Apply collision-aware movement using PhysicsManager
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // FIXED: Restored full movement speeds for responsive gameplay
      let speed = 15.0; // Increased base speed for better responsiveness
      if (this.player.getSprinting() && forwardPressed && !backwardPressed) {
        speed = 25.0; // Increased sprint speed for better feel
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
        // Reduce speed on steep slopes
        const slopeSpeedMultiplier = Math.max(0.3, 1.0 - (surfaceData.slopeAngle - 15) / 45);
        adjustedSpeed = speed * slopeSpeedMultiplier;
      }
      
      // FIXED: Use proper delta time without artificial limitations
      const movementVector = worldMoveDirection.clone().multiplyScalar(adjustedSpeed * deltaTime);
      const targetPosition = currentPosition.clone().add(movementVector);
      
      // Use PhysicsManager's collision-aware movement
      const finalPosition = this.physicsManager.checkPlayerMovement(currentPosition, targetPosition, 0.5);
      
      // Apply the collision-checked position
      this.player.setPosition(finalPosition);
      
      // Much less frequent movement logging (every 180 frames instead of 30)
      if (this.frameCount % 180 === 0) {
        const moved = !finalPosition.equals(targetPosition);
        const debugInfo = moved ? 'COLLISION_BLOCKED' : 'NORMAL_MOVEMENT';
        console.log(`🏃 MOVEMENT: ${debugInfo}`);
        console.log(`🏃 Target: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
        console.log(`🏃 Final: (${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)}, ${finalPosition.z.toFixed(2)})`);
      }
    }
  }
  
  public setSprintEnabled(enabled: boolean): void {
    this.isSprintActivatedByDoubleTap = enabled;
    if (enabled) {
      this.player.startSprint();
    } else {
      this.player.stopSprint();
    }
  }
  
  public checkInTavern(): boolean {
    const playerPosition = this.player.getPosition();
    return playerPosition.x >= -6 && playerPosition.x <= 6 && 
           playerPosition.z >= -6 && playerPosition.z <= 6;
  }
  
  public dispose(): void {
    // Cleanup if needed
  }
}
