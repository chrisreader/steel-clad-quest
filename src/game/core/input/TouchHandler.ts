
export class TouchHandler {
  private joystickState = { active: false, x: 0, y: 0 };
  private eventDispatcher: (type: string, data?: any) => void;

  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
  }

  public getJoystickState(): { active: boolean; x: number; y: number } {
    return { ...this.joystickState };
  }

  public isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  public isTouch(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  public dispose(): void {
    // Touch handler cleanup if needed
  }
}
