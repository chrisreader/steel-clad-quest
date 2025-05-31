
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { CombatSystem } from '../systems/CombatSystem';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { RenderEngine } from './RenderEngine';
import { SceneManager } from './SceneManager';
import { StateManager } from './StateManager';
import { PlayerStats } from '../../types/GameTypes';

export class GameEngine {
  private mountElement: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private inputManager: InputManager;
  private player: Player;
  private combatSystem: CombatSystem;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private renderEngine: RenderEngine;
  private sceneManager: SceneManager;
  private stateManager: StateManager;
  private running: boolean = false;
  private paused: boolean = false;
  
  // Callback functions
  private onUpdateHealth?: (health: number) => void;
  private onUpdateGold?: (gold: number) => void;
  private onUpdateStamina?: (stamina: number) => void;
  private onUpdateScore?: (score: number) => void;
  private onGameOver?: (score: number) => void;
  private onLocationChange?: (isInTavern: boolean) => void;
  
  constructor(mountElement: HTMLDivElement) {
    console.log('⚙️ [GameEngine] Initializing with mount element...');
    
    this.mountElement = mountElement;
    
    // Initialize Three.js core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.mountElement.appendChild(this.renderer.domElement);
    
    // Initialize clock
    this.clock = new THREE.Clock();
    
    // Initialize managers
    this.inputManager = new InputManager();
    this.effectsManager = new EffectsManager(this.scene);
    this.audioManager = new AudioManager();
    this.renderEngine = new RenderEngine(this.scene, this.camera, this.renderer);
    this.sceneManager = new SceneManager(this.scene);
    this.stateManager = new StateManager();
    
    // Initialize player
    this.player = new Player(this.scene, this.effectsManager, this.audioManager);
    
    // Initialize combat system
    this.combatSystem = new CombatSystem(this.scene, this.player, this.effectsManager, this.audioManager);
    
    // Set initial camera position
    this.camera.position.set(0, 2, 5);
    
    console.log('⚙️ [GameEngine] Initialization complete.');
  }

  public async initialize(): Promise<void> {
    console.log('⚙️ [GameEngine] Async initialization started...');
    
    // Initialize input manager
    this.inputManager.initialize(this.renderer);
    
    // Load audio resources if available
    if (this.audioManager && typeof this.audioManager.loadAudio === 'function') {
      await this.audioManager.loadAudio();
      console.log('🔊 [GameEngine] Audio resources loaded.');
    }
    
    // Set up basic scene if available
    if (this.sceneManager && typeof this.sceneManager.setupBasicLevel === 'function') {
      this.sceneManager.setupBasicLevel();
    }
    
    // Set up input handling for bow drawing
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      console.log('🎮 [GameEngine] Input event received:', type, data);
      
      if (type === 'attack') {
        this.combatSystem.startPlayerAttack();
      } else if (type === 'attackEnd') {
        this.combatSystem.stopPlayerAttack();
      }
      
      if (type === 'pause') {
        this.pause();
      }
      
      if (type === 'interact') {
        console.log('🎮 [GameEngine] Interact action');
      }
    });

    console.log('⚙️ [GameEngine] Async initialization complete.');
  }

  private update(): void {
    const deltaTime = this.clock.getDelta();
    
    // Update input manager
    this.inputManager.update();
    
    // Handle player movement
    const moveSpeed = this.player.getStats().movementSpeed * deltaTime;
    let forward = 0;
    let strafe = 0;
    
    if (this.inputManager.isActionPressed('moveForward')) forward = 1;
    if (this.inputManager.isActionPressed('moveBackward')) forward = -1;
    if (this.inputManager.isActionPressed('moveLeft')) strafe = 1;
    if (this.inputManager.isActionPressed('moveRight')) strafe = -1;
    
    // Normalize movement vector
    const direction = new THREE.Vector3(strafe, 0, forward);
    direction.normalize();
    
    // Apply movement
    this.player.move(direction.x * moveSpeed, direction.z * moveSpeed);
    
    // Update combat system
    this.combatSystem.update(deltaTime);
    
    // Update player with bow charge consideration
    this.player.updateWeaponAnimationWithBowCharge(deltaTime);
    
    // Update effects
    this.effectsManager.update(deltaTime);
    
    // Update audio
    this.audioManager.update(this.player.getPosition());
    
    // Update camera position
    this.updateCameraPosition(this.player.getPosition());
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private updateCameraPosition(playerPosition: THREE.Vector3): void {
    // Follow the player with the camera
    this.camera.position.x = playerPosition.x;
    this.camera.position.z = playerPosition.z + 5;
    this.camera.position.y = 3;
  }

  public start(): void {
    console.log('⚙️ [GameEngine] Starting game loop...');
    this.running = true;
    this.renderer.setAnimationLoop(() => {
      if (this.running && !this.paused) {
        this.update();
      }
    });
  }

  public stop(): void {
    console.log('⚙️ [GameEngine] Stopping game loop...');
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  public pause(): void {
    this.paused = !this.paused;
    console.log('⚙️ [GameEngine] Pause toggled:', this.paused);
  }

  public restart(): void {
    console.log('⚙️ [GameEngine] Restarting game...');
    this.stop();
    
    // Reset player
    this.player = new Player(this.scene, this.effectsManager, this.audioManager);
    
    // Reset combat system
    this.combatSystem = new CombatSystem(this.scene, this.player, this.effectsManager, this.audioManager);
    
    this.start();
  }

  public handleInput(type: string, data?: any): void {
    console.log('🎮 [GameEngine] Handling input:', type, data);
    
    if (type === 'requestPointerLock') {
      this.inputManager.requestPointerLock();
    } else if (type === 'requestPointerUnlock') {
      this.inputManager.exitPointerLock();
    }
  }

  public setUIState(uiOpen: boolean): void {
    console.log('🎮 [GameEngine] UI state changed:', uiOpen);
  }

  public dispose(): void {
    console.log('⚙️ [GameEngine] Disposing resources...');
    this.stop();
    this.inputManager.dispose();
    this.effectsManager.dispose();
    this.audioManager.dispose();
    this.combatSystem.dispose();
    this.renderer.dispose();
    if (this.mountElement && this.renderer.domElement) {
      this.mountElement.removeChild(this.renderer.domElement);
    }
  }

  public spawnEnemies(count: number): void {
    const playerPosition = this.player.getPosition();
    this.combatSystem.spawnRandomEnemies(count, playerPosition);
  }

  public getPlayer(): Player {
    return this.player;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public getGameState(): { timeElapsed: number } {
    return { timeElapsed: this.clock.getElapsedTime() };
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
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
}
