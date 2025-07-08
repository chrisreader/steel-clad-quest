import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { InfiniteWorldSystem } from './InfiniteWorldSystem';
import { ProceduralContentManager } from './ProceduralContentManager';
import { TerrainFeatureGenerator } from './TerrainFeatureGenerator';
import { StructureGenerator } from './StructureGenerator';

export interface StreamingRegion {
  region: RegionCoordinates;
  isLoaded: boolean;
  isGenerating: boolean;
  lastAccessTime: number;
  priority: number;
}

export class WorldStreamingManager {
  private ringSystem: RingQuadrantSystem;
  private infiniteWorldSystem: InfiniteWorldSystem;
  private proceduralContentManager: ProceduralContentManager;
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  private structureGenerator: StructureGenerator;
  
  private loadedRegions: Map<string, StreamingRegion> = new Map();
  private generateQueue: RegionCoordinates[] = [];
  private isProcessingQueue: boolean = false;
  
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  // FOG-SYNCHRONIZED STREAMING - Optimized for fog-based visibility
  private streamingRadius: number = 300; // Load within fog visibility
  private unloadRadius: number = 500; // Unload just beyond fog range
  private fogVisibilityRange: number = 400; // Current fog distance
  
  constructor(
    ringSystem: RingQuadrantSystem,
    infiniteWorldSystem: InfiniteWorldSystem,
    proceduralContentManager: ProceduralContentManager,
    terrainFeatureGenerator: TerrainFeatureGenerator,
    structureGenerator: StructureGenerator
  ) {
    this.ringSystem = ringSystem;
    this.infiniteWorldSystem = infiniteWorldSystem;
    this.proceduralContentManager = proceduralContentManager;
    this.terrainFeatureGenerator = terrainFeatureGenerator;
    this.structureGenerator = structureGenerator;
  }

  public update(playerPosition: THREE.Vector3, deltaTime: number): void {
    const playerMovement = playerPosition.distanceTo(this.lastPlayerPosition);
    
    // FOG-AWARE STREAMING - More responsive for fog-based world
    if (playerMovement > 5) { // More sensitive to movement for fog-based loading
      this.updatePlayerPosition(playerPosition);
      this.updateFogAwareStreaming(playerPosition);
      this.processGenerationQueue();
      this.unloadDistantRegions(playerPosition);
      
      this.lastPlayerPosition.copy(playerPosition);
    }
  }

  private updatePlayerPosition(playerPosition: THREE.Vector3): void {
    // Check if we need to generate new infinite rings
    const newRingsGenerated = this.infiniteWorldSystem.generateNewRingIfNeeded(playerPosition);
    
    if (newRingsGenerated) {
      console.log(`🌍 [WorldStreamingManager] Player exploration triggered new ring generation`);
    }
  }

  private updateFogAwareStreaming(playerPosition: THREE.Vector3): void {
    // Dynamic streaming radius based on fog visibility
    const dynamicRadius = Math.min(this.streamingRadius, this.fogVisibilityRange * 0.75);
    const activeRegions = this.getRegionsInRadius(playerPosition, dynamicRadius);
    
    activeRegions.forEach(region => {
      const regionKey = this.ringSystem.getRegionKey(region);
      
      if (!this.loadedRegions.has(regionKey)) {
        // Queue new region for generation
        this.queueRegionForGeneration(region);
        
        // Add to loaded regions map as "generating"
        this.loadedRegions.set(regionKey, {
          region,
          isLoaded: false,
          isGenerating: true,
          lastAccessTime: Date.now(),
          priority: this.calculateRegionPriority(region, playerPosition)
        });
      } else {
        // Update access time for existing region
        const streamingRegion = this.loadedRegions.get(regionKey)!;
        streamingRegion.lastAccessTime = Date.now();
        streamingRegion.priority = this.calculateRegionPriority(region, playerPosition);
      }
    });
  }

