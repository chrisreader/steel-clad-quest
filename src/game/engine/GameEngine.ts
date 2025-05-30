import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { Player } from './Player';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { MovementSystem } from './systems/MovementSystem';
import { CombatSystem } from './systems/CombatSystem';
import { EffectsManager } from './EffectsManager';

export class GameEngine {
  private sceneManager: SceneManager;
  private inputManager: InputManager | null = null;
  private audioManager: AudioManager;
  private movementSystem: MovementSystem;
  private combatSystem: CombatSystem;
  private effectsManager: EffectsManager;
  private player: Player | null = null;
  private initialized: boolean = false;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private gameState: any;
  
  // Movement state
  private isMoving: boolean = false;
  
  // UI state tracking - CRITICAL ADDITION
  private isUIOpen: boolean = false;
  
  // First-person camera controls
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private mouseSensitivity: number = 0.002;
  
  constructor() {
    console.log('🎮 [GameEngine] Initializing GameEngine...');
    
    // Initialize all managers and systems
    this.sceneManager = new SceneManager();
    this.audioManager = new AudioManager();
    this.movementSystem = new MovementSystem();
    this.combatSystem = new CombatSystem(this.sceneManager);
    this.effectsManager = new EffectsManager(this.sceneManager);
    
    this.gameState = {
      playing: false,
      paused: false,
      gameOver: false,
      score: 0,
      timeElapsed: 0
    };
  }
  
  // NEW METHOD: Set UI state from KnightGame
  public setUIState(isUIOpen: boolean): void {
    console.log(`🎮 [GameEngine] UI state changed to: ${isUIOpen ? 'OPEN' : 'CLOSED'}`);
    this.isUIOpen = isUIOpen;
  }
  
  public async initialize(): Promise<void> {
    console.log('🎮 [GameEngine] Initializing game engine...');
    
    try {
      // Initialize all managers
      await this.sceneManager.initialize();
      await this.audioManager.initialize();
      
      // Get the InputManager instance from SceneManager
      this.inputManager = this.sceneManager.getInputManager();
      
      if (!this.inputManager) {
        throw new Error('InputManager not available from SceneManager');
      }
      
      console.log('🎮 [GameEngine] InputManager obtained from SceneManager');
      
      // Initialize player
      this.player = await this.sceneManager.createPlayer();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('🎮 [GameEngine] Game engine initialized successfully');
    } catch (error) {
      console.error('🎮 [GameEngine] Failed to initialize:', error);
      throw error;
    }
  }
  
  public getInputManager() {
    return this.inputManager;
  }
  
  public start(): void {
    if (!this.initialized) {
      console.warn('🎮 [GameEngine] GameEngine not initialized, cannot start.');
      return;
    }
    
    if (this.gameState.playing) {
      console.log('🎮 [GameEngine] Game is already running.');
      return;
    }
    
    console.log('🎮 [GameEngine] Starting the game...');
    this.gameState.playing = true;
    this.gameState.paused = false;
    this.gameState.gameOver = false;
    
    // Reset game state
    this.gameState.score = 0;
    this.gameState.timeElapsed = 0;
    
    // Start the render loop
    this.lastFrameTime = performance.now();
    this.renderLoop();
  }
  
  public stop(): void {
    console.log('🎮 [GameEngine] Stopping the game.');
    this.gameState.playing = false;
  }
  
  public pause(): void {
    if (!this.gameState.playing) {
      console.warn('🎮 [GameEngine] Cannot pause, game is not running.');
      return;
    }
    
    console.log('🎮 [GameEngine] Pausing the game.');
    this.gameState.paused = true;
  }
  
  public resume(): void {
    if (!this.gameState.paused) {
      console.warn('🎮 [GameEngine] Cannot resume, game is not paused.');
      return;
    }
    
    console.log('🎮 [GameEngine] Resuming the game.');
    this.gameState.paused = false;
  }
  
  private setupEventListeners(): void {
    // Listen for custom game input events from InputManager
    document.addEventListener('gameInput', this.handleInputEvent.bind(this));
    
    // Listen for window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  private handleInputEvent(event: CustomEvent): void {
    const { type, data } = event.detail;
    this.handleInput(type, data);
  }
  
  public handleInput(inputType: string, data?: any): void {
    console.log(`🎮 [GameEngine] Input received:`, { type: inputType, data });
    
    if (!this.initialized || !this.gameState.playing) {
      return;
    }
    
    switch (inputType) {
      case 'moveForward':
        this.movementSystem.setInput('forward', true);
        break;
      case 'moveBackward':
        this.movementSystem.setInput('backward', true);
        break;
      case 'moveLeft':
        this.movementSystem.setInput('left', true);
        break;
      case 'moveRight':
        this.movementSystem.setInput('right', true);
        break;
      case 'sprint':
        this.movementSystem.setInput('sprint', true);
        break;
      case 'jump':
        this.movementSystem.setInput('jump', true);
        break;
      case 'attack':
        // CRITICAL ADDITION: Additional safety check for attack input
        if (!this.isUIOpen) {
          console.log('⚔️ [GameEngine] Processing attack input');
          this.handleAttack();
        } else {
          console.log('🚫 [GameEngine] Attack ignored - UI is open');
        }
        break;
      case 'attackEnd':
        if (!this.isUIOpen) {
          this.handleAttackEnd();
        }
        break;
      case 'look':
        this.handleMouseLook(data.x, data.y);
        break;
      case 'pointerLockChange':
        this.handlePointerLockChange(data.locked);
        break;
      case 'requestPointerLock':
        this.requestPointerLock();
        break;
      case 'requestPointerUnlock':
        this.exitPointerLock();
        break;
      case 'playSound':
        if (data.soundName) {
          this.audioManager.playSound(data.soundName);
        }
        break;
    }
  }
  
