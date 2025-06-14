import * as THREE from 'three';
import { ChunkCoordinate, DeterministicBiomeManager } from '../biomes/DeterministicBiomeManager';
import { SeededGrassDistribution, SeededGrassData } from '../SeededGrassDistribution';
import { GrassRenderer } from '../core/GrassRenderer';

export interface LoadedChunk {
  coordinate: ChunkCoordinate;
  grassInstances: string[];
  groundGrassInstances: string[];
  lastAccessTime: number;
}

export class GrassRenderBubbleManager {
  private scene: THREE.Scene;
  private renderer: GrassRenderer;
  
  // Enhanced render bubble configuration
  private readonly RENDER_RADIUS = 600; // Increased from 280
  private readonly UNLOAD_RADIUS = 700; // Increased from 320
  private readonly CHUNK_SIZE = 64;
  private readonly MAX_CHUNKS_PER_FRAME = 8; // Increased from 3
  private readonly MOVEMENT_THRESHOLD = 2; // Reduced from 5
  
  // Chunk tracking
  private loadedChunks: Map<string, LoadedChunk> = new Map();
  private loadQueue: ChunkCoordinate[] = [];
  private unloadQueue: string[] = [];
  
  // Performance tracking
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private frameCounter = 0;
  private loadingThisFrame = 0;
  private isInitialized = false;

  constructor(scene: THREE.Scene, renderer: GrassRenderer) {
    this.scene = scene;
    this.renderer = renderer;
  }

  public initializeWithCoverage(playerPosition: THREE.Vector3, coverageRadius: number = 600): void {
    console.log(`🌱 Initializing grass system with coverage radius: ${coverageRadius}`);
    
    this.lastPlayerPosition.copy(playerPosition);
    
    // Calculate chunks needed for initial coverage
    const chunkRadius = Math.ceil(coverageRadius / this.CHUNK_SIZE);
    const playerChunk = DeterministicBiomeManager.worldPositionToChunk(playerPosition);
    
    const initialChunks: ChunkCoordinate[] = [];
    
    for (let x = playerChunk.x - chunkRadius; x <= playerChunk.x + chunkRadius; x++) {
      for (let z = playerChunk.z - chunkRadius; z <= playerChunk.z + chunkRadius; z++) {
        const chunk: ChunkCoordinate = { x, z };
        const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunk);
        const distance = playerPosition.distanceTo(chunkCenter);
        
        if (distance <= coverageRadius) {
          initialChunks.push(chunk);
        }
      }
    }
    
    // Sort by distance for progressive loading
    initialChunks.sort((a, b) => {
      const distA = playerPosition.distanceTo(DeterministicBiomeManager.chunkToWorldPosition(a));
      const distB = playerPosition.distanceTo(DeterministicBiomeManager.chunkToWorldPosition(b));
      return distA - distB;
    });
    
    this.loadQueue.push(...initialChunks);
    this.isInitialized = true;
    