  private getRegionsInRadius(playerPosition: THREE.Vector3, radius: number): RegionCoordinates[] {
    const regions: RegionCoordinates[] = [];
    
    // Sample positions around player in a circle to find regions
    const sampleCount = 16;
    const radiusSteps = 4;
    
    for (let step = 0; step < radiusSteps; step++) {
      const currentRadius = (radius / radiusSteps) * (step + 1);
      
      for (let i = 0; i < sampleCount; i++) {
        const angle = (i / sampleCount) * Math.PI * 2;
        const samplePosition = new THREE.Vector3(
          playerPosition.x + Math.cos(angle) * currentRadius,
          playerPosition.y,
          playerPosition.z + Math.sin(angle) * currentRadius
        );
        
        const region = this.ringSystem.getRegionForPosition(samplePosition);
        if (region) {
          // Check if we already have this region
          const exists = regions.some(r => 
            r.ringIndex === region.ringIndex && r.quadrant === region.quadrant
          );
          
          if (!exists) {
            regions.push(region);
          }
        }
      }
    }
    
    // Also include player's current region
    const playerRegion = this.ringSystem.getRegionForPosition(playerPosition);
    if (playerRegion) {
      const exists = regions.some(r => 
        r.ringIndex === playerRegion.ringIndex && r.quadrant === playerRegion.quadrant
      );
      
      if (!exists) {
        regions.push(playerRegion);
      }
    }
    
    return regions;
  }

  private queueRegionForGeneration(region: RegionCoordinates): void {
    // Check if already in queue
    const exists = this.generateQueue.some(r => 
      r.ringIndex === region.ringIndex && r.quadrant === region.quadrant
    );
    
    if (!exists) {
      this.generateQueue.push(region);
      console.log(`🔄 [WorldStreamingManager] Queued region Ring ${region.ringIndex}, Quadrant ${region.quadrant} for generation`);
    }
  }

  private calculateRegionPriority(region: RegionCoordinates, playerPosition: THREE.Vector3): number {
    const regionCenter = this.ringSystem.getRegionCenter(region);
    const distance = regionCenter.distanceTo(playerPosition);
    
    // Closer regions have higher priority (lower distance = higher priority)
    const distancePriority = 1000 - distance;
    
    // Player's current region gets highest priority
    const playerRegion = this.ringSystem.getRegionForPosition(playerPosition);
    const isPlayerRegion = playerRegion && 
      playerRegion.ringIndex === region.ringIndex && 
      playerRegion.quadrant === region.quadrant;
    
    const currentRegionBonus = isPlayerRegion ? 500 : 0;
    
    return distancePriority + currentRegionBonus;
  }

  private async processGenerationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.generateQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // Sort queue by priority
      this.generateQueue.sort((a, b) => {
        const regionKeyA = this.ringSystem.getRegionKey(a);
        const regionKeyB = this.ringSystem.getRegionKey(b);
        
        const regionA = this.loadedRegions.get(regionKeyA);
        const regionB = this.loadedRegions.get(regionKeyB);
        
        const priorityA = regionA?.priority || 0;
        const priorityB = regionB?.priority || 0;
        
        return priorityB - priorityA; // Higher priority first
      });
      
