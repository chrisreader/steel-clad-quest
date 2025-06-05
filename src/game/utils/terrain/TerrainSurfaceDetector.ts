
import * as THREE from 'three';
import { PhysicsManager } from '../../engine/PhysicsManager';

export interface SurfaceData {
  height: number;
  normal: THREE.Vector3;
  slopeAngle: number;
  isWalkable: boolean;
  material: 'grass' | 'stone' | 'dirt';
  isTerrainBoundary: boolean;
}

export class TerrainSurfaceDetector {
  private physicsManager: PhysicsManager;
  private maxSlopeAngle: number = 45; // degrees
  private lastNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private normalSmoothing: number = 0.7; // How much to smooth normal changes

  constructor(physicsManager: PhysicsManager) {
    this.physicsManager = physicsManager;
    console.log('🏔️ TerrainSurfaceDetector initialized with smooth surface detection');
  }

  public getSurfaceDataAtPosition(position: THREE.Vector3): SurfaceData {
    // Get terrain data using enhanced raycasting
    const terrainData = this.physicsManager.getTerrainDataAtPosition(position);
    const height = terrainData.height;
    let normal = terrainData.normal;
    
    // Apply normal smoothing to prevent sudden normal changes
    const smoothedNormal = this.lastNormal.clone().lerp(normal, 1 - this.normalSmoothing);
    this.lastNormal.copy(smoothedNormal);
    normal = smoothedNormal.normalize();
    
    // Calculate slope angle from smoothed normal
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
    
    // Check if we're at terrain boundary (raycast miss indicates boundary)
    const isTerrainBoundary = height <= 0.1;
    
    // Determine walkability with smoother transitions
    let isWalkable = slopeAngle <= this.maxSlopeAngle;
    if (isTerrainBoundary) {
      isWalkable = true; // Always walkable on flat ground
    }
    
    // Add buffer zone near max slope for smoother transitions
    if (slopeAngle > this.maxSlopeAngle - 5 && slopeAngle <= this.maxSlopeAngle) {
      // Gradual walkability transition in the 5-degree buffer zone
      const bufferFactor = (this.maxSlopeAngle - slopeAngle) / 5;
      isWalkable = bufferFactor > 0.5;
    }
    
    // Determine material based on smoothed slope
    let material: 'grass' | 'stone' | 'dirt' = 'grass';
    if (isTerrainBoundary) {
      material = 'dirt';
    } else if (slopeAngle > 25) { // Adjusted thresholds for smoother transitions
      material = 'stone';
    } else if (slopeAngle > 10) {
      material = 'dirt';
    }

    console.log(`🏔️ Smooth surface at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}): height=${height.toFixed(2)}, slope=${slopeAngle.toFixed(1)}°, walkable=${isWalkable}`);

    return {
      height,
      normal,
      slopeAngle,
      isWalkable,
      material,
      isTerrainBoundary
    };
  }

  public setMaxSlopeAngle(angle: number): void {
    this.maxSlopeAngle = angle;
  }

  // NEW: Reset smoothing when player teleports or changes areas significantly
  public resetSmoothing(): void {
    this.lastNormal.set(0, 1, 0);
  }

  // NEW: Get terrain heightmap data for rock positioning
  public getTerrainHeightmapAtRegion(center: THREE.Vector3, size: number = 100): number[][] {
    const segments = 32;
    const heightmap: number[][] = [];
    
    for (let x = 0; x <= segments; x++) {
      heightmap[x] = [];
      for (let z = 0; z <= segments; z++) {
        const worldX = center.x + (x / segments - 0.5) * size;
        const worldZ = center.z + (z / segments - 0.5) * size;
        const position = new THREE.Vector3(worldX, 0, worldZ);
        const terrainData = this.physicsManager.getTerrainDataAtPosition(position);
        heightmap[x][z] = terrainData.height;
      }
    }
    
    return heightmap;
  }
}
