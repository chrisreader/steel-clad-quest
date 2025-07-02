import { PerformanceCache } from './PerformanceCache';

export class AdaptivePerformanceManager {
  private frameRates: number[] = [];
  private readonly FRAME_HISTORY_SIZE = 60;
  private lastFrameTime = performance.now();
  private currentQualityLevel = 1.0;
  private grassRenderDistance = 180;
  private readonly MIN_FPS = 30;
  private readonly TARGET_FPS = 45;
  
  // System update intervals (frames between updates)
  private systemIntervals = {
    critical: 1,    // Every frame (movement, input, combat)
    important: 2,   // Every 2nd frame (enemy AI, physics)
    visual: 3,      // Every 3rd frame (wind, particles)
    background: 6   // Every 6th frame (lighting, fog)
  };

  public update(): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    const currentFPS = 1000 / deltaTime;
    
    this.frameRates.push(currentFPS);
    if (this.frameRates.length > this.FRAME_HISTORY_SIZE) {
      this.frameRates.shift();
    }
    
    this.lastFrameTime = now;
    
    // Adjust quality based on average FPS
    if (this.frameRates.length >= 10) {
      const avgFPS = this.frameRates.reduce((a, b) => a + b) / this.frameRates.length;
      this.adjustQuality(avgFPS);
    }
  }

  private adjustQuality(avgFPS: number): void {
    if (avgFPS < this.MIN_FPS && this.currentQualityLevel > 0.3) {
      // Reduce quality
      this.currentQualityLevel = Math.max(0.3, this.currentQualityLevel - 0.1);
      this.grassRenderDistance = Math.max(60, this.grassRenderDistance * 0.9);
      this.increaseUpdateIntervals();
      console.log(`🎯 Performance: Reduced quality to ${this.currentQualityLevel.toFixed(2)} (FPS: ${avgFPS.toFixed(1)})`);
    } else if (avgFPS > this.TARGET_FPS && this.currentQualityLevel < 1.0) {
      // Increase quality
      this.currentQualityLevel = Math.min(1.0, this.currentQualityLevel + 0.05);
      this.grassRenderDistance = Math.min(120, this.grassRenderDistance * 1.05);
      this.decreaseUpdateIntervals();
      console.log(`🎯 Performance: Increased quality to ${this.currentQualityLevel.toFixed(2)} (FPS: ${avgFPS.toFixed(1)})`);
    }
  }

  private increaseUpdateIntervals(): void {
    this.systemIntervals.important = Math.min(4, this.systemIntervals.important + 1);
    this.systemIntervals.visual = Math.min(6, this.systemIntervals.visual + 1);
    this.systemIntervals.background = Math.min(10, this.systemIntervals.background + 2);
  }

  private decreaseUpdateIntervals(): void {
    this.systemIntervals.important = Math.max(2, this.systemIntervals.important - 1);
    this.systemIntervals.visual = Math.max(3, this.systemIntervals.visual - 1);
    this.systemIntervals.background = Math.max(6, this.systemIntervals.background - 1);
  }

  public shouldUpdateSystem(systemType: 'critical' | 'important' | 'visual' | 'background', frameCount: number): boolean {
    return frameCount % this.systemIntervals[systemType] === 0;
  }

  public getQualityLevel(): number {
    return this.currentQualityLevel;
  }

  public getGrassRenderDistance(): number {
    return this.grassRenderDistance;
  }

  public getCurrentFPS(): number {
    return this.frameRates.length > 0 ? this.frameRates[this.frameRates.length - 1] : 60;
  }

  public getAverageFPS(): number {
    if (this.frameRates.length === 0) return 60;
    return this.frameRates.reduce((a, b) => a + b) / this.frameRates.length;
  }
}