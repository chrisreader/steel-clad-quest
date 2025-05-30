
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

export class KeyboardHandler {
  private keys: { [key: string]: boolean } = {};
  private lastWKeyPress: number = 0;
  private doubleTapWindow: number = 300;
  
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
  
  private eventDispatcher: (type: string, data?: any) => void;
  
  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
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
        this.eventDispatcher('doubleTapForward');
      }
      
      this.lastWKeyPress = now;
    }
    
    // Check for key binding matches
    this.checkActionBindings(event.code);
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    this.keys[event.code] = false;
  }
  
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.resetAllInputs();
      this.eventDispatcher('visibilityChange', { visible: false });
    } else {
      this.eventDispatcher('visibilityChange', { visible: true });
    }
  }
  
  private resetAllInputs(): void {
    for (const key in this.keys) {
      this.keys[key] = false;
    }
  }
  
  private checkActionBindings(keyCode: string): void {
    for (const [action, keyCodes] of Object.entries(this.keyBindings)) {
      if (keyCodes.includes(keyCode)) {
        this.eventDispatcher(action);
      }
    }
  }
  
  public isKeyPressed(keyCode: string): boolean {
    return !!this.keys[keyCode];
  }
  
  public isActionPressed(action: keyof KeyBindings): boolean {
    const keyCodes = this.keyBindings[action];
    if (!keyCodes) return false;
    
    return keyCodes.some(keyCode => {
      if (keyCode === 'MouseLeft' || keyCode === 'MouseRight' || keyCode === 'MouseMiddle') {
        // These should be handled by MouseHandler
        return false;
      } else {
        return !!this.keys[keyCode];
      }
    });
  }
  
  public setKeyBindings(bindings: Partial<KeyBindings>): void {
    this.keyBindings = { ...this.keyBindings, ...bindings };
  }
  
  public getKeyBindings(): KeyBindings {
    return { ...this.keyBindings };
  }
  
  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
