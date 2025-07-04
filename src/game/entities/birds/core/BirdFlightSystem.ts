import * as THREE from 'three';
import { BirdState, FlightMode, BirdConfig, BirdBodyParts } from '../BaseBird';

export class BirdFlightSystem {
  private flightPath: THREE.Vector3[] = [];
  private currentPathIndex: number = 0;
  private currentHeading: number = 0;
  private targetHeading: number = 0;
  private visualBankAngle: number = 0;
  private targetAltitude: number = 0;
  private groundLevel: number = 0;
  
  constructor(
    private config: BirdConfig,
    private homePosition: THREE.Vector3
  ) {}

  public generateFlightPath(): void {
    this.flightPath = [];
    this.currentPathIndex = 0;
    
    const numPoints = 8 + Math.floor(Math.random() * 5); // 8-12 waypoints for longer flights
    const baseRadius = this.config.territoryRadius * 1.2; // Larger territory coverage
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.8 - 0.4; // More randomness
      const radius = baseRadius + (Math.random() - 0.5) * baseRadius * 0.6; // Greater radius variation
      const altitude = this.targetAltitude + (Math.random() - 0.5) * 12; // Vary altitude by ±6 units
      
      const x = this.homePosition.x + Math.cos(angle) * radius;
      const z = this.homePosition.z + Math.sin(angle) * radius;
      const y = Math.max(this.groundLevel + 8, altitude); // Ensure minimum height of 8 units
      
      this.flightPath.push(new THREE.Vector3(x, y, z));
    }
    
    // Close the path by connecting back to first point
    this.flightPath.push(this.flightPath[0].clone());
    console.log(`🐦 [${this.config.species}] Generated extended flight path with ${numPoints} waypoints`);
  }

  public setTargetAltitude(altitude: number): void {
    this.targetAltitude = altitude;
  }

  public setGroundLevel(level: number): void {
    this.groundLevel = level;
  }

  public followFlightPath(
    deltaTime: number, 
    position: THREE.Vector3, 
    velocity: THREE.Vector3,
    mesh: THREE.Object3D,
    bodyParts: BirdBodyParts | null
  ): { isFlapping: boolean; wingBeatIntensity: number } {
    if (this.flightPath.length === 0) {
      return { isFlapping: false, wingBeatIntensity: 1.0 };
    }
    
    const currentWaypoint = this.flightPath[this.currentPathIndex];
    if (!currentWaypoint) {
      return { isFlapping: false, wingBeatIntensity: 1.0 };
    }
    
    const distanceToWaypoint = position.distanceTo(currentWaypoint);
    
    // Move to next waypoint when close enough
    if (distanceToWaypoint < 5) {
      this.currentPathIndex = (this.currentPathIndex + 1) % this.flightPath.length;
      console.log(`🐦 [${this.config.species}] Reached waypoint ${this.currentPathIndex}`);
      return { isFlapping: false, wingBeatIntensity: 1.0 };
    }
    
    // Calculate direction to target (horizontal plane only)
    const toTarget = currentWaypoint.clone().sub(position);
    toTarget.y = 0; // Keep turning calculations in horizontal plane
    
    if (toTarget.length() < 0.1) {
      this.currentPathIndex = (this.currentPathIndex + 1) % this.flightPath.length;
      return { isFlapping: false, wingBeatIntensity: 1.0 };
    }
    
    // Calculate target heading (direction bird should face)
    this.targetHeading = Math.atan2(toTarget.z, toTarget.x);
    
    // Smoothly adjust current heading toward target
    let headingDiff = this.targetHeading - this.currentHeading;
    
    // Normalize heading difference to [-π, π] for shortest turn
    while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
    while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
    
    // Limit turn rate for realistic flight
    const maxTurnRate = 2.0 * deltaTime; // Gradual turning
    const headingChange = THREE.MathUtils.clamp(headingDiff, -maxTurnRate, maxTurnRate);
    
    // Update current heading
    this.currentHeading += headingChange;
    
    // Set mesh rotation to match current heading
    mesh.rotation.y = this.currentHeading;
    
    // ALWAYS fly forward in +X direction relative to bird's orientation
    const forwardDirection = new THREE.Vector3(
      Math.cos(this.currentHeading), // +X forward
      0,
      Math.sin(this.currentHeading)
    );
    
    // Set horizontal velocity to always fly forward
    const speed = this.config.flightSpeed;
    velocity.x = forwardDirection.x * speed;
    velocity.z = forwardDirection.z * speed;
    
    // Handle altitude changes independently of horizontal movement
    const altitudeDiff = currentWaypoint.y - position.y;
    let isFlapping = false;
    let wingBeatIntensity = 1.0;
    
    if (Math.abs(altitudeDiff) > 1) {
      const climbRate = THREE.MathUtils.clamp(altitudeDiff * 0.3, -1.5, 1.5);
      velocity.y = THREE.MathUtils.lerp(velocity.y, climbRate, deltaTime * 2);
      isFlapping = true;
      wingBeatIntensity = 1.1;
    } else {
      // Flap during turns for realistic flight
      isFlapping = Math.abs(headingChange) > 0.05;
      wingBeatIntensity = 1.0;
    }
    
    // Visual banking for wings only (does NOT affect flight direction)
    const targetBankAngle = headingChange * 1.5; // Bank in direction of turn
    this.visualBankAngle = THREE.MathUtils.lerp(
      this.visualBankAngle, 
      targetBankAngle, 
      deltaTime * 4
    );
    
    // Apply visual banking to wings only
    if (bodyParts?.leftWing && bodyParts?.rightWing) {
      const clampedBanking = THREE.MathUtils.clamp(this.visualBankAngle, -0.3, 0.3);
      bodyParts.leftWing.rotation.z = clampedBanking;
      bodyParts.rightWing.rotation.z = -clampedBanking;
    }

    return { isFlapping, wingBeatIntensity };
  }
}