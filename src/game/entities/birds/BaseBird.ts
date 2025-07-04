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
  
  // AI properties
  protected stateTimer: number = 0;
  protected nextStateChange: number = 0;
  protected homePosition: THREE.Vector3;
  protected targetPosition: THREE.Vector3;
  protected flightPath: THREE.Vector3[] = [];
  protected currentPathIndex: number = 0;

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
      // Ground physics - ensure bird stays on ground
      this.position.y = this.groundLevel;
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
    
    // Force ground contact when grounded (safety check)
    if (this.flightMode === FlightMode.GROUNDED) {
      this.position.y = this.groundLevel;
    }
  }

  protected updateFlightPhysics(deltaTime: number): void {
    const altitudeDiff = this.targetAltitude - this.position.y;
    
    // Only apply altitude changes for significant differences
    if (Math.abs(altitudeDiff) > 1.0) {
      // Much more subtle altitude changes
      let ascendRate: number;
      if (this.isFlapping) {
        ascendRate = 1.0; // Gentle climbing when flapping
      } else {
        // Soaring: gentle descent due to gravity
        ascendRate = this.birdState === BirdState.SOARING ? -0.3 : 0.2;
      }
      
      const altitudeChange = Math.sign(altitudeDiff) * ascendRate * deltaTime;
      this.position.y += altitudeChange;
    }
    
    // Apply realistic drag
    this.velocity.multiplyScalar(0.98);
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
    this.targetAltitude = this.groundLevel + Math.random() * 20 + 10; // 10-30 units high
    this.isFlapping = true;
    this.changeState(BirdState.TAKING_OFF);
  }

  protected startLanding(): void {
    this.flightMode = FlightMode.DESCENDING;
    this.targetAltitude = this.groundLevel;
    this.changeState(BirdState.LANDING);
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