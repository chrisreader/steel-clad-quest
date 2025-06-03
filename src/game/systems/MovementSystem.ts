
import * as THREE from 'three';
import { Player } from '../entities/Player';
import { InputManager } from '../engine/InputManager';
import { PhysicsManager } from '../engine/PhysicsManager';
import { TerrainSurfaceDetector } from '../utils/terrain/TerrainSurfaceDetector';
import { SurfaceMovementCalculator } from '../utils/movement/SurfaceMovementCalculator';

export class MovementSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private player: Player;
  private inputManager: InputManager;
  private physicsManager: PhysicsManager;
  private surfaceDetector: TerrainSurfaceDetector;
  private surfaceMovementCalculator: SurfaceMovementCalculator;
  private isSprintActivatedByDoubleTap: boolean = false;
  private frameCount: number = 0;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private movementStuckCounter: number = 0;
  
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
    
    // Initialize enhanced surface-following systems
    this.surfaceDetector = new TerrainSurfaceDetector(physicsManager);
    this.surfaceMovementCalculator = new SurfaceMovementCalculator();
    
    console.log("🏃 [MovementSystem] Enhanced with improved surface-following and stuck prevention");
    
    this.setupSprintHandler();
    this.testInputManager();
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
    
    // Check if player is stuck
    const currentPos = this.player.getPosition();
    const movementDistance = currentPos.distanceTo(this.lastPlayerPosition);
    
    if (movementDistance < 0.01) {
      this.movementStuckCounter++;
    } else {
      this.movementStuckCounter = 0;
    }
    
    // Enhanced debugging every 60 frames or when stuck
    if (this.frameCount % 60 === 0 || this.movementStuckCounter > 30) {
      console.log(`\n🏔️ === ENHANCED SURFACE-FOLLOWING DEBUG ===`);
      console.log(`🏔️ Player Position: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`);
      console.log(`🏔️ Movement Distance: ${movementDistance.toFixed(4)}, Stuck Counter: ${this.movementStuckCounter}`);
      
      const surfaceData = this.surfaceDetector.getSurfaceDataAtPosition(currentPos);
      console.log(`🏔️ Surface: height=${surfaceData.height.toFixed(2)}, slope=${surfaceData.slopeAngle.toFixed(1)}°, walkable=${surfaceData.isWalkable}, boundary=${surfaceData.isTerrainBoundary}`);
      
      if (this.movementStuckCounter > 30) {
        console.log(`🏔️ 🚨 PLAYER STUCK DETECTED - Resetting movement calculator`);
        this.surfaceMovementCalculator.resetStuckCounter();
        this.movementStuckCounter = 0;
      }
      
      console.log(`🏔️ === END DEBUG ===\n`);
    }
    
    this.lastPlayerPosition.copy(currentPos);
    
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
    
    // Apply enhanced surface-following movement
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Apply sprint multiplier
      let speed = 5.0; // Base movement speed
      if (this.player.getSprinting() && forwardPressed && !backwardPressed) {
        speed = 7.5;
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
      
      // Get current position and surface data
      const currentPosition = this.player.getPosition();
      const surfaceData = this.surfaceDetector.getSurfaceDataAtPosition(currentPosition);
      
      // Calculate enhanced surface-following movement
      const movementResult = this.surfaceMovementCalculator.calculateSurfaceMovement(
        currentPosition,
        worldMoveDirection,
        speed,
        surfaceData,
        deltaTime
      );
      
      if (!movementResult.isBlocked) {
        // Apply the new position
        this.player.setPosition(movementResult.newPosition);
        
        if (this.frameCount % 30 === 0) { // Less frequent logging
          console.log(`🏃 ENHANCED MOVEMENT: ${movementResult.debugInfo || 'NORMAL'}`);
          console.log(`🏃 From: (${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)})`);
          console.log(`🏃 To: (${movementResult.newPosition.x.toFixed(2)}, ${movementResult.newPosition.y.toFixed(2)}, ${movementResult.newPosition.z.toFixed(2)})`);
          console.log(`🏃 Surface: slope=${surfaceData.slopeAngle.toFixed(1)}°, boundary=${surfaceData.isTerrainBoundary}`);
        }
      } else {
        console.log("🏃 Movement blocked - applying fallback");
        // Simple fallback movement
        const fallbackMovement = worldMoveDirection.clone().multiplyScalar(speed * deltaTime * 0.3);
        const fallbackPosition = currentPosition.clone().add(fallbackMovement);
        fallbackPosition.y = Math.max(surfaceData.height + 0.4, currentPosition.y);
        this.player.setPosition(fallbackPosition);
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
    // Updated to match exact tavern bounds (-6 to +6 in both X and Z)
    return playerPosition.x >= -6 && playerPosition.x <= 6 && 
           playerPosition.z >= -6 && playerPosition.z <= 6;
  }
  
  public dispose(): void {
    // Cleanup if needed
  }
}
