
export class TouchHandler {
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
  
  private eventDispatcher: (type: string, data?: any) => void;
  
  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
    this.detectDeviceType();
    this.setupEventListeners();
  }
  
  private detectDeviceType(): void {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log(`Device detection: Touch: ${this.isTouchDevice}, Mobile: ${this.isMobileDevice}`);
  }
  
  private setupEventListeners(): void {
    if (this.isTouchDevice) {
      document.addEventListener('touchstart', this.handleTouchStart.bind(this));
      document.addEventListener('touchmove', this.handleTouchMove.bind(this));
      document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
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
        
        this.eventDispatcher('joystickStart');
      } else {
        this.eventDispatcher('attack');
      }
    } else if (event.touches.length === 2) {
      this.eventDispatcher('twoFingerTouch');
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
          
          this.eventDispatcher('joystickMove', {
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
        
        this.eventDispatcher('look', { x: deltaX, y: deltaY });
      }
    }
  }
  
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.touches.length === 0) {
      if (this.virtualJoystick.active) {
        this.virtualJoystick.active = false;
        this.virtualJoystick.id = null;
        this.eventDispatcher('joystickEnd');
      }
      
      const touchDuration = Date.now() - this.touchStartTime;
      if (touchDuration < this.touchTapThreshold) {
        this.eventDispatcher('tap', {
          x: this.touchStartPosition.x,
          y: this.touchStartPosition.y,
          side: this.touchStartPosition.x < window.innerWidth / 2 ? 'left' : 'right'
        });
      }
      
      if (this.touchStartPosition.x > window.innerWidth / 2) {
        this.eventDispatcher('attackEnd');
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
        this.eventDispatcher('joystickEnd');
      }
    }
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
  
  public isMobile(): boolean {
    return this.isMobileDevice;
  }
  
  public isTouch(): boolean {
    return this.isTouchDevice;
  }
  
  public dispose(): void {
    if (this.isTouchDevice) {
      document.removeEventListener('touchstart', this.handleTouchStart);
      document.removeEventListener('touchmove', this.handleTouchMove);
      document.removeEventListener('touchend', this.handleTouchEnd);
    }
  }
}
