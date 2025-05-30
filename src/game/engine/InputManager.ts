import * as THREE from 'three';

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
  private keys: { [key: string]: boolean } = {};
  private mouse: { x: number; y: number; buttons: number } = { x: 0, y: 0, buttons: 0 };
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private pointerLocked: boolean = false;
  private lastMouseDown: number = 0;
  private doubleClickThreshold: number = 300;
  private doubleClickDistance: number = 10;
  private isDoubleClick: boolean = false;
  private lastWKeyPress: number = 0;
  private doubleTapWindow: number = 300;
  private wheelDelta: number = 0;
  private touchStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private touchStartTime: number = 0;
  private touchSwipeThreshold: number = 50;
  private touchTapThreshold: number = 200;
  private isTouchDevice: boolean = false;
  private isMobileDevice: boolean = false;
  
  // Virtual joystick for mobile
  private virtualJoystick: {
    active: boolean;
    center: { x: number; y: number };
    current: { x: number; y: number };
    maxDistance: number;
    id: number | null;
  } = {
    active: false,
    center: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    maxDistance: 60,
    id: null
  };
  
  // Mouse movement
  private mouseMovement: { x: number; y: number } = { x: 0, y: 0 };
  
  // Key bindings
  private keyBindings: KeyBindings = {
    moveForward: ['KeyW', 'ArrowUp'],
    moveBackward: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    jump: ['Space'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    attack: ['MouseLeft'],
    interact: ['KeyE', 'KeyF'],
    inventory: ['KeyI', 'Tab'],
    skillTree: ['KeyK'],
    questLog: ['KeyL', 'KeyQ'],
    pause: ['Escape', 'KeyP']
  };
  
  // Event callbacks
  private onPointerLockChange: () => void;
  private renderer: THREE.WebGLRenderer | null = null;
  
  constructor() {
    console.log('Initializing Input Manager...');
    this.onPointerLockChange = this.handlePointerLockChange.bind(this);
    this.detectDeviceType();
    this.setupEventListeners();
  }
  
  public initialize(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    console.log('InputManager initialized with renderer');
  }
  
  private detectDeviceType(): void {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log(`Device detection: Touch: ${this.isTouchDevice}, Mobile: ${this.isMobileDevice}`);
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('wheel', this.handleMouseWheel.bind(this));
    
    // Pointer lock events
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    
    // Touch events for mobile
    if (this.isTouchDevice) {
      document.addEventListener('touchstart', this.handleTouchStart.bind(this));
      document.addEventListener('touchmove', this.handleTouchMove.bind(this));
      document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    // Context menu (prevent right-click menu)
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Visibility change (pause when tab inactive)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    
    this.keys[event.code] = true;
    
    // Special case for sprint double-tap detection
    if (this.keyBindings.moveForward.includes(event.code)) {
      const now = Date.now();
      const timeSinceLastPress = now - this.lastWKeyPress;
      
      if (timeSinceLastPress < this.doubleTapWindow && timeSinceLastPress > 50) {
        this.dispatchInputEvent('doubleTapForward');
      }
      
      this.lastWKeyPress = now;
    }
    
    // Check for key binding matches
    this.checkActionBindings(event.code);
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    this.keys[event.code] = false;
  }
  
  private handleMouseMove(event: MouseEvent): void {
    // Store previous position
    this.previousMouse.x = this.mouse.x;
    this.previousMouse.y = this.mouse.y;
    
    // Update current position
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    
    // Calculate movement (use raw movement values without scaling here)
    this.mouseMovement.x = event.movementX || 0;
    this.mouseMovement.y = event.movementY || 0;
    
    // CRITICAL FIX: Only dispatch look events when pointer is actually locked
    if (this.pointerLocked && (this.mouseMovement.x !== 0 || this.mouseMovement.y !== 0)) {
      console.log("🖱️ [InputManager] Mouse movement dispatched (pointer locked):", this.mouseMovement.x, this.mouseMovement.y);
      
      this.dispatchInputEvent('look', {
        x: this.mouseMovement.x,
        y: this.mouseMovement.y
      });
    } else if (!this.pointerLocked && (this.mouseMovement.x !== 0 || this.mouseMovement.y !== 0)) {
      console.log("🖱️ [InputManager] Mouse movement ignored (pointer not locked):", this.mouseMovement.x, this.mouseMovement.y);
    }
  }
  
  private handleMouseDown(event: MouseEvent): void {
    // Update mouse buttons state
    this.mouse.buttons |= (1 << event.button);
    
    console.log("Mouse button pressed:", event.button);
    
    // Check for double click
    const now = Date.now();
    const timeSinceLastClick = now - this.lastMouseDown;
    const distanceFromLastClick = Math.sqrt(
      Math.pow(this.mouse.x - this.previousMouse.x, 2) +
      Math.pow(this.mouse.y - this.previousMouse.y, 2)
    );
    
    if (timeSinceLastClick < this.doubleClickThreshold && distanceFromLastClick < this.doubleClickDistance) {
      this.isDoubleClick = true;
      this.dispatchInputEvent('doubleClick', { button: event.button });
    } else {
      this.isDoubleClick = false;
    }
    
    this.lastMouseDown = now;
    
    // Handle specific buttons
    switch (event.button) {
      case 0: // Left mouse button
        this.dispatchInputEvent('attack');
        break;
      case 2: // Right mouse button
        this.dispatchInputEvent('secondaryAction');
        break;
      case 1: // Middle mouse button
        this.dispatchInputEvent('tertiaryAction');
        break;
    }
  }
  
  private handleMouseUp(event: MouseEvent): void {
    // Update mouse buttons state
    this.mouse.buttons &= ~(1 << event.button);
    
    // Handle specific buttons
    switch (event.button) {
      case 0: // Left mouse button
        this.dispatchInputEvent('attackEnd');
        break;
      case 2: // Right mouse button
        this.dispatchInputEvent('secondaryActionEnd');
        break;
    }
  }
  
  private handleMouseWheel(event: WheelEvent): void {
    this.wheelDelta = Math.sign(event.deltaY);
    this.dispatchInputEvent('scroll', { delta: this.wheelDelta });
  }
  
  private handlePointerLockChange(): void {
    const wasLocked = this.pointerLocked;
    this.pointerLocked = document.pointerLockElement === this.renderer?.domElement;
    
    console.log("🔒 [InputManager] Pointer lock state changed from", wasLocked, "to", this.pointerLocked);
    
    this.dispatchInputEvent('pointerLockChange', { locked: this.pointerLocked });
  }
  
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.touchStartPosition.x = touch.clientX;
      this.touchStartPosition.y = touch.clientY;
      this.touchStartTime = Date.now();
      
      if (touch.clientX < window.innerWidth / 2) {
        this.virtualJoystick.active = true;
        this.virtualJoystick.center.x = touch.clientX;
        this.virtualJoystick.center.y = touch.clientY;
        this.virtualJoystick.current.x = touch.clientX;
        this.virtualJoystick.current.y = touch.clientY;
        this.virtualJoystick.id = touch.identifier;
        
        this.dispatchInputEvent('joystickStart');
      } else {
        this.dispatchInputEvent('attack');
      }
    } else if (event.touches.length === 2) {
      this.dispatchInputEvent('twoFingerTouch');
    }
  }
  
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    if (this.virtualJoystick.active) {
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        
        if (touch.identifier === this.virtualJoystick.id) {
          this.virtualJoystick.current.x = touch.clientX;
          this.virtualJoystick.current.y = touch.clientY;
          
          const deltaX = this.virtualJoystick.current.x - this.virtualJoystick.center.x;
          const deltaY = this.virtualJoystick.current.y - this.virtualJoystick.center.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          const normalizedDistance = Math.min(distance, this.virtualJoystick.maxDistance) / this.virtualJoystick.maxDistance;
          
          let angle = Math.atan2(deltaY, deltaX);
          
          this.dispatchInputEvent('joystickMove', {
            x: Math.cos(angle) * normalizedDistance,
            y: Math.sin(angle) * normalizedDistance,
            angle: angle,
            magnitude: normalizedDistance
          });
          
          break;
        }
      }
    }
    
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      
      if (touch.clientX > window.innerWidth / 2) {
        const centerX = window.innerWidth * 0.75;
        const centerY = window.innerHeight * 0.5;
        const deltaX = (touch.clientX - centerX) * 0.001;
        const deltaY = (touch.clientY - centerY) * 0.001;
        
        this.dispatchInputEvent('look', { x: deltaX, y: deltaY });
      }
    }
  }
  
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.touches.length === 0) {
      if (this.virtualJoystick.active) {
        this.virtualJoystick.active = false;
        this.virtualJoystick.id = null;
        this.dispatchInputEvent('joystickEnd');
      }
      
      const touchDuration = Date.now() - this.touchStartTime;
      if (touchDuration < this.touchTapThreshold) {
        this.dispatchInputEvent('tap', {
          x: this.touchStartPosition.x,
          y: this.touchStartPosition.y,
          side: this.touchStartPosition.x < window.innerWidth / 2 ? 'left' : 'right'
        });
      }
      
      if (this.touchStartPosition.x > window.innerWidth / 2) {
        this.dispatchInputEvent('attackEnd');
      }
    } else {
      let joystickTouchFound = false;
      
      for (let i = 0; i < event.touches.length; i++) {
        if (event.touches[i].identifier === this.virtualJoystick.id) {
          joystickTouchFound = true;
          break;
        }
      }
      
      if (!joystickTouchFound && this.virtualJoystick.active) {
        this.virtualJoystick.active = false;
        this.virtualJoystick.id = null;
        this.dispatchInputEvent('joystickEnd');
      }
    }
  }
  
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.resetAllInputs();
      this.dispatchInputEvent('visibilityChange', { visible: false });
    } else {
      this.dispatchInputEvent('visibilityChange', { visible: true });
    }
  }
  
  private resetAllInputs(): void {
    for (const key in this.keys) {
      this.keys[key] = false;
    }
    
    this.mouse.buttons = 0;
    this.mouseMovement.x = 0;
    this.mouseMovement.y = 0;
    
    this.virtualJoystick.active = false;
    this.virtualJoystick.id = null;
  }
  
  private checkActionBindings(keyCode: string): void {
    for (const [action, keyCodes] of Object.entries(this.keyBindings)) {
      if (keyCodes.includes(keyCode)) {
        this.dispatchInputEvent(action);
      }
    }
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
  
  // Public API
  public isKeyPressed(keyCode: string): boolean {
    return !!this.keys[keyCode];
  }
  
  public isActionPressed(action: keyof KeyBindings): boolean {
    const keyCodes = this.keyBindings[action];
    if (!keyCodes) return false;
    
    return keyCodes.some(keyCode => {
      if (keyCode === 'MouseLeft') {
        return !!(this.mouse.buttons & 1);
      } else if (keyCode === 'MouseRight') {
        return !!(this.mouse.buttons & 2);
      } else if (keyCode === 'MouseMiddle') {
        return !!(this.mouse.buttons & 4);
      } else {
        return !!this.keys[keyCode];
      }
    });
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
  
  public getJoystickState(): { active: boolean; x: number; y: number } {
    if (!this.virtualJoystick.active) {
      return { active: false, x: 0, y: 0 };
    }
    
    const deltaX = this.virtualJoystick.current.x - this.virtualJoystick.center.x;
    const deltaY = this.virtualJoystick.current.y - this.virtualJoystick.center.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedDistance = Math.min(distance, this.virtualJoystick.maxDistance) / this.virtualJoystick.maxDistance;
    const angle = Math.atan2(deltaY, deltaX);
    
    return {
      active: true,
      x: Math.cos(angle) * normalizedDistance,
      y: Math.sin(angle) * normalizedDistance
    };
  }
  
  public setMouseSensitivity(sensitivity: number): void {
    console.log("Mouse sensitivity setting moved to GameEngine");
  }
  
  public setKeyBindings(bindings: Partial<KeyBindings>): void {
    this.keyBindings = { ...this.keyBindings, ...bindings };
  }
  
  public getKeyBindings(): KeyBindings {
    return { ...this.keyBindings };
  }
  
  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }
  
  public requestPointerLock(): void {
    if (this.renderer && this.renderer.domElement && !this.pointerLocked && document.contains(this.renderer.domElement)) {
      try {
        console.log("🔒 [InputManager] Requesting pointer lock");
        this.renderer.domElement.requestPointerLock();
      } catch (error) {
        console.warn("Failed to request pointer lock:", error);
      }
    } else {
      console.warn("Cannot request pointer lock - renderer, element missing, already locked, or element not in DOM");
    }
  }
  
  public exitPointerLock(): void {
    if (this.pointerLocked) {
      console.log("🔒 [InputManager] Exiting pointer lock");
      document.exitPointerLock();
    }
  }
  
  public isMobile(): boolean {
    return this.isMobileDevice;
  }
  
  public isTouch(): boolean {
    return this.isTouchDevice;
  }
  
  public update(): void {
    // Update input states if needed
  }
  
  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('wheel', this.handleMouseWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
