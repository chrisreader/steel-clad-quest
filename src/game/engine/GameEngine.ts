
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { SceneManager } from './SceneManager';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { PhysicsManager } from './PhysicsManager';
import { Player } from '../entities/Player';
import { GameState, Enemy } from '../../types/GameTypes';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private clock: THREE.Clock;
  
  private inputManager: InputManager;
  private sceneManager: SceneManager;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private physicsManager: PhysicsManager;
  
  private player: Player;
  private enemies: Enemy[] = [];
  private gameState: GameState;
  
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement) {
    console.log('Initializing Game Engine...');
    
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    
    // Create a div element to mount the scene manager
    const mountDiv = document.createElement('div');
    mountDiv.style.width = '100%';
    mountDiv.style.height = '100%';
    
    // Replace the canvas with our mount div
    if (canvas.parentElement) {
      canvas.parentElement.replaceChild(mountDiv, canvas);
    }
    
    // Initialize managers
    this.inputManager = new InputManager();
    this.sceneManager = new SceneManager(mountDiv);
    this.effectsManager = new EffectsManager(this.sceneManager.getScene());
    this.audioManager = new AudioManager();
    this.physicsManager = new PhysicsManager();
    
    // Initialize game objects
    this.player = new Player();
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      currentLevel: 'tavern',
      score: 0,
      timeElapsed: 0
    };
    
    this.setupEventListeners();
    console.log('Game Engine initialized successfully!');
  }

  private setupEventListeners(): void {
    // Window resize is now handled by SceneManager
  }

  public start(): void {
    console.log('Starting game...');
    this.isRunning = true;
    this.gameState.isPlaying = true;
    
    // Create the default world instead of loading a specific level
    this.sceneManager.createDefaultWorld();
    
    this.gameLoop();
  }

  public stop(): void {
    console.log('Stopping game...');
    this.isRunning = false;
    this.gameState.isPlaying = false;
  }

  public pause(): void {
    this.gameState.isPaused = !this.gameState.isPaused;
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.gameLoop());
    
    if (this.gameState.isPaused) return;
    
    const deltaTime = this.clock.getDelta();
    this.gameState.timeElapsed += deltaTime;
    
    // Update game systems
    this.inputManager.update();
    this.player.update(deltaTime);
    this.updateEnemies(deltaTime);
    this.physicsManager.update(deltaTime);
    this.effectsManager.update(deltaTime);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Render the scene using SceneManager
    this.sceneManager.render();
  }

  private updateEnemies(deltaTime: number): void {
    this.enemies.forEach(enemy => {
      // Basic enemy AI and movement will be implemented in enemy classes
    });
  }

  private updateCamera(): void {
    const playerPosition = this.player.getPosition();
    const camera = this.sceneManager.getCamera();
    camera.position.x = playerPosition.x;
    camera.position.z = playerPosition.z + 10;
    camera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getScene(): THREE.Scene {
    return this.sceneManager.getScene();
  }

  public dispose(): void {
    this.stop();
    this.sceneManager.dispose();
    this.audioManager.dispose();
  }
}
