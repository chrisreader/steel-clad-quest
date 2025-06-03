import * as THREE from 'three';
import { TerrainFeatureGenerator } from './TerrainFeatureGenerator';
import { StructureGenerator } from './StructureGenerator';
import { TerrainHeightGenerator } from './TerrainHeightGenerator';

interface QuadrantData {
  key: string;
  centerX: number;
  centerZ: number;
  features: THREE.Object3D[];
  structures: THREE.Object3D[];
  isLoaded: boolean;
}

export class RingQuadrantSystem {
  private scene: THREE.Scene;
  private currentRing: number = 0;
  private ringQuadrants: Map<string, QuadrantData> = new Map();
  private loadedQuadrants: Set<string> = new Set();
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  private structureGenerator: StructureGenerator;
  private terrainHeightGenerator: TerrainHeightGenerator;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  
  private readonly QUADRANT_SIZE: number = 1000;
  private readonly RING_THRESHOLD: number = 1000;
  private readonly INITIAL_QUADRANTS_RADIUS: number = 2;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.terrainFeatureGenerator = new TerrainFeatureGenerator(scene);
    this.structureGenerator = new StructureGenerator(scene);
    this.terrainHeightGenerator = new TerrainHeightGenerator(scene);
    
    console.log('🗺️ [RingQuadrantSystem] Initialized with terrain height generation');
    
    // Generate initial terrain around spawn
    this.generateInitialTerrain();
  }
  
  private generateInitialTerrain(): void {
    const initialRadius = this.INITIAL_QUADRANTS_RADIUS;
    
    for (let x = -initialRadius; x <= initialRadius; x++) {
      for (let z = -initialRadius; z <= initialRadius; z++) {
        const quadrantKey = `${x},${z}`;
        this.loadQuadrant(quadrantKey);
      }
    }
  }

  public updatePlayerPosition(playerPosition: THREE.Vector3): void {
    const distance = Math.sqrt(Math.pow(playerPosition.x - this.lastPlayerPosition.x, 2) + Math.pow(playerPosition.z - this.lastPlayerPosition.z, 2));
    
    if (distance < 50) {
      return;
    }
    
    const ring = Math.max(0, Math.ceil(Math.sqrt(Math.pow(playerPosition.x, 2) + Math.pow(playerPosition.z, 2)) / this.RING_THRESHOLD));
    
    if (ring !== this.currentRing) {
      this.currentRing = ring;
      console.log(`🗺️ [RingQuadrantSystem] Player entered ring ${ring}`);
    }
    
    const currentQuadrant = this.getQuadrantKey(playerPosition.x, playerPosition.z);
    
    // Load new quadrants if needed
    const requiredQuadrants = this.getRequiredQuadrants(playerPosition);
    
    for (const quadrantKey of requiredQuadrants) {
      if (!this.loadedQuadrants.has(quadrantKey)) {
        this.loadQuadrant(quadrantKey);
      }
    }
    
    // Unload distant quadrants
    const maxDistance = this.QUADRANT_SIZE * 3; // Increased slightly for terrain
    for (const quadrantKey of this.loadedQuadrants) {
      const quadrantData = this.ringQuadrants.get(quadrantKey);
      if (quadrantData) {
        const distance = Math.sqrt(
          Math.pow(quadrantData.centerX - playerPosition.x, 2) +
          Math.pow(quadrantData.centerZ - playerPosition.z, 2)
        );
        
        if (distance > maxDistance) {
          this.unloadQuadrant(quadrantKey);
        }
      }
    }
    
    this.lastPlayerPosition.copy(playerPosition);
  }
  
  private loadQuadrant(quadrantKey: string): void {
    if (this.loadedQuadrants.has(quadrantKey)) return;
    
    const [qx, qz] = quadrantKey.split(',').map(Number);
    const centerX = qx * this.QUADRANT_SIZE;
    const centerZ = qz * this.QUADRANT_SIZE;
    
    console.log(`🗺️ [RingQuadrantSystem] Loading quadrant ${quadrantKey} at (${centerX}, ${centerZ})`);
    
    // Generate hilly terrain first
    const terrainData = this.terrainHeightGenerator.generateTerrainForRegion(quadrantKey, centerX, centerZ);
    
    // Then generate features on top of the terrain
    const features = this.terrainFeatureGenerator.generateFeaturesForRegion(quadrantKey, centerX, centerZ);
    
    // Generate structures
    const structures = this.structureGenerator.generateStructuresForRegion(quadrantKey, centerX, centerZ);
    
    const quadrantData: QuadrantData = {
      key: quadrantKey,
      centerX,
      centerZ,
      features,
      structures,
      isLoaded: true
    };
    
    this.ringQuadrants.set(quadrantKey, quadrantData);
    this.loadedQuadrants.add(quadrantKey);
    
    console.log(`🗺️ [RingQuadrantSystem] Loaded quadrant ${quadrantKey} with ${features.length} features and ${structures.length} structures`);
  }
  
  private unloadQuadrant(quadrantKey: string): void {
    const quadrantData = this.ringQuadrants.get(quadrantKey);
    if (!quadrantData) return;
    
    console.log(`🗺️ [RingQuadrantSystem] Unloading quadrant ${quadrantKey}`);
    
    // Remove terrain
    this.terrainHeightGenerator.removeTerrainForRegion(quadrantKey);
    
    // Remove features
    this.terrainFeatureGenerator.removeFeaturesForRegion(quadrantKey);
    
    // Remove structures
    this.structureGenerator.removeStructuresForRegion(quadrantKey);
    
    this.ringQuadrants.delete(quadrantKey);
    this.loadedQuadrants.delete(quadrantKey);
  }
  
  private getQuadrantKey(x: number, z: number): string {
    const qx = Math.floor(x / this.QUADRANT_SIZE);
    const qz = Math.floor(z / this.QUADRANT_SIZE);
    return `${qx},${qz}`;
  }
  
  private getRequiredQuadrants(playerPosition: THREE.Vector3): string[] {
    const requiredQuadrants: string[] = [];
    const radius = 2; // Load quadrants within a 5x5 grid
    
    const currentQx = Math.floor(playerPosition.x / this.QUADRANT_SIZE);
    const currentQz = Math.floor(playerPosition.z / this.QUADRANT_SIZE);
    
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const qx = currentQx + x;
        const qz = currentQz + z;
        const quadrantKey = `${qx},${qz}`;
        requiredQuadrants.push(quadrantKey);
      }
    }
    
    return requiredQuadrants;
  }

  // New method to get terrain height at position
  public getTerrainHeightAtPosition(x: number, z: number): number {
    return this.terrainHeightGenerator.getHeightAtPosition(x, z);
  }
  
  public dispose(): void {
    console.log('🗺️ [RingQuadrantSystem] Disposing all quadrants');
    
    // Dispose terrain
    this.terrainHeightGenerator.dispose();
    
    // Dispose features
    this.terrainFeatureGenerator.dispose();
    
    // Dispose structures
    this.structureGenerator.dispose();
    
    this.ringQuadrants.clear();
    this.loadedQuadrants.clear();
  }
}
