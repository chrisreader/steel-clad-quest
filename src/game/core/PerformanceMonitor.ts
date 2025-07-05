import { logger } from './Logger';
import { PerformanceManager } from '../systems/PerformanceManager';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private performanceManager: PerformanceManager;
  private startTime: number = performance.now();
  private initialFPS: number = 0;
  private stabilizationTime: number = 3000; // 3 seconds to stabilize
  private hasReportedResults: boolean = false;
  
  private constructor(performanceManager: PerformanceManager) {
    this.performanceManager = performanceManager;
  }
  
  public static create(performanceManager: PerformanceManager): PerformanceMonitor {
    PerformanceMonitor.instance = new PerformanceMonitor(performanceManager);
    return PerformanceMonitor.instance;
  }
  
  public static getInstance(): PerformanceMonitor | null {
    return PerformanceMonitor.instance || null;
  }
  
  public recordInitialFPS(): void {
    // Record baseline FPS after stabilization period
    if (performance.now() - this.startTime > this.stabilizationTime && this.initialFPS === 0) {
      const stats = this.performanceManager.getStats();
      this.initialFPS = stats.averageFPS;
      logger.info('PerformanceMonitor', `Baseline FPS recorded: ${this.initialFPS.toFixed(1)}`);
    }
  }
  
  public checkPerformanceImprovement(): void {
    if (this.hasReportedResults || this.initialFPS === 0) return;
    
    // Wait for optimization to take effect
    const timeSinceStart = performance.now() - this.startTime;
    if (timeSinceStart < this.stabilizationTime + 5000) return; // 5 seconds after stabilization
    
    const stats = this.performanceManager.getStats();
    const currentFPS = stats.averageFPS;
    const improvement = ((currentFPS - this.initialFPS) / this.initialFPS) * 100;
    
    this.hasReportedResults = true;
    
    if (improvement > 10) {
      logger.info('PerformanceMonitor', `🚀 PERFORMANCE OPTIMIZATION SUCCESS!`);
      logger.info('PerformanceMonitor', `📈 FPS Improvement: +${improvement.toFixed(1)}% (${this.initialFPS.toFixed(1)} → ${currentFPS.toFixed(1)} FPS)`);
      logger.info('PerformanceMonitor', `⚡ Console log cleanup delivered significant performance gains!`);
    } else if (improvement > 0) {
      logger.info('PerformanceMonitor', `📊 Performance improved by ${improvement.toFixed(1)}% (${this.initialFPS.toFixed(1)} → ${currentFPS.toFixed(1)} FPS)`);
    } else {
      logger.warn('PerformanceMonitor', `Performance may need additional optimization. Current: ${currentFPS.toFixed(1)} FPS vs baseline: ${this.initialFPS.toFixed(1)} FPS`);
    }
    
    // Report performance settings
    logger.info('PerformanceMonitor', `Quality Scale: ${(stats.qualityScale * 100).toFixed(0)}%`);
    logger.info('PerformanceMonitor', `Update Scale: ${(stats.updateScale * 100).toFixed(0)}%`);
  }
  
  public getPerformanceReport(): {
    initialFPS: number;
    currentFPS: number;
    improvement: number;
    qualityScale: number;
    updateScale: number;
  } {
    const stats = this.performanceManager.getStats();
    const currentFPS = stats.averageFPS;
    const improvement = this.initialFPS > 0 ? ((currentFPS - this.initialFPS) / this.initialFPS) * 100 : 0;
    
    return {
      initialFPS: this.initialFPS,
      currentFPS,
      improvement,
      qualityScale: stats.qualityScale,
      updateScale: stats.updateScale
    };
  }
}