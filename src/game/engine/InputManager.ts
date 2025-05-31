
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

interface InputState {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  attack: boolean;
  bowDraw: boolean;
  sprint: boolean;
}

export class InputManager {
  private mouseHandler: MouseHandler;
  private keyboardHandler: KeyboardHandler;
  private touchHandler: TouchHandler;
  private pointerLockManager: PointerLockManager;
  private inputState: InputState;
  
  constructor() {
    console.log('🎮 [InputManager] Initializing...');
    
    // Initialize pointer lock manager first
    this.pointerLockManager = new PointerLockManager();
    
    // Initialize handlers
    this.mouseHandler = new MouseHandler(this, this.pointerLockManager);
    this.keyboardHandler = new KeyboardHandler();
    this.touchHandler = new TouchHandler();
    
    // Initialize input state
    this.inputState = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      attack: false,
      bowDraw: false,
      sprint: false
    };
  }
  
  public initialize(renderer: THREE.WebGLRenderer): void {
    this.pointerLockManager.initialize(renderer);
    console.log('🎮 [InputManager] Initialized');
  }
  
  // Methods needed by MouseHandler
  public setInputState(action: string, value: boolean): void {
    if (action in this.inputState) {
      (this.inputState as any)[action] = value;
      console.log(`🎮 [InputManager] Set ${action} to ${value}`);
    }
  }
  
  public setMouseRotation(deltaX: number, deltaY: number): void {
    // Handle mouse rotation - pass to camera system if needed
    console.log(`🖱️ [InputManager] Mouse rotation: ${deltaX.toFixed(3)}, ${deltaY.toFixed(3)}`);
  }
  
  // Public API methods
  public isKeyPressed(keyCode: string): boolean {
    return this.keyboardHandler.isKeyPressed(keyCode);
  }
  
  public isActionPressed(action: keyof KeyBindings): boolean {
    return this.keyboardHandler.isActionPressed(action);
  }
  
  public getMousePosition(): { x: number; y: number } {
    return { x: 0, y: 0 }; // Simplified
  }
  
  public getMouseDelta(): { x: number; y: number } {
    return { x: 0, y: 0 }; // Simplified
  }
  
  public resetMouseDelta(): void {
    // Simplified
  }
  
  public getJoystickState(): { active: boolean; x: number; y: number } {
    return this.touchHandler.getJoystickState();
  }
  
  public setMouseSensitivity(sensitivity: number): void {
    this.mouseHandler.setMouseSensitivity(sensitivity);
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
    // Update logic
  }
  
  public dispose(): void {
    this.mouseHandler.cleanup();
    this.keyboardHandler.dispose();
    this.touchHandler.dispose();
    this.pointerLockManager.dispose();
  }
  
  public getInputState(): InputState {
    return { ...this.inputState };
  }
}
