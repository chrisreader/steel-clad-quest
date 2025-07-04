import * as THREE from 'three';
import { SpawnableEntity, EntityLifecycleState } from '../../../types/SpawnableEntity';

export enum DragonState {
  IDLE = 'idle',
  PROWLING = 'prowling',
  FLYING = 'flying',
  SOARING = 'soaring',
  LANDING = 'landing',
  TAKING_OFF = 'taking_off',
  ROARING = 'roaring',
  BREATHING_FIRE = 'breathing_fire',
  ALERT = 'alert'
}

export enum DragonFlightMode {
  GROUNDED = 'grounded',
  ASCENDING = 'ascending',
  CRUISING = 'cruising',
  DESCENDING = 'descending',
  LANDING_APPROACH = 'landing_approach'
}

export interface DragonBodyParts {
  body: THREE.Group;
  head: THREE.Group;
  neck: THREE.Group;
  tail: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  horns: THREE.Group;
  spikes: THREE.Group;
  jaw: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
}

export interface DragonWingMembranes {
  upperMembrane: THREE.Mesh;
  lowerMembrane: THREE.Mesh;
  fingerBones: THREE.Mesh[];
  wingArm: THREE.Mesh;
  wingForearm: THREE.Mesh;
}

export interface DragonConfig {
  species: string;
  size: number;
  wingspan: number;
  bodyLength: number;
  neckLength: number;
  tailLength: number;
  legLength: number;
  walkSpeed: number;
  flightSpeed: number;
  flightAltitude: { min: number; max: number };
  territoryRadius: number;
  alertDistance: number;
  fireBreathRange: number;
  roarRadius: number;
}

export abstract class BaseDragon implements SpawnableEntity {
  public id: string;
  public mesh: THREE.Object3D;
  public position: THREE.Vector3;
  public age: number = 0;
  public maxAge: number = 600; // 10 minutes - dragons live longer
  public state: EntityLifecycleState = EntityLifecycleState.SPAWNING;
  public distanceFromPlayer: number = 0;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public opacity: number = 1;

  // Dragon-specific properties
  public dragonState: DragonState = DragonState.IDLE;
  public flightMode: DragonFlightMode = DragonFlightMode.GROUNDED;
  public bodyParts: DragonBodyParts | null = null;
  public config: DragonConfig;
  
  // Animation properties
  protected walkCycle: number = 0;
  protected flapCycle: number = 0;
  protected neckMovement: number = 0;
  protected tailSway: number = 0;
  protected isFlapping: boolean = false;
  protected targetAltitude: number = 0;
  protected groundLevel: number = 0;
  protected wingBeatIntensity: number = 1.0;
  
  // Flight heading system
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
  protected soaringAltitudeLoss: number = 0;
  
  // Dragon-specific properties
  protected roarCooldown: number = 0;
  protected fireBreathCooldown: number = 0;
  protected intimidationRadius: number = 50;

  constructor(id: string, config: DragonConfig) {
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
    
    // Dragons are much larger, so body is higher off ground
    const bodyToGroundDistance = 4.8; // 10x larger than bird (0.48)
    this.position.y = this.groundLevel + bodyToGroundDistance;
    this.mesh.position.copy(this.position);
    
    this.createDragonBody();
    this.state = EntityLifecycleState.ACTIVE;
    this.scheduleNextStateChange();
    
    console.log(`🐉 [${this.config.species}] Spawned at ground level ${this.groundLevel}, dragon position: ${this.position.y}`);
  }

  protected detectGroundLevel(position: THREE.Vector3): number {
    return 0;
  }

