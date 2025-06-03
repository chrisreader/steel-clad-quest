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
    
    console.log("🏃 [MovementSystem] Initialized with enhanced terrain following system");
    
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
    
    // Handle movement input using the InputManager API
    const moveDirection = new THREE.Vector3();
    let hasMovementInput = false;
    
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
    
    // Log input state periodically for debugging
    if (this.frameCount % 60 === 0 && hasMovementInput) {
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
    
    // Process movement if input detected
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Apply sprint multiplier
      let speed = 5.0; // Base movement speed
      if (this.player.getSprinting() && forwardPressed && !backwardPressed) {
        speed = 7.5; // Sprint speed
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
      
      // Calculate movement distance and target position
      const currentPosition = this.player.getPosition();
      const movementDistance = speed * deltaTime;
      const targetPosition = currentPosition.clone().add(worldMoveDirection.multiplyScalar(movementDistance));
      
      console.log(`🏃 [MovementSystem] Movement attempt: from (${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)}) to (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
      
      // ENHANCED: Use improved physics system for terrain-following movement
      const safePosition = this.physicsManager.checkPlayerMovement(currentPosition, targetPosition, 0.4);
      
      // Calculate actual movement that occurred
      const actualMovement = new THREE.Vector3().subVectors(safePosition, currentPosition);
      
      if (actualMovement.length() > 0.001) {
        console.log("🏃 [MovementSystem] TERRAIN FOLLOWING MOVEMENT:", {
          from: {x: currentPosition.x.toFixed(3), y: currentPosition.y.toFixed(3), z: currentPosition.z.toFixed(3)},
          to: {x: safePosition.x.toFixed(3), y: safePosition.y.toFixed(3), z: safePosition.z.toFixed(3)},
          verticalChange: actualMovement.y.toFixed(3),
          horizontalDistance: Math.sqrt(actualMovement.x * actualMovement.x + actualMovement.z * actualMovement.z).toFixed(3),
          totalDistance: actualMovement.length().toFixed(3)
        });
        
        // Convert movement back to direction and scale for player.move()
        const movementDirection = actualMovement.clone().normalize();
        const movementSpeed = actualMovement.length() / deltaTime;
        
        // Apply the movement through the player system
        this.player.move(movementDirection.multiplyScalar(movementSpeed / speed), deltaTime);
        
        // Log terrain following specifically
        if (Math.abs(actualMovement.y) > 0.01) {
          console.log("🏔️ [MovementSystem] TERRAIN FOLLOWING CONFIRMED:", {
            yChange: actualMovement.y.toFixed(3),
            newHeight: safePosition.y.toFixed(3),
            followingTerrain: true
          });
        }
      } else {
        // Movement was completely blocked
        if (this.frameCount % 30 === 0) {
          console.log("🏃 [MovementSystem] Movement blocked by terrain/collision");
        }
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
