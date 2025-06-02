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
  
  // NEW: Vertical movement properties
  private maxSlopeAngle: number = 45; // Maximum walkable slope in degrees
  private stepHeight: number = 0.3; // Maximum step height player can walk up
  private smoothVerticalMovement: boolean = true; // Smooth Y transitions
  
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
    
    console.log("🏃 [MovementSystem] Initialized with collision detection and vertical movement");
    
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
      
      // NEW: Enhanced movement with vertical positioning
      const safePosition = this.calculateVerticalMovement(currentPosition, targetPosition);
      
      // Calculate actual movement vector
      const actualMovement = new THREE.Vector3().subVectors(safePosition, currentPosition);
      
      if (actualMovement.length() > 0.001) {
        // Convert back to normalized direction for player.move()
        const normalizedMovement = actualMovement.clone().normalize();
        const movementScale = actualMovement.length() / (5.0 * deltaTime);
        
        console.log("🏃 [MovementSystem] Moving with vertical adjustment:", {
          from: currentPosition,
          to: safePosition,
          movement: actualMovement,
          distance: actualMovement.length(),
          verticalChange: safePosition.y - currentPosition.y
        });
        
        this.player.move(normalizedMovement.multiplyScalar(movementScale), deltaTime);
      } else {
        console.log("🏃 [MovementSystem] Movement blocked by collision or steep slope");
      }
    }
  }
  
  // NEW: Calculate movement with vertical positioning on slopes
  private calculateVerticalMovement(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3): THREE.Vector3 {
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const horizontalDistance = direction.length();
    
    if (horizontalDistance === 0) return currentPosition;
    
    direction.normalize();
    
    // Check for horizontal collision first
    const collision = this.physicsManager.checkRayCollision(currentPosition, direction, horizontalDistance, ['projectile', 'enemy']);
    
    if (collision) {
      // Calculate safe position just before collision
      const safeDistance = Math.max(0, collision.distance - 0.4 - 0.1); // player radius + buffer
      const safeHorizontalPosition = currentPosition.clone().add(direction.multiplyScalar(safeDistance));
      
      // Check ground height at safe position
      const groundInfo = this.physicsManager.getGroundHeight(safeHorizontalPosition);
      
      if (this.physicsManager.isWalkableSlope(groundInfo.normal, this.maxSlopeAngle)) {
        const verticalDifference = groundInfo.height - currentPosition.y;
        
        // Allow stepping up small obstacles
        if (verticalDifference <= this.stepHeight || verticalDifference < 0) {
          safeHorizontalPosition.y = groundInfo.height + 0.5; // Keep player above ground
          return safeHorizontalPosition;
        }
      }
      
      // Try wall sliding if vertical movement isn't possible
      return this.handleWallSliding(currentPosition, targetPosition, collision);
    }
    
    // No horizontal collision, check ground height at target
    const groundInfo = this.physicsManager.getGroundHeight(targetPosition);
    
    // Check if slope is walkable
    if (this.physicsManager.isWalkableSlope(groundInfo.normal, this.maxSlopeAngle)) {
      const verticalDifference = groundInfo.height - currentPosition.y;
      
      // Allow movement if it's a gentle slope or step
      if (Math.abs(verticalDifference) <= this.stepHeight || verticalDifference < 0) {
        const adjustedTarget = targetPosition.clone();
        adjustedTarget.y = groundInfo.height + 0.5; // Keep player above ground
        return adjustedTarget;
      } else {
        // Slope too steep, try to find intermediate position
        return this.findWalkablePath(currentPosition, targetPosition);
      }
    }
    
    // Default: maintain current height if no ground found
    return targetPosition;
  }
  
  // NEW: Find a walkable path when direct path is too steep
  private findWalkablePath(currentPosition: THREE.Vector3, targetPosition: THREE.Vector3): THREE.Vector3 {
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    const steps = 5; // Number of intermediate points to check
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const intermediatePos = currentPosition.clone().lerp(targetPosition, progress);
      
      const groundInfo = this.physicsManager.getGroundHeight(intermediatePos);
      const verticalDiff = groundInfo.height - currentPosition.y;
      
      if (this.physicsManager.isWalkableSlope(groundInfo.normal, this.maxSlopeAngle) && 
          Math.abs(verticalDiff) <= this.stepHeight) {
        intermediatePos.y = groundInfo.height + 0.5;
        return intermediatePos;
      }
    }
    
    // No walkable path found, stay in current position
    return currentPosition;
  }
  
  // NEW: Enhanced wall sliding that considers vertical movement
  private handleWallSliding(currentPos: THREE.Vector3, targetPos: THREE.Vector3, collision: { object: any; distance: number; point: THREE.Vector3 }): THREE.Vector3 {
    // Get collision normal
    const collisionBox = collision.object.box;
    const collisionCenter = collisionBox.getCenter(new THREE.Vector3());
    const normal = new THREE.Vector3().subVectors(collision.point, collisionCenter).normalize();
    
    // Project movement vector onto plane perpendicular to collision normal
    const movement = new THREE.Vector3().subVectors(targetPos, currentPos);
    const projectedMovement = movement.clone().sub(normal.clone().multiplyScalar(movement.dot(normal)));
    
    const slideTarget = currentPos.clone().add(projectedMovement);
    
    // Check ground height at slide target
    const groundInfo = this.physicsManager.getGroundHeight(slideTarget);
    
    if (this.physicsManager.isWalkableSlope(groundInfo.normal, this.maxSlopeAngle)) {
      slideTarget.y = groundInfo.height + 0.5;
      
      // Verify sliding movement isn't blocked
      const slideDirection = projectedMovement.normalize();
      const slideDistance = projectedMovement.length();
      const slideCollision = this.physicsManager.checkRayCollision(currentPos, slideDirection, slideDistance, ['projectile', 'enemy']);
      
      if (!slideCollision) {
        return slideTarget;
      }
    }
    
    // Can't slide, stay in current position
    return currentPos;
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
