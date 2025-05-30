
export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private mousePosition = { x: 0, y: 0 };
  private mouseButtons: { [button: number]: boolean } = {};

  constructor() {
    console.log('Initializing Input Manager...');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.keys[event.code] = true;
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys[event.code] = false;
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mousePosition.x = event.clientX;
    this.mousePosition.y = event.clientY;
  }

  private handleMouseDown(event: MouseEvent): void {
    this.mouseButtons[event.button] = true;
  }

  private handleMouseUp(event: MouseEvent): void {
    this.mouseButtons[event.button] = false;
  }

  public isKeyPressed(key: string): boolean {
    return !!this.keys[key];
  }

  public isMouseButtonPressed(button: number): boolean {
    return !!this.mouseButtons[button];
  }

  public getMousePosition(): { x: number; y: number } {
    return this.mousePosition;
  }

  public update(): void {
    // Update input states if needed
  }
}
