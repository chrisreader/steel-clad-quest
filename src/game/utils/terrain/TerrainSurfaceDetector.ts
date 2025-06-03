
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
  private raycaster: THREE.Raycaster;
  private maxSlopeAngle: number = 45; // degrees
  private normalCache: Map<string, THREE.Vector3> = new Map();

  constructor(physicsManager: PhysicsManager) {
    this.physicsManager = physicsManager;
    this.raycaster = new THREE.Raycaster();
    console.log('🏔️ TerrainSurfaceDetector initialized with enhanced boundary handling');
  }

  public getSurfaceDataAtPosition(position: THREE.Vector3): SurfaceData {
    // Get basic terrain height
    const height = this.physicsManager.getTerrainHeightAtPosition(position);
    
    // Calculate surface normal with improved stability
    const normal = this.calculateStableSurfaceNormal(position);
    
    // Calculate slope angle
    const up = new THREE.Vector3(0, 1, 0);
    const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);
    
    // Check if we're at terrain boundary
    const isTerrainBoundary = this.isAtTerrainBoundary(position);
    
    // Adjust walkability based on boundary conditions
    let isWalkable = slopeAngle <= this.maxSlopeAngle;
    
    // More lenient walkability at boundaries
    if (isTerrainBoundary) {
      isWalkable = slopeAngle <= this.maxSlopeAngle + 15; // More tolerance at boundaries
    }
    
    // Determine material based on slope and boundary
    let material: 'grass' | 'stone' | 'dirt' = 'grass';
    if (isTerrainBoundary) {
      material = 'dirt'; // Dirt at boundaries for smoother transitions
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

  private calculateStableSurfaceNormal(position: THREE.Vector3): THREE.Vector3 {
    const cacheKey = `${Math.floor(position.x * 4)},${Math.floor(position.z * 4)}`;
    
    if (this.normalCache.has(cacheKey)) {
      return this.normalCache.get(cacheKey)!.clone();
    }

    // Use adaptive offset based on distance from terrain center
    const terrainCenter = new THREE.Vector3(0, 0, 0); // Assuming terrain is centered at origin
    const distanceFromCenter = position.distanceTo(terrainCenter);
    const adaptiveOffset = Math.max(0.05, Math.min(0.2, distanceFromCenter * 0.01));

    // Sample heights in multiple directions for stability
    const samples = [
      { dir: new THREE.Vector3(-adaptiveOffset, 0, 0), height: 0 },
      { dir: new THREE.Vector3(adaptiveOffset, 0, 0), height: 0 },
      { dir: new THREE.Vector3(0, 0, -adaptiveOffset), height: 0 },
      { dir: new THREE.Vector3(0, 0, adaptiveOffset), height: 0 },
    ];

    // Get height samples
    samples.forEach(sample => {
      const samplePos = position.clone().add(sample.dir);
      sample.height = this.physicsManager.getTerrainHeightAtPosition(samplePos);
    });

    // Calculate gradients with bounds checking
    const dx = (samples[1].height - samples[0].height) / (2 * adaptiveOffset);
    const dz = (samples[3].height - samples[2].height) / (2 * adaptiveOffset);

    // Clamp gradients to reasonable values
    const clampedDx = Math.max(-5, Math.min(5, dx));
    const clampedDz = Math.max(-5, Math.min(5, dz));

    // Create surface normal with clamped values
    const normal = new THREE.Vector3(-clampedDx, 1, -clampedDz).normalize();
    
    // Cache the result
    this.normalCache.set(cacheKey, normal.clone());
    
    // Clean cache periodically
    if (this.normalCache.size > 1000) {
      this.normalCache.clear();
    }

    return normal;
  }

  private isAtTerrainBoundary(position: THREE.Vector3): boolean {
    // Check if position is near the edge of terrain by sampling nearby heights
    const centerHeight = this.physicsManager.getTerrainHeightAtPosition(position);
    const boundaryCheckRadius = 1.0;
    
    // Sample points around current position
    const checkPoints = [
      new THREE.Vector3(position.x + boundaryCheckRadius, position.y, position.z),
      new THREE.Vector3(position.x - boundaryCheckRadius, position.y, position.z),
      new THREE.Vector3(position.x, position.y, position.z + boundaryCheckRadius),
      new THREE.Vector3(position.x, position.y, position.z - boundaryCheckRadius),
    ];

    // If any nearby point has significantly different height or is at ground level (0), we're at boundary
    for (const checkPoint of checkPoints) {
      const checkHeight = this.physicsManager.getTerrainHeightAtPosition(checkPoint);
      const heightDifference = Math.abs(checkHeight - centerHeight);
      
      if (checkHeight <= 0.1 || heightDifference > 2.0) {
        return true;
      }
    }

    return false;
  }

  public setMaxSlopeAngle(angle: number): void {
    this.maxSlopeAngle = angle;
  }

  public clearCache(): void {
    this.normalCache.clear();
  }
}
