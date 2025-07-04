import * as THREE from 'three';
import { SpawnableEntity, EntityLifecycleState } from '../../../types/SpawnableEntity';

export enum BirdState {
  IDLE = 'idle',
  WALKING = 'walking',
  FORAGING = 'foraging',
  ALERT = 'alert',
  TAKING_OFF = 'taking_off',
  FLYING = 'flying',
  SOARING = 'soaring',
  LANDING = 'landing',
  PREENING = 'preening'
}

export enum FlightMode {
  GROUNDED = 'grounded',
  ASCENDING = 'ascending',
  CRUISING = 'cruising',
  DESCENDING = 'descending',
  LANDING_APPROACH = 'landing_approach'
}

export interface BirdBodyParts {
  body: THREE.Group;
  head: THREE.Group;
  neck: THREE.Group;
  tail: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  beak: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
}

export interface WingSegments {
  upperArm: THREE.Mesh;
  forearm: THREE.Mesh;
  hand: THREE.Mesh;
  primaryFeathers: THREE.Mesh[];
  secondaryFeathers: THREE.Mesh[];
  covertFeathers?: THREE.Mesh[];
}

export interface BirdConfig {
  species: string;
  size: number;
  wingspan: number;
  bodyLength: number;
  legLength: number;
  walkSpeed: number;
  flightSpeed: number;
  flightAltitude: { min: number; max: number };
  territoryRadius: number;
  alertDistance: number;
}

export abstract class BaseBird implements SpawnableEntity {
  public id: string;
  public mesh: THREE.Object3D;
  public position: THREE.Vector3;
  public age: number = 0;
  public maxAge: number = 300; // 5 minutes
  public state: EntityLifecycleState = EntityLifecycleState.SPAWNING;
  public distanceFromPlayer: number = 0;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public opacity: number = 1;

  // Bird-specific properties
  public birdState: BirdState = BirdState.IDLE;
  public flightMode: FlightMode = FlightMode.GROUNDED;
  public bodyParts: BirdBodyParts | null = null;
  public config: BirdConfig;
  
  // Animation properties
  protected walkCycle: number = 0;
  protected flapCycle: number = 0;
  protected headBobCycle: number = 0;
  protected isFlapping: boolean = false;
  protected targetAltitude: number = 0;
  protected groundLevel: number = 0;
  protected wingBeatIntensity: number = 1.0; // Variable wing beat intensity
  protected bankingAngle: number = 0; // Current banking angle during turns
  
  // AI properties
  protected stateTimer: number = 0;
  protected nextStateChange: number = 0;
  protected homePosition: THREE.Vector3;
  protected targetPosition: THREE.Vector3;
  protected flightPath: THREE.Vector3[] = [];
  protected currentPathIndex: number = 0;
  protected flightPathProgress: number = 0; // Progress along current path segment
  protected soaringAltitudeLoss: number = 0; // Track altitude loss during soaring

  constructor(id: string, config: BirdConfig) {
    this.id = id;
    this.config = config;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3();
    this.homePosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
  }

  public initialize(position: THREE.Vector3): void {
    this.position.copy(position);
    this.homePosition.copy(position);
    this.targetPosition.copy(position);
    
    // Detect actual ground level using raycast
    this.groundLevel = this.detectGroundLevel(position);
    
    // Position bird so bottom of feet touch ground (legs + feet + foot thickness)
    const feetToBodyDistance = 0.48;
    this.position.y = this.groundLevel + feetToBodyDistance;
    this.mesh.position.copy(this.position);
    
    this.createBirdBody();
    this.state = EntityLifecycleState.ACTIVE;
    this.scheduleNextStateChange();
    
    console.log(`🐦 [${this.config.species}] Spawned with feet at ground level ${this.groundLevel}, bird position: ${this.position.y}`);
  }

  protected detectGroundLevel(position: THREE.Vector3): number {
    // For now, assume ground level is 0 since we don't have terrain system integration
    // TODO: Add raycast ground detection when terrain system is available
    return 0;
  }

