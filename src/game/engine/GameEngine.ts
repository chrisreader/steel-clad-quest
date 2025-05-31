
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { SceneManager } from './SceneManager';
import { RenderEngine } from './RenderEngine';
import { StateManager } from './StateManager';
import { UIIntegrationManager } from './UIIntegrationManager';
import { AudioManager } from './AudioManager';
import { EffectsManager } from './EffectsManager';
import { PhysicsManager } from './PhysicsManager';

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private renderEngine: RenderEngine;
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private stateManager: StateManager;
  private uiIntegrationManager: UIIntegrationManager;
  private audioManager: AudioManager;
  private effectsManager: EffectsManager;
  private physicsManager: PhysicsManager;
  private player: Player | null = null;
  private gameRunning: boolean = false;
  private isPausedState: boolean = false;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  
  // Callback functions
  private onUpdateHealth?: (health: number) => void;
  private onUpdateGold?: (gold: number) => void;
  private onUpdateStamina?: (stamina: number) => void;
  private onUpdateScore?: (score: number) => void;
  private onGameOver?: (score: number) => void;
  private onLocationChange?: (isInTavern: boolean) => void;

  constructor(mountElement: HTMLDivElement) {
    console.log('[GameEngine] Constructor called with mountElement:', mountElement);
    
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // Configure renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87CEEB);
    
    // Mount to DOM
    mountElement.appendChild(this.renderer.domElement);
    console.log('[GameEngine] Renderer mounted to DOM element');
    
    // Initialize managers
    this.renderEngine = new RenderEngine(this.scene, this.camera, this.renderer);
    this.sceneManager = new SceneManager(this.scene, this.camera, this.renderer);
    this.inputManager = new InputManager();
    this.stateManager = new StateManager();
    this.uiIntegrationManager = new UIIntegrationManager();
    this.audioManager = new AudioManager();
    this.effectsManager = new EffectsManager(this.scene);
    this.physicsManager = new PhysicsManager();
    
    // Initialize input manager with renderer
    this.inputManager.initialize(this.renderer);
    
    console.log('[GameEngine] All managers initialized');
    
    // Handle window resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  public async initialize(): Promise<void> {
    console.log('[GameEngine] Starting initialization...');
    
    try {
      // Initialize scene
      await this.sceneManager.initialize();
      console.log('[GameEngine] Scene initialized');
      
      // Create player
      this.player = new Player(this.scene, this.camera, this.renderer);
      await this.player.initialize();
      console.log('[GameEngine] Player created and initialized');
      
      // Initialize other managers
      await this.renderEngine.initialize();
      await this.physicsManager.initialize();
      
      console.log('[GameEngine] Initialization completed successfully');
    } catch (error) {
      console.error('[GameEngine] Initialization failed:', error);
      throw error;
    }
  }

  public start(): void {
    if (this.gameRunning) {
      console.log('[GameEngine] Already running');
      return;
    }
    
    console.log('[GameEngine] Starting game engine...');
    this.gameRunning = true;
    this.isPausedState = false;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public pause(): void {
    this.isPausedState = !this.isPausedState;
    console.log('[GameEngine] Pause state changed to:', this.isPausedState);
  }

  public restart(): void {
    console.log('[GameEngine] Restarting game engine - will recreate player...');
    
    // Stop current game loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Dispose current player
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    
    // Reset state
    this.gameRunning = false;
    this.isPausedState = false;
    
    // Recreate player and restart
    this.createNewPlayer().then(() => {
      this.start();
      console.log('[GameEngine] Restart completed with new player');
    });
  }

  private async createNewPlayer(): Promise<void> {
    console.log('[GameEngine] Creating new player...');
    this.player = new Player(this.scene, this.camera, this.renderer);
    await this.player.initialize();
    console.log('[GameEngine] New player created and initialized');
  }

  private gameLoop(): void {
    if (!this.gameRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    if (!this.isPausedState) {
      this.update(deltaTime);
      this.render();
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    if (!this.player) return;
    
    // Update player with input state
    const inputState = this.inputManager.getInputState();
    
    // Handle bow drawing input
    if (inputState.bowDraw && !this.player.isBowDrawing) {
      console.log('🎮 [GameEngine] Starting bow draw from input');
      this.player.startBowDraw();
    } else if (!inputState.bowDraw && this.player.isBowDrawing) {
      console.log('🎮 [GameEngine] Stopping bow draw from input');
      this.player.stopBowDraw();
    }
    
    // Handle movement
    if (inputState.moveForward) {
      this.player.moveForward(deltaTime);
    }
    if (inputState.moveBackward) {
      this.player.moveBackward(deltaTime);
    }
    if (inputState.moveLeft) {
      this.player.moveLeft(deltaTime);
    }
    if (inputState.moveRight) {
      this.player.moveRight(deltaTime);
    }
    
    // Handle sprint
    this.player.setSprinting(inputState.sprint);
    
    // Update player
    this.player.update(deltaTime);
    
    // Update other systems
    this.physicsManager.update(deltaTime);
    this.effectsManager.update(deltaTime);
    this.sceneManager.update(deltaTime);
    
    // Reset mouse delta after each frame
    this.inputManager.update();
  }

  private render(): void {
    this.renderEngine.render();
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public handleInput(action: string, data?: any): void {
    if (!this.gameRunning) return;
    
    // Handle input actions
    switch (action) {
      case 'requestPointerLock':
        this.inputManager.requestPointerLock();
        break;
      case 'requestPointerUnlock':
        this.inputManager.exitPointerLock();
        break;
      default:
        // Let input manager handle other inputs
        break;
    }
  }

  // Getters for external access
  public getPlayer(): Player | null {
    return this.player;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getGameState(): any {
    return {
      timeElapsed: performance.now() / 1000,
      isRunning: this.gameRunning,
      isPaused: this.isPausedState
    };
  }

  public isRunning(): boolean {
    return this.gameRunning;
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public setUIState(uiOpen: boolean): void {
    // Handle UI state changes
    if (uiOpen) {
      this.inputManager.exitPointerLock();
    }
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

  public dispose(): void {
    console.log('[GameEngine] Disposing...');
    
    // Stop game loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Dispose managers
    this.inputManager.dispose();
    this.sceneManager.dispose();
    this.renderEngine.dispose();
    this.effectsManager.dispose();
    this.physicsManager.dispose();
    
    // Dispose player
    if (this.player) {
      this.player.dispose();
    }
    
    // Remove renderer from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    this.gameRunning = false;
    console.log('[GameEngine] Disposed');
  }
}
