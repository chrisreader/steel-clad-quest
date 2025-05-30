
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
      this.sceneManager = new SceneManager(this.mountElement);
      this.scene = this.sceneManager.getScene();
      this.camera = this.sceneManager.getCamera();
      this.renderer = this.sceneManager.getRenderer();
      
      // Create default world
      this.sceneManager.createDefaultWorld();
      
      // Create the input manager
      this.inputManager = new InputManager();
      
      // Create the effects manager
      this.effectsManager = new EffectsManager(this.scene, this.camera);
      
      // Create the audio manager
      this.audioManager = new AudioManager(this.camera, this.scene);
      await this.preloadAudio();
      
      // Create the player
      this.player = new Player(this.scene, this.effectsManager, this.audioManager);
      
      // Create game systems
      this.combatSystem = new CombatSystem(this.scene, this.player, this.effectsManager, this.audioManager);
      
      // Set game as initialized
      this.isInitialized = true;
      
      console.log("Game engine initialized successfully!");
      
      // Start the game
      this.start();
    } catch (error) {
      console.error("Error initializing game engine:", error);
      throw error;
    }
  }
  
  private async preloadAudio(): Promise<void> {
    // Preload common sound effects
    try {
      await this.audioManager.loadSound('assets/sounds/sword_swing.mp3', 'sword_swing', SoundCategory.SFX);
      await this.audioManager.loadSound('assets/sounds/sword_hit.mp3', 'sword_hit', SoundCategory.SFX);
      await this.audioManager.loadSound('assets/sounds/player_hurt.mp3', 'player_hurt', SoundCategory.SFX);
      await this.audioManager.loadSound('assets/sounds/enemy_hurt.mp3', 'enemy_hurt', SoundCategory.SFX);
      await this.audioManager.loadSound('assets/sounds/enemy_death.mp3', 'enemy_death', SoundCategory.SFX);
      await this.audioManager.loadSound('assets/sounds/gold_pickup.mp3', 'gold_pickup', SoundCategory.SFX);
      await this.audioManager.loadSound('assets/sounds/footstep.mp3', 'footstep', SoundCategory.SFX);
      
      // Load ambient sounds
      await this.audioManager.loadSound('assets/sounds/tavern_ambience.mp3', 'tavern_ambience', SoundCategory.AMBIENT);
      await this.audioManager.loadSound('assets/sounds/forest_ambience.mp3', 'forest_ambience', SoundCategory.AMBIENT);
      
      // Load music
      await this.audioManager.loadSound('assets/sounds/game_music.mp3', 'game_music', SoundCategory.MUSIC);
      
      // Start ambient sounds
      this.audioManager.play('tavern_ambience', true, 1);
      this.audioManager.play('game_music', true, 2);
    } catch (error) {
      console.warn("Some audio files couldn't be loaded. The game will continue without them.", error);
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
    // Update combat system
    this.combatSystem.update(deltaTime);
    
    // Update effects
    this.effectsManager.update(deltaTime);
    
    // Update audio
    this.audioManager.update();
    
    // Update player
    this.player.update(deltaTime);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Check for game over
    this.checkGameOver();
  }
  
  private updateCamera(): void {
    const playerPosition = this.player.getPosition();
    this.camera.position.x = playerPosition.x;
    this.camera.position.z = playerPosition.z + 10;
    this.camera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);
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
    
    // Reset camera position and rotation
    this.camera.position.set(0, 2.2, 2);
    this.camera.rotation.set(0, 0, 0);
    
    // Restart clock
    this.clock.start();
    
    // Start ambient sounds
    this.audioManager.play('tavern_ambience', true);
    this.audioManager.play('game_music', true);
    
    console.log("Game restarted!");
  }
  
  public handleInput(inputType: string, data?: any): void {
    if (!this.isInitialized || !this.gameState.isPlaying || this.gameState.isPaused) return;
    
    switch (inputType) {
      case 'attack':
        this.combatSystem.startPlayerAttack();
        break;
      
      case 'pause':
        this.pause();
        break;
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
    
    // Dispose audio
    this.audioManager.dispose();
    
    // Dispose combat system
    this.combatSystem.dispose();
    
    // Dispose effects
    this.effectsManager.dispose();
    
    // Dispose scene manager
    this.sceneManager.dispose();
    
    console.log("Game engine disposed!");
  }
}
