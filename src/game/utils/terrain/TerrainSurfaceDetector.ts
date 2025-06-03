
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
    console.log('🏔️ TerrainSurfaceDetector initialized with smooth raycast-based detection');
  }

  public getSurfaceDataAtPosition(position: THREE.Vector3): SurfaceData {
    // Get terrain data using smooth raycasting
    const terrainData = this.physicsManager.getTerrainDataAtPosition(position);
    const height = terrainData.height;
    const normal = terrainData.normal;
    
    // Calculate slope angle from normal with smoothing
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
    
    // Check if we're at terrain boundary with tolerance
    const isTerrainBoundary = height <= 0.2; // Slightly higher tolerance for smooth transitions
    
    // Determine walkability with gradual falloff
    let isWalkable = slopeAngle <= this.maxSlopeAngle;
    if (isTerrainBoundary) {
      isWalkable = true; // Always walkable on flat ground
    }
    
    // Determine material based on slope with smooth transitions
    let material: 'grass' | 'stone' | 'dirt' = 'grass';
    if (isTerrainBoundary) {
      material = 'dirt';
    } else if (slopeAngle > 25) { // Adjusted for smoother transitions
      material = 'stone';
    } else if (slopeAngle > 10) { // Lowered threshold for more natural feel
      material = 'dirt';
    }

    console.log(`🏔️ SMOOTH Surface at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}): height=${height.toFixed(2)}, slope=${slopeAngle.toFixed(1)}°, walkable=${isWalkable}, boundary=${isTerrainBoundary}`);

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
