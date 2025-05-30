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
  
  // First-person camera controls
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private mouseSensitivity: number = 0.002;
  private maxPitch: number = Math.PI / 2 - 0.1; // Prevent over-rotation
  private pointerLockRequested: boolean = false;
  
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
      this.sceneManager = new SceneManager(this.mountElement);
      this.scene = this.sceneManager.getScene();
      this.camera = this.sceneManager.getCamera();
      this.renderer = this.sceneManager.getRenderer();
      console.log("SceneManager created successfully");
      
      // Ensure camera is in a good initial state
      console.log("Setting up initial camera position...");
      this.camera.position.set(0, 2, 5);
      this.camera.lookAt(0, 0, 0);
      console.log("Camera positioned at:", this.camera.position);
      console.log("Camera looking at origin");
      
      // Create default world
      console.log("Creating default world...");
      this.sceneManager.createDefaultWorld();
      console.log("Default world created");
      
      // Create the input manager and initialize it properly
      console.log("Creating InputManager...");
      this.inputManager = new InputManager();
      
      // Wait a bit to ensure renderer is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.inputManager.initialize(this.renderer);
      console.log("InputManager created and initialized");
      
      // Setup mouse look controls after a short delay to ensure everything is ready
      setTimeout(() => {
        this.setupMouseLookControls();
        console.log("Mouse look controls set up");
      }, 200);
      
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
      }
      
      // Create the player
      console.log("Creating Player...");
      this.player = new Player(this.scene, this.effectsManager, this.audioManager);
      console.log("Player created at position:", this.player.getPosition());
      
      // Hide player model for first-person view
      this.player.getGroup().visible = false;
      
      // Create game systems
      console.log("Creating CombatSystem...");
      this.combatSystem = new CombatSystem(this.scene, this.player, this.effectsManager, this.audioManager);
      console.log("CombatSystem created");
      
      // Create MovementSystem
      console.log("Creating MovementSystem...");
      this.movementSystem = new MovementSystem(this.scene, this.camera, this.player, this.inputManager);
      console.log("MovementSystem created");
      
      // Set first-person camera position properly
      this.setupFirstPersonCamera();
      
      // Verify scene setup
      console.log("Scene has", this.scene.children.length, "children");
      console.log("Scene children types:", this.scene.children.map(child => child.type));
      
      // Force an initial render to make sure everything is visible
      console.log("Performing initial render...");
      this.sceneManager.render();
      console.log("Initial render complete");
      
      // Set game as initialized
      this.isInitialized = true;
      
      console.log("Game engine initialized successfully!");
      
      // Start the game
      console.log("Starting game...");
      this.start();
      console.log("Game started");
    } catch (error) {
      console.error("Error initializing game engine:", error);
      this.isInitialized = true;
      console.warn("Game initialized with errors - some features may not work");
    }
  }
  
  private setupFirstPersonCamera(): void {
    const playerPosition = this.player.getPosition();
    
    // Position camera at player's eye level
    this.camera.position.set(playerPosition.x, playerPosition.y + 1.7, playerPosition.z);
    
    // Reset camera rotation to face forward
    this.cameraRotation.pitch = 0;
    this.cameraRotation.yaw = 0;
    
    // Apply initial rotation
    this.updateCameraRotation();
    
    console.log("First-person camera set up at:", this.camera.position);
    console.log("Camera rotation reset - Pitch:", this.cameraRotation.pitch, "Yaw:", this.cameraRotation.yaw);
  }
  
  private setupMouseLookControls(): void {
    console.log("Setting up mouse look controls...");
    
    // Listen for mouse look input
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      if (type === 'look') {
        this.handleMouseLook(data.x, data.y);
      }
      
      if (type === 'pointerLockChange') {
        console.log("Pointer lock changed:", data.locked);
        if (!data.locked && this.pointerLockRequested) {
          setTimeout(() => {
            this.requestPointerLockSafely();
          }, 100);
        }
      }
    });
    
    // Request pointer lock on canvas click
    const handleCanvasClick = () => {
      console.log("Canvas clicked, requesting pointer lock...");
      this.requestPointerLockSafely();
    };
    
    // Add click listener with better timing
    setTimeout(() => {
      if (this.renderer && this.renderer.domElement) {
        this.renderer.domElement.addEventListener('click', handleCanvasClick);
        console.log("Canvas click listener added successfully");
        
        // Make canvas focusable and focus it
        this.renderer.domElement.tabIndex = 0;
        this.renderer.domElement.focus();
        console.log("Canvas focused for input");
      } else {
        console.error("Renderer or canvas not ready for pointer lock setup");
      }
    }, 300);
  }
  
  private requestPointerLockSafely(): void {
    if (!this.renderer || !this.renderer.domElement) {
      console.warn("Cannot request pointer lock: renderer or canvas not available");
      return;
    }
    
    if (!document.contains(this.renderer.domElement)) {
      console.warn("Cannot request pointer lock: canvas element not in DOM");
      return;
    }
    
    try {
      this.pointerLockRequested = true;
      console.log("Requesting pointer lock on element:", this.renderer.domElement);
      this.renderer.domElement.requestPointerLock();
    } catch (error) {
      console.error("Failed to request pointer lock:", error);
      this.pointerLockRequested = false;
    }
  }
  
  private handleMouseLook(deltaX: number, deltaY: number): void {
    // Apply sensitivity scaling to prevent wild camera movement
    const scaledDeltaX = deltaX * 0.5;
    const scaledDeltaY = deltaY * 0.5;
    
    // Update yaw (left/right rotation)
    this.cameraRotation.yaw -= scaledDeltaX;
    
    // Update pitch (up/down rotation) with clamping
    this.cameraRotation.pitch -= scaledDeltaY;
    this.cameraRotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.cameraRotation.pitch));
    
    // Apply rotation to camera
    this.updateCameraRotation();
  }
  
  private updateCameraRotation(): void {
    // Create rotation quaternion from pitch and yaw
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotation.pitch);
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.yaw);
    
    // Combine rotations (yaw first, then pitch)
    const finalQuaternion = new THREE.Quaternion().multiplyQuaternions(yawQuaternion, pitchQuaternion);
    
    // Apply rotation to camera
    this.camera.quaternion.copy(finalQuaternion);
    
    // Update player rotation to match camera yaw for movement
    this.player.setRotation(this.cameraRotation.yaw);
  }
  
  private async preloadAudio(): Promise<void> {
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
      await this.audioManager.loadSound(`assets/sounds/${id}.mp3`, id, SoundCategory.SFX);
      console.log(`Loaded audio: ${id}`);
    } catch (e) {
      try {
        await this.audioManager.loadSound(`/sounds/${id}.mp3`, id, SoundCategory.SFX);
        console.log(`Loaded audio from alternate path: ${id}`);
      } catch (e2) {
        console.warn(`Failed to load audio: ${id} - game will continue without this sound`);
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
    
    requestAnimationFrame(this.animate);
    
    if (this.gameState.isPaused) return;
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.gameState.timeElapsed += deltaTime;
    
    // Update game systems
    this.update(deltaTime);
    
    // Debug camera state occasionally
    if (Math.floor(this.gameState.timeElapsed * 10) % 50 === 0) {
      console.log("Camera pos:", this.camera.position, "rot:", this.cameraRotation);
    }
    
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
    
    // Update camera to follow player (first-person)
    this.updateFirstPersonCamera();
    
    // Check location changes
    this.checkLocationChanges();
    
    // Check for game over
    this.checkGameOver();
  }
  
  private updateFirstPersonCamera(): void {
    const playerPosition = this.player.getPosition();
    
    // Keep camera at player's eye level
    this.camera.position.set(playerPosition.x, playerPosition.y + 1.7, playerPosition.z);
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
      this.audioManager.pause('game_music');
      this.audioManager.pause('tavern_ambience');
    } else {
      this.audioManager.resume('game_music');
      this.audioManager.resume('tavern_ambience');
    }
  }
  
  public restart(): void {
    if (!this.isInitialized) return;
    
    console.log("Restarting game...");
    
    this.gameState.isGameOver = false;
    this.gameState.isPaused = false;
    this.gameState.timeElapsed = 0;
    this.gameState.score = 0;
    
    this.player.setPosition(new THREE.Vector3(0, 0, 2));
    
    this.combatSystem.clear();
    
    this.setupFirstPersonCamera();
    
    this.clock.start();
    
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
        this.player.startSprint();
        break;
      
      case 'moveForward':
      case 'moveBackward':
      case 'moveLeft':
      case 'moveRight':
      case 'sprint':
        console.log("Movement input:", inputType);
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
    
    this.gameState.isPlaying = false;
    
    this.movementSystem.dispose();
    this.audioManager.dispose();
    this.combatSystem.dispose();
    this.effectsManager.dispose();
    this.inputManager.dispose();
    this.sceneManager.dispose();
    
    console.log("Game engine disposed!");
  }
}
