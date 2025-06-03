
import * as THREE from 'three';
import { Player } from '../entities/Player';
import { InputManager } from '../engine/InputManager';
import { PhysicsManager } from '../engine/PhysicsManager';

export class MovementSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private player: Player;
  private inputManager: InputManager;
  private physicsManager: PhysicsManager;
  private isSprintActivatedByDoubleTap: boolean = false;
  private frameCount: number = 0;
  private smoothingFactor: number = 0.05; // Faster height adjustments for better stair climbing
  
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
    
    console.log("🏃 [MovementSystem] Initialized with enhanced terrain collision detection");
    
    // Set up sprint input handler
    this.setupSprintHandler();
    
    // Test input manager immediately
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
    
    // Handle movement input using the InputManager API
    const moveDirection = new THREE.Vector3();
    let hasMovementInput = false;
    
    // Check each movement key individually with logging
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
    
    // Log input state every 60 frames
    if (this.frameCount % 60 === 0) {
      console.log("🏃 [MovementSystem] Input state:", {
        forward: forwardPressed,
        backward: backwardPressed,
        left: leftPressed,
        right: rightPressed,
        hasInput: hasMovementInput,
        moveDirection: moveDirection,
        playerPos: this.player.getPosition()
      });
    }
    
    // Handle sprint logic
    if (this.isSprintActivatedByDoubleTap) {
      if (forwardPressed && !backwardPressed) {
        if (!this.player.getSprinting()) {
          console.log("🏃 [MovementSystem] Continuing sprint - W still held after double-tap");
          this.player.startSprint();
        }
      } else {
        console.log("🏃 [MovementSystem] Sprint stopped - W released or moving backward");
        this.isSprintActivatedByDoubleTap = false;
        this.player.stopSprint();
      }
    }
    
    // Normalize movement
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Apply sprint multiplier
      let speed = 1.0;
      if (this.player.getSprinting() && forwardPressed && !backwardPressed) {
        speed = 1.5;
      }
      moveDirection.multiplyScalar(speed);
      
      // Transform movement direction relative to camera rotation
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      
      const rightVector = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
      const forwardVector = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
      
      // Apply movement relative to camera orientation
      const worldMoveDirection = new THREE.Vector3();
      worldMoveDirection.addScaledVector(forwardVector, -moveDirection.z);
      worldMoveDirection.addScaledVector(rightVector, moveDirection.x);
      
      // Get current and target positions
      const currentPosition = this.player.getPosition();
      const movementDistance = worldMoveDirection.length() * 5.0 * deltaTime; // 5.0 is movement speed
      const targetPosition = currentPosition.clone().add(worldMoveDirection.normalize().multiplyScalar(movementDistance));
      
      // Enhanced collision checking with slope angle validation
      const angle = this.physicsManager.getSlopeAngleAtPosition(targetPosition);
      if (angle > 45) {
        console.log(`🏃 [MovementSystem] Blocked by steep slope: ${angle.toFixed(1)} degrees`);
        return; // Don't move on steep slopes
      }
      
      // Check for standard collisions and terrain height
      let safePosition = this.physicsManager.checkPlayerMovement(currentPosition, targetPosition, 0.4);
      
      // Check for staircase navigation
      safePosition = this.physicsManager.checkStaircaseNavigation(currentPosition, safePosition, 0.4);
      
      // Get terrain height at the safe position
      const terrainHeight = this.physicsManager.getTerrainHeightAtPosition(safePosition);
      
      // Smoothly adjust player height to follow terrain with faster response for stairs
      const currentHeight = currentPosition.y;
      const targetHeight = terrainHeight + 0.4; // Player radius above terrain
      
      // Use faster interpolation for better stair climbing
      const heightDifference = targetHeight - currentHeight;
      const maxHeightChange = 5.0 * deltaTime; // Increased for better stair response
      
      if (Math.abs(heightDifference) > 0.05) { // Reduced threshold for faster response
        const heightAdjustment = Math.sign(heightDifference) * Math.min(Math.abs(heightDifference), maxHeightChange);
        safePosition.y = currentHeight + heightAdjustment;
      } else {
        safePosition.y = targetHeight;
      }
      
      // Calculate actual movement vector
      const actualMovement = new THREE.Vector3().subVectors(safePosition, currentPosition);
      
      if (actualMovement.length() > 0.001) {
        // Convert back to normalized direction for player.move()
        const normalizedMovement = actualMovement.clone().normalize();
        const movementScale = actualMovement.length() / (5.0 * deltaTime);
        
        console.log("🏃 [MovementSystem] Moving with enhanced terrain collision:", {
          from: currentPosition,
          to: safePosition,
          movement: actualMovement,
          terrainHeight: terrainHeight,
          slopeAngle: angle.toFixed(1),
          distance: actualMovement.length()
        });
        
        this.player.move(normalizedMovement.multiplyScalar(movementScale), deltaTime);
      } else {
        console.log("🏃 [MovementSystem] Movement blocked by collision or terrain");
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
