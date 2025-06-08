
import * as THREE from 'three';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface LODLevel {
  distance: number;
  quality: number;
  visible: boolean;
  updateFrequency: number;
}

export class EnhancedLODManager {
  private performanceMonitor: PerformanceMonitor;
  private lodLevels: LODLevel[] = [
    { distance: 50, quality: 1.0, visible: true, updateFrequency: 1 },
    { distance: 100, quality: 0.8, visible: true, updateFrequency: 2 },
    { distance: 200, quality: 0.6, visible: true, updateFrequency: 4 },
    { distance: 300, quality: 0.4, visible: true, updateFrequency: 8 },
    { distance: 500, quality: 0.2, visible: true, updateFrequency: 16 }
  ];

  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor;
  }

  public calculateLOD(distance: number, frameCount: number = 0): LODLevel {
    // Adjust LOD based on performance
    const performanceLevel = this.performanceMonitor.getPerformanceLevel();
    const performanceMultiplier = performanceLevel === 'high' ? 1.0 : 
                                 performanceLevel === 'medium' ? 0.8 : 0.6;

    for (const level of this.lodLevels) {
      if (distance <= level.distance * performanceMultiplier) {
        return {
          ...level,
          quality: level.quality * performanceMultiplier,
          visible: frameCount % level.updateFrequency === 0
        };
      }
    }

    return { distance: Infinity, quality: 0, visible: false, updateFrequency: 60 };
  }

  public shouldUpdate(distance: number, frameCount: number): boolean {
    const lod = this.calculateLOD(distance, frameCount);
    return lod.visible && frameCount % lod.updateFrequency === 0;
  }

  public getQualityMultiplier(distance: number): number {
    return this.calculateLOD(distance).quality;
  }

  public isVisible(distance: number, maxDistance: number): boolean {
    const performanceLevel = this.performanceMonitor.getPerformanceLevel();
    const adjustedMaxDistance = maxDistance * (performanceLevel === 'high' ? 1.0 : 
                                              performanceLevel === 'medium' ? 0.8 : 0.6);
    return distance <= adjustedMaxDistance;
  }
}
