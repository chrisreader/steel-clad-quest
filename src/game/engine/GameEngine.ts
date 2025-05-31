import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { LevelManager } from './LevelManager';
import { UIManager } from './UIManager';
import { CombatSystem } from '../systems/CombatSystem';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { GameSettings } from './GameSettings';
import { SaveManager } from './SaveManager';
import { PerformanceMonitor } from './PerformanceMonitor';

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private inputManager: InputManager;
  private player: Player;
  private levelManager: LevelManager;
  private uiManager: UIManager;
  private combatSystem: CombatSystem;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private gameSettings: GameSettings;
  private saveManager: SaveManager;
  private performanceMonitor: PerformanceMonitor;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    console.log('⚙️ [GameEngine] Initializing...');
    
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Initialize managers and systems
    this.clock = new THREE.Clock();
    this.inputManager = new InputManager();
    this.effectsManager = new EffectsManager(this.scene);
    this.audioManager = new AudioManager();
    this.player = new Player(this.scene, this.effectsManager, this.audioManager);
    this.combatSystem = new CombatSystem(this.scene, this.player, this.effectsManager, this.audioManager);
    this.levelManager = new LevelManager(this.scene, this.player, this.combatSystem);
    this.uiManager = new UIManager(this.player, this.combatSystem);
    this.gameSettings = new GameSettings();
    this.saveManager = new SaveManager(this.player, this.levelManager, this.gameSettings);
    this.performanceMonitor = new PerformanceMonitor();
    
    // Set initial camera position
    this.camera.position.set(0, 2, 5);
    
    console.log('⚙️ [GameEngine] Initialization complete.');
  }

  public initialize(renderer: THREE.WebGLRenderer): Promise<void> {
    return new Promise((resolve) => {
      console.log('⚙️ [GameEngine] Async initialization started...');
      
      // Initialize input manager
      this.inputManager.initialize(renderer);
      
      // Load game settings
      this.gameSettings.loadSettings();
      
      // Load audio resources
      this.audioManager.loadAudio().then(() => {
        console.log('🔊 [GameEngine] Audio resources loaded.');
      });
      
      // Load a level
      this.levelManager.loadLevel('forest').then(() => {
        console.log('🌍 [GameEngine] Level loaded.');
        
        // Initialize UI
        this.uiManager.initialize();
        
        // Resolve the promise to signal completion
        resolve();
        
        console.log('⚙️ [GameEngine] Async initialization complete.');
      });

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
          this.uiManager.togglePauseMenu();
        }
        
        if (type === 'inventory') {
          this.uiManager.toggleInventory();
        }
        
        if (type === 'skillTree') {
          this.uiManager.toggleSkillTree();
        }
        
        if (type === 'questLog') {
          this.uiManager.toggleQuestLog();
        }
        
        if (type === 'interact') {
          // Implement interaction logic here
          console.log('🎮 [GameEngine] Interact action');
        }
      });

      console.log('🎮 [GameEngine] Input event listeners added.');
    });
  }

  private update(): void {
    const deltaTime = this.clock.getDelta();
    
    // Update performance monitor
    this.performanceMonitor.update();
    
    // Update input manager
    this.inputManager.update();
    
    // Update player position for combat system
    const playerPosition = this.player.getPosition();
    
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
    
    // Update level manager
    this.levelManager.update(deltaTime);
    
    // Update UI
    this.uiManager.update(deltaTime);
    
    // Update effects
    this.effectsManager.update(deltaTime);
    
    // Update audio
    this.audioManager.update(playerPosition);
    
    // Update camera position
    this.updateCameraPosition(playerPosition);
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // Update performance stats in UI
    this.uiManager.updatePerformanceStats(this.performanceMonitor.getStats());
  }

  private updateCameraPosition(playerPosition: THREE.Vector3): void {
    // Follow the player with the camera
    this.camera.position.x = playerPosition.x;
    this.camera.position.z = playerPosition.z + 5;
    this.camera.position.y = 3;
  }

  public start(): void {
    console.log('⚙️ [GameEngine] Starting game loop...');
    this.renderer.setAnimationLoop(() => {
      this.update();
    });
  }

  public stop(): void {
    console.log('⚙️ [GameEngine] Stopping game loop...');
    this.renderer.setAnimationLoop(null);
  }

  public dispose(): void {
    console.log('⚙️ [GameEngine] Disposing resources...');
    this.inputManager.dispose();
    this.levelManager.dispose();
    this.uiManager.dispose();
    this.effectsManager.dispose();
    this.audioManager.dispose();
    this.performanceMonitor.dispose();
    this.saveManager.dispose();
    this.combatSystem.dispose();
    this.renderer.dispose();
  }

  public saveGame(): void {
    this.saveManager.saveGame();
  }

  public loadGame(): void {
    this.saveManager.loadGame();
  }

  public spawnEnemies(count: number): void {
    const playerPosition = this.player.getPosition();
    this.combatSystem.spawnRandomEnemies(count, playerPosition);
  }

  public getPlayer(): Player {
    return this.player;
  }
}
