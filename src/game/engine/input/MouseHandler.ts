
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
  
  // Advanced mouse smoothing system
  private lastMouseMoveTime: number = 0;
  private mouseMoveThrottle: number = 8; // Increased for more consistent feel
  private mouseVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private smoothedMovement: { x: number; y: number } = { x: 0, y: 0 };
  private movementHistory: Array<{ x: number; y: number; time: number }> = [];
  private readonly SMOOTHING_SAMPLES: number = 5;
  private readonly SMOOTHING_FACTOR: number = 0.15;
  private readonly ACCELERATION_THRESHOLD: number = 2.0;
  private mouseSensitivity: number = 1.0;
  
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
    
    // Ultra-smooth input handling with minimal throttling
    if (!this.isPointerLocked && now - this.lastMouseMoveTime < this.mouseMoveThrottle) {
      return;
    }
    this.lastMouseMoveTime = now;
    
    this.previousMouse.x = this.mouse.x;
    this.previousMouse.y = this.mouse.y;
    
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    
    // Get raw movement values
    const rawX = event.movementX || 0;
    const rawY = event.movementY || 0;
    
    // Apply advanced smoothing only when pointer is locked
    if (this.isPointerLocked && (rawX !== 0 || rawY !== 0)) {
      const smoothedInput = this.applySmoothingFilter(rawX, rawY, now);
      
      this.mouseMovement.x = smoothedInput.x * this.mouseSensitivity;
      this.mouseMovement.y = smoothedInput.y * this.mouseSensitivity;
      
      this.eventDispatcher('look', {
        x: this.mouseMovement.x,
        y: this.mouseMovement.y
      });
    }
  }
  
  private applySmoothingFilter(rawX: number, rawY: number, timestamp: number): { x: number; y: number } {
    // Add to movement history
    this.movementHistory.push({ x: rawX, y: rawY, time: timestamp });
    
    // Keep only recent samples
    if (this.movementHistory.length > this.SMOOTHING_SAMPLES) {
      this.movementHistory.shift();
    }
    
    // Calculate velocity for acceleration detection
    if (this.movementHistory.length >= 2) {
      const recent = this.movementHistory[this.movementHistory.length - 1];
      const previous = this.movementHistory[this.movementHistory.length - 2];
      const deltaTime = Math.max(recent.time - previous.time, 1);
      
      this.mouseVelocity.x = (recent.x - previous.x) / deltaTime * 1000;
      this.mouseVelocity.y = (recent.y - previous.y) / deltaTime * 1000;
    }
    
    // Apply exponential moving average smoothing
    this.smoothedMovement.x = this.smoothedMovement.x * (1 - this.SMOOTHING_FACTOR) + rawX * this.SMOOTHING_FACTOR;
    this.smoothedMovement.y = this.smoothedMovement.y * (1 - this.SMOOTHING_FACTOR) + rawY * this.SMOOTHING_FACTOR;
    
    // Detect rapid movements and reduce smoothing for responsiveness
    const velocityMagnitude = Math.sqrt(this.mouseVelocity.x * this.mouseVelocity.x + this.mouseVelocity.y * this.mouseVelocity.y);
    const responsivenessFactor = velocityMagnitude > this.ACCELERATION_THRESHOLD ? 0.8 : 0.4;
    
    return {
      x: this.smoothedMovement.x * responsivenessFactor + rawX * (1 - responsivenessFactor),
      y: this.smoothedMovement.y * responsivenessFactor + rawY * (1 - responsivenessFactor)
    };
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
    // Reset smoothing when pointer lock changes
    if (locked) {
      this.smoothedMovement = { x: 0, y: 0 };
      this.mouseVelocity = { x: 0, y: 0 };
      this.movementHistory = [];
    }
    console.log("🖱️ [MouseHandler] Pointer lock state updated:", locked);
  }
  
  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
  }
  
  public dispose(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('wheel', this.handleMouseWheel);
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
  }
}
