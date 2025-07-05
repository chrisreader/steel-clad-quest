import { PerformanceManager } from '../systems/PerformanceManager';
import { PerformanceMonitor } from './PerformanceMonitor';

/**
 * EMERGENCY PERFORMANCE OPTIMIZER
 * Coordinates between PerformanceManager and PerformanceMonitor for maximum FPS gains
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private performanceManager: PerformanceManager;
  private performanceMonitor: PerformanceMonitor | null = null;
  
  // Frame skipping counters for different system types
  private frameCounters = {
    ui: 0,
    animation: 0,
    effects: 0,
    ai: 0,
    physics: 0
  };
  
  private constructor(performanceManager: PerformanceManager) {
    this.performanceManager = performanceManager;
  }
  
  public static create(performanceManager: PerformanceManager): PerformanceOptimizer {
    PerformanceOptimizer.instance = new PerformanceOptimizer(performanceManager);
    return PerformanceOptimizer.instance;
  }
  
  public static getInstance(): PerformanceOptimizer | null {
    return PerformanceOptimizer.instance || null;
  }
  
  public initializeMonitoring(): void {
    this.performanceMonitor = PerformanceMonitor.create(this.performanceManager);
  }
  
  public updateFrameCounters(deltaTime: number): void {
    // Update all frame counters
    Object.keys(this.frameCounters).forEach(key => {
      this.frameCounters[key as keyof typeof this.frameCounters]++;
    });
    
    // Record initial FPS if monitoring is active
    if (this.performanceMonitor) {
      this.performanceMonitor.recordInitialFPS();
      this.performanceMonitor.checkPerformanceImprovement();
    }
  }
  
  // INTELLIGENT FRAME SKIPPING based on system priority and performance
  public shouldUpdateSystem(system: keyof typeof this.frameCounters, distance?: number): boolean {
    const counter = this.frameCounters[system];
    
    // Base skip rates for different systems (higher = less frequent updates)
    const baseSkipRates = {
      ui: 2,        // UI can skip 1 frame (30fps)
      animation: 1, // Animations need to be smooth (60fps)
      effects: 3,   // Effects can skip 2 frames (20fps)
      ai: 4,        // AI can skip 3 frames (15fps)
      physics: 1    // Physics needs to be consistent (60fps)
    };
    
    let skipRate = baseSkipRates[system];
    
    // Apply performance scaling
    const performanceStats = this.performanceManager.getStats();
    if (performanceStats.averageFPS < 30) {
      // EMERGENCY MODE: More aggressive skipping when FPS is very low
      skipRate *= 2;
    } else if (performanceStats.averageFPS < 45) {
      // PERFORMANCE MODE: Moderate skipping when FPS is low
      skipRate = Math.floor(skipRate * 1.5);
    }
    
    // Distance-based optimization
    if (distance !== undefined) {
      if (distance > 100) skipRate *= 4;      // Very far: skip 4x more
      else if (distance > 50) skipRate *= 2;  // Far: skip 2x more
      else if (distance > 25) skipRate *= 1.5; // Medium: skip 1.5x more
    }
    
    return counter % Math.max(1, Math.floor(skipRate)) === 0;
  }
  
  // AUTOMATIC QUALITY ADJUSTMENT based on performance
  public getOptimalQualityLevel(): 'ultra' | 'high' | 'medium' | 'low' {
    const stats = this.performanceManager.getStats();
    const avgFPS = stats.averageFPS;
    
    if (avgFPS >= 55) return 'ultra';
    if (avgFPS >= 45) return 'high';
    if (avgFPS >= 30) return 'medium';
    return 'low';
  }
  
  // MEMORY OPTIMIZATION: Smart garbage collection hints
  public optimizeMemoryIfNeeded(): void {
    const stats = this.performanceManager.getStats();
    
    // Trigger garbage collection hint if performance is struggling
    if (stats.averageFPS < 25 && stats.qualityScale < 0.7) {
      // Force garbage collection during low-impact moments
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
    }
  }
  
  // CACHE MANAGEMENT: Automatic cache cleanup
  public cleanupCaches(): void {
    // This can be extended to clean up various system caches
    // Currently focused on critical performance systems
  }
  
  public getPerformanceReport(): {
    currentFPS: number;
    improvement: string;
    qualityLevel: string;
    skipRates: typeof this.frameCounters;
  } {
    const stats = this.performanceManager.getStats();
    const monitorReport = this.performanceMonitor?.getPerformanceReport();
    
    return {
      currentFPS: stats.currentFPS,
      improvement: monitorReport ? `${monitorReport.improvement.toFixed(1)}%` : 'calculating...',
      qualityLevel: this.getOptimalQualityLevel(),
      skipRates: { ...this.frameCounters }
    };
  }
}