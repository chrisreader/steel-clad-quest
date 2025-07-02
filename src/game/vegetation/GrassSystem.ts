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
import { AdaptivePerformanceManager } from '../utils/AdaptivePerformanceManager';

export class GrassSystem {
  private scene: THREE.Scene;
  private config: GrassConfig;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  
  // Core systems
  private renderer: GrassRenderer;
  private windSystem: WindSystem;
  private bubbleManager: GrassRenderBubbleManager;
  
  // Performance optimization
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 8; // More responsive updates
  private readonly FOG_CHECK_INTERVAL: number = 200; // Faster fog response
  private performanceManager: AdaptivePerformanceManager | null = null;
  
  // Player tracking
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerVelocity: number = 0;
  
  constructor(scene: THREE.Scene, config?: Partial<GrassConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_GRASS_CONFIG, ...config };
    
    this.renderer = new GrassRenderer(scene);
    this.windSystem = new WindSystem();
    this.bubbleManager = new GrassRenderBubbleManager(scene, this.renderer);
    
    // Initialize position-based biome system with enhanced organic biomes
    DeterministicBiomeManager.setWorldSeed(Date.now());
    DeterministicBiomeManager.forceRegenerateAllBiomes();
    
    console.log('🌱 POSITION-BASED GRASS SYSTEM: Initialized with fractal organic biome generation');
  }
  
  public initializeGrassSystem(playerPosition: THREE.Vector3, coverageRadius: number = 200): void {
    console.log(`🌱 FRACTAL ORGANIC GRASS: Initializing with position-based biome queries`);
    
    // Force biome regeneration for fractal shapes
    DeterministicBiomeManager.clearCache();
    
    this.bubbleManager.initializeWithCoverage(playerPosition, 120);
    this.lastPlayerPosition.copy(playerPosition);
    
    // Debug current position-based biome
    const debugInfo = DeterministicBiomeManager.getDebugBiomeInfo(playerPosition);
    console.log(`🌱 POSITION-BASED GRASS: Player in ${debugInfo.biomeData.biomeType} biome (${debugInfo.organicBiomeCount} organic biomes nearby)`);
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
    
    console.log(`🌱 Legacy region converted to position-based fractal system`);
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number, performanceManager?: AdaptivePerformanceManager): void {
    this.updateCounter++;
    
    if (performanceManager) {
      this.performanceManager = performanceManager;
    }
    
    // Track player velocity
    this.playerVelocity = playerPosition.distanceTo(this.lastPlayerPosition) / deltaTime;
    this.lastPlayerPosition.copy(playerPosition);
    
    // Update bubble manager with adaptive render distance
    const renderDistance = this.performanceManager ? this.performanceManager.getGrassRenderDistance() : 120;
    this.bubbleManager.updateWithAdaptiveDistance(playerPosition, renderDistance);
    
    // Adaptive system updates based on performance
    const shouldUpdateWind = !this.performanceManager || this.performanceManager.shouldUpdateSystem('visual', this.updateCounter);
    if (shouldUpdateWind) {
      this.windSystem.update(deltaTime);
    }
    
    // Adaptive material updates based on performance
    const shouldUpdateMaterials = !this.performanceManager || this.performanceManager.shouldUpdateSystem('visual', this.updateCounter);
    if (shouldUpdateMaterials && this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Adaptive update intervals based on performance
      const qualityLevel = this.performanceManager ? this.performanceManager.getQualityLevel() : 1.0;
      const updateInterval = Math.floor(16 / qualityLevel); // Faster updates for higher quality
      
      const shouldUpdateTallGrass = this.updateCounter % updateInterval === 0;
      const shouldUpdateGroundGrass = this.updateCounter % updateInterval === Math.floor(updateInterval / 2);
      
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
      
      if (this.checkFogChanges() && this.cachedFogValues) {
        this.updateFogUniforms();
      }
    }
    
    // Performance-adaptive reporting
    const reportInterval = this.performanceManager ? Math.floor(600 / this.performanceManager.getQualityLevel()) : 600;
    if (this.updateCounter % reportInterval === 0) {
      const currentFPS = this.performanceManager ? this.performanceManager.getCurrentFPS() : 60;
      console.log(`🌱 ADAPTIVE PERFORMANCE: ${this.bubbleManager.getRenderedInstanceCount()} instances, ${currentFPS.toFixed(1)}fps, distance: ${renderDistance}`);
    }
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
    
    for (const material of this.renderer.getGrassMaterials().values()) {
      GrassShader.updateSeasonalVariation(material, season);
    }
    
    for (const material of this.renderer.getGroundGrassMaterials().values()) {
      GrassShader.updateSeasonalVariation(material, season);
    }
  }
  
  public removeGrassForRegion(region: RegionCoordinates): void {
    console.log(`🌱 Legacy region removal ignored - position-based system handles this automatically`);
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
    console.log('🌱 Position-based grass system disposed');
  }
  
  public debugBiomeAtPosition(position: THREE.Vector3): void {
    const debugInfo = DeterministicBiomeManager.getDebugBiomeInfo(position);
    console.log('🔍 POSITION-BASED BIOME DEBUG:', debugInfo);
  }
  
  public regenerateOrganicBiomes(): void {
    DeterministicBiomeManager.setWorldSeed(Date.now());
    console.log('🔄 FRACTAL BIOME: Regenerated with new fractal boundaries');
  }
}

export type { GrassConfig };