  protected abstract createDragonBody(): void;
  protected abstract updateDragonBehavior(deltaTime: number, playerPosition: THREE.Vector3): void;
  protected abstract updateAnimation(deltaTime: number): void;

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.state !== EntityLifecycleState.ACTIVE) return;

    this.age += deltaTime;
    this.distanceFromPlayer = this.position.distanceTo(playerPosition);
    
    this.updateDragonBehavior(deltaTime, playerPosition);
    this.updatePhysics(deltaTime);
    this.updateAnimation(deltaTime);
    this.mesh.position.copy(this.position);
    
    // Dragons have larger despawn distance
    if (this.age >= this.maxAge || this.distanceFromPlayer > 500) {
      this.state = EntityLifecycleState.DESPAWNING;
    }
  }

  protected updatePhysics(deltaTime: number): void {
    if (this.flightMode === DragonFlightMode.GROUNDED) {
      const bodyToGroundDistance = 4.8; // 10x larger than bird
      this.position.y = this.groundLevel + bodyToGroundDistance;
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
      }
    } else {
      this.updateFlightPhysics(deltaTime);
    }
    
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    if (this.flightMode === DragonFlightMode.GROUNDED) {
      const bodyToGroundDistance = 4.8;
      this.position.y = this.groundLevel + bodyToGroundDistance;
    }
  }

  protected updateFlightPhysics(deltaTime: number): void {
    // Dragon-scaled gravity effect
    const gravity = -9.8 * deltaTime;
    this.velocity.y += gravity;
    
    // Lift generation from massive wing flapping
    if (this.isFlapping) {
      const liftForce = 120 * this.wingBeatIntensity * deltaTime; // 10x stronger than bird
      this.velocity.y += liftForce;
    }
    
    // Enhanced soaring physics for dragons
    if (this.dragonState === DragonState.SOARING && this.flightMode !== DragonFlightMode.GROUNDED) {
      this.soaringAltitudeLoss += deltaTime;
      
      // Dragons are better at soaring due to size
      const thermalChance = Math.random();
      if (thermalChance < 0.02) { // 2% chance per frame to hit thermal (better than birds)
        this.velocity.y += 4.0 * deltaTime; // Stronger thermals for dragons
        this.soaringAltitudeLoss = Math.max(0, this.soaringAltitudeLoss - 2.0);
        console.log(`🐉 [${this.config.species}] Caught powerful thermal updraft!`);
      } else {
        // Natural soaring energy loss - very gradual for dragons
        const soaringDrag = -0.5 * deltaTime; // Less drag due to size
        this.velocity.y += soaringDrag;
      }
      
      // Start flapping if losing too much altitude
      if (this.soaringAltitudeLoss > 8.0 && this.position.y < this.targetAltitude - 6) {
        this.isFlapping = true;
        this.wingBeatIntensity = 1.2;
        console.log(`🐉 [${this.config.species}] Starting to flap to regain altitude from soaring`);
      }
    }
    
    // Reset soaring timer when actively flapping
    if (this.isFlapping) {
      this.soaringAltitudeLoss = 0;
    }
    
    // Reasonable velocity limits for dragon flight
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -15, 10); // Faster than birds
    
    // Air resistance for dragons
    this.velocity.multiplyScalar(0.99); // Less air resistance due to size
  }

  protected scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 10000 + 5000); // Longer state changes
  }

  protected changeState(newState: DragonState): void {
    if (this.dragonState === newState) return;
    
    console.log(`🐉 [${this.config.species}] State change: ${this.dragonState} -> ${newState}`);
    this.dragonState = newState;
    this.stateTimer = 0;
    this.scheduleNextStateChange();
  }

  protected startFlight(): void {
    this.flightMode = DragonFlightMode.ASCENDING;
    this.targetAltitude = this.groundLevel + Math.random() * 50 + 30; // Higher altitude for dragons
    this.isFlapping = true;
    this.wingBeatIntensity = 1.5;
    this.generateFlightPath();
    this.changeState(DragonState.TAKING_OFF);
    console.log(`🐉 [${this.config.species}] Starting flight, target altitude: ${this.targetAltitude.toFixed(1)}`);
  }

  protected startLanding(): void {
    this.flightMode = DragonFlightMode.LANDING_APPROACH;
    this.targetAltitude = this.groundLevel;
    this.changeState(DragonState.LANDING);
    this.isFlapping = false;
    this.wingBeatIntensity = 1.0;
    this.visualBankAngle = 0;
    console.log(`🐉 [${this.config.species}] Starting landing approach from altitude: ${this.position.y.toFixed(1)}`);
  }

  protected generateFlightPath(): void {
    this.flightPath = [];
    this.currentPathIndex = 0;
    
    const numPoints = 6 + Math.floor(Math.random() * 4);
    const baseRadius = this.config.territoryRadius * 1.5; // Larger territory for dragons
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.6 - 0.3;
      const radius = baseRadius + (Math.random() - 0.5) * baseRadius * 0.8;
      const altitude = this.targetAltitude + (Math.random() - 0.5) * 25;
      
      const x = this.homePosition.x + Math.cos(angle) * radius;
      const z = this.homePosition.z + Math.sin(angle) * radius;
      const y = Math.max(this.groundLevel + 20, altitude);
      
      this.flightPath.push(new THREE.Vector3(x, y, z));
    }
    
    this.flightPath.push(this.flightPath[0].clone());
    console.log(`🐉 [${this.config.species}] Generated dragon flight path with ${numPoints} waypoints`);
  }

  protected followFlightPath(deltaTime: number): void {
    if (this.flightPath.length === 0) return;
    
    const currentWaypoint = this.flightPath[this.currentPathIndex];
    if (!currentWaypoint) return;
    
    const distanceToWaypoint = this.position.distanceTo(currentWaypoint);
    
    if (distanceToWaypoint < 15) { // Larger waypoint radius for dragons
      this.currentPathIndex = (this.currentPathIndex + 1) % this.flightPath.length;
      console.log(`🐉 [${this.config.species}] Reached waypoint ${this.currentPathIndex}`);
      return;
    }
    
    // Calculate direction to target
    const toTarget = currentWaypoint.clone().sub(this.position);
    const horizontalTarget = new THREE.Vector3(toTarget.x, 0, toTarget.z).normalize();
    
    // Calculate desired heading
    this.targetHeading = Math.atan2(horizontalTarget.z, horizontalTarget.x);
    
    // Smooth heading interpolation (slower for dragons)
    let headingDiff = this.targetHeading - this.currentHeading;
    
    // Handle angle wrapping
    if (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
    if (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
    
    const maxTurnRate = 0.8 * deltaTime; // Slower turning for dragons
    const actualTurn = THREE.MathUtils.clamp(headingDiff, -maxTurnRate, maxTurnRate);
    this.currentHeading += actualTurn;
    
    // Orient mesh to face flight direction
    this.mesh.rotation.y = this.currentHeading;
    
    // Move in the direction the dragon is facing
    const moveDirection = new THREE.Vector3(
      Math.cos(this.currentHeading),
      0,
      Math.sin(this.currentHeading)
    );
    
    // Apply consistent forward velocity (slower than birds but more powerful)
    const speed = this.config.flightSpeed;
    this.velocity.x = moveDirection.x * speed;
    this.velocity.z = moveDirection.z * speed;
    
    // Handle altitude changes
    const altitudeDiff = currentWaypoint.y - this.position.y;
    if (Math.abs(altitudeDiff) > 3.0) {
      const climbRate = THREE.MathUtils.clamp(altitudeDiff * 0.2, -2.5, 2.5);
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, climbRate, deltaTime * 1.5);
      
      // Flap more when climbing or descending significantly
      this.isFlapping = true;
      this.wingBeatIntensity = 1.0 + Math.abs(climbRate) * 0.4;
    } else {
      // Maintain current altitude
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, 0, deltaTime * 2);
      
      // Dragons can soar more effectively
      this.isFlapping = Math.abs(actualTurn) > 0.01 || this.dragonState === DragonState.FLYING;
      this.wingBeatIntensity = this.dragonState === DragonState.SOARING ? 0.2 : 1.0;
    }
    
    // Visual banking effect
    const targetBank = -actualTurn * 1.5; // Less banking than birds
    this.visualBankAngle = THREE.MathUtils.lerp(this.visualBankAngle, targetBank, deltaTime * 3);
    
    if (this.bodyParts?.body) {
      const clampedBank = THREE.MathUtils.clamp(this.visualBankAngle, -0.2, 0.2);
      this.bodyParts.body.rotation.z = clampedBank;
    }
    
    console.log(`🐉 [${this.config.species}] Dragon flight: heading=${(this.currentHeading * 180/Math.PI).toFixed(1)}°, dist=${distanceToWaypoint.toFixed(1)}m`);
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
    
    console.log(`🐉 [${this.config.species}] Disposed dragon entity`);
  }
}