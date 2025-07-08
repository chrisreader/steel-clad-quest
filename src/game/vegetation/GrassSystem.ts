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
import { BuildingManager } from '../buildings/BuildingManager';

export class GrassSystem {
  private scene: THREE.Scene;
  private config: GrassConfig;
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
  private buildingManager: BuildingManager | null = null;
  
  // Static reference for SeededGrassDistribution to access
  private static globalBuildingManager: BuildingManager | null = null;
  
  // Core systems
  private renderer: GrassRenderer;
  private windSystem: WindSystem;
  private bubbleManager: GrassRenderBubbleManager;
  
  // FOG-AWARE PERFORMANCE OPTIMIZATION
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 30; // FOG-RESPONSIVE: Every 30 frames for fog awareness
  private readonly FOG_CHECK_INTERVAL: number = 60; // RESPONSIVE: Every second for dynamic fog changes
  
  // Fog integration
  private fogVisibilityRange: number = 400;
  
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
  }
  
  public setBuildingManager(buildingManager: BuildingManager): void {
    this.buildingManager = buildingManager;
    GrassSystem.globalBuildingManager = buildingManager;
    console.log('🌱 GrassSystem: BuildingManager connected for grass exclusion');
  }
  
  public static getBuildingManager(): BuildingManager | null {
    return GrassSystem.globalBuildingManager;
  }
  
  public initializeGrassSystem(playerPosition: THREE.Vector3, coverageRadius: number = 200): void {
    // Force biome regeneration for fractal shapes
    DeterministicBiomeManager.clearCache();
    
    // FOG-AWARE INITIALIZATION - Coverage based on fog visibility
    const fogAwareCoverage = Math.min(coverageRadius, this.fogVisibilityRange * 0.6);
    this.bubbleManager.initializeWithCoverage(playerPosition, fogAwareCoverage);
    this.lastPlayerPosition.copy(playerPosition);
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
    
    // Legacy region system now handled by position-based system
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    this.updateCounter++;
    
    // Track player velocity
    this.playerVelocity = playerPosition.distanceTo(this.lastPlayerPosition) / deltaTime;
    this.lastPlayerPosition.copy(playerPosition);
    
    // Update bubble manager with position-based biome queries
    this.bubbleManager.update(playerPosition);
    
    // Update wind system
    this.windSystem.update(deltaTime);
    
    // Update materials less frequently for better performance
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      const shouldUpdateTallGrass = this.updateCounter % 180 === 0; // ULTRA-AGGRESSIVE: Every 180 frames
      const shouldUpdateGroundGrass = this.updateCounter % 180 === 90; // ULTRA-AGGRESSIVE: Every 180 frames offset
      
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
    
    // Performance reporting (every 6000 frames = ~6 minutes)
    if (this.updateCounter % 6000 === 0) {
      console.log(`🌱 Grass instances: ${this.bubbleManager.getRenderedInstanceCount()}`);
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
    // Legacy region system now handled automatically
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
  }
  
  public debugBiomeAtPosition(position: THREE.Vector3): void {
    const debugInfo = DeterministicBiomeManager.getDebugBiomeInfo(position);
    console.log('🔍 POSITION-BASED BIOME DEBUG:', debugInfo);
  }
  
  public regenerateOrganicBiomes(): void {
    DeterministicBiomeManager.setWorldSeed(Date.now());
  }
  
  public setFogVisibilityRange(range: number): void {
    this.fogVisibilityRange = range;
    // Update fog-aware initialization coverage
    console.log(`🌫️ [GrassSystem] Updated fog visibility range to ${range} units`);
  }
  
  public getFogVisibilityRange(): number {
    return this.fogVisibilityRange;
  }
}

export type { GrassConfig };
