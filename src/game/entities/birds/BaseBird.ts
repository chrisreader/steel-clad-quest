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
  PREENING = 'preening',
  DEAD = 'dead'
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
  
  // Combat properties
  public health: number = 1;
  public maxHealth: number = 1;
  public isDead: boolean = false;
  public deathTime: number = 0;
  public hitBox: THREE.Mesh | null = null;
  public rotationSpeed: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  
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
    // Hitbox creation moved to after body creation in subclasses
    this.state = EntityLifecycleState.ACTIVE;
    this.scheduleNextStateChange();
    
    console.log(`🐦 [${this.config.species}] Spawned with feet at ground level ${this.groundLevel}, bird position: ${this.position.y}`);
  }

  protected detectGroundLevel(position: THREE.Vector3): number {
    return 0;
  }

  protected abstract createBirdBody(): void;
  protected abstract createHitBox(): void;
  protected abstract updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void;
  protected abstract updateAnimation(deltaTime: number): void;
  
  public takeDamage(damage: number): void {
    if (this.isDead) return;
    
    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }
  
  public die(): void {
    if (this.isDead) return;
    
    this.isDead = true;
    this.deathTime = Date.now();
    this.birdState = BirdState.DEAD;
    
    // Start death fall animation if bird was flying
    if (this.position.y > 1) {
      this.startDeathFall();
    } else {
      // Ground death - transform to corpse position immediately
      this.velocity.set(0, 0, 0);
      if (this.bodyParts) {
        this.bodyParts.body.rotation.z = Math.PI / 2; // Rotate 90 degrees to lie on side
        this.position.y = this.groundLevel + 0.1; // Place on ground
        this.mesh.position.copy(this.position);
      }
    }
    
    console.log(`🐦💀 [${this.config.species}] Died and ${this.position.y > 1 ? 'started falling' : 'became corpse'}`);
  }
  
  private startDeathFall(): void {
    // Create tumbling fall animation
    this.velocity.y = -2; // Start falling
    this.velocity.x += (Math.random() - 0.5) * 2; // Random horizontal drift
    this.velocity.z += (Math.random() - 0.5) * 2;
    
    // Add spinning motion for realistic death tumble
    this.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.3
    };
    
    console.log(`🐦🍂 [${this.config.species}] Started death fall animation from altitude ${this.position.y.toFixed(1)}`);
  }
  
  public getHitBox(): THREE.Mesh | null {
    // Ensure hitbox world matrix is updated before returning
    if (this.hitBox) {
      this.hitBox.updateMatrixWorld(true);
    }
    return this.hitBox;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.state !== EntityLifecycleState.ACTIVE) return;

    this.age += deltaTime;
    this.distanceFromPlayer = this.position.distanceTo(playerPosition);
    
    // Handle dead bird corpse timer
    if (this.isDead) {
      // Handle death fall animation
      if (this.position.y > 0.1) {
        this.velocity.y -= 9.8 * deltaTime; // Gravity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Apply death rotation for tumbling effect
        if (this.bodyParts) {
          this.bodyParts.body.rotation.x += this.rotationSpeed.x;
          this.bodyParts.body.rotation.y += this.rotationSpeed.y;
          this.bodyParts.body.rotation.z += this.rotationSpeed.z;
        }
        
        // Ensure bird lands on ground and becomes corpse
        if (this.position.y <= 0.1) {
          this.position.y = 0.1;
          this.velocity.set(0, 0, 0);
          this.rotationSpeed = { x: 0, y: 0, z: 0 };
          
          // Final corpse position
          if (this.bodyParts) {
            this.bodyParts.body.rotation.z = Math.PI / 2; // Lie on side
          }
          
          console.log(`🐦🪦 [${this.config.species}] Landed and became corpse`);
        }
        
        this.mesh.position.copy(this.position);
      }
      
      // Cleanup timer
      if (Date.now() - this.deathTime > 30000) { // 30 seconds
        this.state = EntityLifecycleState.DESPAWNING;
      }
      return; // Dead birds don't update behavior or physics
    }
    
    // PERFORMANCE: Skip expensive updates for distant birds
    const isNearPlayer = this.distanceFromPlayer < 50;
    const updateFrequency = isNearPlayer ? 1 : 3; // Update distant birds every 3 frames
    
    if (Math.floor(this.age * 60) % updateFrequency === 0) {
      this.updateBirdBehavior(deltaTime, playerPosition);
      this.updatePhysics(deltaTime);
      
      // PERFORMANCE: Only update animation for nearby birds
      if (isNearPlayer) {
        this.updateAnimation(deltaTime);
      }
    }
    
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
    // Base gravity effect
    const gravity = -9.8 * deltaTime;
    this.velocity.y += gravity;
    
    // Lift generation from wing flapping
    if (this.isFlapping) {
      const liftForce = 12 * this.wingBeatIntensity * deltaTime;
      this.velocity.y += liftForce;
    }
    
    // Enhanced soaring physics - ONLY apply during SOARING state
    if (this.birdState === BirdState.SOARING && this.flightMode !== FlightMode.GROUNDED) {
      this.soaringAltitudeLoss += deltaTime;
      
      // Realistic soaring: minimal energy loss with occasional thermals
      const thermalChance = Math.random();
      if (thermalChance < 0.01) { // 1% chance per frame to hit thermal
        // Thermal updraft - slight altitude gain
        this.velocity.y += 2.0 * deltaTime;
        this.soaringAltitudeLoss = Math.max(0, this.soaringAltitudeLoss - 1.0);
        console.log(`🐦 [${this.config.species}] Caught thermal updraft!`);
      } else {
        // Natural soaring energy loss - very gradual
        const soaringDrag = -1.5 * deltaTime;
        this.velocity.y += soaringDrag;
      }
      
      // Start flapping if losing too much altitude
      if (this.soaringAltitudeLoss > 4.0 && this.position.y < this.targetAltitude - 3) {
        this.isFlapping = true;
        this.wingBeatIntensity = 1.1;
        console.log(`🐦 [${this.config.species}] Starting to flap to regain altitude from soaring`);
      }
    }
    
    // Reset soaring timer when actively flapping
    if (this.isFlapping) {
      this.soaringAltitudeLoss = 0;
    }
    
    // Reasonable velocity limits for bird flight
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -6, 4);
    
    // Air resistance - more realistic for bird flight
    this.velocity.multiplyScalar(0.985);
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
    
    // Calculate direction to target
    const toTarget = currentWaypoint.clone().sub(this.position);
    const horizontalTarget = new THREE.Vector3(toTarget.x, 0, toTarget.z).normalize();
    
    // Calculate desired heading (bird should face where it's going)
    this.targetHeading = Math.atan2(horizontalTarget.z, horizontalTarget.x);
    
    // Smooth heading interpolation
    let headingDiff = this.targetHeading - this.currentHeading;
    
    // Handle angle wrapping
    if (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
    if (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
    
    const maxTurnRate = 1.8 * deltaTime;
    const actualTurn = THREE.MathUtils.clamp(headingDiff, -maxTurnRate, maxTurnRate);
    this.currentHeading += actualTurn;
    
    // FIXED: Always orient mesh to face flight direction (bird model faces forward along +X axis)
    this.mesh.rotation.y = this.currentHeading;
    
    // FIXED: Always move in the direction the bird is visually facing
    const moveDirection = new THREE.Vector3(
      Math.cos(this.currentHeading),
      0,
      Math.sin(this.currentHeading)
    );
    
    // Apply consistent forward velocity
    const speed = this.config.flightSpeed;
    this.velocity.x = moveDirection.x * speed;
    this.velocity.z = moveDirection.z * speed;
    
    // Handle altitude changes
    const altitudeDiff = currentWaypoint.y - this.position.y;
    if (Math.abs(altitudeDiff) > 1.5) {
      const climbRate = THREE.MathUtils.clamp(altitudeDiff * 0.3, -1.2, 1.2);
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, climbRate, deltaTime * 2);
      
      // Flap more when climbing or descending significantly
      this.isFlapping = true;
      this.wingBeatIntensity = 1.0 + Math.abs(climbRate) * 0.3;
    } else {
      // Maintain current altitude with minimal adjustments
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, 0, deltaTime * 3);
      
      // Only flap when turning or need speed
      this.isFlapping = Math.abs(actualTurn) > 0.02 || this.birdState === BirdState.FLYING;
      this.wingBeatIntensity = this.birdState === BirdState.SOARING ? 0.3 : 1.0;
    }
    
    // Visual banking effect (body only, not wings)
    const targetBank = -actualTurn * 2.0; // Banking into turns
    this.visualBankAngle = THREE.MathUtils.lerp(this.visualBankAngle, targetBank, deltaTime * 4);
    
    if (this.bodyParts?.body) {
      const clampedBank = THREE.MathUtils.clamp(this.visualBankAngle, -0.3, 0.3);
      this.bodyParts.body.rotation.z = clampedBank;
    }
    
    console.log(`🐦 [${this.config.species}] Forward flight: heading=${(this.currentHeading * 180/Math.PI).toFixed(1)}°, mesh rot=${(this.mesh.rotation.y * 180/Math.PI).toFixed(1)}°, vel=(${this.velocity.x.toFixed(2)}, ${this.velocity.z.toFixed(2)}), dist=${distanceToWaypoint.toFixed(1)}m`);
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