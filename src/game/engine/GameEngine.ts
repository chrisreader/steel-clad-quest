
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { SceneManager } from './SceneManager';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { PhysicsManager } from './PhysicsManager';
import { Player } from '../entities/Player';
import { GameState, Enemy } from '../../types/GameTypes';

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  
  private inputManager: InputManager;
  private sceneManager: SceneManager;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private physicsManager: PhysicsManager;
  
  private player: Player;
  private enemies: Enemy[] = [];
  private gameState: GameState;
  
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement) {
    console.log('Initializing Game Engine...');
    
    // Initialize Three.js core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.clock = new THREE.Clock();
    
    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    
    // Initialize managers
    this.inputManager = new InputManager();
    this.sceneManager = new SceneManager(this.scene);
    this.effectsManager = new EffectsManager(this.scene);
    this.audioManager = new AudioManager();
    this.physicsManager = new PhysicsManager();
    
    // Initialize game objects
    this.player = new Player();
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      currentLevel: 'tavern',
      score: 0,
      timeElapsed: 0
    };
    
    this.setupEventListeners();
    console.log('Game Engine initialized successfully!');
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private setupCamera(): void {
    this.camera.position.set(0, 10, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
    
    // Directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public start(): void {
    console.log('Starting game...');
    this.isRunning = true;
    this.gameState.isPlaying = true;
    this.sceneManager.loadLevel('tavern');
    this.gameLoop();
  }

  public stop(): void {
    console.log('Stopping game...');
    this.isRunning = false;
    this.gameState.isPlaying = false;
  }

  public pause(): void {
    this.gameState.isPaused = !this.gameState.isPaused;
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.gameLoop());
    
    if (this.gameState.isPaused) return;
    
    const deltaTime = this.clock.getDelta();
    this.gameState.timeElapsed += deltaTime;
    
    // Update game systems
    this.inputManager.update();
    this.player.update(deltaTime);
    this.updateEnemies(deltaTime);
    this.physicsManager.update(deltaTime);
    this.effectsManager.update(deltaTime);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private updateEnemies(deltaTime: number): void {
    this.enemies.forEach(enemy => {
      // Basic enemy AI and movement will be implemented in enemy classes
    });
  }

  private updateCamera(): void {
    const playerPosition = this.player.getPosition();
    this.camera.position.x = playerPosition.x;
    this.camera.position.z = playerPosition.z + 10;
    this.camera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.audioManager.dispose();
  }
}
