import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { CameraManager } from './CameraManager';
import { SceneManager } from './SceneManager';
import { PointerLockManager } from './PointerLockManager';
import { UIManager } from '../../ui/UIManager';
import { Item } from '../../types/GameTypes';
import { Inventory } from '../Inventory';
import { MouseHandler } from './input/MouseHandler';

export class GameEngine {
  private isGameRunning: boolean = false;
  private sceneManager: SceneManager;
  private cameraManager: CameraManager;
  private inputManager: InputManager;
  private pointerLockManager: PointerLockManager;
  private mouseHandler: MouseHandler;
  private player: Player | null = null;
  private uiManager: UIManager;
  private inventory: Inventory;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    uiManager: UIManager,
    inventory: Inventory
  ) {
    this.sceneManager = new SceneManager(scene);
    this.cameraManager = new CameraManager(camera);
    this.inputManager = new InputManager();
    this.pointerLockManager = new PointerLockManager();
    this.mouseHandler = new MouseHandler(this.inputManager, this.pointerLockManager);
    this.uiManager = uiManager;
    this.inventory = inventory;

    this.pointerLockManager.addEventListener('lock', () => {
      this.inputManager.resetInputState();
      this.uiManager.hideCrosshair(false);
    });
    this.pointerLockManager.addEventListener('unlock', () => {
      this.inputManager.resetInputState();
      this.uiManager.showCrosshair();
    });
  }

  public async initialize(): Promise<void> {
    await this.sceneManager.loadScene();
    this.player = new Player(this.sceneManager.getScene(), this.cameraManager.getCamera());
    this.player.initialize();
    this.cameraManager.setTarget(this.player.getPosition());
    this.pointerLockManager.connect(document.body);
    this.isGameRunning = true;
    console.log('🎮 [GameEngine] Initialized and running!');
  }

  public setPlayerWeapon(item: Item): void {
    if (this.player) {
      this.player.setWeapon(item);
    }
  }

  public handleInput(action: string): void {
    if (!this.isGameRunning) return;

    switch (action) {
      case 'moveForward':
      case 'moveBackward':
      case 'moveLeft':
      case 'moveRight':
        this.inputManager.setInputState(action, true);
        break;
      case 'sprint':
        this.inputManager.setInputState('sprint', true);
        break;
      case 'attack':
        this.inputManager.setInputState('attack', true);
        break;
    }
  }

  public stopInput(action: string): void {
    if (!this.isGameRunning) return;

    switch (action) {
      case 'moveForward':
      case 'moveBackward':
      case 'moveLeft':
      case 'moveRight':
        this.inputManager.setInputState(action, false);
        break;
      case 'sprint':
        this.inputManager.setInputState('sprint', false);
        break;
      case 'attack':
        this.inputManager.setInputState('attack', false);
        break;
    }
  }

  public update(deltaTime: number): void {
    this.updateGameLogic(deltaTime);
    this.cameraManager.update(deltaTime);
    this.uiManager.update(deltaTime);
  }

  private updateGameLogic(deltaTime: number): void {
    if (!this.isGameRunning || !this.player) return;

    const inputState = this.inputManager.getInputState();
    
    // Handle bow drawing input
    if (inputState.bowDraw && !this.player.isBowDrawing) {
      console.log('🎮 [GameEngine] Starting bow draw from input');
      this.player.startBowDraw();
    } else if (!inputState.bowDraw && this.player.isBowDrawing) {
      console.log('🎮 [GameEngine] Stopping bow draw from input');
      this.player.stopBowDraw();
    }
    
    // Handle attack input (for non-bow weapons)
    if (inputState.attack && !this.player.isBowDrawing) {
      this.player.attack();
    }

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
    if (inputState.sprint) {
      this.player.sprint(true);
    } else {
      this.player.sprint(false);
    }

    this.player.update(deltaTime);
    this.cameraManager.setTarget(this.player.getPosition());
  }

  public isRunning(): boolean {
    return this.isGameRunning;
  }

  public isPointerLocked(): boolean {
    return this.pointerLockManager.isLocked();
  }

  public requestPointerLock(): void {
    this.pointerLockManager.requestLock();
  }

  public exitPointerLock(): void {
    this.pointerLockManager.exitLock();
  }

  public dispose(): void {
    this.sceneManager.dispose();
    this.inputManager.resetInputState();
    this.pointerLockManager.disconnect();
    if (this.player) {
      this.player.dispose();
    }
    this.isGameRunning = false;
    console.log('🎮 [GameEngine] Disposed');
  }
}
