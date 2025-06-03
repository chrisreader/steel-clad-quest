
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

  constructor(physicsManager: PhysicsManager) {
    this.physicsManager = physicsManager;
    console.log('🏔️ TerrainSurfaceDetector initialized with raycast-based detection');
  }

  public getSurfaceDataAtPosition(position: THREE.Vector3): SurfaceData {
    // Get terrain data using raycasting
    const terrainData = this.physicsManager.getTerrainDataAtPosition(position);
    const height = terrainData.height;
    const normal = terrainData.normal;
    
    // Calculate slope angle from normal
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
    
    // Check if we're at terrain boundary (raycast miss indicates boundary)
    const isTerrainBoundary = height <= 0.1;
    
    // Determine walkability
    let isWalkable = slopeAngle <= this.maxSlopeAngle;
    if (isTerrainBoundary) {
      isWalkable = true; // Always walkable on flat ground
    }
    
    // Determine material based on slope
    let material: 'grass' | 'stone' | 'dirt' = 'grass';
    if (isTerrainBoundary) {
      material = 'dirt';
    } else if (slopeAngle > 30) {
      material = 'stone';
    } else if (slopeAngle > 15) {
      material = 'dirt';
    }

    console.log(`🏔️ Surface at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}): height=${height.toFixed(2)}, slope=${slopeAngle.toFixed(1)}°, walkable=${isWalkable}, boundary=${isTerrainBoundary}`);

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
}
