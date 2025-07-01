
import * as THREE from 'three';
import { GrassConfig, DEFAULT_GRASS_CONFIG } from './core/GrassConfig';
import { GrassRenderer } from './core/GrassRenderer';
import { WindSystem } from './animation/WindSystem';
import { RegionCoordinates } from '../world/RingQuadrantSystem';
import { TimeUtils } from '../utils/TimeUtils';
import { TIME_PHASES } from '../config/DayNightConfig';
import { GrassShader } from './core/GrassShader';
import { GrassRenderBubbleManager } from './performance/GrassRenderBubbleManager';
import { DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';

export class GrassSystem {
  private scene: THREE.Scene;
  private config: GrassConfig;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  
  // Core systems
  private renderer: GrassRenderer;
  private windSystem: WindSystem;
  private bubbleManager: GrassRenderBubbleManager;
  
  // ENHANCED: Performance optimization with adaptive updates
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 15; // Reduced frequency
  private readonly FOG_CHECK_INTERVAL: number = 300; // Less frequent fog checks
  
  // PERFORMANCE: Smart update system
  private lastPerformanceReport: number = 0;
  private readonly PERFORMANCE_REPORT_INTERVAL: number = 1000; // Every 1000 frames
  private frameTimeHistory: number[] = [];
  private readonly MAX_FRAME_TIME_SAMPLES: number = 30;
  
  // Player tracking with velocity
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerVelocity: number = 0;
  private isPlayerMoving: boolean = false;
  
  constructor(scene: THREE.Scene, config?: Partial<GrassConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_GRASS_CONFIG, ...config };
    
    this.renderer = new GrassRenderer(scene);
    this.windSystem = new WindSystem();
    this.bubbleManager = new GrassRenderBubbleManager(scene, this.renderer);
    
    // Initialize position-based biome system
    DeterministicBiomeManager.setWorldSeed(Date.now());
    DeterministicBiomeManager.forceRegenerateAllBiomes();
    
    console.log('🌱 ENHANCED PERFORMANCE GRASS SYSTEM: Initialized with adaptive LOD and smart culling');
  }
  
  public initializeGrassSystem(playerPosition: THREE.Vector3, coverageRadius: number = 180): void {
    console.log(`🌱 PERFORMANCE OPTIMIZED: Initializing with ${coverageRadius}-unit smart rendering`);
    
    // Force biome regeneration
    DeterministicBiomeManager.clearCache();
    
    // ENHANCED: Reduced coverage radius for better performance
    this.bubbleManager.initializeWithCoverage(playerPosition, coverageRadius);
    this.lastPlayerPosition.copy(playerPosition);
    
    const debugInfo = DeterministicBiomeManager.getDebugBiomeInfo(playerPosition);
    console.log(`🌱 OPTIMIZED BIOME: ${debugInfo.biomeData.biomeType} biome loaded with performance enhancements`);
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number,
    currentPlayerPosition?: THREE.Vector3
  ): void {
    if (!this.bubbleManager.isLoadingComplete() && currentPlayerPosition) {
      // PERFORMANCE: Reduced coverage radius
      const coverageRadius = Math.min(size, 350);
      this.initializeGrassSystem(currentPlayerPosition, coverageRadius);
    }
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    const frameStartTime = performance.now();
    
    this.updateCounter++;
    
    // ENHANCED: Track player movement and velocity
    this.playerVelocity = playerPosition.distanceTo(this.lastPlayerPosition) / deltaTime;
    this.isPlayerMoving = this.playerVelocity > 0.1;
    this.lastPlayerPosition.copy(playerPosition);
    
    // PERFORMANCE: Update bubble manager with movement prediction
    this.bubbleManager.update(playerPosition);
    
    // ENHANCED: Adaptive wind system updates
    const windUpdateInterval = this.isPlayerMoving ? 2 : 4; // More frequent when moving
    if (this.updateCounter % windUpdateInterval === 0) {
      this.windSystem.update(deltaTime * windUpdateInterval);
    }
    
    // PERFORMANCE: Less frequent material updates
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // ENHANCED: Staggered material updates for better performance
      const shouldUpdateTallGrass = this.updateCounter % 30 === 0;
      const shouldUpdateGroundGrass = this.updateCounter % 30 === 15;
      
      if (shouldUpdateTallGrass) {
        this.updateGrassMaterials(this.renderer.getGrassMaterials(), nightFactor, dayFactor, false);
      }
      
      if (shouldUpdateGroundGrass) {
        this.updateGrassMaterials(this.renderer.getGroundGrassMaterials(), nightFactor, dayFactor, true);
      }
      
      // PERFORMANCE: Less frequent fog updates
      if (this.checkFogChanges() && this.cachedFogValues) {
        this.updateFogUniforms();
      }
    }
    
    // ENHANCED: Performance monitoring and adaptive quality
    const frameTime = performance.now() - frameStartTime;
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.MAX_FRAME_TIME_SAMPLES) {
      this.frameTimeHistory.shift();
    }
    
    // Performance reporting
    if (this.updateCounter - this.lastPerformanceReport >= this.PERFORMANCE_REPORT_INTERVAL) {
      this.reportPerformanceMetrics();
      this.lastPerformanceReport = this.updateCounter;
    }
  }
  
  // PERFORMANCE: Batch material updates
  private updateGrassMaterials(
    materials: Map<string, THREE.ShaderMaterial>, 
    nightFactor: number, 
    dayFactor: number, 
    isGroundGrass: boolean
  ): void {
    for (const material of materials.values()) {
      this.windSystem.updateMaterialWind(material, isGroundGrass);
      GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
      GrassShader.updateSeasonalVariation(material, this.currentSeason);
    }
  }
  
  // ENHANCED: Performance monitoring
  private reportPerformanceMetrics(): void {
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const maxFrameTime = Math.max(...this.frameTimeHistory);
    const rendererMetrics = this.renderer.getPerformanceMetrics();
    
    console.log(`🌱 PERFORMANCE REPORT:`, {
      instances: `${rendererMetrics.visibleInstances}/${rendererMetrics.totalInstances}`,
      materials: rendererMetrics.pooledMaterials,
      geometries: rendererMetrics.pooledGeometries,
      avgFrameTime: `${avgFrameTime.toFixed(2)}ms`,
      maxFrameTime: `${maxFrameTime.toFixed(2)}ms`,
      playerVelocity: this.playerVelocity.toFixed(2)
    });
    
    // Reset frame time history
    this.frameTimeHistory = [];
  }
  
  private checkFogChanges(): boolean {
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) return false;
    
    const now = performance.now();
    if (now - this.lastFogUpdate < this.FOG_CHECK_INTERVAL) return false;
    
    const currentFog = {
      color: this.scene.fog.color.clone(),
      near: this.scene.fog.near,
      far: this.scene.fog.far
    };
    
    if (!this.cachedFogValues || 
        !this.cachedFogValues.color.equals(currentFog.color) ||
        this.cachedFogValues.near !== currentFog.near ||
        this.cachedFogValues.far !== currentFog.far) {
      
      this.cachedFogValues = currentFog;
      this.lastFogUpdate = now;
      return true;
    }
    
    return false;
  }
  
  private updateFogUniforms(): void {
    if (!this.cachedFogValues) return;
    
    const allMaterials = [
      ...this.renderer.getGrassMaterials().values(),
      ...this.renderer.getGroundGrassMaterials().values()
    ];
    
    for (const material of allMaterials) {
      if (material.uniforms.fogColor) {
        material.uniforms.fogColor.value.copy(this.cachedFogValues.color);
      }
      if (material.uniforms.fogNear) {
        material.uniforms.fogNear.value = this.cachedFogValues.near;
      }
      if (material.uniforms.fogFar) {
        material.uniforms.fogFar.value = this.cachedFogValues.far;
      }
    }
  }
  
  public setSeason(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    this.currentSeason = season;
    
    // Batch update all materials
    const allMaterials = [
      ...this.renderer.getGrassMaterials().values(),
      ...this.renderer.getGroundGrassMaterials().values()
    ];
    
    for (const material of allMaterials) {
      GrassShader.updateSeasonalVariation(material, season);
    }
  }
  
  public removeGrassForRegion(region: RegionCoordinates): void {
    // Position-based system handles this automatically
  }
  
  public getLoadedChunkCount(): number {
    return this.bubbleManager.getLoadedChunkCount();
  }
  
  public getRenderedInstanceCount(): number {
    return this.bubbleManager.getRenderedInstanceCount();
  }
  
  public isGrassSystemReady(): boolean {
    return this.bubbleManager.isLoadingComplete();
  }
  
  // PERFORMANCE: Get comprehensive performance metrics
  public getPerformanceMetrics(): {
    grassSystem: any;
    renderer: any;
    avgFrameTime: number;
    playerVelocity: number;
  } {
    const avgFrameTime = this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length 
      : 0;
    
    return {
      grassSystem: {
        loadedChunks: this.getLoadedChunkCount(),
        renderedInstances: this.getRenderedInstanceCount(),
        isReady: this.isGrassSystemReady()
      },
      renderer: this.renderer.getPerformanceMetrics(),
      avgFrameTime,
      playerVelocity: this.playerVelocity
    };
  }
  
  public dispose(): void {
    this.bubbleManager.dispose();
    this.renderer.dispose();
    console.log('🌱 Enhanced performance grass system disposed');
  }
  
  public debugBiomeAtPosition(position: THREE.Vector3): void {
    const debugInfo = DeterministicBiomeManager.getDebugBiomeInfo(position);
    console.log('🔍 OPTIMIZED BIOME DEBUG:', debugInfo);
  }
  
  public regenerateOrganicBiomes(): void {
    DeterministicBiomeManager.setWorldSeed(Date.now());
    console.log('🔄 PERFORMANCE BIOME: Regenerated with enhanced fractal boundaries');
  }
}

export type { GrassConfig };
