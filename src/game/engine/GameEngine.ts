import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { PhysicsManager } from './PhysicsManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { GameState, PlayerStats } from '../../types/GameTypes';

export class GameEngine {
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private physicsManager: PhysicsManager;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
  private player: Player;
  private enemies: Enemy[] = [];
  private goldItems: Gold[] = [];
  
  private gameState: GameState;
  private isInitialized: boolean = false;
  private running: boolean = false;
  private paused: boolean = false;
  
  // Callbacks
  private onUpdateHealth?: (health: number) => void;
  private onUpdateGold?: (gold: number) => void;
  private onUpdateStamina?: (stamina: number) => void;
  private onUpdateScore?: (score: number) => void;
  private onGameOver?: (score: number) => void;
  private onLocationChange?: (isInTavern: boolean) => void;
  
  // Camera control variables
  private pitch: number = 0;
  private yaw: number = 0;
  private maxPitch: number = Math.PI / 2 - 0.1;
  
  constructor(mountElement: HTMLDivElement) {
    console.log('[GameEngine] Constructor called with mount element:', mountElement);
    
    // Initialize managers
    this.sceneManager = new SceneManager(mountElement);
    this.inputManager = new InputManager();
    this.physicsManager = new PhysicsManager();
    this.effectsManager = new EffectsManager(this.sceneManager.getScene());
    this.audioManager = new AudioManager();
    
    // Initialize player with required parameters
    this.player = new Player(this.sceneManager.getScene(), this.effectsManager);
    
    // Initialize game state
    this.gameState = {
      score: 0,
      timeElapsed: 0,
      enemiesDefeated: 0,
      goldCollected: 0,
      isInTavern: false
    };
    
    console.log('[GameEngine] Initialization complete');
  }
  
  public async initialize(): Promise<void> {
    console.log('[GameEngine] Starting initialization...');
    
    try {
      // Set up loading progress callback
      this.sceneManager.setLoadingProgressCallback((progress) => {
        console.log(`Loading progress: ${progress.stage} (${progress.progress}/${progress.total})`);
      });
      
      // Create the world (this is now async and shows progress)
      await this.sceneManager.createWorld();
      
      // Add player to scene - player is already added in constructor
      
      // Set up input handling with proper debugging
      this.setupInputHandling();
      
      // Position camera at player position (first-person)
      const camera = this.sceneManager.getCamera();
      const playerPos = this.player.getPosition();
      camera.position.copy(playerPos);
      camera.position.y = playerPos.y + 1.6; // Eye level offset
      
      console.log('[GameEngine] Camera positioned at:', camera.position);
      
      this.isInitialized = true;
      this.running = true;
      
      // Start render loop
      this.startRenderLoop();
      
      console.log('[GameEngine] Initialization completed successfully');
      
    } catch (error) {
      console.error('[GameEngine] Initialization failed:', error);
      throw error;
    }
  }
  
