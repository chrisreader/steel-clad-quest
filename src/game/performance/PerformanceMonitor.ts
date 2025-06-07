
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  visibleObjects: number;
  culledObjects: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    drawCalls: 0,
    visibleObjects: 0,
    culledObjects: 0
  };

  private frameCount = 0;
  private lastTime = performance.now();
  private frameTimeAccumulator = 0;
  private updateInterval = 1000; // Update metrics every second

  public update(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.frameCount++;
    this.frameTimeAccumulator += deltaTime;

    // Update metrics every second
    if (this.frameTimeAccumulator >= this.updateInterval) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / this.frameTimeAccumulator);
      this.metrics.frameTime = this.frameTimeAccumulator / this.frameCount;
      
      // Reset counters
      this.frameCount = 0;
      this.frameTimeAccumulator = 0;
      
      // Update memory usage if available
      if (performance.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
      }
    }

    this.lastTime = currentTime;
  }

  public updateRenderMetrics(drawCalls: number, visibleObjects: number, culledObjects: number): void {
    this.metrics.drawCalls = drawCalls;
    this.metrics.visibleObjects = visibleObjects;
    this.metrics.culledObjects = culledObjects;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getFPS(): number {
    return this.metrics.fps;
  }

  public shouldReduceQuality(): boolean {
    return this.metrics.fps < 30;
  }

  public shouldIncreaseQuality(): boolean {
    return this.metrics.fps > 55;
  }
}