    console.log(`🌱 Queued ${initialChunks.length} chunks for initial loading`);
  }

  public update(playerPosition: THREE.Vector3): void {
    this.frameCounter++;
    this.loadingThisFrame = 0;
    
    // If not initialized, skip movement-based updates
    if (!this.isInitialized) {
      this.processLoadQueue();
      return;
    }
    
    // Check if player moved significantly
    const movement = this.lastPlayerPosition.distanceTo(playerPosition);
    if (movement < this.MOVEMENT_THRESHOLD && this.loadQueue.length === 0) return;
    
    this.lastPlayerPosition.copy(playerPosition);
    
    // Update chunk visibility
    this.updateChunkVisibility(playerPosition);
    
    // Process loading queue (increased per frame)
    this.processLoadQueue();
    
    // Process unloading queue
    this.processUnloadQueue();
    
    // Periodic cleanup
    if (this.frameCounter % 300 === 0) {
      this.performCleanup();
    }
  }

  private updateChunkVisibility(playerPosition: THREE.Vector3): void {
    const playerChunk = DeterministicBiomeManager.worldPositionToChunk(playerPosition);
    
    // Calculate render radius in chunks
    const chunkRadius = Math.ceil(this.RENDER_RADIUS / this.CHUNK_SIZE);
    const unloadRadius = Math.ceil(this.UNLOAD_RADIUS / this.CHUNK_SIZE);
    
    // Find chunks that should be loaded
    const chunksToLoad: ChunkCoordinate[] = [];
    
    for (let x = playerChunk.x - chunkRadius; x <= playerChunk.x + chunkRadius; x++) {
      for (let z = playerChunk.z - chunkRadius; z <= playerChunk.z + chunkRadius; z++) {
        const chunk: ChunkCoordinate = { x, z };
        const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(chunk);
        const distance = playerPosition.distanceTo(chunkCenter);
        
        if (distance <= this.RENDER_RADIUS) {
          const chunkKey = DeterministicBiomeManager.getChunkKey(chunk);
          
          if (!this.loadedChunks.has(chunkKey) && !this.isChunkInQueue(chunk)) {
            chunksToLoad.push(chunk);
          } else if (this.loadedChunks.has(chunkKey)) {
            // Update access time for loaded chunks
            const loadedChunk = this.loadedChunks.get(chunkKey)!;
            loadedChunk.lastAccessTime = performance.now();
          }
        }
      }
    }
    
    // Add chunks to load queue (sorted by distance)
    chunksToLoad.sort((a, b) => {
      const distA = playerPosition.distanceTo(DeterministicBiomeManager.chunkToWorldPosition(a));
      const distB = playerPosition.distanceTo(DeterministicBiomeManager.chunkToWorldPosition(b));
      return distA - distB;
    });
    
    this.loadQueue.push(...chunksToLoad);
    
    // Find chunks that should be unloaded
    const chunksToUnload: string[] = [];
    
    for (const [chunkKey, loadedChunk] of this.loadedChunks.entries()) {
      const chunkCenter = DeterministicBiomeManager.chunkToWorldPosition(loadedChunk.coordinate);
      const distance = playerPosition.distanceTo(chunkCenter);
      
      if (distance > this.UNLOAD_RADIUS) {
        chunksToUnload.push(chunkKey);
      }
    }
    
    this.unloadQueue.push(...chunksToUnload);
  }

  private isChunkInQueue(chunk: ChunkCoordinate): boolean {
    return this.loadQueue.some(queuedChunk => 
      queuedChunk.x === chunk.x && queuedChunk.z === chunk.z
    );
  }

  private processLoadQueue(): void {
    while (this.loadQueue.length > 0 && this.loadingThisFrame < this.MAX_CHUNKS_PER_FRAME) {
      const chunk = this.loadQueue.shift()!;
      this.loadChunk(chunk);
      this.loadingThisFrame++;
    }
  }

  private processUnloadQueue(): void {
    while (this.unloadQueue.length > 0) {
      const chunkKey = this.unloadQueue.shift()!;
      this.unloadChunk(chunkKey);
    }
  }

  private loadChunk(chunk: ChunkCoordinate): void {
    const chunkKey = DeterministicBiomeManager.getChunkKey(chunk);
    
    if (this.loadedChunks.has(chunkKey)) return;
    
    const biomeData = DeterministicBiomeManager.getBiomeForChunk(chunk);
    const biomeInfo = {
      type: biomeData.biomeType,
      strength: biomeData.strength,
      transitionZone: biomeData.strength < 0.8
    };
    
    // Generate deterministic grass data
    const tallGrassData = SeededGrassDistribution.generateGrassForChunk(chunk, false);
    const groundGrassData = SeededGrassDistribution.generateGrassForChunk(chunk, true);
    
    // Group by species
    const tallGrassGroups = this.groupGrassBySpecies(tallGrassData);
    const groundGrassGroups = this.groupGrassBySpecies(groundGrassData);
    
    const grassInstances: string[] = [];
    const groundGrassInstances: string[] = [];
    
    // Create tall grass instances
    for (const [speciesName, speciesData] of Object.entries(tallGrassGroups)) {
      const instanceKey = `${chunkKey}_${speciesName}`;
      this.renderer.createInstancedMesh(
        chunkKey,
        speciesName,
        speciesData as { positions: THREE.Vector3[]; scales: THREE.Vector3[]; rotations: THREE.Quaternion[]; },
        { ringIndex: 0, quadrant: 0 }, // Dummy region data
        biomeInfo,
        false,
        1.0
      );
      grassInstances.push(instanceKey);
    }
    
    // Create ground grass instances
    for (const [speciesName, speciesData] of Object.entries(groundGrassGroups)) {
      const instanceKey = `${chunkKey}_${speciesName}`;
      this.renderer.createInstancedMesh(
        chunkKey,
        speciesName,
        speciesData as { positions: THREE.Vector3[]; scales: THREE.Vector3[]; rotations: THREE.Quaternion[]; },
        { ringIndex: 0, quadrant: 0 }, // Dummy region data
        biomeInfo,
        true,
        1.0
      );
      groundGrassInstances.push(instanceKey);
    }
    
    // Track loaded chunk
    this.loadedChunks.set(chunkKey, {
      coordinate: chunk,
      grassInstances,
      groundGrassInstances,
      lastAccessTime: performance.now()
    });
    
    console.log(`🌱 Loaded chunk ${chunkKey} with ${tallGrassData.positions.length} tall grass, ${groundGrassData.positions.length} ground grass`);
  }

  private unloadChunk(chunkKey: string): void {
    const loadedChunk = this.loadedChunks.get(chunkKey);
    if (!loadedChunk) return;
    
    // Remove grass instances
    this.renderer.removeRegion(chunkKey);
    
    // Remove from tracking
    this.loadedChunks.delete(chunkKey);
    
    console.log(`🌱 Unloaded chunk ${chunkKey}`);
  }

  private groupGrassBySpecies(grassData: SeededGrassData) {
    const groups: { [species: string]: {
      positions: THREE.Vector3[];
      scales: THREE.Vector3[];
      rotations: THREE.Quaternion[];
    }} = {};
    
    for (let i = 0; i < grassData.positions.length; i++) {
      const species = grassData.species[i];
      if (!groups[species]) {
        groups[species] = { positions: [], scales: [], rotations: [] };
      }
      
      groups[species].positions.push(grassData.positions[i]);
      groups[species].scales.push(grassData.scales[i]);
      groups[species].rotations.push(grassData.rotations[i]);
    }
    
    return groups;
  }

  private performCleanup(): void {
    const now = performance.now();
    const CLEANUP_THRESHOLD = 30000; // 30 seconds
    
    for (const [chunkKey, loadedChunk] of this.loadedChunks.entries()) {
      if (now - loadedChunk.lastAccessTime > CLEANUP_THRESHOLD) {
        this.unloadQueue.push(chunkKey);
      }
    }
    
    console.log(`🌱 Bubble Manager: ${this.loadedChunks.size} chunks loaded, queue: ${this.loadQueue.length} load, ${this.unloadQueue.length} unload`);
  }

  public getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }

  public isLoadingComplete(): boolean {
    return this.loadQueue.length === 0 && this.isInitialized;
  }

  public dispose(): void {
    // Unload all chunks
    for (const chunkKey of this.loadedChunks.keys()) {
      this.unloadChunk(chunkKey);
    }
    
    this.loadedChunks.clear();
    this.loadQueue = [];
    this.unloadQueue = [];
    
    console.log('🌱 Grass Render Bubble Manager disposed');
  }
}
