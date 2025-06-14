
import * as THREE from 'three';
import { SeededGrassDistribution } from '../SeededGrassDistribution';
import { GrassRenderer } from '../core/GrassRenderer';
import { DeterministicBiomeManager, ChunkCoordinate } from '../biomes/DeterministicBiomeManager';
import { FlowerDistribution } from '../flowers/FlowerDistribution';

interface ChunkData {
  coordinate: ChunkCoordinate;
  tallGrassData: any;
  groundGrassData: any;
  flowerData: THREE.Group[];
  lastAccessTime: number;
}

export class GrassRenderBubbleManager {
  private scene: THREE.Scene;
  private renderer: GrassRenderer;
  private loadedChunks: Map<string, ChunkData> = new Map();
  private flowerGroups: Map<string, THREE.Group[]> = new Map();
  private currentSeason: string = 'summer';

  private readonly CHUNK_SIZE: number = 64;
  private readonly RENDER_DISTANCE: number = 200;
  private readonly UNLOAD_DISTANCE: number = 250;
  private readonly CHUNK_TIMEOUT: number = 15000; // ms

  constructor(scene: THREE.Scene, renderer: GrassRenderer) {
    this.scene = scene;
    this.renderer = renderer;
  }

  public initializeWithCoverage(playerPosition: THREE.Vector3, coverageRadius: number): void {
    const playerChunk = DeterministicBiomeManager.worldPositionToChunk(playerPosition);
    const renderRadius = Math.ceil(coverageRadius / this.CHUNK_SIZE);

    for (let x = -renderRadius; x <= renderRadius; x++) {
      for (let z = -renderRadius; z <= renderRadius; z++) {
        const chunkCoord: ChunkCoordinate = {
          x: playerChunk.x + x,
          z: playerChunk.z + z
        };

        const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunkCoord);
        const distanceToPlayer = playerPosition.distanceTo(chunkCenter);

        if (distanceToPlayer <= coverageRadius) {
          this.loadChunk(chunkCoord);
        }
      }
    }

