import * as THREE from 'three';
import { Player } from '../entities/Player';
import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { EffectsManager } from './EffectsManager';
import { AudioManager, SoundCategory } from './AudioManager';
import { CombatSystem } from '../systems/CombatSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { RenderEngine } from './RenderEngine';
import { StateManager } from './StateManager';
import { UIIntegrationManager } from './UIIntegrationManager';
import { PhysicsManager } from './PhysicsManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { GameState, EnemyType } from '../../types/GameTypes';

export class GameEngine {
  // Core managers
  private renderEngine: RenderEngine;
  private stateManager: StateManager;
  private uiIntegrationManager: UIIntegrationManager;
  private physicsManager: PhysicsManager;
  private buildingManager: BuildingManager | null = null;
  
  // Game systems
  private sceneManager: SceneManager | null = null;
  private inputManager: InputManager | null = null;
  private effectsManager: EffectsManager | null = null;
  private audioManager: AudioManager | null = null;
  private combatSystem: CombatSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  
  // Game entities
  private player: Player | null = null;
  
  // State
  private isInitialized: boolean = false;
  private mountElement: HTMLDivElement;
  
  // Movement state
  private isMoving: boolean = false;
  
  // Attack state tracking
  private isAttackPressed: boolean = false;
  
  // Performance optimization - reduce update frequency for non-critical systems
  private systemUpdateCounter: number = 0;
  private readonly SYSTEM_UPDATE_INTERVAL: number = 3; // Update every 3rd frame for better performance
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    
    // Initialize managers
    this.renderEngine = new RenderEngine(mountElement);
    this.stateManager = new StateManager();
    this.uiIntegrationManager = new UIIntegrationManager();
    this.physicsManager = new PhysicsManager();
  }
  
  // NEW METHOD: Set UI state from KnightGame
  public setUIState(isUIOpen: boolean): void {
    this.uiIntegrationManager.setUIState(isUIOpen);
  }
  
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log("🎮 [GameEngine] Starting initialization...");
    
    try {
      // Initialize render engine
      this.renderEngine.initialize();
      
      // Create the building manager
      this.buildingManager = new BuildingManager(this.renderEngine.getScene(), this.physicsManager);
      console.log("🏗️ [GameEngine] BuildingManager created");
      
      // Create the scene manager using the render engine's scene and physics manager
      this.sceneManager = new SceneManager(this.renderEngine.getScene(), this.physicsManager);
      
      // FIXED: Set camera reference in SceneManager for proper sun glow calculations
      this.sceneManager.setCamera(this.renderEngine.getCamera());
      console.log("📹 [GameEngine] Camera reference passed to SceneManager for sun glow calculations");
      
      // Create default world
      this.sceneManager.createDefaultWorld();
      
      // Create the input manager
      this.inputManager = new InputManager();
      this.inputManager.initialize(this.renderEngine.getRenderer());
      
      // Setup mouse look controls
      this.setupMouseLookControls();
      
      // Create the effects manager
      this.effectsManager = new EffectsManager(this.renderEngine.getScene(), this.renderEngine.getCamera());
      
      // Create the audio manager
      this.audioManager = new AudioManager(this.renderEngine.getCamera(), this.renderEngine.getScene());
      
      // Set audio manager for building manager
      if (this.buildingManager && this.audioManager) {
        this.buildingManager.setAudioManager(this.audioManager);
        console.log("🔊 [GameEngine] AudioManager connected to BuildingManager");
      }
      
      // Create buildings with fireplaces
      this.createBuildings();
      
      // Preload audio
      try {
        await this.preloadAudio();
      } catch (audioError) {
        console.warn("🎮 [GameEngine] Audio preloading failed, continuing:", audioError);
      }
      
      // CRITICAL: Create the player with extensive debugging
      console.log("🎮 [GameEngine] Creating player with NEW ARM POSITIONING...");
      this.player = new Player(this.renderEngine.getScene(), this.effectsManager, this.audioManager);
      console.log("🎮 [GameEngine] Player created successfully with new arm positioning");
      
      // Make player arms/sword visible for first-person immersion
      const playerBody = this.player.getBody();
      if (playerBody.leftArm) playerBody.leftArm.visible = true;
      if (playerBody.rightArm) playerBody.rightArm.visible = true;
      
      // Create game systems with physics manager
      this.combatSystem = new CombatSystem(this.renderEngine.getScene(), this.player, this.effectsManager, this.audioManager, this.renderEngine.getCamera(), this.physicsManager);
      this.movementSystem = new MovementSystem(this.renderEngine.getScene(), this.renderEngine.getCamera(), this.player, this.inputManager, this.physicsManager);
      
      // Initialize enemy spawning system in scene manager
      if (this.sceneManager) {
        this.sceneManager.initializeEnemySpawning(this.effectsManager, this.audioManager);
        this.sceneManager.startEnemySpawning(this.player.getPosition());
      }
      
      // Set first-person camera position
      this.renderEngine.setupFirstPersonCamera(this.player.getPosition());
      
      // Set game as initialized
      this.isInitialized = true;
      console.log("🎮 [GameEngine] Initialization complete with fire animation system!");
      
      // Start the game
      this.start();
    } catch (error) {
      console.error("🎮 [GameEngine] Initialization error:", error);
      this.isInitialized = true; // Still mark as initialized
    }
  }
  
  private createBuildings(): void {
    if (!this.buildingManager) return;
    
    console.log("🏗️ [GameEngine] Creating buildings with animated fireplaces...");
    
    // Create tavern at origin with fireplace
    const tavernBuilding = this.buildingManager.createBuilding({
      type: 'tavern',
      position: new THREE.Vector3(0, 0, 0),
      id: 'main_tavern'
    });
    
    if (tavernBuilding) {
      console.log("🔥 [GameEngine] Tavern with animated fireplace created successfully");
    }
  }
  
  private setupMouseLookControls(): void {
    console.log("🎮 [GameEngine] Setting up mouse look controls...");
    
    // Listen for mouse look input
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      if (type === 'look') {
        this.handleMouseLook(data.x, data.y);
      }
      
      if (type === 'pointerLockChange') {
        this.uiIntegrationManager.handlePointerLockChange(data.locked);
        if (!data.locked && this.uiIntegrationManager.isPointerLockRequested()) {
          setTimeout(() => {
            this.requestPointerLockSafely();
          }, 100);
        }
      }
    });
    
    // Request pointer lock on canvas click
    const handleCanvasClick = () => {
      this.requestPointerLockSafely();
    };
    
    if (this.renderEngine.getRenderer()?.domElement) {
      this.renderEngine.getRenderer().domElement.addEventListener('click', handleCanvasClick);
    }
  }
  
  private requestPointerLockSafely(): void {
    const renderer = this.renderEngine.getRenderer();
    if (!renderer?.domElement || !document.contains(renderer.domElement)) {
      console.warn("🎮 [GameEngine] Cannot request pointer lock: canvas not available");
      return;
    }
    
    try {
      this.uiIntegrationManager.setPointerLockRequested(true);
      renderer.domElement.requestPointerLock();
      console.log("🎮 [GameEngine] Pointer lock requested successfully");
    } catch (error) {
      console.error("🎮 [GameEngine] Failed to request pointer lock:", error);
      this.uiIntegrationManager.setPointerLockRequested(false);
    }
  }
  
  private handleMouseLook(deltaX: number, deltaY: number): void {
    if (!this.uiIntegrationManager.shouldProcessMouseLook(deltaX, deltaY)) {
      return;
    }
    
    console.log("📹 [GameEngine] Processing mouse look:", deltaX, deltaY);
    this.renderEngine.handleMouseLook(deltaX, deltaY);
    
    // Update player visual rotation
    if (this.player && typeof this.player.setVisualRotation === 'function') {
      const cameraRotation = this.renderEngine.getCameraRotation();
      this.player.setVisualRotation(cameraRotation.yaw, cameraRotation.pitch);
    }
  }
  
  private async preloadAudio(): Promise<void> {
    const preloadPromises = [
      this.loadAudioWithFallback('sword_swing'),
      this.loadAudioWithFallback('sword_hit'),
      this.loadAudioWithFallback('bow_draw'),
      this.loadAudioWithFallback('bow_release'),
      this.loadAudioWithFallback('arrow_shoot'),
      this.loadAudioWithFallback('arrow_hit'),
      this.loadAudioWithFallback('arrow_impact'),
      this.loadAudioWithFallback('player_hurt'),
      this.loadAudioWithFallback('enemy_hurt'),
      this.loadAudioWithFallback('enemy_death'),
      this.loadAudioWithFallback('gold_pickup'),
      this.loadAudioWithFallback('footstep'),
      this.loadAudioWithFallback('tavern_ambience'),
      this.loadAudioWithFallback('forest_ambience'),
      this.loadAudioWithFallback('game_music')
    ];
    
    await Promise.allSettled(preloadPromises);
    console.log("🎮 [GameEngine] Audio preloading complete");
  }

  private async loadAudioWithFallback(id: string): Promise<void> {
    if (!this.audioManager) return;
    
    try {
      await this.audioManager.loadSound(`assets/sounds/${id}.mp3`, id, SoundCategory.SFX);
      console.log(`🎮 [GameEngine] Loaded audio: ${id}`);
    } catch (e) {
      try {
        await this.audioManager.loadSound(`/sounds/${id}.mp3`, id, SoundCategory.SFX);
        console.log(`🎮 [GameEngine] Loaded audio from alternate path: ${id}`);
      } catch (e2) {
        console.warn(`🎮 [GameEngine] Failed to load audio: ${id} - continuing without sound`);
      }
    }
  }
  
  public start(): void {
    if (!this.isInitialized) {
      console.error("🎮 [GameEngine] Cannot start: not initialized");
      return;
    }
    
    console.log("🎮 [GameEngine] Starting game with NEW ARM POSITIONING...");
    this.stateManager.start();
    this.animate();
    console.log("🎮 [GameEngine] Game started successfully with NEW ARM POSITIONING!");
  }
  
  private animate = (): void => {
    if (!this.isInitialized || !this.stateManager.isPlaying()) {
      return;
    }
    
    requestAnimationFrame(this.animate);
    
    if (this.stateManager.isPaused()) {
      return;
    }
    
    const deltaTime = this.renderEngine.getDeltaTime();
    this.stateManager.update(deltaTime);
    this.update(deltaTime);
    this.renderEngine.render();
  };
  
  private update(deltaTime: number): void {
    if (!this.movementSystem || !this.inputManager || !this.combatSystem || !this.effectsManager || !this.audioManager || !this.player) {
      return;
    }
    
    // Increment system update counter
    this.systemUpdateCounter++;
    
    // Update movement system every frame (critical for smooth gameplay)
    this.movementSystem.update(deltaTime);
    
    // Check if player is moving
    this.isMoving = this.inputManager.isActionPressed('moveForward') ||
                   this.inputManager.isActionPressed('moveBackward') ||
                   this.inputManager.isActionPressed('moveLeft') ||
                   this.inputManager.isActionPressed('moveRight');
    
    // Update critical systems every frame
    this.combatSystem.update(deltaTime);
    this.player.update(deltaTime, this.isMoving);
    
    // Update camera to follow player (critical for smooth first-person)
    this.renderEngine.updateFirstPersonCamera(this.player.getPosition());
    
    // Update less critical systems less frequently for performance
    if (this.systemUpdateCounter % this.SYSTEM_UPDATE_INTERVAL === 0) {
      // Update building manager (for fire animation)
      if (this.buildingManager) {
        this.buildingManager.update(deltaTime * this.SYSTEM_UPDATE_INTERVAL); // Compensate for reduced frequency
      }
      
      // Update effects
      this.effectsManager.update(deltaTime * this.SYSTEM_UPDATE_INTERVAL);
      
      // Update audio
      this.audioManager.update();
      
      // Update scene manager with player position for ring-quadrant system
      if (this.sceneManager) {
        this.sceneManager.update(deltaTime * this.SYSTEM_UPDATE_INTERVAL, this.player.getPosition());
      }
      
      // Sync enemies from scene manager to combat system
      if (this.sceneManager) {
        const sceneEnemies = this.sceneManager.getEnemies();
        // Update combat system with current enemies
        sceneEnemies.forEach(enemy => {
          if (!this.combatSystem!.getEnemies().includes(enemy)) {
            this.combatSystem!.addEnemy(enemy);
          }
        });
      }
    }
    
    // Check location changes (less frequent)
    if (this.systemUpdateCounter % 10 === 0) { // Every 10th frame
      const isInTavern = this.movementSystem.checkInTavern();
      this.stateManager.updateLocationState(isInTavern);
    }
    
    // Check for game over (less frequent)
    if (this.systemUpdateCounter % 30 === 0) { // Every 30th frame
      if (!this.player.isAlive() && !this.stateManager.isGameOver()) {
        this.stateManager.setGameOver(this.stateManager.getScore());
      }
    }
  }
  
  public pause(): void {
    if (!this.isInitialized || !this.stateManager.isPlaying()) return;
    
    this.stateManager.pause();
    
    if (this.audioManager) {
      if (this.stateManager.isPaused()) {
        this.audioManager.pause('game_music');
        this.audioManager.pause('tavern_ambience');
      } else {
        this.audioManager.resume('game_music');
        this.audioManager.resume('tavern_ambience');
      }
    }
  }
  
  public restart(): void {
    if (!this.isInitialized) return;
    
    console.log("🎮 [GameEngine] Restarting game and RECREATING PLAYER with NEW ARM POSITIONING...");
    this.stateManager.restart();
    
    // CRITICAL: Recreate player to ensure new arm positioning takes effect
    if (this.effectsManager && this.audioManager) {
      // Dispose old player
      if (this.player) {
        this.player.dispose();
        this.renderEngine.getScene().remove(this.player.getGroup());
      }
      
      // Create new player with updated positioning
      console.log("🔄 [GameEngine] Creating NEW player instance with updated arm positioning...");
      this.player = new Player(this.renderEngine.getScene(), this.effectsManager, this.audioManager);
      console.log("🔄 [GameEngine] NEW player instance created with updated arm positioning");
      
      // Make player arms/sword visible for first-person immersion
      const playerBody = this.player.getBody();
      if (playerBody.leftArm) playerBody.leftArm.visible = true;
      if (playerBody.rightArm) playerBody.rightArm.visible = true;
      
      // Recreate combat system with new player, camera, and physics manager
      if (this.combatSystem) {
        this.combatSystem.dispose();
      }
      this.combatSystem = new CombatSystem(this.renderEngine.getScene(), this.player, this.effectsManager, this.audioManager, this.renderEngine.getCamera(), this.physicsManager);
      
      // Recreate movement system with new player and physics manager
      if (this.movementSystem) {
        this.movementSystem.dispose();
      }
      this.movementSystem = new MovementSystem(this.renderEngine.getScene(), this.renderEngine.getCamera(), this.player, this.inputManager!, this.physicsManager);
      
      // Reset first-person camera
      this.renderEngine.setupFirstPersonCamera(this.player.getPosition());
    }
    
    // Restart enemy spawning
    if (this.sceneManager && this.effectsManager && this.audioManager) {
      this.sceneManager.initializeEnemySpawning(this.effectsManager, this.audioManager);
      this.sceneManager.startEnemySpawning(this.player!.getPosition());
    }
    
    // Start ambient sounds
    if (this.audioManager) {
      this.audioManager.play('tavern_ambience', true);
      this.audioManager.play('game_music', true);
    }
    
    console.log("🎮 [GameEngine] Game restarted with NEW PLAYER and ARM POSITIONING!");
  }
  
  public handleInput(type: string, data?: any): void {
    if (!this.isInitialized) {
      console.log("🎮 [GameEngine] Input ignored - not initialized");
      return;
    }
    
    // Handle pointer lock requests even when game is paused
    if (type === 'requestPointerLock' || type === 'requestPointerUnlock') {
      if (type === 'requestPointerLock' && this.inputManager) {
        this.inputManager.requestPointerLock();
      } else if (type === 'requestPointerUnlock' && this.inputManager) {
        this.inputManager.exitPointerLock();
      }
      return;
    }
    
    // For other inputs, check if game is ready
    if (!this.stateManager.isPlaying() || this.stateManager.isPaused()) {
      return;
    }
    
    switch (type) {
      case 'attack':
        if (!this.isAttackPressed && this.combatSystem) {
          this.isAttackPressed = true;
          this.combatSystem.startPlayerAttack();
        }
        break;
        
      case 'attackEnd':
        if (this.isAttackPressed && this.combatSystem) {
          this.isAttackPressed = false;
          this.combatSystem.stopPlayerAttack();
        }
        break;
        
      case 'sprint':
      case 'doubleTapForward':
        if (this.player) {
          this.player.startSprint();
        }
        break;
        
      case 'pointerLockChange':
        break;
        
      default:
        break;
    }
  }
  
  // Callback setters - delegate to state manager
  public setOnUpdateHealth(callback: (health: number) => void): void {
    this.stateManager.setOnUpdateHealth(callback);
  }
  
  public setOnUpdateGold(callback: (gold: number) => void): void {
    this.stateManager.setOnUpdateGold(callback);
  }
  
  public setOnUpdateStamina(callback: (stamina: number) => void): void {
    this.stateManager.setOnUpdateStamina(callback);
  }
  
  public setOnUpdateScore(callback: (score: number) => void): void {
    this.stateManager.setOnUpdateScore(callback);
  }
  
  public setOnGameOver(callback: (score: number) => void): void {
    this.stateManager.setOnGameOver(callback);
  }
  
  public setOnLocationChange(callback: (isInTavern: boolean) => void): void {
    this.stateManager.setOnLocationChange(callback);
  }
  
  // Getters - delegate to appropriate managers
  public getGameState(): GameState {
    return this.stateManager.getGameState();
  }
  
  public getScene(): THREE.Scene {
    return this.renderEngine.getScene();
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.renderEngine.getCamera();
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderEngine.getRenderer();
  }
  
  public getPlayer(): Player | null {
    return this.player;
  }
  
  public isRunning(): boolean {
    return this.stateManager.isPlaying();
  }
  
  public isPaused(): boolean {
    return this.stateManager.isPaused();
  }
  
  public isGameOver(): boolean {
    return this.stateManager.isGameOver();
  }
  
  public dispose(): void {
    console.log("🎮 [GameEngine] Disposing game engine...");
    
    // Dispose managers (check for null to avoid runtime errors)
    this.stateManager.dispose();
    this.uiIntegrationManager.dispose();
    this.renderEngine.dispose();
    
    // Dispose building manager
    if (this.buildingManager) {
      this.buildingManager.dispose();
    }
    
    // Dispose systems (check for null to avoid runtime errors)
    if (this.movementSystem) {
      this.movementSystem.dispose();
    }
    if (this.audioManager) {
      this.audioManager.dispose();
    }
    if (this.combatSystem) {
      this.combatSystem.dispose();
    }
    if (this.effectsManager) {
      this.effectsManager.dispose();
    }
    if (this.inputManager) {
      this.inputManager.dispose();
    }
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
    
    console.log("🎮 [GameEngine] Game engine disposed!");
  }
}
