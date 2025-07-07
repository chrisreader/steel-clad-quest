import * as THREE from 'three';
import { FogSynchronizedRenderConfig } from '../config/FogSynchronizedRenderConfig';
import { FogAwareLODManager } from './FogAwareLODManager';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderCallsCount: number;
  triangleCount: number;
  textureMemoryMB: number;
}

export interface AdaptiveSettings {
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  fogDistance: number;
  lodAggressiveness: number;
  instanceCullingDistance: number;
  vegetationDensity: number;
  effectsQuality: 'minimal' | 'low' | 'medium' | 'high';
}

export class PerformanceAdaptiveManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private fogLODManager: FogAwareLODManager;
  
  // PERFORMANCE TRACKING
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private lastPerformanceCheck = 0;
  private performanceHistory: number[] = [];
  private readonly PERFORMANCE_HISTORY_SIZE = 30; // 30 samples
  
  // ADAPTIVE SETTINGS
  private currentSettings: AdaptiveSettings = {
    shadowQuality: 'high',
    fogDistance: 300,
    lodAggressiveness: 1.0,
    instanceCullingDistance: 200,
    vegetationDensity: 1.0,
    effectsQuality: 'high'
  };
  
  private targetFPS = 45; // Target minimum FPS
  private readonly FPS_CHECK_INTERVAL = 2000; // Check every 2 seconds
  
  // QUALITY PRESETS
  private readonly QUALITY_PRESETS = {
    ultra: {
      shadowQuality: 'high' as const,
      fogDistance: 300,
      lodAggressiveness: 0.8,
      instanceCullingDistance: 250,
      vegetationDensity: 1.5,
      effectsQuality: 'high' as const
    },
    high: {
      shadowQuality: 'medium' as const,
      fogDistance: 250,
      lodAggressiveness: 1.0,
      instanceCullingDistance: 200,
      vegetationDensity: 1.0,
      effectsQuality: 'medium' as const
    },
    medium: {
      shadowQuality: 'low' as const,
      fogDistance: 200,
      lodAggressiveness: 1.3,
      instanceCullingDistance: 150,
      vegetationDensity: 0.7,
      effectsQuality: 'low' as const
    },
    low: {
      shadowQuality: 'off' as const,
      fogDistance: 150,
      lodAggressiveness: 1.6,
      instanceCullingDistance: 100,
      vegetationDensity: 0.4,
      effectsQuality: 'minimal' as const
    }
  };

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, fogLODManager: FogAwareLODManager) {
    this.scene = scene;
    this.renderer = renderer;
    this.fogLODManager = fogLODManager;
    
    console.log('🎯 [PerformanceAdaptive] Initialized with target FPS:', this.targetFPS);
  }

  public update(deltaTime: number): void {
    this.frameCount++;
    const now = performance.now();
    
    // Calculate current FPS
    if (now - this.lastPerformanceCheck > this.FPS_CHECK_INTERVAL) {
      const fps = this.frameCount / ((now - this.lastFrameTime) / 1000);
      this.frameCount = 0;
      this.lastFrameTime = now;
      this.lastPerformanceCheck = now;
      
      // Add to performance history
      this.performanceHistory.push(fps);
      if (this.performanceHistory.length > this.PERFORMANCE_HISTORY_SIZE) {
        this.performanceHistory.shift();
      }
      
      // Analyze performance and adapt
      this.analyzeAndAdapt(fps);
    }
  }

  private analyzeAndAdapt(currentFPS: number): void {
    if (this.performanceHistory.length < 5) return; // Need some history
    
    const avgFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    const fpsStability = this.calculateFPSStability();
    
    console.log(`🎯 [PerformanceAdaptive] FPS: ${currentFPS.toFixed(1)} (avg: ${avgFPS.toFixed(1)}, stability: ${(fpsStability * 100).toFixed(1)}%)`);
    
    // Determine if we need to change quality
    if (avgFPS < this.targetFPS - 5) {
      // Performance is bad, reduce quality
      this.reduceQuality();
    } else if (avgFPS > this.targetFPS + 10 && fpsStability > 0.8) {
      // Performance is good and stable, try to increase quality
      this.increaseQuality();
    }
    
    // Apply current settings
    this.applySettings();
  }

  private calculateFPSStability(): number {
    if (this.performanceHistory.length < 10) return 0;
    
    const recent = this.performanceHistory.slice(-10);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, fps) => sum + Math.pow(fps - avg, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    
    // Stability is 1 - (stdDev / avg), clamped to 0-1
    return Math.max(0, 1 - (stdDev / avg));
  }

  private reduceQuality(): void {
    const current = this.currentSettings;
    let changed = false;
    
    // Reduce in order of visual impact vs performance gain
    if (current.shadowQuality === 'high') {
      current.shadowQuality = 'medium';
      changed = true;
    } else if (current.fogDistance > 150) {
      current.fogDistance = Math.max(150, current.fogDistance - 50);
      changed = true;
    } else if (current.vegetationDensity > 0.4) {
      current.vegetationDensity = Math.max(0.4, current.vegetationDensity - 0.2);
      changed = true;
    } else if (current.shadowQuality === 'medium') {
      current.shadowQuality = 'low';
      changed = true;
    } else if (current.lodAggressiveness < 2.0) {
      current.lodAggressiveness = Math.min(2.0, current.lodAggressiveness + 0.3);
      changed = true;
    } else if (current.effectsQuality !== 'minimal') {
      current.effectsQuality = this.reduceEffectsQuality(current.effectsQuality);
      changed = true;
    } else if (current.shadowQuality === 'low') {
      current.shadowQuality = 'off';
      changed = true;
    }
    
    if (changed) {
      console.log('⬇️ [PerformanceAdaptive] Reduced quality:', current);
    }
  }

  private increaseQuality(): void {
    const current = this.currentSettings;
    let changed = false;
    
    // Increase in reverse order
    if (current.shadowQuality === 'off') {
      current.shadowQuality = 'low';
      changed = true;
    } else if (current.effectsQuality === 'minimal') {
      current.effectsQuality = 'low';
      changed = true;
    } else if (current.lodAggressiveness > 0.8) {
      current.lodAggressiveness = Math.max(0.8, current.lodAggressiveness - 0.2);
      changed = true;
    } else if (current.shadowQuality === 'low') {
      current.shadowQuality = 'medium';
      changed = true;
    } else if (current.vegetationDensity < 1.5) {
      current.vegetationDensity = Math.min(1.5, current.vegetationDensity + 0.2);
      changed = true;
    } else if (current.fogDistance < 300) {
      current.fogDistance = Math.min(300, current.fogDistance + 25);
      changed = true;
    } else if (current.shadowQuality === 'medium') {
      current.shadowQuality = 'high';
      changed = true;
    }
    
    if (changed) {
      console.log('⬆️ [PerformanceAdaptive] Increased quality:', current);
    }
  }

  private reduceEffectsQuality(current: AdaptiveSettings['effectsQuality']): AdaptiveSettings['effectsQuality'] {
    switch (current) {
      case 'high': return 'medium';
      case 'medium': return 'low';
      case 'low': return 'minimal';
      default: return 'minimal';
    }
  }

  private applySettings(): void {
    // Apply shadow quality
    this.applyShadowSettings();
    
    // Apply fog distance (this affects all fog-synchronized systems)
    this.applyFogSettings();
    
    // Apply LOD aggressiveness
    this.applyLODSettings();
    
    // Apply vegetation density (would need to communicate with spawning systems)
    this.applyVegetationSettings();
    
    // Apply effects quality
    this.applyEffectsSettings();
  }

  private applyShadowSettings(): void {
    switch (this.currentSettings.shadowQuality) {
      case 'off':
        this.renderer.shadowMap.enabled = false;
        break;
      case 'low':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.setShadowMapSize(512);
        break;
      case 'medium':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.setShadowMapSize(1024);
        break;
      case 'high':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.setShadowMapSize(2048);
        break;
    }
  }

  private setShadowMapSize(size: number): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight) {
        if (object.shadow) {
          object.shadow.mapSize.width = size;
          object.shadow.mapSize.height = size;
        }
      }
    });
  }

  private applyFogSettings(): void {
    // Update fog in the scene
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.far = this.currentSettings.fogDistance;
    } else if (this.scene.fog instanceof THREE.FogExp2) {
      // Adjust density for exponential fog
      this.scene.fog.density = 0.001 + (300 - this.currentSettings.fogDistance) * 0.000005;
    }
  }

  private applyLODSettings(): void {
    // The LOD aggressiveness affects how quickly objects reduce in quality
    // This would need to be communicated to the LOD manager
    console.log(`🎯 [PerformanceAdaptive] LOD aggressiveness: ${this.currentSettings.lodAggressiveness}`);
  }

  private applyVegetationSettings(): void {
    // This would need to communicate with vegetation spawning systems
    console.log(`🎯 [PerformanceAdaptive] Vegetation density: ${this.currentSettings.vegetationDensity}`);
  }

  private applyEffectsSettings(): void {
    // This would disable/enable various particle systems and effects
    console.log(`🎯 [PerformanceAdaptive] Effects quality: ${this.currentSettings.effectsQuality}`);
  }

  // PRESET METHODS
  public setQualityPreset(preset: 'ultra' | 'high' | 'medium' | 'low'): void {
    this.currentSettings = { ...this.QUALITY_PRESETS[preset] };
    this.applySettings();
    console.log(`🎯 [PerformanceAdaptive] Applied ${preset} quality preset`);
  }

  public getCurrentSettings(): AdaptiveSettings {
    return { ...this.currentSettings };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    const info = this.renderer.info;
    const avgFPS = this.performanceHistory.length > 0 
      ? this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length 
      : 0;
      
    return {
      fps: avgFPS,
      frameTime: avgFPS > 0 ? 1000 / avgFPS : 0,
      renderCallsCount: info.render.calls,
      triangleCount: info.render.triangles,
      textureMemoryMB: (info.memory.textures * 4) / (1024 * 1024) // Rough estimate
    };
  }

  public setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(20, Math.min(120, fps));
    console.log(`🎯 [PerformanceAdaptive] Target FPS set to: ${this.targetFPS}`);
  }

  public dispose(): void {
    this.performanceHistory = [];
    console.log('🎯 [PerformanceAdaptive] Performance Adaptive Manager disposed');
  }
}