    console.log(`🌱 Initialized grass coverage with ${this.loadedChunks.size} chunks`);
  }

  public update(playerPosition: THREE.Vector3): void {
    const playerChunk = DeterministicBiomeManager.worldPositionToChunk(playerPosition);
    const chunksToLoad: ChunkCoordinate[] = [];
    const chunksToUnload: string[] = [];
    
    // Calculate required chunks within render distance
    const renderRadius = Math.ceil(this.RENDER_DISTANCE / this.CHUNK_SIZE);
    
    for (let x = -renderRadius; x <= renderRadius; x++) {
      for (let z = -renderRadius; z <= renderRadius; z++) {
        const chunkCoord: ChunkCoordinate = {
          x: playerChunk.x + x,
          z: playerChunk.z + z
        };
        
        const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunkCoord);
        const distanceToPlayer = playerPosition.distanceTo(chunkCenter);
        
        if (distanceToPlayer <= this.RENDER_DISTANCE) {
          const chunkKey = DeterministicBiomeManager.getChunkKey(chunkCoord);
          
          if (!this.loadedChunks.has(chunkKey)) {
            chunksToLoad.push(chunkCoord);
          } else {
            // Update access time
            const chunkData = this.loadedChunks.get(chunkKey)!;
            chunkData.lastAccessTime = performance.now();
          }
        }
      }
    }
    
    // Find chunks to unload
    const now = performance.now();
    for (const [chunkKey, chunkData] of this.loadedChunks.entries()) {
      const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunkData.coordinate);
      const distanceToPlayer = playerPosition.distanceTo(chunkCenter);
      
      if (distanceToPlayer > this.UNLOAD_DISTANCE || 
          (now - chunkData.lastAccessTime) > this.CHUNK_TIMEOUT) {
        chunksToUnload.push(chunkKey);
      }
    }
    
    // Load new chunks
    for (const chunk of chunksToLoad) {
      this.loadChunk(chunk);
    }
    
    // Unload distant chunks
    for (const chunkKey of chunksToUnload) {
      this.unloadChunk(chunkKey);
    }
  }

  private loadChunk(chunk: ChunkCoordinate): void {
    const chunkKey = DeterministicBiomeManager.getChunkKey(chunk);
    
    // Generate grass data
    const tallGrassData = SeededGrassDistribution.generateGrassForChunk(chunk, false);
    const groundGrassData = SeededGrassDistribution.generateGrassForChunk(chunk, true);
    
    // Generate flower data
    const flowerData = FlowerDistribution.generateFlowersForChunk(chunk, this.currentSeason);
    
    // Create grass instances
    if (tallGrassData.positions.length > 0) {
      this.createGrassInstances(chunk, tallGrassData, false);
    }
    
    if (groundGrassData.positions.length > 0) {
      this.createGrassInstances(chunk, groundGrassData, true);
    }
    
    // Add flowers to scene
    for (const flowerGroup of flowerData) {
      this.scene.add(flowerGroup);
    }
    
    // Store chunk data
    const chunkData: ChunkData = {
      coordinate: chunk,
      tallGrassData,
      groundGrassData,
      flowerData,
      lastAccessTime: performance.now()
    };
    
    this.loadedChunks.set(chunkKey, chunkData);
    this.flowerGroups.set(chunkKey, flowerData);
    
    console.log(`🌱🌸 Loaded chunk ${chunkKey} with ${flowerData.length} flower patches`);
  }

  private unloadChunk(chunkKey: string): void {
    const chunkData = this.loadedChunks.get(chunkKey);
    if (!chunkData) return;
    
    // Remove grass instances
    this.renderer.removeRegion(chunkKey);
    
    // Remove flowers from scene
    const flowers = this.flowerGroups.get(chunkKey);
    if (flowers) {
      for (const flowerGroup of flowers) {
        this.scene.remove(flowerGroup);
        // Dispose flower geometries and materials
        flowerGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    }
    
    this.loadedChunks.delete(chunkKey);
    this.flowerGroups.delete(chunkKey);
    
    console.log(`🌱🌸 Unloaded chunk ${chunkKey}`);
  }

  private createGrassInstances(
    chunk: ChunkCoordinate,
    grassData: any,
    isGroundGrass: boolean
  ): void {
    const chunkKey = DeterministicBiomeManager.getChunkKey(chunk);
    const biomeInfo = DeterministicBiomeManager.getBiomeInfo(DeterministicBiomeManager.chunkToWorldPosition(chunk));

    // Group species by type
    const speciesMap: { [species: string]: number[] } = {};
    for (let i = 0; i < grassData.species.length; i++) {
      const species = grassData.species[i];
      if (!speciesMap[species]) {
        speciesMap[species] = [];
      }
      speciesMap[species].push(i);
    }

    // Create instances for each species
    for (const species in speciesMap) {
      const indices = speciesMap[species];

      const speciesPositions = indices.map(i => grassData.positions[i]);
      const speciesScales = indices.map(i => grassData.scales[i]);
      const speciesRotations = indices.map(i => grassData.rotations[i]);

      // Updated to use chunk-based system instead of region-based
      this.renderer.createInstancedMesh(
        chunkKey,
        species,
        {
          positions: speciesPositions,
          scales: speciesScales,
          rotations: speciesRotations
        },
        { x: 0, z: 0 }, // Dummy region coordinate since we're using chunk-based system
        biomeInfo,
        isGroundGrass,
        1.0 // Full LOD
      );
    }
  }

  public setSeason(season: string): void {
    if (this.currentSeason === season) return;
    
    console.log(`🌸 Changing flower season from ${this.currentSeason} to ${season}`);
    this.currentSeason = season;
    
    // Reload all chunks to update flower species for new season
    const chunksToReload = Array.from(this.loadedChunks.keys());
    for (const chunkKey of chunksToReload) {
      const chunkData = this.loadedChunks.get(chunkKey)!;
      this.unloadChunk(chunkKey);
      this.loadChunk(chunkData.coordinate);
    }
  }

  public getFlowerCount(): number {
    let totalFlowers = 0;
    for (const flowers of this.flowerGroups.values()) {
      totalFlowers += flowers.length;
    }
    return totalFlowers;
  }

  public isLoadingComplete(): boolean {
    return true; // All chunks are loaded immediately
  }

  public getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }

  public getRenderedInstanceCount(): number {
    let instanceCount = 0;
    for (const [key, mesh] of this.renderer.getGrassInstances()) {
      instanceCount += mesh.count;
    }
    for (const [key, mesh] of this.renderer.getGroundGrassInstances()) {
      instanceCount += mesh.count;
    }
    return instanceCount;
  }

  public dispose(): void {
    // Clear all chunks
    const chunkKeys = Array.from(this.loadedChunks.keys());
    for (const chunkKey of chunkKeys) {
      this.unloadChunk(chunkKey);
    }
    
    // Clear caches
    SeededGrassDistribution.clearCache();
    FlowerDistribution.clearCache();
    
    console.log('🌱🌸 Grass and flower bubble manager disposed');
  }
}
