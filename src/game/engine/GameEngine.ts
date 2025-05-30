import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { EffectsManager } from './EffectsManager';
import { AudioManager, SoundCategory } from './AudioManager';
import { CombatSystem } from '../systems/CombatSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { GameState, EnemyType } from '../../types/GameTypes';

export class GameEngine {
  // Core THREE.js components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  // Game systems
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private combatSystem: CombatSystem;
  private movementSystem: MovementSystem;
  
  // Game entities
  private player: Player;
  
  // Game state
  private gameState: GameState;
  private clock: THREE.Clock;
  private isInitialized: boolean = false;
  private mountElement: HTMLDivElement;
  
  // Movement state
  private isMoving: boolean = false;
  
  // Callbacks
  private onUpdateHealth: (health: number) => void;
  private onUpdateGold: (gold: number) => void;
  private onUpdateStamina: (stamina: number) => void;
  private onUpdateScore: (score: number) => void;
  private onGameOver: (score: number) => void;
  private onLocationChange: (isInTavern: boolean) => void;
  
  constructor(mountElement: HTMLDivElement) {
    this.mountElement = mountElement;
    this.clock = new THREE.Clock();
    
    // Initialize default callbacks
    this.onUpdateHealth = () => {};
    this.onUpdateGold = () => {};
    this.onUpdateStamina = () => {};
    this.onUpdateScore = () => {};
    this.onGameOver = () => {};
    this.onLocationChange = () => {};
    
    // Initialize game state
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      currentLevel: 'tavern',
      score: 0,
      timeElapsed: 0
    };
  }
  
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log("Initializing game engine...");
    
    try {
      // Create the scene manager
      console.log("Creating SceneManager...");
      try {
        this.sceneManager = new SceneManager(this.mountElement);
        this.scene = this.sceneManager.getScene();
        this.camera = this.sceneManager.getCamera();
        this.renderer = this.sceneManager.getRenderer();
        console.log("SceneManager created successfully");
      } catch (sceneError) {
        console.error("Failed to create SceneManager:", sceneError);
        throw new Error("Scene initialization failed: " + sceneError.message);
      }
      
      // Create default world
      console.log("Creating default world...");
      this.sceneManager.createDefaultWorld();
      console.log("Default world created");
      
      // Create the input manager
      console.log("Creating InputManager...");
      this.inputManager = new InputManager();
      this.inputManager.initialize(this.renderer);
      console.log("InputManager created");
      
      // Create the effects manager
      console.log("Creating EffectsManager...");
      this.effectsManager = new EffectsManager(this.scene, this.camera);
      console.log("EffectsManager created");
      
      // Create the audio manager
      console.log("Creating AudioManager...");
      this.audioManager = new AudioManager(this.camera, this.scene);
      console.log("AudioManager created");
      
      console.log("Preloading audio...");
      try {
        await this.preloadAudio();
        console.log("Audio preloaded successfully");
      } catch (audioError) {
        console.warn("Audio preloading failed, continuing without audio:", audioError);
        // Continue without audio
      }
      
      // Create the player
      console.log("Creating Player...");
      this.player = new Player(this.scene, this.effectsManager, this.audioManager);
      console.log("Player created at position:", this.player.getPosition());
      
      // Create game systems
      console.log("Creating CombatSystem...");
      this.combatSystem = new CombatSystem(this.scene, this.player, this.effectsManager, this.audioManager);
      console.log("CombatSystem created");
      
      // Create MovementSystem
      console.log("Creating MovementSystem...");
      this.movementSystem = new MovementSystem(this.scene, this.camera, this.player, this.inputManager);
      console.log("MovementSystem created");
      
      // Set proper initial camera position for third-person view
      const playerPosition = this.player.getPosition();
      this.camera.position.set(playerPosition.x, playerPosition.y + 5, playerPosition.z + 8);
      this.camera.lookAt(playerPosition.x, playerPosition.y + 1, playerPosition.z);
      console.log("Camera positioned at:", this.camera.position);
      console.log("Camera looking at:", playerPosition.x, playerPosition.y + 1, playerPosition.z);
      
      // Log scene children to verify scene content
      console.log("Scene has", this.scene.children.length, "children");
      console.log("Scene children types:", this.scene.children.map(child => child.type));
      
      // Set game as initialized
      this.isInitialized = true;
      
      console.log("Game engine initialized successfully!");
      
      // Start the game
      console.log("Starting game...");
      this.start();
      console.log("Game started");
    } catch (error) {
      console.error("Error initializing game engine:", error);
      // Don't rethrow the error - mark as initialized with issues
      this.isInitialized = true; // Still mark as initialized so loading completes
      console.warn("Game initialized with errors - some features may not work");
    }
  }
  
  private async preloadAudio(): Promise<void> {
    // Use Promise.allSettled instead of Promise.all to handle individual failures
    const preloadPromises = [
      this.loadAudioWithFallback('sword_swing'),
      this.loadAudioWithFallback('sword_hit'),
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
    console.log("Audio preloading complete - some files may have failed to load");
  }

  private async loadAudioWithFallback(id: string): Promise<void> {
    try {
      // Try to load from assets/sounds first
      await this.audioManager.loadSound(`assets/sounds/${id}.mp3`, id, SoundCategory.SFX);
      console.log(`Loaded audio: ${id}`);
    } catch (e) {
      try {
        // Try alternate location
        await this.audioManager.loadSound(`/sounds/${id}.mp3`, id, SoundCategory.SFX);
        console.log(`Loaded audio from alternate path: ${id}`);
      } catch (e2) {
        console.warn(`Failed to load audio: ${id} - game will continue without this sound`);
        // Don't rethrow, just continue without this audio
      }
    }
  }
  
  public start(): void {
    if (!this.isInitialized) {
      console.error("Cannot start game: engine not initialized");
      return;
    }
    
    console.log("Starting game...");
    
    // Start game loop
    this.gameState.isPlaying = true;
    this.gameState.isPaused = false;
    this.clock.start();
    
    // Start the render loop
    this.animate();
    
    console.log("Game started!");
  }
  
  private animate = (): void => {
    if (!this.isInitialized || !this.gameState.isPlaying) return;
    
    // Request next frame
    requestAnimationFrame(this.animate);
    
    // Skip update if paused
    if (this.gameState.isPaused) {
      return;
    }
    
    // Calculate delta time
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap at 100ms to prevent large jumps
    
    // Update total elapsed time
    this.gameState.timeElapsed += deltaTime;
    
    // Update game systems
    this.update(deltaTime);
    
    // Render the scene
    this.sceneManager.render();
  };
  
  private update(deltaTime: number): void {
    // Update movement system first
    this.movementSystem.update(deltaTime);
    
    // Check if player is moving for animation purposes
    this.isMoving = this.inputManager.isActionPressed('moveForward') ||
                   this.inputManager.isActionPressed('moveBackward') ||
                   this.inputManager.isActionPressed('moveLeft') ||
                   this.inputManager.isActionPressed('moveRight');
    
    // Update combat system
    this.combatSystem.update(deltaTime);
    
    // Update effects
    this.effectsManager.update(deltaTime);
    
    // Update audio
    this.audioManager.update();
    
    // Update player with movement information
    this.player.update(deltaTime, this.isMoving);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Check location changes
    this.checkLocationChanges();
    
    // Check for game over
    this.checkGameOver();
  }
  
  private updateCamera(): void {
    const playerPosition = this.player.getPosition();
    
    // Follow player with some offset - adjusted for better third-person view
    const targetX = playerPosition.x;
    const targetZ = playerPosition.z + 8;
    const targetY = playerPosition.y + 5;
    
    // Smooth camera following
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, 0.1);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.1);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.1);
    
    // Look at player (slightly above player position)
    this.camera.lookAt(playerPosition.x, playerPosition.y + 1, playerPosition.z);
  }
  
  private checkLocationChanges(): void {
    const isInTavern = this.movementSystem.checkInTavern();
    this.onLocationChange(isInTavern);
  }
  
  private checkGameOver(): void {
    // Check if player is dead
    if (!this.player.isAlive() && !this.gameState.isGameOver) {
      this.gameState.isGameOver = true;
      this.gameState.isPaused = true;
      this.onGameOver(this.gameState.score);
    }
  }
  
  public pause(): void {
    if (!this.isInitialized || !this.gameState.isPlaying) return;
    
    this.gameState.isPaused = !this.gameState.isPaused;
    
    if (this.gameState.isPaused) {
      // Pause audio
      this.audioManager.pause('game_music');
      this.audioManager.pause('tavern_ambience');
    } else {
      // Resume audio
      this.audioManager.resume('game_music');
      this.audioManager.resume('tavern_ambience');
    }
  }
  
  public restart(): void {
    if (!this.isInitialized) return;
    
    console.log("Restarting game...");
    
    // Reset game state
    this.gameState.isGameOver = false;
    this.gameState.isPaused = false;
    this.gameState.timeElapsed = 0;
    this.gameState.score = 0;
    
    // Reset player
    this.player.setPosition(new THREE.Vector3(0, 0, 2));
    
    // Clear enemies and gold
    this.combatSystem.clear();
    
    // Reset camera position
    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(0, 0, 0);
    
    // Restart clock
    this.clock.start();
    
    // Start ambient sounds
    this.audioManager.play('tavern_ambience', true);
    this.audioManager.play('game_music', true);
    
    console.log("Game restarted!");
  }
  
  public handleInput(inputType: string, data?: any): void {
    if (!this.isInitialized || !this.gameState.isPlaying || this.gameState.isPaused) return;
    
    console.log("Game input received:", inputType, data);
    
    switch (inputType) {
      case 'attack':
        this.combatSystem.startPlayerAttack();
        break;
      
      case 'pause':
        this.pause();
        break;
      
      case 'doubleTapForward':
        // Start sprinting
        this.player.startSprint();
        break;
      
      // Movement inputs - forward these to the movement system
      case 'moveForward':
      case 'moveBackward':
      case 'moveLeft':
      case 'moveRight':
      case 'sprint':
        // These are handled by the InputManager and MovementSystem automatically
        console.log("Movement input:", inputType);
        break;
        
      // Movement inputs are handled by the MovementSystem through InputManager
      // but we can add special cases here if needed
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
  
  // Getters
  public getGameState(): GameState {
    return { ...this.gameState };
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public getPlayer(): Player {
    return this.player;
  }
  
  public isRunning(): boolean {
    return this.gameState.isPlaying;
  }
  
  public isPaused(): boolean {
    return this.gameState.isPaused;
  }
  
  public isGameOver(): boolean {
    return this.gameState.isGameOver;
  }
  
  public dispose(): void {
    console.log("Disposing game engine...");
    
    // Stop the game
    this.gameState.isPlaying = false;
    
    // Dispose movement system
    this.movementSystem.dispose();
    
    // Dispose audio
    this.audioManager.dispose();
    
    // Dispose combat system
    this.combatSystem.dispose();
    
    // Dispose effects
    this.effectsManager.dispose();
    
    // Dispose input manager
    this.inputManager.dispose();
    
    // Dispose scene manager
    this.sceneManager.dispose();
    
    console.log("Game engine disposed!");
  }
}
