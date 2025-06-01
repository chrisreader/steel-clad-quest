
import * as THREE from 'three';

export class PointerLockManager {
  private renderer: THREE.WebGLRenderer | null = null;
  private pointerLocked = false;
  private eventDispatcher: (type: string, data?: any) => void;

  constructor(eventDispatcher: (type: string, data?: any) => void) {
    this.eventDispatcher = eventDispatcher;
    this.setupEventListeners();
  }

  public initialize(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  private setupEventListeners(): void {
    document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
  }

  private handlePointerLockChange(): void {
    this.pointerLocked = document.pointerLockElement !== null;
    this.eventDispatcher('pointerLockChange', { locked: this.pointerLocked });
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public requestPointerLock(): void {
    if (this.renderer?.domElement) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public dispose(): void {
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }
}
