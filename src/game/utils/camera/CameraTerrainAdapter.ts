
import * as THREE from 'three';
import { SurfaceData } from '../terrain/TerrainSurfaceDetector';

export class CameraTerrainAdapter {
  private camera: THREE.PerspectiveCamera;
  private targetRotation: THREE.Quaternion = new THREE.Quaternion();
  private currentRotation: THREE.Quaternion = new THREE.Quaternion();
  private adaptationStrength: number = 0.3;
  private smoothingFactor: number = 0.05;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    console.log('📹 CameraTerrainAdapter initialized');
  }

  public adaptToTerrain(surfaceData: SurfaceData, playerDirection: THREE.Vector3): void {
    // Calculate how much to tilt camera based on surface normal
    const surfaceNormal = surfaceData.normal;
    const up = new THREE.Vector3(0, 1, 0);
    
    // Only adapt for moderate slopes to avoid disorientation
    if (surfaceData.slopeAngle > 30) {
      this.targetRotation = this.currentRotation.clone();
      return;
    }

    // Calculate tilt amount based on slope
    const tiltAmount = surfaceData.slopeAngle * this.adaptationStrength * (Math.PI / 180);
    
    // Create rotation to align camera slightly with terrain
    const forward = playerDirection.clone().normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const terrainUp = surfaceNormal.clone();
    
    // Create subtle rotation matrix
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeBasis(right, terrainUp, forward.clone().negate());
    
    this.targetRotation.setFromRotationMatrix(rotationMatrix);
    
    console.log(`📹 Camera adapting to terrain: slope=${surfaceData.slopeAngle.toFixed(1)}°, tilt=${tiltAmount.toFixed(3)}`);
  }

  public updateCamera(): void {
    // Smoothly interpolate to target rotation
    this.currentRotation.slerp(this.targetRotation, this.smoothingFactor);
    
    // Apply subtle terrain adaptation while preserving mouse look
    // This will be integrated with the existing mouse look system
  }

  public setAdaptationStrength(strength: number): void {
    this.adaptationStrength = Math.max(0, Math.min(1, strength));
  }

  public getCurrentRotation(): THREE.Quaternion {
    return this.currentRotation.clone();
  }
}
