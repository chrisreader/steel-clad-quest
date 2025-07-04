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
  protected wingBeatIntensity: number = 1.0;
  
  // Flight heading system (separated from visual banking)
  protected currentHeading: number = 0;
  protected targetHeading: number = 0;
  protected visualBankAngle: number = 0;
  
  // AI properties
  protected stateTimer: number = 0;
  protected nextStateChange: number = 0;
  protected homePosition: THREE.Vector3;
  protected targetPosition: THREE.Vector3;
  protected flightPath: THREE.Vector3[] = [];
  protected currentPathIndex: number = 0;
  protected flightPathProgress: number = 0;
  protected soaringAltitudeLoss: number = 0;

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
    
    this.groundLevel = this.detectGroundLevel(position);
    
    const feetToBodyDistance = 0.48;
    this.position.y = this.groundLevel + feetToBodyDistance;
    this.mesh.position.copy(this.position);
    
    this.createBirdBody();
    this.state = EntityLifecycleState.ACTIVE;
    this.scheduleNextStateChange();
    
    console.log(`🐦 [${this.config.species}] Spawned with feet at ground level ${this.groundLevel}, bird position: ${this.position.y}`);
  }

  protected detectGroundLevel(position: THREE.Vector3): number {
    return 0;
  }

  protected abstract createBirdBody(): void;
  protected abstract updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void;
  protected abstract updateAnimation(deltaTime: number): void;

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.state !== EntityLifecycleState.ACTIVE) return;

    this.age += deltaTime;
    this.distanceFromPlayer = this.position.distanceTo(playerPosition);
    
    this.updateBirdBehavior(deltaTime, playerPosition);
    this.updatePhysics(deltaTime);
    this.updateAnimation(deltaTime);
    this.mesh.position.copy(this.position);
    
    if (this.age >= this.maxAge || this.distanceFromPlayer > 200) {
      this.state = EntityLifecycleState.DESPAWNING;
    }
  }

  protected updatePhysics(deltaTime: number): void {
    if (this.flightMode === FlightMode.GROUNDED) {
      const feetToBodyDistance = 0.48;
      this.position.y = this.groundLevel + feetToBodyDistance;
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
      }
    } else {
      this.updateFlightPhysics(deltaTime);
    }
    
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    if (this.flightMode === FlightMode.GROUNDED) {
      const feetToBodyDistance = 0.48;
      this.position.y = this.groundLevel + feetToBodyDistance;
    }
  }

  protected updateFlightPhysics(deltaTime: number): void {
    const gravity = -9.8 * deltaTime;
    this.velocity.y += gravity;
    
    if (this.isFlapping) {
      const liftForce = 12 * this.wingBeatIntensity * deltaTime;
      this.velocity.y += liftForce;
    }
    
    if (this.birdState === BirdState.SOARING && !this.isFlapping) {
      this.soaringAltitudeLoss += deltaTime;
      const soaringDrag = -2.5 * deltaTime;
      this.velocity.y += soaringDrag;
      
      if (this.soaringAltitudeLoss > 3.0 && this.position.y < this.targetAltitude - 2) {
        this.isFlapping = true;
        this.wingBeatIntensity = 1.2;
        console.log(`🐦 [${this.config.species}] Starting to flap during soaring to regain altitude`);
      }
    }
    
    if (this.isFlapping) {
      this.soaringAltitudeLoss = 0;
    }
    
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -8, 4);
    this.velocity.multiplyScalar(0.99);
  }

  protected scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 5000 + 2000);
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
    this.targetAltitude = this.groundLevel + Math.random() * 20 + 15;
    this.isFlapping = true;
    this.wingBeatIntensity = 1.3;
    this.generateFlightPath();
    this.changeState(BirdState.TAKING_OFF);
    console.log(`🐦 [${this.config.species}] Starting flight, target altitude: ${this.targetAltitude.toFixed(1)}`);
  }

  protected startLanding(): void {
    this.flightMode = FlightMode.LANDING_APPROACH;
    this.targetAltitude = this.groundLevel;
    this.changeState(BirdState.LANDING);
    this.isFlapping = false;
    this.wingBeatIntensity = 1.0;
    this.visualBankAngle = 0;
    console.log(`🐦 [${this.config.species}] Starting landing approach from altitude: ${this.position.y.toFixed(1)}`);
  }

  protected generateFlightPath(): void {
    this.flightPath = [];
    this.currentPathIndex = 0;
    this.flightPathProgress = 0;
    
    const numPoints = 8 + Math.floor(Math.random() * 5);
    const baseRadius = this.config.territoryRadius * 1.2;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.8 - 0.4;
      const radius = baseRadius + (Math.random() - 0.5) * baseRadius * 0.6;
      const altitude = this.targetAltitude + (Math.random() - 0.5) * 12;
      
      const x = this.homePosition.x + Math.cos(angle) * radius;
      const z = this.homePosition.z + Math.sin(angle) * radius;
      const y = Math.max(this.groundLevel + 8, altitude);
      
      this.flightPath.push(new THREE.Vector3(x, y, z));
    }
    
    this.flightPath.push(this.flightPath[0].clone());
    console.log(`🐦 [${this.config.species}] Generated extended flight path with ${numPoints} waypoints`);
  }

  protected followFlightPath(deltaTime: number): void {
    if (this.flightPath.length === 0) return;
    
    const currentWaypoint = this.flightPath[this.currentPathIndex];
    if (!currentWaypoint) return;
    
    const distanceToWaypoint = this.position.distanceTo(currentWaypoint);
    
    if (distanceToWaypoint < 5) {
      this.currentPathIndex = (this.currentPathIndex + 1) % this.flightPath.length;
      console.log(`🐦 [${this.config.species}] Reached waypoint ${this.currentPathIndex}`);
      return;
    }
    
    // Calculate direction to target (including Y component for proper 3D flight)
    const toTarget = currentWaypoint.clone().sub(this.position).normalize();
    
    // Update heading based on horizontal movement only
    this.targetHeading = Math.atan2(toTarget.z, toTarget.x);
    
    let headingDiff = this.targetHeading - this.currentHeading;
    while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
    while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
    
    const maxTurnRate = 2.0 * deltaTime;
    const headingChange = THREE.MathUtils.clamp(headingDiff, -maxTurnRate, maxTurnRate);
    
    this.currentHeading += headingChange;
    
    // CRITICAL: Set mesh rotation to match flight direction
    this.mesh.rotation.y = this.currentHeading;
    
    // Set velocity to move bird forward in its facing direction
    const forwardDirection = new THREE.Vector3(
      Math.cos(this.currentHeading),
      0,
      Math.sin(this.currentHeading)
    );
    
    const speed = this.config.flightSpeed;
    this.velocity.x = forwardDirection.x * speed;
    this.velocity.z = forwardDirection.z * speed;
    
    // Handle altitude separately
    const altitudeDiff = currentWaypoint.y - this.position.y;
    if (Math.abs(altitudeDiff) > 1) {
      const climbRate = THREE.MathUtils.clamp(altitudeDiff * 0.3, -1.5, 1.5);
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, climbRate, deltaTime * 2);
      this.isFlapping = true;
      this.wingBeatIntensity = 1.1;
    } else {
      this.isFlapping = Math.abs(headingChange) > 0.05;
      this.wingBeatIntensity = 1.0;
    }
    
    // Calculate banking angle for visual effect only (don't apply to wings)
    this.visualBankAngle = THREE.MathUtils.lerp(
      this.visualBankAngle, 
      headingChange * 1.5, 
      deltaTime * 4
    );
    
    // Apply subtle body banking without affecting wing animations
    if (this.bodyParts?.body) {
      const clampedBanking = THREE.MathUtils.clamp(this.visualBankAngle, -0.2, 0.2);
      this.bodyParts.body.rotation.z = clampedBanking;
    }
    
    console.log(`🐦 [${this.config.species}] Flying: heading=${(this.currentHeading * 180/Math.PI).toFixed(1)}°, velocity=(${this.velocity.x.toFixed(1)}, ${this.velocity.z.toFixed(1)}) speed=${speed}`);
  }

  public dispose(): void {
    if (this.bodyParts) {
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