  private setupInputHandling(): void {
    console.log('[GameEngine] Setting up input handling...');
    
    // Listen for game input events
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      console.log('Game input received:', type, data);
      this.handleInput(type, data);
    });
    
    // Set up WASD movement
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false
    };
    
    document.addEventListener('keydown', (event) => {
      console.log('Key pressed:', event.code);
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.sprint = true;
          break;
      }
      
      this.updateMovement(keys);
    });
    
    document.addEventListener('keyup', (event) => {
      console.log('Key released:', event.code);
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.sprint = false;
          break;
      }
      
      this.updateMovement(keys);
    });
    
    console.log('[GameEngine] Input handling setup complete');
  }
  
  private updateMovement(keys: any): void {
    if (!this.running || this.paused) return;
    
    const camera = this.sceneManager.getCamera();
    const moveSpeed = keys.sprint ? 0.2 : 0.1;
    
    // Calculate movement direction based on camera rotation
    const direction = new THREE.Vector3();
    
    if (keys.forward) {
      direction.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-moveSpeed));
    }
    if (keys.backward) {
      direction.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(moveSpeed));
    }
    if (keys.left) {
      const left = new THREE.Vector3();
      camera.getWorldDirection(left);
      left.cross(camera.up).normalize().multiplyScalar(-moveSpeed);
      direction.add(left);
    }
    if (keys.right) {
      const right = new THREE.Vector3();
      camera.getWorldDirection(right);
      right.cross(camera.up).normalize().multiplyScalar(moveSpeed);
      direction.add(right);
    }
    
    // Keep movement on ground level
    direction.y = 0;
    
    if (direction.length() > 0) {
      const newPosition = camera.position.clone().add(direction);
      camera.position.copy(newPosition);
      
      // Update player position to match camera
      this.player.setPosition(newPosition);
      
      console.log('Player moved to:', camera.position);
    }
  }
  
  public handleInput(type: string, data?: any): void {
    if (!this.running) return;
    
    console.log(`Handling input: ${type}`, data);
    
    switch (type) {
      case 'look':
        this.handleMouseLook(data.x, data.y);
        break;
      case 'attack':
        this.handleAttack();
        break;
      case 'playSound':
        if (data?.soundName) {
          // this.audioManager.playSound(data.soundName);
        }
        break;
    }
  }
  
  private handleMouseLook(deltaX: number, deltaY: number): void {
    console.log('Handling mouse look:', deltaX, deltaY);
    
    const sensitivity = 100; // Increased sensitivity
    
    // Update yaw (horizontal rotation)
    this.yaw -= deltaX * sensitivity;
    
    // Update pitch (vertical rotation) with limits
    this.pitch -= deltaY * sensitivity;
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
    
    console.log('Camera rotation updated - Pitch:', this.pitch, 'Yaw:', this.yaw);
    
    // Apply rotation to camera
    const camera = this.sceneManager.getCamera();
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw;
    camera.rotation.x = this.pitch;
    
    console.log('Camera quaternion updated:', camera.quaternion);
  }
  
  private handleAttack(): void {
    console.log('Attack triggered');
    // Implement attack logic here
    // this.audioManager.playSound('sword_swing');
  }
  
  private startRenderLoop(): void {
    const animate = () => {
      if (!this.running) return;
      
      requestAnimationFrame(animate);
      
      if (!this.paused) {
        this.update();
      }
      
      this.render();
    };
    
    animate();
    console.log('[GameEngine] Render loop started');
  }
  
  private update(): void {
    // Update game logic here
    if (this.isInitialized) {
      this.gameState.timeElapsed += 1/60; // Assuming 60 FPS
      
      // Update player
      this.player.update(1/60);
      
      // Update enemies
      this.enemies.forEach(enemy => enemy.update(1/60, this.player.getPosition()));
      
      // Update effects
      this.effectsManager.update(1/60);
      
      // Check for collisions, etc.
    }
  }
  
  private render(): void {
    this.sceneManager.render();
  }
  
  // Callback setters
  public setOnUpdateHealth(callback: (health: number) => void): void {
    this.onUpdateHealth = callback;
  }
  
  public setOnUpdateGold(callback: (gold: number) => void): void {
    this.onUpdateGold = callback;
  }
  
  public setOnUpdateStamina(callback: (stamina: number) => void): void {
    this.onUpdateStamina = callback;
  }
  
  public setOnUpdateScore(callback: (score: number) => void): void {
    this.onUpdateScore = callback;
  }
  
  public setOnGameOver(callback: (score: number) => void): void {
    this.onGameOver = callback;
  }
  
  public setOnLocationChange(callback: (isInTavern: boolean) => void): void {
    this.onLocationChange = callback;
  }
  
  // Game state methods
  public isRunning(): boolean {
    return this.running;
  }
  
  public isPaused(): boolean {
    return this.paused;
  }
  
  public pause(): void {
    this.paused = !this.paused;
    console.log('Game paused:', this.paused);
  }
  
  public restart(): void {
    console.log('Restarting game...');
    this.paused = false;
    this.gameState = {
      score: 0,
      timeElapsed: 0,
      enemiesDefeated: 0,
      goldCollected: 0,
      isInTavern: false
    };
    
    // Reset player position
    this.player.setPosition(new THREE.Vector3(0, 1.8, 5));
    const camera = this.sceneManager.getCamera();
    camera.position.set(0, 1.8, 5);
    this.pitch = 0;
    this.yaw = 0;
    camera.rotation.set(0, 0, 0);
  }
  
  public getPlayer(): Player {
    return this.player;
  }
  
  public getGameState(): GameState {
    return this.gameState;
  }
  
  public dispose(): void {
    console.log('[GameEngine] Disposing...');
    this.running = false;
    this.sceneManager.dispose();
    // this.audioManager.dispose();
  }
}
