
export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private frameTimeHistory: number[] = [];
  private readonly historySize: number = 60;
  private updateCallbacks: Array<(fps: number, frameTime: number) => void> = [];

  public update(): void {
    const now = performance.now();
    
    if (this.lastTime > 0) {
      const deltaTime = now - this.lastTime;
      this.frameTimeHistory.push(deltaTime);
      
      if (this.frameTimeHistory.length > this.historySize) {
        this.frameTimeHistory.shift();
      }
      
      // Calculate FPS every 30 frames for stability
      if (this.frameCount % 30 === 0) {
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        this.fps = 1000 / avgFrameTime;
        
        // Notify callbacks
        this.updateCallbacks.forEach(callback => callback(this.fps, avgFrameTime));
      }
    }
    
    this.lastTime = now;
    this.frameCount++;
  }

  public getFPS(): number {
    return this.fps;
  }

  public getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 16.67;
    return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
  }

  public onUpdate(callback: (fps: number, frameTime: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  public shouldSkipFrame(): boolean {
    // Skip non-critical updates if FPS is below 30
    return this.fps < 30;
  }

  public getPerformanceLevel(): 'high' | 'medium' | 'low' {
    if (this.fps >= 50) return 'high';
    if (this.fps >= 30) return 'medium';
    return 'low';
  }
}
