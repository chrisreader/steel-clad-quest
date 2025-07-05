
import * as THREE from 'three';

export class MouseHandler {
  private mouse: { x: number; y: number; buttons: number } = { x: 0, y: 0, buttons: 0 };
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private mouseMovement: { x: number; y: number } = { x: 0, y: 0 };
  private lastMouseDown: number = 0;
  private doubleClickThreshold: number = 300;
  private doubleClickDistance: number = 10;
  private isDoubleClick: boolean = false;
  private wheelDelta: number = 0;
  private isPointerLocked: boolean = false;
  
  // Performance optimization
  private lastMouseMoveTime: number = 0;
  private mouseMoveThrottle: number = 8; // ~120fps max for mouse events
  
  private eventDispatcher: (type: string, data?: any) => void;
  
  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('wheel', this.handleMouseWheel.bind(this));
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  private handleMouseMove(event: MouseEvent): void {
    const now = performance.now();
    
    // Throttle mouse events for better performance (but allow all when pointer locked)
    if (!this.isPointerLocked && now - this.lastMouseMoveTime < this.mouseMoveThrottle) {
      return;
    }
    this.lastMouseMoveTime = now;
    
    this.previousMouse.x = this.mouse.x;
    this.previousMouse.y = this.mouse.y;
    
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    
    // Use raw movement values for better precision
    this.mouseMovement.x = event.movementX || 0;
    this.mouseMovement.y = event.movementY || 0;
    
    // Only dispatch look events when pointer is locked and there's actual movement
    if (this.isPointerLocked && (this.mouseMovement.x !== 0 || this.mouseMovement.y !== 0)) {
      this.eventDispatcher('look', {
        x: this.mouseMovement.x,
        y: this.mouseMovement.y
      });
    }
  }
  
  private handleMouseDown(event: MouseEvent): void {
    console.log("🖱️ [MouseHandler] Mouse down detected - button:", event.button);
    this.mouse.buttons |= (1 << event.button);
    
    const now = Date.now();
    const timeSinceLastClick = now - this.lastMouseDown;
    const distanceFromLastClick = Math.sqrt(
      Math.pow(this.mouse.x - this.previousMouse.x, 2) +
      Math.pow(this.mouse.y - this.previousMouse.y, 2)
    );
    
    if (timeSinceLastClick < this.doubleClickThreshold && distanceFromLastClick < this.doubleClickDistance) {
      this.isDoubleClick = true;
      this.eventDispatcher('doubleClick', { button: event.button });
    } else {
      this.isDoubleClick = false;
    }
    
    this.lastMouseDown = now;
    
    switch (event.button) {
      case 0: // Left mouse button
        console.log("🖱️ [MouseHandler] LEFT CLICK - dispatching 'attack' event");
        this.eventDispatcher('attack');
        break;
      case 2: // Right mouse button
        console.log("🖱️ [MouseHandler] RIGHT CLICK - dispatching 'secondaryAction' event");
        this.eventDispatcher('secondaryAction');
        break;
      case 1: // Middle mouse button
        this.eventDispatcher('tertiaryAction');
        break;
    }
  }
  
  private handleMouseUp(event: MouseEvent): void {
    console.log("🖱️ [MouseHandler] Mouse up detected - button:", event.button);
    this.mouse.buttons &= ~(1 << event.button);
    
    switch (event.button) {
      case 0: // Left mouse button
        console.log("🖱️ [MouseHandler] LEFT RELEASE - dispatching 'attackEnd' event");
        this.eventDispatcher('attackEnd');
        break;
      case 2: // Right mouse button
        console.log("🖱️ [MouseHandler] RIGHT RELEASE - dispatching 'secondaryActionEnd' event");
        this.eventDispatcher('secondaryActionEnd');
        break;
    }
  }
  
  private handleMouseWheel(event: WheelEvent): void {
    this.wheelDelta = Math.sign(event.deltaY);
    this.eventDispatcher('scroll', { delta: this.wheelDelta });
  }
  
  public getMousePosition(): { x: number; y: number } {
    return { ...this.mouse };
  }
  
  public getMouseDelta(): { x: number; y: number } {
    return { ...this.mouseMovement };
  }
  
  public resetMouseDelta(): void {
    this.mouseMovement.x = 0;
    this.mouseMovement.y = 0;
  }
  
  public isButtonPressed(button: number): boolean {
    return !!(this.mouse.buttons & (1 << button));
  }
  
  public setPointerLocked(locked: boolean): void {
    this.isPointerLocked = locked;
    console.log("🖱️ [MouseHandler] Pointer lock state updated:", locked);
  }
  
  public dispose(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('wheel', this.handleMouseWheel);
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
  }
}
