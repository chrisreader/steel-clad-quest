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
  
  // Enhanced animation properties
  protected walkCycle: number = 0;
  protected flapCycle: number = 0;
  protected headBobCycle: number = 0;
  protected isFlapping: boolean = false;
  protected targetAltitude: number = 0;
  protected groundLevel: number = 0;
  protected wingsExtended: boolean = false;
  
  // Enhanced AI properties
  protected stateTimer: number = 0;
  protected nextStateChange: number = 0;
  protected homePosition: THREE.Vector3;
  protected targetPosition: THREE.Vector3;
  protected flightPath: THREE.Vector3[] = [];
  protected currentPathIndex: number = 0;
  protected stateStartTime: number = 0;
  protected lastValidPosition: THREE.Vector3;

  // Physics constants
  protected readonly GRAVITY = -9.81;
  protected readonly LIFT_FORCE = 12.0;
  protected readonly DRAG_COEFFICIENT = 0.95;
  protected readonly GROUND_BUFFER = 0.05;

  constructor(id: string, config: BirdConfig) {
    this.id = id;
    this.config = config;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3();
    this.homePosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.lastValidPosition = new THREE.Vector3();
  }

  public initialize(position: THREE.Vector3): void {
    this.position.copy(position);
    this.homePosition.copy(position);
    this.targetPosition.copy(position);
    this.lastValidPosition.copy(position);
    this.groundLevel = position.y;
    this.mesh.position.copy(position);
    
    this.createBirdBody();
    this.state = EntityLifecycleState.ACTIVE;
    this.scheduleNextStateChange();
    
    console.log(`🐦 [${this.config.species}] Spawned at position:`, position);
  }

  protected abstract createBirdBody(): void;
  protected abstract updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void;
  protected abstract updateAnimation(deltaTime: number): void;

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.state !== EntityLifecycleState.ACTIVE) return;

    this.age += deltaTime;
    this.distanceFromPlayer = this.position.distanceTo(playerPosition);
    
    // Store last valid position before any updates
    this.lastValidPosition.copy(this.position);
    
    // Update AI behavior first
    this.updateBirdBehavior(deltaTime, playerPosition);
    
    // Update physics with proper validation
    this.updatePhysics(deltaTime);
    
    // Validate position and recover if needed
    this.validateAndRecoverPosition();
    
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
    // Ground check BEFORE applying velocity
    if (this.position.y <= this.groundLevel + this.GROUND_BUFFER && this.flightMode !== FlightMode.GROUNDED) {
      console.log(`🐦 [${this.config.species}] Landing detected - Y: ${this.position.y.toFixed(2)}, Ground: ${this.groundLevel}`);
      this.forceLanding();
      return;
    }

    // Apply velocity based on flight mode
    if (this.flightMode === FlightMode.GROUNDED) {
      this.updateGroundPhysics();
    } else {
      this.updateFlightPhysics(deltaTime);
    }

    // Apply velocity to position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Final ground enforcement
    if (this.flightMode === FlightMode.GROUNDED) {
      this.position.y = this.groundLevel;
    }
  }

  protected updateGroundPhysics(): void {
    // On ground - clear all velocity and ensure position
    this.velocity.set(0, 0, 0);
    this.position.y = this.groundLevel;
    this.wingsExtended = false;
    this.isFlapping = false;
  }

  protected updateFlightPhysics(deltaTime: number): void {
    // Apply gravity
    this.velocity.y += this.GRAVITY * deltaTime * 0.1; // Reduced gravity for bird flight
    
    // Apply lift when flapping
    if (this.isFlapping) {
      this.velocity.y += this.LIFT_FORCE * deltaTime;
    }
    
    // Apply drag
    this.velocity.multiplyScalar(this.DRAG_COEFFICIENT);
    
    // Altitude control for different flight modes
    const altitudeDiff = this.targetAltitude - this.position.y;
    
    switch (this.flightMode) {
      case FlightMode.ASCENDING:
        if (altitudeDiff > 1.0) {
          this.velocity.y = Math.max(this.velocity.y, 2.0);
          this.isFlapping = true;
        } else {
          this.flightMode = FlightMode.CRUISING;
          this.changeState(BirdState.SOARING);
        }
        break;
        
      case FlightMode.CRUISING:
        // Maintain altitude with occasional flaps
        if (Math.abs(altitudeDiff) > 2.0) {
          this.isFlapping = Math.random() < 0.3;
        } else {
          this.isFlapping = Math.random() < 0.1; // Occasional maintenance flaps
        }
        break;
        
      case FlightMode.DESCENDING:
        this.velocity.y = Math.min(this.velocity.y, -1.5);
        this.isFlapping = Math.random() < 0.2; // Light flapping to control descent
        break;
        
      case FlightMode.LANDING_APPROACH:
        this.velocity.y = -2.0; // Controlled descent
        this.isFlapping = true; // Active flapping for landing control
        break;
    }
    
    this.wingsExtended = true;
  }

  protected forceLanding(): void {
    this.flightMode = FlightMode.GROUNDED;
    this.position.y = this.groundLevel;
    this.velocity.set(0, 0, 0);
    this.mesh.rotation.set(0, this.mesh.rotation.y, 0); // Reset pitch and roll
    this.changeState(BirdState.IDLE);
    this.isFlapping = false;
    this.wingsExtended = false;
    
    console.log(`🐦 [${this.config.species}] Force landed at ground level`);
  }

  protected validateAndRecoverPosition(): void {
    // Check for impossible positions
    if (this.position.y < this.groundLevel - 1.0) {
      console.log(`🐦 [${this.config.species}] Position recovery - below ground`);
      this.position.copy(this.lastValidPosition);
      this.forceLanding();
    }
    
    // Check for NaN or infinite values
    if (!this.position.x || !this.position.y || !this.position.z) {
      console.log(`🐦 [${this.config.species}] Position recovery - invalid coordinates`);
      this.position.copy(this.lastValidPosition);
      this.velocity.set(0, 0, 0);
    }
  }

  protected scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 5000 + 2000); // 2-7 seconds
    this.stateStartTime = Date.now();
  }

  protected changeState(newState: BirdState): void {
    if (this.birdState === newState) return;
    
    const oldState = this.birdState;
    console.log(`🐦 [${this.config.species}] State: ${oldState} -> ${newState}, Flight: ${this.flightMode}`);
    
    this.birdState = newState;
    this.stateTimer = 0;
    this.stateStartTime = Date.now();
    this.scheduleNextStateChange();
    
    // State-specific initialization
    this.initializeStateSpecificBehavior(newState);
  }

  protected initializeStateSpecificBehavior(state: BirdState): void {
    switch (state) {
      case BirdState.TAKING_OFF:
        this.startFlight();
        break;
      case BirdState.LANDING:
        this.startLanding();
        break;
      case BirdState.IDLE:
      case BirdState.WALKING:
      case BirdState.FORAGING:
        if (this.flightMode !== FlightMode.GROUNDED) {
          this.forceLanding();
        }
        break;
    }
  }

  protected startFlight(): void {
    if (this.flightMode !== FlightMode.GROUNDED) return;
    
    this.flightMode = FlightMode.ASCENDING;
    this.targetAltitude = this.groundLevel + Math.random() * 15 + 8; // 8-23 units high
    this.isFlapping = true;
    this.wingsExtended = true;
    this.velocity.y = 1.0; // Initial upward velocity
    
    console.log(`🐦 [${this.config.species}] Starting flight to altitude ${this.targetAltitude.toFixed(1)}`);
  }

  protected startLanding(): void {
    if (this.flightMode === FlightMode.GROUNDED) return;
    
    this.flightMode = FlightMode.LANDING_APPROACH;
    this.targetAltitude = this.groundLevel;
    this.isFlapping = true; // Active landing control
    
    console.log(`🐦 [${this.config.species}] Starting landing sequence`);
  }

  protected isStateTimedOut(): boolean {
    const stateAge = Date.now() - this.stateStartTime;
    
    // Different timeouts for different states
    switch (this.birdState) {
      case BirdState.TAKING_OFF:
        return stateAge > 3000; // 3 seconds max for takeoff
      case BirdState.LANDING:
        return stateAge > 4000; // 4 seconds max for landing
      default:
        return stateAge > 8000; // 8 seconds max for other states
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