
import { InputManager } from '../InputManager';
import { PointerLockManager } from './PointerLockManager';

export class MouseHandler {
  private inputManager: InputManager;
  private pointerLockManager: PointerLockManager;
  private mouseSensitivity: number = 0.002;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(inputManager: InputManager, pointerLockManager: PointerLockManager) {
    this.inputManager = inputManager;
    this.pointerLockManager = pointerLockManager;
    
    // Bind event handlers
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    console.log('🖱️ [MouseHandler] Initialized');
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.pointerLockManager.isPointerLocked()) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    this.lastMouseX += movementX;
    this.lastMouseY += movementY;
    
    // Send rotation data to the input manager
    this.inputManager.setMouseRotation(
      movementX * this.mouseSensitivity,
      movementY * this.mouseSensitivity
    );
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.pointerLockManager.isPointerLocked()) return;
    
    console.log('🖱️ [MouseHandler] Mouse button pressed:', event.button);
    
    switch (event.button) {
      case 0: // Left mouse button
        console.log('🖱️ [MouseHandler] Left mouse button pressed - starting bow draw');
        this.inputManager.setInputState('attack', true);
        this.inputManager.setInputState('bowDraw', true);
        break;
      case 1: // Middle mouse button
        event.preventDefault();
        break;
      case 2: // Right mouse button
        event.preventDefault();
        break;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.pointerLockManager.isPointerLocked()) return;
    
    console.log('🖱️ [MouseHandler] Mouse button released:', event.button);
    
    switch (event.button) {
      case 0: // Left mouse button
        console.log('🖱️ [MouseHandler] Left mouse button released - stopping bow draw');
        this.inputManager.setInputState('attack', false);
        this.inputManager.setInputState('bowDraw', false);
        break;
      case 2: // Right mouse button
        event.preventDefault();
        break;
    }
  }

  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }

  public getMouseSensitivity(): number {
    return this.mouseSensitivity;
  }

  public cleanup(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    console.log('🖱️ [MouseHandler] Cleaned up event listeners');
  }
}
