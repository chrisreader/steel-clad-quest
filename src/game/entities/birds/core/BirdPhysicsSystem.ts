import * as THREE from 'three';
import { FlightMode } from '../BaseBird';

export class BirdPhysicsSystem {
  private soaringAltitudeLoss: number = 0;

  public updatePhysics(
    deltaTime: number,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    flightMode: FlightMode,
    groundLevel: number,
    isFlapping: boolean,
    wingBeatIntensity: number,
    birdState: string,
    targetAltitude: number
  ): void {
    if (flightMode === FlightMode.GROUNDED) {
      // Ground physics - ensure bird feet stay on ground
      const feetToBodyDistance = 0.48;
      position.y = groundLevel + feetToBodyDistance;
      // Clear any upward velocity when grounded
      if (velocity.y > 0) {
        velocity.y = 0;
      }
    } else {
      // Flight physics
      this.updateFlightPhysics(
        deltaTime, 
        velocity, 
        isFlapping, 
        wingBeatIntensity, 
        birdState, 
        position, 
        targetAltitude
      );
    }
    
    // Apply velocity
    position.add(velocity.clone().multiplyScalar(deltaTime));
    
    // Force ground contact when grounded (safety check with feet positioning)
    if (flightMode === FlightMode.GROUNDED) {
      const feetToBodyDistance = 0.48;
      position.y = groundLevel + feetToBodyDistance;
    }
  }

  private updateFlightPhysics(
    deltaTime: number,
    velocity: THREE.Vector3,
    isFlapping: boolean,
    wingBeatIntensity: number,
    birdState: string,
    position: THREE.Vector3,
    targetAltitude: number
  ): void {
    // Apply gravity - birds fall without lift
    const gravity = -9.8 * deltaTime;
    velocity.y += gravity;
    
    // Apply lift when flapping with variable intensity
    if (isFlapping) {
      const liftForce = 12 * wingBeatIntensity * deltaTime;
      velocity.y += liftForce;
    }
    
    // Realistic soaring physics - gradual altitude loss without flapping
    if (birdState === 'soaring' && !isFlapping) {
      this.soaringAltitudeLoss += deltaTime;
      // Add extra gravity during soaring to simulate energy loss
      const soaringDrag = -2.5 * deltaTime;
      velocity.y += soaringDrag;
      
      // If altitude drops too much, start flapping to regain height
      if (this.soaringAltitudeLoss > 3.0 && position.y < targetAltitude - 2) {
        // This will be handled by the calling code
        console.log(`🐦 Starting to flap during soaring to regain altitude`);
      }
    }
    
    // Reset soaring loss when actively flapping
    if (isFlapping) {
      this.soaringAltitudeLoss = 0;
    }
    
    // Limit velocities to realistic ranges
    velocity.y = THREE.MathUtils.clamp(velocity.y, -8, 4);
    
    // Apply drag
    velocity.multiplyScalar(0.99);
  }

  public getSoaringAltitudeLoss(): number {
    return this.soaringAltitudeLoss;
  }

  public resetSoaringAltitudeLoss(): void {
    this.soaringAltitudeLoss = 0;
  }
}