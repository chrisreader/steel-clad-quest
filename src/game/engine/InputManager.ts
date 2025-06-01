import * as THREE from 'three';
import { MouseHandler } from './input/MouseHandler';
import { KeyboardHandler } from './input/KeyboardHandler';
import { TouchHandler } from './input/TouchHandler';
import { PointerLockManager } from './input/PointerLockManager';

interface KeyBindings {
  moveForward: string[];
  moveBackward: string[];
  moveLeft: string[];
  moveRight: string[];
  jump: string[];
  sprint: string[];
  attack: string[];
  interact: string[];
  inventory: string[];
  skillTree: string[];
  questLog: string[];
  pause: string[];
}

export class InputManager {
  private mouseHandler: MouseHandler;
  private keyboardHandler: KeyboardHandler;
  private touchHandler: TouchHandler;
  private pointerLockManager: PointerLockManager;
  
  constructor() {
    console.log('🎮 [InputManager] Initializing with enhanced mouse smoothing...');
    
    // Create event dispatcher
    const eventDispatcher = this.dispatchInputEvent.bind(this);
    
    // Initialize handlers
    this.mouseHandler = new MouseHandler(eventDispatcher);
    this.keyboardHandler = new KeyboardHandler(eventDispatcher);
    this.touchHandler = new TouchHandler(eventDispatcher);
    this.pointerLockManager = new PointerLockManager(eventDispatcher);
    
    // Set up pointer lock state synchronization
    this.setupPointerLockSync();
  }
  
  public initialize(renderer: THREE.WebGLRenderer): void {
    this.pointerLockManager.initialize(renderer);
    console.log('🎮 [InputManager] Initialized with enhanced mouse handling');
  }
  
  private setupPointerLockSync(): void {
    // Listen for pointer lock changes to sync with mouse handler
    document.addEventListener('gameInput', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      if (type === 'pointerLockChange') {
        this.mouseHandler.setPointerLocked(data.locked);
        console.log("🔄 [InputManager] Synchronized pointer lock state:", data.locked);
      }
    });
  }
  
  // Custom event system
  private dispatchInputEvent(type: string, data?: any): void {
    const event = new CustomEvent('gameInput', {
      detail: {
        type: type,
        data: data || {}
      }
    });
    
    document.dispatchEvent(event);
  }
  
  // Public API - delegate to appropriate handlers
  public isKeyPressed(keyCode: string): boolean {
    return this.keyboardHandler.isKeyPressed(keyCode);
  }
  
  public isActionPressed(action: keyof KeyBindings): boolean {
    // Check keyboard first
    const keyboardResult = this.keyboardHandler.isActionPressed(action);
    if (keyboardResult) return true;
    
    // Check mouse for mouse-based actions
    if (action === 'attack') {
      return this.mouseHandler.isButtonPressed(0); // Left mouse button
    }
    
    return false;
  }
  
  public isAttackHeld(): boolean {
    return this.mouseHandler.isButtonHeld(0); // Left mouse button
  }
  
  public getMousePosition(): { x: number; y: number } {
    return this.mouseHandler.getMousePosition();
  }
  
  public getMouseDelta(): { x: number; y: number } {
    return this.mouseHandler.getMouseDelta();
  }
  
  public resetMouseDelta(): void {
    this.mouseHandler.resetMouseDelta();
  }
  
  public getJoystickState(): { active: boolean; x: number; y: number } {
    return this.touchHandler.getJoystickState();
  }
  
  public setMouseSensitivity(sensitivity: number): void {
    console.log("Mouse sensitivity setting moved to GameEngine");
  }
  
  public setKeyBindings(bindings: Partial<KeyBindings>): void {
    this.keyboardHandler.setKeyBindings(bindings);
  }
  
  public getKeyBindings(): KeyBindings {
    return this.keyboardHandler.getKeyBindings();
  }
  
  public isPointerLocked(): boolean {
    return this.pointerLockManager.isPointerLocked();
  }
  
  public requestPointerLock(): void {
    this.pointerLockManager.requestPointerLock();
  }
  
  public exitPointerLock(): void {
    this.pointerLockManager.exitPointerLock();
  }
  
  public isMobile(): boolean {
    return this.touchHandler.isMobile();
  }
  
  public isTouch(): boolean {
    return this.touchHandler.isTouch();
  }
  
  public update(): void {
    // Reset mouse delta after each frame for smooth movement
    this.mouseHandler.resetMouseDelta();
  }
  
  public dispose(): void {
    this.mouseHandler.dispose();
    this.keyboardHandler.dispose();
    this.touchHandler.dispose();
    this.pointerLockManager.dispose();
  }
}
