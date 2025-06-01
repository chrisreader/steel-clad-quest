
export class MouseHandler {
  private mousePosition = { x: 0, y: 0 };
  private mouseDelta = { x: 0, y: 0 };
  private previousMousePosition = { x: 0, y: 0 };
  private isPointerLocked = false;
  private buttonsPressed = new Set<number>();
  private eventDispatcher: (type: string, data?: any) => void;

  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isPointerLocked) {
      this.mouseDelta.x = event.movementX || 0;
      this.mouseDelta.y = event.movementY || 0;
      
      this.eventDispatcher('look', {
        x: this.mouseDelta.x,
        y: this.mouseDelta.y
      });
    } else {
      this.mousePosition.x = event.clientX;
      this.mousePosition.y = event.clientY;
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    this.buttonsPressed.add(event.button);
    
    if (event.button === 0) { // Left click
      this.eventDispatcher('attack');
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    this.buttonsPressed.delete(event.button);
    
    if (event.button === 0) { // Left click
      this.eventDispatcher('attackEnd');
    }
  }

  public setPointerLocked(locked: boolean): void {
    this.isPointerLocked = locked;
  }

  public getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  public getMouseDelta(): { x: number; y: number } {
    return { ...this.mouseDelta };
  }

  public resetMouseDelta(): void {
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }

  public isButtonPressed(button: number): boolean {
    return this.buttonsPressed.has(button);
  }

  public dispose(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }
}