  private handleMouseLook(deltaX: number, deltaY: number): void {
    // CRITICAL FIX: Ignore mouse look when UI is open
    if (this.isUIOpen) {
      console.log(`🚫 [GameEngine] Mouse look ignored - UI is open (deltaX: ${deltaX}, deltaY: ${deltaY})`);
      return;
    }
    
    console.log("📹 [GameEngine] Processing mouse look:", deltaX, deltaY);
    
    // Update yaw (left/right rotation)
    this.cameraRotation.yaw -= deltaX * this.mouseSensitivity;
    
    // Update pitch (up/down rotation) with limits
    this.cameraRotation.pitch -= deltaY * this.mouseSensitivity;
    this.cameraRotation.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.pitch));
    
    // Apply rotation to camera
    if (this.sceneManager) {
      this.sceneManager.updateCameraRotation(this.cameraRotation.yaw, this.cameraRotation.pitch);
    }
  }
  
  private handleAttack(): void {
    if (this.player && this.combatSystem) {
      console.log('🗡️ [GameEngine] Player attacking');
      this.player.attack();
      this.audioManager.playSound('sword_swing');
    }
  }
  
  private handleAttackEnd(): void {
    if (this.player) {
      this.player.stopAttack();
    }
  }
  
  private handlePointerLockChange(locked: boolean): void {
    console.log(`🔒 [GameEngine] Pointer lock changed: ${locked}`);
    
    if (locked) {
      console.log('🎮 [GameEngine] Pointer locked - game controls active');
    } else {
      console.log('🎮 [GameEngine] Pointer unlocked - game controls inactive');
    }
  }
  
  public requestPointerLock(): void {
    if (this.inputManager) {
      this.inputManager.requestPointerLock();
    }
  }
  
  public exitPointerLock(): void {
    if (this.inputManager) {
      this.inputManager.exitPointerLock();
    }
  }
  
  private renderLoop = (): void => {
    if (!this.gameState.playing) {
      console.log('🎮 [GameEngine] Render loop stopped.');
      return;
    }
    
    requestAnimationFrame(this.renderLoop);
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    
    this.update(deltaTime);
    this.render();
  }
  
  private update(deltaTime: number): void {
    if (!this.gameState.playing || this.gameState.paused) {
      return;
    }
    
    // Update game state
    this.gameState.timeElapsed += deltaTime;
    
    // Update systems
    if (this.movementSystem && this.player) {
      this.movementSystem.update(this.player, deltaTime);
    }
    
    if (this.combatSystem) {
      this.combatSystem.update(deltaTime);
    }
    
    // Update player
    if (this.player) {
      this.player.update(deltaTime);
    }
    
    // Update scene
    if (this.sceneManager) {
      this.sceneManager.update(deltaTime);
    }
    
    // Update audio
    if (this.audioManager) {
      this.audioManager.update(deltaTime);
    }
    
    // Update effects
    if (this.effectsManager) {
      this.effectsManager.update(deltaTime);
    }
  }
  
  private render(): void {
    if (this.sceneManager) {
      this.sceneManager.render();
    }
    
    // Log render info periodically
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      const fps = (1000 / (performance.now() - this.lastFrameTime)).toFixed(1);
      console.log(`🎮 [GameEngine] Render loop active:`, {
        frame: this.frameCount,
        fps: fps,
        playing: this.gameState.playing,
        paused: this.gameState.paused,
        cameraPos: this.player?.getPosition(),
        sceneChildren: this.sceneManager?.getScene()?.children.length
      });
    }
    this.lastFrameTime = performance.now();
  }
  
  public getPlayer(): any {
    return this.player;
  }
  
  public getGameState(): any {
    return { ...this.gameState };
  }
  
  public isRunning(): boolean {
    return this.gameState.playing;
  }
  
  public isPaused(): boolean {
    return this.gameState.paused;
  }
  
  public dispose(): void {
    console.log('🎮 [GameEngine] Disposing game engine...');
    
    // Stop the game loop
    this.stop();
    
    // Remove event listeners
    document.removeEventListener('gameInput', this.handleInputEvent);
    window.removeEventListener('resize', this.handleResize);
    
    // Dispose of all managers
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
    
    if (this.audioManager) {
      this.audioManager.dispose();
    }
    
    if (this.inputManager) {
      this.inputManager.dispose();
    }
    
    console.log('🎮 [GameEngine] Game engine disposed');
  }
  
  private handleResize(): void {
    if (this.sceneManager) {
      this.sceneManager.handleResize();
    }
  }
}
