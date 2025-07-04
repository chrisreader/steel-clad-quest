import * as THREE from 'three';
import { SpawnableEntity, EntityLifecycleState } from '../../../types/SpawnableEntity';
import { BirdFlightSystem } from './core/BirdFlightSystem';
import { BirdPhysicsSystem } from './core/BirdPhysicsSystem';
import { BirdStateManager } from './core/BirdStateManager';

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
  public bodyParts: BirdBodyParts | null = null;
  public config: BirdConfig;
  
  // Animation properties
  protected walkCycle: number = 0;
  protected flapCycle: number = 0;
  protected headBobCycle: number = 0;
  protected isFlapping: boolean = false;
  protected wingBeatIntensity: number = 1.0;
  protected groundLevel: number = 0;
  
  // AI properties
  protected homePosition: THREE.Vector3;
  protected targetPosition: THREE.Vector3;

  // Systems
  protected flightSystem: BirdFlightSystem;
  protected physicsSystem: BirdPhysicsSystem;
  protected stateManager: BirdStateManager;

  constructor(id: string, config: BirdConfig) {
    this.id = id;
    this.config = config;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3();
    this.homePosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    
    // Initialize systems
    this.flightSystem = new BirdFlightSystem(config, this.homePosition);
    this.physicsSystem = new BirdPhysicsSystem();
    this.stateManager = new BirdStateManager(config);
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
    
    // Initialize systems
    this.flightSystem.setGroundLevel(this.groundLevel);
    
    this.createBirdBody();
    this.state = EntityLifecycleState.ACTIVE;
    
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
    
    // Update AI behavior through state manager
    const { shouldStartFlight, shouldStartLanding } = this.stateManager.updateBehavior(
      deltaTime, 
      playerPosition, 
      this.position, 
      this.distanceFromPlayer
    );

    if (shouldStartFlight) {
      this.startFlight();
    } else if (shouldStartLanding) {
      this.startLanding();
    }
    
    // Update bird-specific behavior
    this.updateBirdBehavior(deltaTime, playerPosition);
    
    // Update physics through physics system
    this.physicsSystem.updatePhysics(
      deltaTime,
      this.position,
      this.velocity,
      this.stateManager.getFlightMode(),
      this.groundLevel,
      this.isFlapping,
      this.wingBeatIntensity,
      this.stateManager.getCurrentState(),
      0 // targetAltitude - will be managed by flight system
    );
    
    // Update animations
    this.updateAnimation(deltaTime);
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Check for lifecycle changes
    if (this.age >= this.maxAge || this.distanceFromPlayer > 200) {
      this.state = EntityLifecycleState.DESPAWNING;
    }
  }

  protected startFlight(): void {
    this.stateManager.setFlightMode(FlightMode.ASCENDING);
    const targetAltitude = this.groundLevel + Math.random() * 20 + 15; // 15-35 units high
    this.flightSystem.setTargetAltitude(targetAltitude);
    this.isFlapping = true;
    this.wingBeatIntensity = 1.3; // Higher intensity for takeoff
    this.flightSystem.generateFlightPath();
    this.stateManager.startFlight();
    console.log(`🐦 [${this.config.species}] Starting flight, target altitude: ${targetAltitude.toFixed(1)}`);
  }

  protected startLanding(): void {
    this.stateManager.startLanding();
    this.flightSystem.setTargetAltitude(this.groundLevel);
    this.isFlapping = false; // Stop flapping to begin glide approach
    this.wingBeatIntensity = 1.0; // Reset intensity
    console.log(`🐦 [${this.config.species}] Starting landing approach from altitude: ${this.position.y.toFixed(1)}`);
  }

  protected followFlightPath(deltaTime: number): void {
    const flightResult = this.flightSystem.followFlightPath(
      deltaTime,
      this.position,
      this.velocity,
      this.mesh,
      this.bodyParts
    );
    
    this.isFlapping = flightResult.isFlapping;
    this.wingBeatIntensity = flightResult.wingBeatIntensity;

    // Handle soaring altitude loss
    if (this.stateManager.getCurrentState() === BirdState.SOARING && 
        this.physicsSystem.getSoaringAltitudeLoss() > 3.0) {
      this.isFlapping = true;
      this.wingBeatIntensity = 1.2;
      this.physicsSystem.resetSoaringAltitudeLoss();
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

  // Getters for accessing state manager data
  public getBirdState(): BirdState {
    return this.stateManager.getCurrentState();
  }

  public getFlightMode(): FlightMode {
    return this.stateManager.getFlightMode();
  }
}