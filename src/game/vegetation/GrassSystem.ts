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
  
  // Performance optimization
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 12;
  private readonly FOG_CHECK_INTERVAL: number = 200;
  
  // Player tracking
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerVelocity: number = 0;
  
  constructor(scene: THREE.Scene, config?: Partial<GrassConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_GRASS_CONFIG, ...config };
    
    this.renderer = new GrassRenderer(scene);
    this.windSystem = new WindSystem();
    this.bubbleManager = new GrassRenderBubbleManager(scene, this.renderer);
    
    // ENHANCED: Initialize with random seed for each new game
    DeterministicBiomeManager.initializeWithRandomSeed();
    
    console.log(`🌱 Grass system initialized with 11 distinct biomes: Prairie (golden), Thicket (dark green), Crystalline (blue-green), and 8 others (seed: ${DeterministicBiomeManager.getWorldSeed()})`);
  }
  
  public initializeGrassSystem(playerPosition: THREE.Vector3, coverageRadius: number = 200): void {
    console.log(`🌱 Initializing 11-biome grass system with dramatically different biomes at position: ${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)}`);
    console.log(`🌱 Expected biomes: Dense Thicket (4x density, dark green), Sparse Steppe (0.3x density, golden), Crystalline Grove (blue-green), and 8 others`);
    
    this.bubbleManager.initializeWithCoverage(playerPosition, 200);
    this.lastPlayerPosition.copy(playerPosition);
    
    console.log(`🌱 Biome system initialized with seed: ${DeterministicBiomeManager.getWorldSeed()} - walk around to see dramatic differences!`);
  }
  
  /**
   * Reinitialize with a new random seed (useful for "new game" scenarios)
   */
  public regenerateWithNewSeed(): void {
    console.log('🌱 Regenerating 11-biome system with new random seed...');
    DeterministicBiomeManager.initializeWithRandomSeed();
    
    // Clear existing grass and regenerate
    this.bubbleManager.dispose();
    this.bubbleManager = new GrassRenderBubbleManager(this.scene, this.renderer);
    
    console.log(`🌱 11-biome system regenerated with new seed: ${DeterministicBiomeManager.getWorldSeed()}`);
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number,
    currentPlayerPosition?: THREE.Vector3
  ): void {
    // LEGACY METHOD - now handled by bubble manager with 11-biome system
    console.log(`🌱 Legacy region generation bypassed - using 11-biome bubble manager instead`);
    
    if (!this.bubbleManager.isLoadingComplete() && currentPlayerPosition) {
      const coverageRadius = Math.max(size, 400);
      this.initializeGrassSystem(currentPlayerPosition, coverageRadius);
    }
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    this.updateCounter++;
    
    this.playerVelocity = playerPosition.distanceTo(this.lastPlayerPosition) / deltaTime;
    this.lastPlayerPosition.copy(playerPosition);
    
    this.bubbleManager.update(playerPosition);
    
    this.windSystem.update(deltaTime);
    
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      const shouldUpdateTallGrass = this.updateCounter % 24 === 0;
      const shouldUpdateGroundGrass = this.updateCounter % 24 === 12;
      
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
    
    if (this.updateCounter % 600 === 0) {
      console.log(`🌱 Performance: ${this.bubbleManager.getRenderedInstanceCount()} grass instances across patchy biome distribution`);
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
    console.log(`🌱 Legacy region removal ignored - 11-biome bubble manager handles this automatically`);
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
    console.log('🌱 Grass system disposed');
  }
}

export type { GrassConfig };
