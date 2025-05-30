
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
      this.isSprintEnabled = true;
    } else {
      this.isSprintEnabled = false;
    }
    
    // Normalize movement
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      // Apply sprint multiplier
      const speed = this.isSprintEnabled ? 1.5 : 1.0;
      moveDirection.multiplyScalar(speed);
      
      // Move player
      this.player.move(moveDirection, deltaTime);
    }
  }
  
  public setSprintEnabled(enabled: boolean): void {
    this.isSprintEnabled = enabled;
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
