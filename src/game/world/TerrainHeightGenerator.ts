
import * as THREE from 'three';

export interface TerrainHeightData {
  heightmap: Float32Array;
  mesh: THREE.Mesh;
  size: number;
  scale: number;
  maxHeight: number;
  centerX: number;
  centerZ: number;
}

export class TerrainHeightGenerator {
  private scene: THREE.Scene;
  private terrainMeshes: Map<string, TerrainHeightData> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🏔️ [TerrainHeightGenerator] Initialized with THREE.Terrain support');
  }
  
  public generateTerrainForRegion(regionKey: string, centerX: number, centerZ: number): TerrainHeightData {
    console.log(`🏔️ [TerrainHeightGenerator] Generating hilly terrain for region ${regionKey} at (${centerX}, ${centerZ})`);
    
    // Configuration for terrain generation
    const terrainSize = 1000; // World units
    const segments = 63; // Must be power of 2 minus 1 for THREE.Terrain
    const maxHeight = 50; // Maximum hill height
    const minHeight = -10; // Minimum valley depth
    
    // Create terrain using THREE.Terrain
    const terrain = new (window as any).THREE.Terrain({
      heightmap: (window as any).THREE.Terrain.DiamondSquare,
      maxHeight: maxHeight,
      minHeight: minHeight,
      xSegments: segments,
      ySegments: segments,
      xSize: terrainSize,
      ySize: terrainSize,
      material: new THREE.MeshLambertMaterial({ 
        color: 0x4a7c59, // Forest green color to match existing terrain
        wireframe: false
      }),
      // Add some randomness to make each region unique
      frequency: 2.5 + Math.random() * 1.5,
      amplification: 1.0 + Math.random() * 0.5
    });
    
    // Position the terrain at the region center
    terrain.position.set(centerX, 0, centerZ);
    terrain.receiveShadow = true;
    terrain.castShadow = false; // Terrain doesn't cast shadows to improve performance
    
    // Add to scene
    this.scene.add(terrain);
    
    // Extract heightmap data for collision detection and future use
    const geometry = terrain.geometry as THREE.PlaneGeometry;
    const vertices = geometry.attributes.position.array as Float32Array;
    const heightmap = new Float32Array((segments + 1) * (segments + 1));
    
    // Extract height values from geometry
    for (let i = 0; i < heightmap.length; i++) {
      heightmap[i] = vertices[i * 3 + 2]; // Z coordinate contains height after rotation
    }
    
    const terrainData: TerrainHeightData = {
      heightmap,
      mesh: terrain,
      size: segments + 1,
      scale: terrainSize / segments,
      maxHeight,
      centerX,
      centerZ
    };
    
    this.terrainMeshes.set(regionKey, terrainData);
    
    console.log(`🏔️ [TerrainHeightGenerator] Created terrain mesh for region ${regionKey}`);
    return terrainData;
  }
  
  // Get height at specific world coordinates
  public getHeightAtPosition(x: number, z: number): number {
    for (const [regionKey, terrainData] of this.terrainMeshes) {
      const { heightmap, size, scale, centerX, centerZ } = terrainData;
      
      // Check if position is within this terrain region
      const localX = (x - centerX) / scale + size / 2;
      const localZ = (z - centerZ) / scale + size / 2;
      
      if (localX >= 0 && localX < size && localZ >= 0 && localZ < size) {
        // Bilinear interpolation for smooth height lookup
        const x1 = Math.floor(localX);
        const x2 = Math.min(x1 + 1, size - 1);
        const z1 = Math.floor(localZ);
        const z2 = Math.min(z1 + 1, size - 1);
        
        const fx = localX - x1;
        const fz = localZ - z1;
        
        const h11 = heightmap[z1 * size + x1];
        const h21 = heightmap[z1 * size + x2];
        const h12 = heightmap[z2 * size + x1];
        const h22 = heightmap[z2 * size + x2];
        
        const h1 = h11 * (1 - fx) + h21 * fx;
        const h2 = h12 * (1 - fx) + h22 * fx;
        
        return h1 * (1 - fz) + h2 * fz;
      }
    }
    
    return 0; // Default ground level if no terrain found
  }
  
  public getTerrainData(regionKey: string): TerrainHeightData | undefined {
    return this.terrainMeshes.get(regionKey);
  }
  
  public removeTerrainForRegion(regionKey: string): void {
    const terrainData = this.terrainMeshes.get(regionKey);
    if (terrainData) {
      this.scene.remove(terrainData.mesh);
      terrainData.mesh.geometry.dispose();
      (terrainData.mesh.material as THREE.Material).dispose();
      this.terrainMeshes.delete(regionKey);
      console.log(`🏔️ [TerrainHeightGenerator] Removed terrain for region ${regionKey}`);
    }
  }
  
  public getAllTerrainRegions(): string[] {
    return Array.from(this.terrainMeshes.keys());
  }
  
  public dispose(): void {
    for (const regionKey of this.terrainMeshes.keys()) {
      this.removeTerrainForRegion(regionKey);
    }
    console.log('🏔️ [TerrainHeightGenerator] Disposed all terrain');
  }
}
