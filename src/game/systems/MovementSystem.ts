
import * as THREE from 'three';
import { Player } from '../entities/Player';
import { InputManager } from '../engine/InputManager';

export class MovementSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private player: Player;
  private inputManager: InputManager;
  private isSprintEnabled: boolean = false;
  private frameCount: number = 0;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    player: Player,
    inputManager: InputManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.inputManager = inputManager;
    
    console.log("🏃 [MovementSystem] Initialized with player at:", this.player.getPosition());
    console.log("🏃 [MovementSystem] InputManager available:", !!this.inputManager);
    
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
    // Listen for double-tap forward sprint activation
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type } = customEvent.detail;
      
      if (type === 'doubleTapForward') {
        console.log("🏃 [MovementSystem] Double tap forward detected - starting sprint");
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
    
    // Debug log movement input when detected
    if (hasMovementInput) {
      console.log("🏃 [MovementSystem] Movement input detected:", {
        direction: moveDirection,
        playerPos: this.player.getPosition(),
        deltaTime: deltaTime,
        frame: this.frameCount
      });
    }
    
    // Check for sprint - FIXED: Only allow sprint when moving forward
    const sprintPressed = this.inputManager.isActionPressed('sprint');
    const canSprint = sprintPressed && forwardPressed && !backwardPressed;
    
    if (canSprint) {
      if (!this.isSprintEnabled) {
        console.log("🏃 [MovementSystem] Sprint started - forward movement detected");
        this.player.startSprint();
        this.isSprintEnabled = true;
      }
    } else {
      if (this.isSprintEnabled) {
        console.log("🏃 [MovementSystem] Sprint stopped - no forward movement or sprint key released");
        this.player.stopSprint();
        this.isSprintEnabled = false;
      }
    }
    
    // Normalize movement
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Apply sprint multiplier ONLY if sprinting AND moving forward
      let speed = 1.0;
      if (this.player.getSprinting() && forwardPressed && !backwardPressed) {
        speed = 1.5;
      }
      moveDirection.multiplyScalar(speed);
      
      // Transform movement direction relative to camera rotation (first-person)
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      
      // Calculate right vector (perpendicular to camera direction)
      const rightVector = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
      
      // Calculate forward vector (camera direction but without Y component for ground movement)
      const forwardVector = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
      
      // Apply movement relative to camera orientation
      const worldMoveDirection = new THREE.Vector3();
      worldMoveDirection.addScaledVector(forwardVector, -moveDirection.z); // Forward/backward
      worldMoveDirection.addScaledVector(rightVector, moveDirection.x); // Left/right
      
      // Store previous position for debugging
      const previousPosition = this.player.getPosition().clone();
      
      // Move player in world space with enhanced logging
      console.log("🏃 [MovementSystem] Executing player movement:", {
        worldDirection: worldMoveDirection,
        speed: speed,
        deltaTime: deltaTime,
        previousPos: previousPosition,
        sprinting: this.player.getSprinting(),
        forwardPressed: forwardPressed
      });
      
      // FIXED: Movement no longer affects visual rotation
      this.player.move(worldMoveDirection, deltaTime);
      
      // Log movement result
      const newPosition = this.player.getPosition();
      const actualMovement = newPosition.clone().sub(previousPosition);
      
      console.log("🏃 [MovementSystem] Movement result:", {
        from: previousPosition,
        to: newPosition,
        movement: actualMovement,
        distance: actualMovement.length(),
        success: actualMovement.length() > 0.001
      });
    }
  }
  
  public setSprintEnabled(enabled: boolean): void {
    this.isSprintEnabled = enabled;
    if (enabled) {
      this.player.startSprint();
    } else {
      this.player.stopSprint();
    }
  }
  
  public checkInTavern(): boolean {
    const playerPosition = this.player.getPosition();
    // Check if player is within tavern bounds
    return Math.abs(playerPosition.x) < 6 && Math.abs(playerPosition.z) < 6;
  }
  
  public dispose(): void {
    // Cleanup if needed
  }
}
