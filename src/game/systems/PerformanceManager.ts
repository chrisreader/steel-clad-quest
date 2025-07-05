import * as THREE from 'three';

export interface PerformanceSettings {
  targetFPS: number;
  maxUpdateInterval: number;
  distanceLODThresholds: {
    close: number;
    medium: number;
    far: number;
  };
  adaptiveQuality: boolean;
}

export class PerformanceManager {
  private settings: PerformanceSettings;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private currentFPS: number = 60;
  private fpsHistory: number[] = [];
  private readonly HISTORY_SIZE = 60; // 1 second at 60fps
  
  // Performance scaling factors
  private qualityScale: number = 1.0;
  private updateFrequencyScale: number = 1.0;
  
  constructor(settings?: Partial<PerformanceSettings>) {
    this.settings = {
      targetFPS: 60,
      maxUpdateInterval: 32, // Max 32ms between updates (30fps minimum)
      distanceLODThresholds: {
        close: 30,
        medium: 60,
        far: 120
      },
      adaptiveQuality: true,
      ...settings
    };
    
    console.log('🚀 [PerformanceManager] Initialized with target FPS:', this.settings.targetFPS);
  }
  
  public updatePerformanceMetrics(deltaTime: number): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFrameTime >= 1000) { // Update every second
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
      
      // Add to history
      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > this.HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
      
      // Adjust performance settings based on current FPS
      if (this.settings.adaptiveQuality) {
        this.adjustPerformanceSettings();
      }
    }
  }
  
  private adjustPerformanceSettings(): void {
    const averageFPS = this.getAverageFPS();
    const targetFPS = this.settings.targetFPS;
    
    if (averageFPS < targetFPS * 0.8) { // Below 80% of target
      // Reduce quality to improve performance
      this.qualityScale = Math.max(0.5, this.qualityScale - 0.1);
      this.updateFrequencyScale = Math.max(0.3, this.updateFrequencyScale - 0.1);
      console.log('🔻 [PerformanceManager] Performance below target, reducing quality:', {
        fps: averageFPS,
        target: targetFPS,
        qualityScale: this.qualityScale,
        updateScale: this.updateFrequencyScale
      });
    } else if (averageFPS > targetFPS * 1.1) { // Above 110% of target
      // Increase quality if we have headroom
      this.qualityScale = Math.min(1.0, this.qualityScale + 0.05);
      this.updateFrequencyScale = Math.min(1.0, this.updateFrequencyScale + 0.05);
    }
  }
  
  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return this.currentFPS;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }
  
  // Performance-based update frequency calculation
  public getUpdateFrequency(baseFrequency: number, distance?: number): number {
    let frequency = baseFrequency * this.updateFrequencyScale;
    
    // Distance-based scaling
    if (distance !== undefined) {
      if (distance > this.settings.distanceLODThresholds.far) {
        frequency *= 0.25; // Very distant: 25% frequency
      } else if (distance > this.settings.distanceLODThresholds.medium) {
        frequency *= 0.5; // Medium distance: 50% frequency
      } else if (distance > this.settings.distanceLODThresholds.close) {
        frequency *= 0.75; // Close distance: 75% frequency
      }
      // Very close objects: full frequency
    }
    
    return Math.max(1, Math.round(frequency));
  }
  
  // Check if an object should be updated based on distance and performance
  public shouldUpdate(frameCounter: number, distance?: number): boolean {
    const updateFreq = this.getUpdateFrequency(1, distance);
    return frameCounter % updateFreq === 0;
  }
  
  // Get LOD level based on distance
  public getLODLevel(distance: number): 'high' | 'medium' | 'low' | 'minimal' {
    if (distance < this.settings.distanceLODThresholds.close) {
      return 'high';
    } else if (distance < this.settings.distanceLODThresholds.medium) {
      return 'medium';
    } else if (distance < this.settings.distanceLODThresholds.far) {
      return 'low';
    } else {
      return 'minimal';
    }
  }
  
  // Calculate safe delta time to prevent large jumps
  public getSafeDeltaTime(deltaTime: number): number {
    return Math.min(deltaTime, this.settings.maxUpdateInterval / 1000);
  }
  
  // Performance-based material quality
  public getMaterialQuality(): number {
    return this.qualityScale;
  }
  
  // Performance-based render distance
  public getRenderDistance(): number {
    return this.settings.distanceLODThresholds.far * this.qualityScale;
  }
  
  // Get current performance stats
  public getStats(): {
    currentFPS: number;
    averageFPS: number;
    qualityScale: number;
    updateScale: number;
  } {
    return {
      currentFPS: this.currentFPS,
      averageFPS: this.getAverageFPS(),
      qualityScale: this.qualityScale,
      updateScale: this.updateFrequencyScale
    };
  }
  
  // Force performance adjustment (for manual optimization)
  public setPerformanceLevel(level: 'low' | 'medium' | 'high' | 'ultra'): void {
    switch (level) {
      case 'low':
        this.qualityScale = 0.5;
        this.updateFrequencyScale = 0.3;
        break;
      case 'medium':
        this.qualityScale = 0.7;
        this.updateFrequencyScale = 0.6;
        break;
      case 'high':
        this.qualityScale = 0.9;
        this.updateFrequencyScale = 0.8;
        break;
      case 'ultra':
        this.qualityScale = 1.0;
        this.updateFrequencyScale = 1.0;
        break;
    }
    console.log(`🎯 [PerformanceManager] Performance level set to ${level}:`, {
      qualityScale: this.qualityScale,
      updateScale: this.updateFrequencyScale
    });
  }
}