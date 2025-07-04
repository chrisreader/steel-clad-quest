import * as THREE from 'three';
import { BirdState, FlightMode } from '../core/BirdTypes';

export class FlightPhysics {
  public static updateFlightPhysics(
    deltaTime: number,
    velocity: THREE.Vector3,
    position: THREE.Vector3,
    isFlapping: boolean,
    wingBeatIntensity: number,
    birdState: BirdState,
    flightMode: FlightMode,
    targetAltitude: number,
    groundLevel: number
  ): { soaringAltitudeLoss: number; updatedFlapping: boolean; updatedIntensity: number } {
    let soaringAltitudeLoss = 0;
    let updatedFlapping = isFlapping;
    let updatedIntensity = wingBeatIntensity;

    // Base gravity effect
    const gravity = -9.8 * deltaTime;
    velocity.y += gravity;
    
    // Lift generation from wing flapping
    if (isFlapping) {
      const liftForce = 12 * wingBeatIntensity * deltaTime;
      velocity.y += liftForce;
    }
    
    // Enhanced soaring physics - ONLY apply during SOARING state
    if (birdState === BirdState.SOARING && flightMode !== FlightMode.GROUNDED) {
      soaringAltitudeLoss += deltaTime;
      
      // Realistic soaring: minimal energy loss with occasional thermals
      const thermalChance = Math.random();
      if (thermalChance < 0.01) { // 1% chance per frame to hit thermal
        // Thermal updraft - slight altitude gain
        velocity.y += 2.0 * deltaTime;
        soaringAltitudeLoss = Math.max(0, soaringAltitudeLoss - 1.0);
      } else {
        // Natural soaring energy loss - very gradual
        const soaringDrag = -1.5 * deltaTime;
        velocity.y += soaringDrag;
      }
      
      // Start flapping if losing too much altitude
      if (soaringAltitudeLoss > 4.0 && position.y < targetAltitude - 3) {
        updatedFlapping = true;
        updatedIntensity = 1.1;
      }
    }
    
    // Reset soaring timer when actively flapping
    if (isFlapping) {
      soaringAltitudeLoss = 0;
    }
    
    // Reasonable velocity limits for bird flight
    velocity.y = THREE.MathUtils.clamp(velocity.y, -6, 4);
    
    // Air resistance - more realistic for bird flight
    velocity.multiplyScalar(0.985);

    return { soaringAltitudeLoss, updatedFlapping, updatedIntensity };
  }

  public static executeEmergencyLanding(
    deltaTime: number,
    velocity: THREE.Vector3,
    position: THREE.Vector3,
    groundLevel: number
  ): boolean {
    velocity.y = Math.min(velocity.y - 8 * deltaTime, -3);
    velocity.x *= 0.95;
    velocity.z *= 0.95;
    
    const feetToBodyDistance = 0.48;
    return position.y <= groundLevel + feetToBodyDistance + 1;
  }

  public static executeLanding(
    deltaTime: number,
    velocity: THREE.Vector3,
    position: THREE.Vector3,
    groundLevel: number,
    mesh: THREE.Object3D,
    flapCycle: number
  ): { shouldLand: boolean; updatedFlapCycle: number } {
    // Landing approach with extended wings (no flapping)
    const updatedFlapCycle = flapCycle + deltaTime * 6;
    
    // Calculate glide approach - smooth descent with extended wings
    const altitudeToGround = position.y - groundLevel;
    const isLandingFlare = altitudeToGround < 5.0; // Start flare higher for realistic approach
    
    if (isLandingFlare) {
      // Landing flare - reduce speed and gentle descent with fully extended wings
      velocity.x *= 0.94; // Gradual speed reduction
      velocity.z *= 0.94;
      velocity.y = Math.max(velocity.y - 1.2 * deltaTime, -1.0);
      
      // Pitch up slightly for landing flare
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, 0.1, deltaTime * 2);
    } else {
      // Maintain steady glide approach with extended wings
      velocity.x *= 0.99; // Maintain glide speed
      velocity.z *= 0.99;
      
      // Steady descent on glide path
      const glideAngle = 0.25; // Shallow glide slope (~14°)
      const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
      velocity.y = Math.max(velocity.y - 0.6 * deltaTime, -currentSpeed * glideAngle);
      
      // Slight nose-down attitude for glide
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, -0.05, deltaTime);
    }
    
    // Land when close to ground
    const feetToBodyDistance = 0.48;
    const shouldLand = position.y <= groundLevel + feetToBodyDistance + 0.3;
    
    return { shouldLand, updatedFlapCycle };
  }
}