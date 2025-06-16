
import * as THREE from 'three';
import { GrassConfig, DEFAULT_GRASS_CONFIG } from './core/GrassConfig';
import { GrassRenderer } from './core/GrassRenderer';
import { OptimizedWindSystem } from './animation/OptimizedWindSystem';
import { RegionCoordinates } from '../world/RingQuadrantSystem';
import { TimeUtils } from '../utils/TimeUtils';
import { TIME_PHASES } from '../config/DayNightConfig';
import { GrassShader } from './core/GrassShader';
import { GrassRenderBubbleManager } from './performance/GrassRenderBubbleManager';
import { DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer';

export class OptimizedGrassSystem {
  private scene: THREE.Scene;
  private config: GrassConfig;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  
  // Core systems
  private renderer: GrassRenderer;
  private windSystem: OptimizedWindSystem;
  private bubbleManager: GrassRenderBubbleManager;
  
  // Optimized performance tracking
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  
  // Player tracking
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerVelocity: number = 0;
  
  constructor(scene: THREE.Scene, config?: Partial<GrassConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_GRASS_CONFIG, ...config };
    
    this.renderer = new GrassRenderer(scene);
    this.windSystem = new OptimizedWindSystem();
    this.bubbleManager = new GrassRenderBubbleManager(scene, this.renderer);
    
    // Initialize position-based biome system
    DeterministicBiomeManager.setWorldSeed(Date.now());
    DeterministicBiomeManager.forceRegenerateAllBiomes();
    
    console.log('🌱 OPTIMIZED GRASS SYSTEM: Initialized with performance enhancements');
  }
  
  public initializeGrassSystem(playerPosition: THREE.Vector3, coverageRadius: number = 200): void {
    console.log(`🌱 OPTIMIZED GRASS: Initializing with performance-based biome queries`);
    
    DeterministicBiomeManager.clearCache();
    this.bubbleManager.initializeWithCoverage(playerPosition, 200);
    this.lastPlayerPosition.copy(playerPosition);
    
    // Reduced debug logging frequency
    const debugInfo = DeterministicBiomeManager.getDebugBiomeInfo(playerPosition);
    console.log(`🌱 OPTIMIZED GRASS: Player in ${debugInfo.biomeData.biomeType} biome`);
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number,
    currentPlayerPosition?: THREE.Vector3
  ): void {
    if (!this.bubbleManager.isLoadingComplete() && currentPlayerPosition) {
      const coverageRadius = Math.max(size, 400);
      this.initializeGrassSystem(currentPlayerPosition, coverageRadius);
    }
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    this.updateCounter++;
    
    // Track player velocity with less frequency
    if (this.updateCounter % 3 === 0) {
      this.playerVelocity = playerPosition.distanceTo(this.lastPlayerPosition) / deltaTime;
      this.lastPlayerPosition.copy(playerPosition);
    }
    
    // Update bubble manager
    this.bubbleManager.update(playerPosition);
    
    // Update wind system with performance optimization
    this.windSystem.update(deltaTime);
    
    // Use PerformanceOptimizer to determine update frequencies
    if (PerformanceOptimizer.shouldUpdateGrassMaterials()) {
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Staggered material updates for better performance
      const shouldUpdateTallGrass = this.updateCounter % 24 === 0;
      const shouldUpdateGroundGrass = this.updateCounter % 36 === 0; // Less frequent for ground grass
      
      if (shouldUpdateTallGrass) {
        for (const material of this.renderer.getGrassMaterials().values()) {
          this.windSystem.updateMaterialWind(material, false);
          GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
          GrassShader.updateSeasonalVariation(material, this.currentSeason);
        }
      }
      
      if (shouldUpdateGroundGrass) {
        for (const material of this.renderer.getGroundGrassMaterials().values()) {
          this.windSystem.updateMaterialWind(material, true);
          GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
          GrassShader.updateSeasonalVariation(material, this.currentSeason);
        }
      }
      
      // Use performance optimizer for fog updates
      if (PerformanceOptimizer.shouldUpdateFog() && this.checkFogChanges() && this.cachedFogValues) {
        this.updateFogUniforms();
      }
    }
    
    // Optimized performance reporting
    if (PerformanceOptimizer.shouldLogPerformance()) {
      console.log(`🌱 OPTIMIZED PERFORMANCE: ${this.bubbleManager.getRenderedInstanceCount()} grass instances (FPS: ${PerformanceOptimizer.getCurrentFPS().toFixed(1)})`);
    }
  }
  
  private checkFogChanges(): boolean {
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) return false;
    
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
    
    // Update all materials immediately when season changes
    for (const material of this.renderer.getGrassMaterials().values()) {
      GrassShader.updateSeasonalVariation(material, season);
    }
    
    for (const material of this.renderer.getGroundGrassMaterials().values()) {
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
  
  public dispose(): void {
    this.bubbleManager.dispose();
    this.renderer.dispose();
    console.log('🌱 Optimized grass system disposed');
  }
  
  public debugBiomeAtPosition(position: THREE.Vector3): void {
    const debugInfo = DeterministicBiomeManager.getDebugBiomeInfo(position);
    console.log('🔍 OPTIMIZED BIOME DEBUG:', debugInfo);
  }
  
  public regenerateOrganicBiomes(): void {
    DeterministicBiomeManager.setWorldSeed(Date.now());
    console.log('🔄 OPTIMIZED BIOME: Regenerated with performance enhancements');
  }
}

export type { GrassConfig };
