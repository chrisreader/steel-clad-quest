

import * as THREE from 'three';
import { Player } from '../entities/Player';
import { InputManager } from '../engine/InputManager';

export class MovementSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private player: Player;
  private inputManager: InputManager;
  private isSprintEnabled: boolean = false;
  
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
    
    console.log("MovementSystem initialized with player at:", this.player.getPosition());
    
    // Set up sprint input handler
    this.setupSprintHandler();
  }
  
  private setupSprintHandler(): void {
    // Listen for double-tap forward sprint activation
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type } = customEvent.detail;
      
      if (type === 'doubleTapForward') {
        console.log("Double tap forward detected - starting sprint");
        this.player.startSprint();
      }
    });
  }
  
  public update(deltaTime: number): void {
    // Handle movement input using the correct InputManager API
    const moveDirection = new THREE.Vector3();
    let hasMovementInput = false;
    
    if (this.inputManager.isActionPressed('moveForward')) {
      moveDirection.z -= 1;
      hasMovementInput = true;
    }
    if (this.inputManager.isActionPressed('moveBackward')) {
      moveDirection.z += 1;
      hasMovementInput = true;
    }
    if (this.inputManager.isActionPressed('moveLeft')) {
      moveDirection.x -= 1;
      hasMovementInput = true;
    }
    if (this.inputManager.isActionPressed('moveRight')) {
      moveDirection.x += 1;
      hasMovementInput = true;
    }
    
    // Debug log movement input
    if (hasMovementInput) {
      console.log("Movement input detected:", {
        direction: moveDirection,
        playerPos: this.player.getPosition(),
        deltaTime: deltaTime
      });
    }
    
    // Check for sprint
    if (this.inputManager.isActionPressed('sprint')) {
      if (!this.isSprintEnabled) {
        console.log("Sprint started");
        this.player.startSprint();
        this.isSprintEnabled = true;
      }
    } else {
      if (this.isSprintEnabled) {
        console.log("Sprint stopped");
        this.player.stopSprint();
        this.isSprintEnabled = false;
      }
    }
    
    // Normalize movement
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Apply sprint multiplier if sprinting
      const speed = this.player.getSprinting() ? 1.5 : 1.0;
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
      
      // Move player in world space
      this.player.move(worldMoveDirection, deltaTime);
      
      // Log movement result
      const newPosition = this.player.getPosition();
      const actualMovement = newPosition.clone().sub(previousPosition);
      
      if (actualMovement.length() > 0.001) {
        console.log("Player moved:", {
          from: previousPosition,
          to: newPosition,
          movement: actualMovement,
          distance: actualMovement.length()
        });
      }
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

