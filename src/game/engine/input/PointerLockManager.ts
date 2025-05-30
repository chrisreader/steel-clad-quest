
import * as THREE from 'three';

export class PointerLockManager {
  private pointerLocked: boolean = false;
  private renderer: THREE.WebGLRenderer | null = null;
  private eventDispatcher: (type: string, data?: any) => void;
  private onPointerLockChange: () => void;
  
  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
    this.onPointerLockChange = this.handlePointerLockChange.bind(this);
    this.setupEventListeners();
  }
  
  public initialize(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    console.log('PointerLockManager initialized with renderer');
  }
  
  private setupEventListeners(): void {
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }
  
  private handlePointerLockChange(): void {
    const wasLocked = this.pointerLocked;
    this.pointerLocked = document.pointerLockElement === this.renderer?.domElement;
    
    console.log("🔒 [PointerLockManager] Pointer lock state changed from", wasLocked, "to", this.pointerLocked);
    console.log("🔒 [PointerLockManager] Document.pointerLockElement:", document.pointerLockElement);
    console.log("🔒 [PointerLockManager] Renderer domElement:", this.renderer?.domElement);
    
    this.eventDispatcher('pointerLockChange', { locked: this.pointerLocked });
  }
  
  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }
  
  public requestPointerLock(): void {
    console.log("🔒 [PointerLockManager] Requesting pointer lock...");
    
    if (this.renderer && this.renderer.domElement && document.contains(this.renderer.domElement)) {
      try {
        console.log("🔒 [PointerLockManager] Attempting to request pointer lock");
        this.renderer.domElement.requestPointerLock();
      } catch (error) {
        console.warn("🔒 [PointerLockManager] Failed to request pointer lock:", error);
      }
    } else {
      console.warn("🔒 [PointerLockManager] Cannot request pointer lock:", {
        hasRenderer: !!this.renderer,
        hasElement: !!this.renderer?.domElement,
        alreadyLocked: this.pointerLocked,
        inDOM: this.renderer?.domElement ? document.contains(this.renderer.domElement) : false
      });
    }
  }
  
  public exitPointerLock(): void {
    console.log("🔒 [PointerLockManager] Exit pointer lock requested - current state:", this.pointerLocked);
    
    // CRITICAL FIX: Always try to exit pointer lock, regardless of our state tracking
    // Sometimes the state tracking gets out of sync
    try {
      if (document.pointerLockElement) {
        console.log("🔒 [PointerLockManager] Document has pointer lock element - calling exitPointerLock()");
        document.exitPointerLock();
      } else {
        console.log("🔒 [PointerLockManager] No pointer lock element found in document");
      }
    } catch (error) {
      console.warn("🔒 [PointerLockManager] Failed to exit pointer lock:", error);
    }
    
    // Also try to update our internal state immediately
    setTimeout(() => {
      const actualState = document.pointerLockElement !== null;
      if (this.pointerLocked !== actualState) {
        console.log("🔒 [PointerLockManager] State mismatch detected, correcting:", this.pointerLocked, "->", actualState);
        this.pointerLocked = actualState;
        this.eventDispatcher('pointerLockChange', { locked: this.pointerLocked });
      }
    }, 50);
  }
  
  public dispose(): void {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
