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
  
  // UI state tracking - CRITICAL ADDITION
  private isUIOpen: boolean = false;
  
  // First-person camera controls
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };
  private mouseSensitivity: number = 0.002;
  private maxPitch: number = Math.PI / 2 - 0.1; // Prevent over-rotation
  private pointerLockRequested: boolean = false;
  
  // Debug state
  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  
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
  
  // NEW METHOD: Set UI state from KnightGame
  public setUIState(isUIOpen: boolean): void {
    console.log(`🎮 [GameEngine] UI state changed to: ${isUIOpen ? 'OPEN' : 'CLOSED'}`);
    this.isUIOpen = isUIOpen;
  }
  
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log("🎮 [GameEngine] Starting initialization...");
    console.log("🎮 [GameEngine] Mount element:", this.mountElement);
    console.log("🎮 [GameEngine] Mount element dimensions:", {
      width: this.mountElement.clientWidth,
      height: this.mountElement.clientHeight,
      offsetWidth: this.mountElement.offsetWidth,
      offsetHeight: this.mountElement.offsetHeight
    });
    
    try {
      // Create the scene manager
      console.log("🎮 [GameEngine] Creating SceneManager...");
      this.sceneManager = new SceneManager(this.mountElement);
      this.scene = this.sceneManager.getScene();
      this.camera = this.sceneManager.getCamera();
      this.renderer = this.sceneManager.getRenderer();
      
      console.log("🎮 [GameEngine] SceneManager created successfully");
      
      // Verify canvas is properly attached
      const canvas = this.renderer.domElement;
      console.log("🎮 [GameEngine] Canvas verification:");
      console.log("🎮 [GameEngine] - Canvas element:", canvas);
      console.log("🎮 [GameEngine] - Canvas parent:", canvas.parentElement);
      console.log("🎮 [GameEngine] - Mount element children:", this.mountElement.children.length);
      console.log("🎮 [GameEngine] - Canvas in DOM:", document.contains(canvas));
      
      // Force canvas attachment if not properly attached
      if (!document.contains(canvas) || canvas.parentElement !== this.mountElement) {
        console.log("🎮 [GameEngine] Re-attaching canvas to mount element...");
        this.mountElement.appendChild(canvas);
      }
      
      // Set canvas style to ensure visibility
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.outline = 'none';
      
      console.log("🎮 [GameEngine] Canvas style applied:", {
        display: canvas.style.display,
        width: canvas.style.width,
        height: canvas.style.height,
        position: canvas.style.position
      });
      
      console.log("🎮 [GameEngine] Renderer canvas:", this.renderer.domElement);
      console.log("🎮 [GameEngine] Canvas parent:", this.renderer.domElement.parentElement);
      console.log("🎮 [GameEngine] Canvas size:", this.renderer.getSize(new THREE.Vector2()));
      
      // Create default world
      console.log("🎮 [GameEngine] Creating default world...");
      this.sceneManager.createDefaultWorld();
      console.log("🎮 [GameEngine] Scene children after world creation:", this.scene.children.length);
      
      // Create the input manager
      console.log("🎮 [GameEngine] Creating InputManager...");
      this.inputManager = new InputManager();
      this.inputManager.initialize(this.renderer);
      
      // Setup mouse look controls immediately
      this.setupMouseLookControls();
      
      // Create the effects manager
      console.log("🎮 [GameEngine] Creating EffectsManager...");
      this.effectsManager = new EffectsManager(this.scene, this.camera);
      
      // Create the audio manager
      console.log("🎮 [GameEngine] Creating AudioManager...");
      this.audioManager = new AudioManager(this.camera, this.scene);
      
      // Preload audio (with error handling)
      try {
        await this.preloadAudio();
        console.log("🎮 [GameEngine] Audio preloaded successfully");
      } catch (audioError) {
        console.warn("🎮 [GameEngine] Audio preloading failed, continuing:", audioError);
      }
      
      // Create the player
      console.log("🎮 [GameEngine] Creating Player...");
      this.player = new Player(this.scene, this.effectsManager, this.audioManager);
      console.log("🎮 [GameEngine] Player created at position:", this.player.getPosition());
      
      // Make player arms/sword visible for first-person immersion
      const playerBody = this.player.getBody();
      if (playerBody.leftArm) playerBody.leftArm.visible = true;
      if (playerBody.rightArm) playerBody.rightArm.visible = true;
      
      // Create game systems
      console.log("🎮 [GameEngine] Creating CombatSystem...");
      this.combatSystem = new CombatSystem(this.scene, this.player, this.effectsManager, this.audioManager);
      
      // Create MovementSystem
      console.log("🎮 [GameEngine] Creating MovementSystem...");
      this.movementSystem = new MovementSystem(this.scene, this.camera, this.player, this.inputManager);
      
      // Set first-person camera position with detailed logging
      this.setupFirstPersonCamera();
      
      // Log final scene state
      console.log("🎮 [GameEngine] Final scene state:");
      console.log("🎮 [GameEngine] - Children count:", this.scene.children.length);
      console.log("🎮 [GameEngine] - Camera position:", this.camera.position);
      console.log("🎮 [GameEngine] - Camera rotation:", this.camera.rotation);
      console.log("🎮 [GameEngine] - Renderer size:", this.renderer.getSize(new THREE.Vector2()));
      
      // Test render immediately
      console.log("🎮 [GameEngine] Testing immediate render...");
      this.renderer.render(this.scene, this.camera);
      console.log("🎮 [GameEngine] Immediate render completed");
      
      // Set game as initialized
      this.isInitialized = true;
      console.log("🎮 [GameEngine] Initialization complete!");
      
      // Start the game
      this.start();
    } catch (error) {
      console.error("🎮 [GameEngine] Initialization error:", error);
      this.isInitialized = true; // Still mark as initialized
    }
  }
  
  private setupFirstPersonCamera(): void {
    const playerPosition = this.player.getPosition();
    
    // Position camera at player's eye level with detailed logging
    this.camera.position.set(playerPosition.x, playerPosition.y + 1.7, playerPosition.z);
    
    console.log("🎮 [GameEngine] Camera setup:");
    console.log("🎮 [GameEngine] - Player position:", playerPosition);
    console.log("🎮 [GameEngine] - Camera position:", this.camera.position);
    console.log("🎮 [GameEngine] - Camera looking at:", this.camera.getWorldDirection(new THREE.Vector3()));
    
    // Reset camera rotation
    this.cameraRotation.pitch = 0;
    this.cameraRotation.yaw = 0;
    
    // Apply initial rotation
    this.updateCameraRotation();
    
    // Test that objects are in view
    const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
    console.log("🎮 [GameEngine] Camera direction:", cameraDirection);
    
    // Calculate distance to debug objects
    const debugCubePos = new THREE.Vector3(0, 2, -8);
    const distanceToCube = this.camera.position.distanceTo(debugCubePos);
    console.log("🎮 [GameEngine] Distance to debug cube:", distanceToCube);
  }
  
  private setupMouseLookControls(): void {
    console.log("Setting up mouse look controls...");
    
    // Listen for mouse look input
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      if (type === 'look') {
        console.log("Look input received:", data);
        this.handleMouseLook(data.x, data.y);
      }
      
      if (type === 'pointerLockChange') {
        console.log("Pointer lock changed:", data.locked);
        if (!data.locked && this.pointerLockRequested) {
          // Pointer lock was lost, try to request it again
          setTimeout(() => {
            this.requestPointerLockSafely();
          }, 100);
        }
      }
    });
    
    // Request pointer lock on canvas click immediately
    const handleCanvasClick = () => {
      console.log("Canvas clicked, requesting pointer lock...");
      this.requestPointerLockSafely();
    };
    
    // Set up click listener immediately if renderer is ready
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.addEventListener('click', handleCanvasClick);
      console.log("Canvas click listener added immediately");
    } else {
      console.warn("Renderer or canvas not ready for pointer lock setup");
    }
  }
  
  private requestPointerLockSafely(): void {
    if (!this.renderer || !this.renderer.domElement) {
      console.warn("Cannot request pointer lock: renderer or canvas not available");
      return;
    }
    
    // Check if element is still in DOM
    if (!document.contains(this.renderer.domElement)) {
      console.warn("Cannot request pointer lock: canvas element not in DOM");
      return;
    }
    
    try {
      this.pointerLockRequested = true;
      this.renderer.domElement.requestPointerLock();
      console.log("Pointer lock requested successfully");
    } catch (error) {
      console.error("Failed to request pointer lock:", error);
      this.pointerLockRequested = false;
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
    
    // Update pitch (up/down rotation) with clamping
    this.cameraRotation.pitch -= deltaY * this.mouseSensitivity;
    this.cameraRotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.cameraRotation.pitch));
    
    console.log("Camera rotation updated - Pitch:", this.cameraRotation.pitch, "Yaw:", this.cameraRotation.yaw);
    
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
    
    // FIXED: Only update player visual rotation when looking around, not during movement
    // This keeps the arms/sword locked to cursor direction
    if (this.player && typeof this.player.setVisualRotation === 'function') {
      this.player.setVisualRotation(this.cameraRotation.yaw, this.cameraRotation.pitch);
    }
    
    console.log("Camera quaternion updated:", this.camera.quaternion);
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
      console.error("🎮 [GameEngine] Cannot start: not initialized");
      return;
    }
    
    console.log("🎮 [GameEngine] Starting game...");
    
    // Start game loop
    this.gameState.isPlaying = true;
    this.gameState.isPaused = false;
    this.clock.start();
    
    console.log("🎮 [GameEngine] Game state after start:", this.gameState);
    console.log("🎮 [GameEngine] Starting render loop...");
    
    // Start the render loop
    this.animate();
    
    console.log("🎮 [GameEngine] Game started successfully!");
  }
  
  private animate = (): void => {
    this.renderCount++;
    const now = performance.now();
    
    // Log every 60 frames (roughly 1 second)
    if (this.renderCount % 60 === 0) {
      const fps = this.renderCount / ((now - this.lastRenderTime) / 1000) * 60;
      console.log("🎮 [GameEngine] Render loop active:", {
        frame: this.renderCount,
        fps: fps.toFixed(1),
        playing: this.gameState.isPlaying,
        paused: this.gameState.isPaused,
        cameraPos: this.camera.position,
        sceneChildren: this.scene.children.length
      });
      this.lastRenderTime = now;
    }
    
    if (!this.isInitialized || !this.gameState.isPlaying) {
      console.log("🎮 [GameEngine] Animation stopped - initialized:", this.isInitialized, "playing:", this.gameState.isPlaying);
      return;
    }
    
    // Request next frame
    requestAnimationFrame(this.animate);
    
    // Skip update if paused
    if (this.gameState.isPaused) {
      return;
    }
    
    // Calculate delta time
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    
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
    
    // Log movement input every 60 frames when moving
    if (this.isMoving && this.renderCount % 60 === 0) {
      console.log("🎮 [GameEngine] Movement active:", {
        forward: this.inputManager.isActionPressed('moveForward'),
        backward: this.inputManager.isActionPressed('moveBackward'),
        left: this.inputManager.isActionPressed('moveLeft'),
        right: this.inputManager.isActionPressed('moveRight'),
        playerPos: this.player.getPosition(),
        cameraPos: this.camera.position
      });
    }
    
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
    
    // Camera rotation is handled by mouse look controls
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
    
    // Reset first-person camera
    this.setupFirstPersonCamera();
    
    // Restart clock
    this.clock.start();
    
    // Start ambient sounds
    this.audioManager.play('tavern_ambience', true);
    this.audioManager.play('game_music', true);
    
    console.log("Game restarted!");
  }
  
  public handleInput(type: string, data?: any): void {
    if (!this.isInitialized) {
      console.log("🎮 [GameEngine] Input ignored - not initialized");
      return;
    }
    
    // Handle pointer lock requests even when game is paused (for UI management)
    if (type === 'requestPointerLock' || type === 'requestPointerUnlock') {
      console.log("🎮 [GameEngine] Pointer lock request:", type);
      
      if (type === 'requestPointerLock') {
        this.inputManager.requestPointerLock();
      } else if (type === 'requestPointerUnlock') {
        this.inputManager.exitPointerLock();
      }
      return;
    }
    
    // For other inputs, check if game is playing and not paused
    if (!this.gameState.isPlaying || this.gameState.isPaused) {
      console.log("🎮 [GameEngine] Input ignored - not ready. Playing:", this.gameState.isPlaying, "Paused:", this.gameState.isPaused);
      return;
    }
    
    console.log("🎮 [GameEngine] Input received:", { type, data });
    
    switch (type) {
      case 'attack':
        console.log("🎮 [GameEngine] Processing attack input");
        if (this.combatSystem) {
          this.combatSystem.startPlayerAttack();
        } else {
          console.warn("🎮 [GameEngine] No combat system available for attack");
        }
        break;
        
      case 'sprint':
        if (this.player) {
          this.player.startSprint();
        }
        break;
        
      case 'doubleTapForward':
        if (this.player) {
          this.player.startSprint();
        }
        break;
        
      case 'pointerLockChange':
        if (data && data.locked) {
          console.log("🎮 [GameEngine] Pointer locked - game controls active");
        } else {
          console.log("🎮 [GameEngine] Pointer unlocked - game controls inactive");
        }
        break;
        
      default:
        // Handle other input types
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