      // Process one region per frame to maintain performance
      const region = this.generateQueue.shift();
      if (region) {
        await this.generateRegionContent(region);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async generateRegionContent(region: RegionCoordinates): Promise<void> {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    console.log(`🏗️ [WorldStreamingManager] Generating content for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    try {
      // Generate terrain
      const terrain = this.ringSystem.createTerrainWithHills(region);
      
      // Generate procedural content
      if (!this.infiniteWorldSystem.isRegionGenerated(region)) {
        this.proceduralContentManager.generateProceduralContentForRegion(region);
      }
      
      // Generate features
      this.terrainFeatureGenerator.generateRocksForRegion(region);
      
      // Generate structures
      this.structureGenerator.generateStructuresForRegion(region);
      
      // Mark region as loaded
      const streamingRegion = this.loadedRegions.get(regionKey);
      if (streamingRegion) {
        streamingRegion.isLoaded = true;
        streamingRegion.isGenerating = false;
      }
      
      console.log(`✅ [WorldStreamingManager] Completed generation for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
      
    } catch (error) {
      console.error(`❌ [WorldStreamingManager] Failed to generate region Ring ${region.ringIndex}, Quadrant ${region.quadrant}:`, error);
      
      // Remove from loaded regions if generation failed
      this.loadedRegions.delete(regionKey);
    }
  }

  private unloadDistantRegions(playerPosition: THREE.Vector3): void {
    const regionsToUnload: string[] = [];
    const currentTime = Date.now();
    const maxAge = 30000; // 30 seconds - more aggressive for fog-based system
    
    this.loadedRegions.forEach((streamingRegion, regionKey) => {
      const regionCenter = this.ringSystem.getRegionCenter(streamingRegion.region);
      const distance = regionCenter.distanceTo(playerPosition);
      const age = currentTime - streamingRegion.lastAccessTime;
      
      // FOG-AWARE UNLOADING - Aggressive unloading beyond fog visibility
      const fogAwareUnloadDistance = Math.max(this.unloadRadius, this.fogVisibilityRange * 1.25);
      
      if (distance > fogAwareUnloadDistance || age > maxAge) {
        regionsToUnload.push(regionKey);
      }
    });
    
    regionsToUnload.forEach(regionKey => {
      this.unloadRegion(regionKey);
    });
    
    if (regionsToUnload.length > 0) {
      console.log(`🗑️ [WorldStreamingManager] Unloaded ${regionsToUnload.length} distant regions`);
    }
  }

  private unloadRegion(regionKey: string): void {
    const streamingRegion = this.loadedRegions.get(regionKey);
    if (!streamingRegion) return;
    
    console.log(`🗑️ [WorldStreamingManager] Unloading region Ring ${streamingRegion.region.ringIndex}, Quadrant ${streamingRegion.region.quadrant}`);
    
    // Remove features generated for this region
    this.terrainFeatureGenerator.removeFeaturesByRegion(streamingRegion.region);
    
    // Remove from loaded regions
    this.loadedRegions.delete(regionKey);
  }

  public getLoadedRegionCount(): number {
    return Array.from(this.loadedRegions.values()).filter(r => r.isLoaded).length;
  }

  public getGeneratingRegionCount(): number {
    return Array.from(this.loadedRegions.values()).filter(r => r.isGenerating).length;
  }

  public getQueueLength(): number {
    return this.generateQueue.length;
  }

  public getDebugInfo(): any {
    const loadedRegions = Array.from(this.loadedRegions.values()).filter(r => r.isLoaded);
    const generatingRegions = Array.from(this.loadedRegions.values()).filter(r => r.isGenerating);
    
    return {
      loadedRegions: loadedRegions.length,
      generatingRegions: generatingRegions.length,
      queueLength: this.generateQueue.length,
      maxGeneratedRing: this.infiniteWorldSystem.getMaxGeneratedRing(),
      loadedRingDistribution: this.getLoadedRingDistribution(),
      fogVisibilityRange: this.fogVisibilityRange,
      streamingRadius: Math.min(this.streamingRadius, this.fogVisibilityRange * 0.75),
      unloadRadius: Math.max(this.unloadRadius, this.fogVisibilityRange * 1.25)
    };
  }
  
  public setFogVisibilityRange(range: number): void {
    this.fogVisibilityRange = range;
    // Auto-adjust streaming distances based on fog
    this.streamingRadius = Math.min(300, range * 0.75);
    this.unloadRadius = Math.max(500, range * 1.25);
  }

  private getLoadedRingDistribution(): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    this.loadedRegions.forEach(streamingRegion => {
      if (streamingRegion.isLoaded) {
        const ring = streamingRegion.region.ringIndex;
        distribution[ring] = (distribution[ring] || 0) + 1;
      }
    });
    
    return distribution;
  }
}