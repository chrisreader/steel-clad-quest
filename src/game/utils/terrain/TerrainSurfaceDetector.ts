
import * as THREE from 'three';
import { PhysicsManager } from '../../engine/PhysicsManager';

export interface SurfaceData {
  height: number;
  normal: THREE.Vector3;
  slopeAngle: number;
  isWalkable: boolean;
  material: 'grass' | 'stone' | 'dirt';
}

export class TerrainSurfaceDetector {
  private physicsManager: PhysicsManager;
  private raycaster: THREE.Raycaster;
  private maxSlopeAngle: number = 45; // degrees

  constructor(physicsManager: PhysicsManager) {
    this.physicsManager = physicsManager;
    this.raycaster = new THREE.Raycaster();
    console.log('🏔️ TerrainSurfaceDetector initialized');
  }

  public getSurfaceDataAtPosition(position: THREE.Vector3): SurfaceData {
    // Get basic terrain height
    const height = this.physicsManager.getTerrainHeightAtPosition(position);
    
    // Calculate surface normal by sampling nearby heights
    const offset = 0.1;
    const heightX1 = this.physicsManager.getTerrainHeightAtPosition(
      new THREE.Vector3(position.x - offset, position.y, position.z)
    );
    const heightX2 = this.physicsManager.getTerrainHeightAtPosition(
      new THREE.Vector3(position.x + offset, position.y, position.z)
    );
    const heightZ1 = this.physicsManager.getTerrainHeightAtPosition(
      new THREE.Vector3(position.x, position.y, position.z - offset)
    );
    const heightZ2 = this.physicsManager.getTerrainHeightAtPosition(
      new THREE.Vector3(position.x, position.y, position.z + offset)
    );

    // Calculate gradients
    const dx = (heightX2 - heightX1) / (2 * offset);
    const dz = (heightZ2 - heightZ1) / (2 * offset);

    // Create surface normal
    const normal = new THREE.Vector3(-dx, 1, -dz).normalize();
    
    // Calculate slope angle
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
    
    // Determine if walkable
    const isWalkable = slopeAngle <= this.maxSlopeAngle;
    
    // Determine material based on slope
    let material: 'grass' | 'stone' | 'dirt' = 'grass';
    if (slopeAngle > 30) material = 'stone';
    else if (slopeAngle > 15) material = 'dirt';

    console.log(`🏔️ Surface at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}): height=${height.toFixed(2)}, slope=${slopeAngle.toFixed(1)}°, walkable=${isWalkable}`);

    return {
      height,
      normal,
      slopeAngle,
      isWalkable,
      material
    };
  }

  public setMaxSlopeAngle(angle: number): void {
    this.maxSlopeAngle = angle;
  }
}
