
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
    
    // Set up sprint input handler
    this.setupSprintHandler();
  }
  
  private setupSprintHandler(): void {
    // Listen for double-tap forward sprint activation
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type } = customEvent.detail;
      
      if (type === 'doubleTapForward') {
        this.player.startSprint();
      }
    });
  }
  
  public update(deltaTime: number): void {
    // Handle movement input using the correct InputManager API
    const moveDirection = new THREE.Vector3();
    
    if (this.inputManager.isActionPressed('moveForward')) {
      moveDirection.z -= 1;
    }
    if (this.inputManager.isActionPressed('moveBackward')) {
      moveDirection.z += 1;
    }
    if (this.inputManager.isActionPressed('moveLeft')) {
      moveDirection.x -= 1;
    }
    if (this.inputManager.isActionPressed('moveRight')) {
      moveDirection.x += 1;
    }
    
    // Check for sprint
    if (this.inputManager.isActionPressed('sprint')) {
      if (!this.isSprintEnabled) {
        this.player.startSprint();
        this.isSprintEnabled = true;
      }
    } else {
      if (this.isSprintEnabled) {
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
      
      // Move player
      this.player.move(moveDirection, deltaTime);
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
