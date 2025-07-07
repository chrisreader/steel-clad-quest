import * as THREE from 'three';

export class FogSynchronizedRenderConfig {
  // FOG-SYNCHRONIZED DISTANCES - Dense environment with high performance
  private static readonly FOG_DISTANCES = {
    // Dense detail zone (0-50 units) - Ultra high quality
    ULTRA_CLOSE: 50,
    
    // High detail zone (50-100 units) - High quality, reduced effects
    CLOSE: 100,
    
    // Medium detail zone (100-200 units) - Medium quality, basic materials
    MEDIUM: 200,
    
    // Far zone (200-300 units) - Low detail, simple materials, heavy LOD
    FAR: 300,
    
    // Fog limit (300+ units) - Complete culling (invisible anyway)
    FOG_LIMIT: 300,
    
    // Absolute maximum before complete removal
    ABSOLUTE_CULL: 400
  };

  // ADAPTIVE FOG SYSTEM - Extends/contracts based on performance
  private static currentPerformanceLevel: 'high' | 'medium' | 'low' = 'high';
  private static currentFogLimit = FogSynchronizedRenderConfig.FOG_DISTANCES.FOG_LIMIT;
  private static lastFPSCheck = 0;
  private static frameCount = 0;
  private static lastFrameTime = performance.now();

  // DENSE ENVIRONMENT SCALING - Higher density closer, lower density farther
  public static getDensityMultiplier(distance: number): number {
    if (distance < this.FOG_DISTANCES.ULTRA_CLOSE) return 2.0; // Double density close up
    if (distance < this.FOG_DISTANCES.CLOSE) return 1.5;       // 1.5x density in close range
    if (distance < this.FOG_DISTANCES.MEDIUM) return 1.0;      // Normal density in medium range
    if (distance < this.FOG_DISTANCES.FAR) return 0.3;        // Low density in far range
    return 0.0; // No spawning beyond fog
  }

  // QUALITY LEVEL BY DISTANCE
  public static getQualityLevel(distance: number): 'ultra' | 'high' | 'medium' | 'low' | 'culled' {
    if (distance > this.currentFogLimit) return 'culled';
    if (distance < this.FOG_DISTANCES.ULTRA_CLOSE) return 'ultra';
    if (distance < this.FOG_DISTANCES.CLOSE) return 'high';
    if (distance < this.FOG_DISTANCES.MEDIUM) return 'medium';
    if (distance < this.FOG_DISTANCES.FAR) return 'low';
    return 'culled';
  }

  // RENDER DISTANCES BY FEATURE TYPE - All synchronized with fog
  public static getRenderDistance(featureType: 'vegetation' | 'rocks' | 'enemies' | 'effects' | 'clouds' | 'birds'): number {
    const performanceMultiplier = this.getPerformanceMultiplier();
    
    switch (featureType) {
      case 'vegetation':
        return Math.min(this.currentFogLimit, this.FOG_DISTANCES.FAR * performanceMultiplier);
      case 'rocks':
        return Math.min(this.currentFogLimit, this.FOG_DISTANCES.FAR * performanceMultiplier);
      case 'enemies':
        return Math.min(this.currentFogLimit, this.FOG_DISTANCES.MEDIUM * performanceMultiplier);
      case 'effects':
        return Math.min(this.currentFogLimit, this.FOG_DISTANCES.CLOSE * performanceMultiplier);
      case 'clouds':
        return Math.min(this.currentFogLimit, this.FOG_DISTANCES.FAR * 1.2); // Slightly farther for realism
      case 'birds':
        return Math.min(this.currentFogLimit, this.FOG_DISTANCES.MEDIUM * performanceMultiplier);
      default:
        return this.currentFogLimit;
    }
  }

  // PERFORMANCE-ADAPTIVE SYSTEM
  public static updatePerformanceLevel(deltaTime: number): void {
    this.frameCount++;
    const now = performance.now();
    
    // Check FPS every 2 seconds
    if (now - this.lastFPSCheck > 2000) {
      const fps = this.frameCount / ((now - this.lastFrameTime) / 1000);
      this.frameCount = 0;
      this.lastFrameTime = now;
      this.lastFPSCheck = now;
      
      // Adjust performance level based on FPS
      if (fps > 50) {
        this.currentPerformanceLevel = 'high';
        this.currentFogLimit = this.FOG_DISTANCES.FOG_LIMIT;
      } else if (fps > 30) {
        this.currentPerformanceLevel = 'medium';
        this.currentFogLimit = this.FOG_DISTANCES.MEDIUM;
      } else {
        this.currentPerformanceLevel = 'low';
        this.currentFogLimit = this.FOG_DISTANCES.CLOSE;
      }
      
      console.log(`🌫️ [FogSync] Performance level: ${this.currentPerformanceLevel}, FPS: ${fps.toFixed(1)}, Fog limit: ${this.currentFogLimit}`);
    }
  }

  private static getPerformanceMultiplier(): number {
    switch (this.currentPerformanceLevel) {
      case 'high': return 1.0;
      case 'medium': return 0.7;
      case 'low': return 0.5;
      default: return 1.0;
    }
  }

  // FOG-BASED CULLING CHECK
  public static shouldCull(distance: number): boolean {
    return distance > this.currentFogLimit;
  }

  // BATCH CULLING - Check multiple objects at once
  public static batchCullCheck(positions: THREE.Vector3[], playerPosition: THREE.Vector3): boolean[] {
    return positions.map(pos => this.shouldCull(pos.distanceTo(playerPosition)));
  }

  // MATERIAL QUALITY BY DISTANCE
  public static getMaterialQuality(distance: number): {
    shadows: boolean;
    transparency: boolean;
    complexShaders: boolean;
    instancing: boolean;
  } {
    const quality = this.getQualityLevel(distance);
    
    switch (quality) {
      case 'ultra':
        return { shadows: true, transparency: true, complexShaders: true, instancing: false };
      case 'high':
        return { shadows: true, transparency: true, complexShaders: true, instancing: true };
      case 'medium':
        return { shadows: false, transparency: false, complexShaders: false, instancing: true };
      case 'low':
        return { shadows: false, transparency: false, complexShaders: false, instancing: true };
      default:
        return { shadows: false, transparency: false, complexShaders: false, instancing: true };
    }
  }

  // SPAWN DISTANCES
  public static getSpawnDistances() {
    return {
      MIN_DISTANCE: 20,
      MAX_DISTANCE: Math.min(this.currentFogLimit * 0.8, this.FOG_DISTANCES.MEDIUM),
      DENSE_ZONE_LIMIT: this.FOG_DISTANCES.ULTRA_CLOSE,
      MEDIUM_ZONE_LIMIT: this.FOG_DISTANCES.CLOSE
    };
  }

  // FADE DISTANCES
  public static getFadeDistances() {
    return {
      FADE_IN_START: this.currentFogLimit * 0.6,
      FADE_OUT_COMPLETE: this.currentFogLimit,
      ULTRA_CLOSE_FADE: this.FOG_DISTANCES.ULTRA_CLOSE * 0.8
    };
  }

  // DEBUG INFO
  public static getDebugInfo() {
    return {
      performanceLevel: this.currentPerformanceLevel,
      currentFogLimit: this.currentFogLimit,
      distances: this.FOG_DISTANCES,
      spawnDistances: this.getSpawnDistances(),
      fadeDistances: this.getFadeDistances()
    };
  }
}

console.log('🌫️ [FogSync] Fog-Synchronized Render Configuration loaded - Dense environments with high performance');