  protected abstract createBirdBody(): void;
  
  protected abstract updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void;
  
  protected abstract updateAnimation(deltaTime: number): void;

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.state !== EntityLifecycleState.ACTIVE) return;

    this.age += deltaTime;
    this.distanceFromPlayer = this.position.distanceTo(playerPosition);
    
    // Update AI behavior
    this.updateBirdBehavior(deltaTime, playerPosition);
    
    // Update physics
    this.updatePhysics(deltaTime);
    
    // Update animations
    this.updateAnimation(deltaTime);
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Check for lifecycle changes
    if (this.age >= this.maxAge || this.distanceFromPlayer > 200) {
      this.state = EntityLifecycleState.DESPAWNING;
    }
  }

  protected updatePhysics(deltaTime: number): void {
    if (this.flightMode === FlightMode.GROUNDED) {
      // Ground physics - ensure bird feet stay on ground
      const feetToBodyDistance = 0.48;
      this.position.y = this.groundLevel + feetToBodyDistance;
      // Clear any upward velocity when grounded
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
      }
    } else {
      // Flight physics
      this.updateFlightPhysics(deltaTime);
    }
    
    // Apply velocity
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Force ground contact when grounded (safety check with feet positioning)
    if (this.flightMode === FlightMode.GROUNDED) {
      const feetToBodyDistance = 0.48;
      this.position.y = this.groundLevel + feetToBodyDistance;
    }
  }

  protected updateFlightPhysics(deltaTime: number): void {
    // Apply gravity - birds fall without lift
    const gravity = -9.8 * deltaTime;
    this.velocity.y += gravity;
    
    // Apply lift when flapping with variable intensity
    if (this.isFlapping) {
      const liftForce = 12 * this.wingBeatIntensity * deltaTime;
      this.velocity.y += liftForce;
    }
    
    // Realistic soaring physics - gradual altitude loss without flapping
    if (this.birdState === BirdState.SOARING && !this.isFlapping) {
      this.soaringAltitudeLoss += deltaTime;
      // Add extra gravity during soaring to simulate energy loss
      const soaringDrag = -2.5 * deltaTime;
      this.velocity.y += soaringDrag;
      
      // If altitude drops too much, start flapping to regain height
      if (this.soaringAltitudeLoss > 3.0 && this.position.y < this.targetAltitude - 2) {
        this.isFlapping = true;
        this.wingBeatIntensity = 1.2; // Extra effort to regain altitude
        console.log(`🐦 [${this.config.species}] Starting to flap during soaring to regain altitude`);
      }
    }
    
    // Reset soaring loss when actively flapping
    if (this.isFlapping) {
      this.soaringAltitudeLoss = 0;
    }
    
    // Limit velocities to realistic ranges
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -8, 4);
    
    // Apply drag
    this.velocity.multiplyScalar(0.99);
  }

  protected scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 5000 + 2000); // 2-7 seconds
  }

  protected changeState(newState: BirdState): void {
    if (this.birdState === newState) return;
    
    console.log(`🐦 [${this.config.species}] State change: ${this.birdState} -> ${newState}`);
    this.birdState = newState;
    this.stateTimer = 0;
    this.scheduleNextStateChange();
  }

  protected startFlight(): void {
    this.flightMode = FlightMode.ASCENDING;
    this.targetAltitude = this.groundLevel + Math.random() * 15 + 8; // 8-23 units high (reduced)
    this.isFlapping = true;
    this.wingBeatIntensity = 1.3; // Higher intensity for takeoff
    this.generateFlightPath();
    this.changeState(BirdState.TAKING_OFF);
    console.log(`🐦 [${this.config.species}] Starting flight, target altitude: ${this.targetAltitude.toFixed(1)}`);
  }

  protected startLanding(): void {
    this.flightMode = FlightMode.DESCENDING;
    this.targetAltitude = this.groundLevel;
    this.changeState(BirdState.LANDING);
    this.isFlapping = false; // Stop flapping to begin descent
    this.wingBeatIntensity = 1.0; // Reset intensity
    this.bankingAngle = 0; // Reset banking for landing
    console.log(`🐦 [${this.config.species}] Starting landing from altitude: ${this.position.y.toFixed(1)}`);
  }

  protected generateFlightPath(): void {
    this.flightPath = [];
    this.currentPathIndex = 0;
    this.flightPathProgress = 0;
    
    const numPoints = 6 + Math.floor(Math.random() * 4); // 6-9 waypoints
    const baseRadius = this.config.territoryRadius * 0.8;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.5 - 0.25; // Add randomness
      const radius = baseRadius + (Math.random() - 0.5) * baseRadius * 0.4; // Vary radius
      const altitude = this.targetAltitude + (Math.random() - 0.5) * 8; // Vary altitude by ±4 units
      
      const x = this.homePosition.x + Math.cos(angle) * radius;
      const z = this.homePosition.z + Math.sin(angle) * radius;
      const y = Math.max(this.groundLevel + 5, altitude); // Ensure minimum height
      
      this.flightPath.push(new THREE.Vector3(x, y, z));
    }
    
    // Close the path by connecting back to first point
    this.flightPath.push(this.flightPath[0].clone());
  }

  protected followFlightPath(deltaTime: number): void {
    if (this.flightPath.length === 0) return;
    
    const currentWaypoint = this.flightPath[this.currentPathIndex];
    if (!currentWaypoint) return;
    
    const distanceToWaypoint = this.position.distanceTo(currentWaypoint);
    
    // Move towards current waypoint with natural undulating motion
    const direction = currentWaypoint.clone().sub(this.position).normalize();
    const speed = this.config.flightSpeed;
    
    // Add undulating motion for realistic flight
    const undulationFreq = 0.3; // Slow undulation
    const undulationAmplitude = 1.5;
    const undulation = Math.sin(this.age * undulationFreq) * undulationAmplitude * deltaTime;
    direction.y += undulation;
    
    // Calculate banking angle based on turn direction
    const nextWaypoint = this.flightPath[this.currentPathIndex + 1] || this.flightPath[0];
    const futureDirection = nextWaypoint.clone().sub(currentWaypoint).normalize();
    const turnAngle = direction.clone().cross(futureDirection).y;
    this.bankingAngle = THREE.MathUtils.lerp(this.bankingAngle, turnAngle * 0.5, deltaTime * 2);
    
    // Apply movement
    this.velocity.x = direction.x * speed;
    this.velocity.z = direction.z * speed;
    
    // Make bird face its flight direction
    const targetRotationY = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotationY, deltaTime * 2);
    
    // Apply banking angle for realistic turns
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, this.bankingAngle, deltaTime * 3);
    
    // Adjust wing beat intensity based on altitude difference
    const altitudeDiff = currentWaypoint.y - this.position.y;
    if (altitudeDiff > 1) {
      this.wingBeatIntensity = 1.4; // Climbing
      this.isFlapping = true;
    } else if (altitudeDiff < -1) {
      this.wingBeatIntensity = 0.8; // Descending
      this.isFlapping = false; // Glide down
    } else {
      this.wingBeatIntensity = 1.0; // Level flight
      this.isFlapping = true;
    }
    
    // Move to next waypoint when close enough
    if (distanceToWaypoint < 3) {
      this.currentPathIndex = (this.currentPathIndex + 1) % this.flightPath.length;
      this.flightPathProgress = 0;
    }
  }

  public dispose(): void {
    if (this.bodyParts) {
      // Dispose all body part geometries and materials
      Object.values(this.bodyParts).forEach(part => {
        if (part instanceof THREE.Group) {
          part.traverse(child => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
        } else if (part instanceof THREE.Mesh) {
          part.geometry.dispose();
          if (Array.isArray(part.material)) {
            part.material.forEach(mat => mat.dispose());
          } else {
            part.material.dispose();
          }
        }
      });
    }
    
    console.log(`🐦 [${this.config.species}] Disposed bird entity`);
  }
}