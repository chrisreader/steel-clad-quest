export class UIIntegrationManager {
  private isUIOpen: boolean = false;
  private pointerLockRequested: boolean = false;
  
  constructor() {
    console.log("🖥️ [UIIntegrationManager] Initializing...");
  }
  
  public setUIState(isUIOpen: boolean): void {
    console.log(`🖥️ [UIIntegrationManager] UI state changed to: ${isUIOpen ? 'OPEN' : 'CLOSED'}`);
    this.isUIOpen = isUIOpen;
  }
  
  public isUICurrentlyOpen(): boolean {
    return this.isUIOpen;
  }
  
  public shouldProcessMouseLook(deltaX: number, deltaY: number): boolean {
    if (this.isUIOpen) {
      console.log(`🚫 [UIIntegrationManager] Mouse look ignored - UI is open (deltaX: ${deltaX}, deltaY: ${deltaY})`);
      return false;
    }
    return true;
  }
  
  public setPointerLockRequested(requested: boolean): void {
    this.pointerLockRequested = requested;
  }
  
  public isPointerLockRequested(): boolean {
    return this.pointerLockRequested;
  }
  
  public handlePointerLockChange(locked: boolean): void {
    if (!locked && this.pointerLockRequested) {
      console.log("🖥️ [UIIntegrationManager] Pointer lock lost, attempting to re-request...");
      // The caller should handle re-requesting pointer lock
      return;
    }
    console.log("🖥️ [UIIntegrationManager] Pointer lock state:", locked ? 'LOCKED' : 'UNLOCKED');
  }
  
  public dispose(): void {
    console.log("🖥️ [UIIntegrationManager] Disposing...");
    this.isUIOpen = false;
    this.pointerLockRequested = false;
  }
}
