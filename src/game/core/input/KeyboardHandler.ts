
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
  private keysPressed = new Set<string>();
  private keyBindings: KeyBindings;
  private eventDispatcher: (type: string, data?: any) => void;

  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
    this.keyBindings = this.getDefaultKeyBindings();
    this.setupEventListeners();
  }

  private getDefaultKeyBindings(): KeyBindings {
    return {
      moveForward: ['KeyW', 'ArrowUp'],
      moveBackward: ['KeyS', 'ArrowDown'],
      moveLeft: ['KeyA', 'ArrowLeft'],
      moveRight: ['KeyD', 'ArrowRight'],
      jump: ['Space'],
      sprint: ['ShiftLeft', 'ShiftRight'],
      attack: ['Space'],
      interact: ['KeyE'],
      inventory: ['KeyI'],
      skillTree: ['KeyK'],
      questLog: ['KeyQ'],
      pause: ['Escape']
    };
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.keysPressed.add(event.code);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keysPressed.delete(event.code);
  }

  public isKeyPressed(keyCode: string): boolean {
    return this.keysPressed.has(keyCode);
  }

  public isActionPressed(action: keyof KeyBindings): boolean {
    return this.keyBindings[action].some(key => this.keysPressed.has(key));
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
  }
}
