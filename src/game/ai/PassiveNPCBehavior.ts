
import * as THREE from 'three';

export enum PassiveBehaviorState {
  PATROLLING = 'patrolling',
  INVESTIGATING = 'investigating',
  RESTING = 'resting',
  FORAGING = 'foraging',
  SOCIALIZING = 'socializing'
}

export interface Waypoint {
  position: THREE.Vector3;
  type: 'patrol' | 'interest' | 'rest' | 'forage';
  priority: number;
  radius: number; // How close to get before considering "reached"
}

export interface NPCPersonality {
  patrolPreference: number; // 0-1, higher = more patrolling
  investigationCuriosity: number; // 0-1, higher = more investigating
  restFrequency: number; // 0-1, higher = more resting
  socialTendency: number; // 0-1, higher = more social behavior
  movementSpeed: number; // Speed multiplier for this personality
}

export class PassiveNPCBehavior {
  private currentState: PassiveBehaviorState = PassiveBehaviorState.PATROLLING;
  private currentWaypoint: Waypoint | null = null;
  private waypoints: Waypoint[] = [];
  private personality: NPCPersonality;
  private stateTimer: number = 0;
  private stateDuration: number = 0;
  private position: THREE.Vector3;
  private spawnPosition: THREE.Vector3;
  private maxRoamDistance: number;
  private safeZoneBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  private lookDirection: THREE.Vector3 = new THREE.Vector3();
  private headRotation: number = 0;
  private targetHeadRotation: number = 0;

  constructor(
    spawnPosition: THREE.Vector3,
    maxRoamDistance: number = 25,
    safeZoneCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    safeZoneRadius: number = 8
  ) {
    this.position = spawnPosition.clone();
    this.spawnPosition = spawnPosition.clone();
    this.maxRoamDistance = maxRoamDistance;
    
    // Convert circular safe zone to rectangular bounds for exact tavern match
    this.safeZoneBounds = {
      minX: -6,
      maxX: 6,
      minZ: -6,
      maxZ: 6
    };
    
    // Generate random personality
    this.personality = this.generatePersonality();
    
    // Generate initial waypoints
    this.generateWaypoints();
    
    // Start with initial behavior
    this.selectNewBehavior();
    
    console.log(`🤖 [PassiveNPCBehavior] Created with personality:`, this.personality);
  }

  private generatePersonality(): NPCPersonality {
    return {
      patrolPreference: 0.3 + Math.random() * 0.4, // 0.3-0.7
      investigationCuriosity: 0.2 + Math.random() * 0.6, // 0.2-0.8
      restFrequency: 0.1 + Math.random() * 0.3, // 0.1-0.4
      socialTendency: 0.2 + Math.random() * 0.5, // 0.2-0.7
      movementSpeed: 0.6 + Math.random() * 0.8 // 0.6-1.4
    };
  }

  private generateWaypoints(): void {
    this.waypoints = [];
    const numWaypoints = 8 + Math.floor(Math.random() * 8); // 8-15 waypoints

    for (let i = 0; i < numWaypoints; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 5 + Math.random() * (this.maxRoamDistance - 5);
      
      const position = new THREE.Vector3(
        this.spawnPosition.x + Math.cos(angle) * distance,
        0,
        this.spawnPosition.z + Math.sin(angle) * distance
      );

      // Avoid safe zone using rectangular bounds
      const isInSafeZone = position.x >= this.safeZoneBounds.minX && 
                          position.x <= this.safeZoneBounds.maxX && 
                          position.z >= this.safeZoneBounds.minZ && 
                          position.z <= this.safeZoneBounds.maxZ;
      
      if (isInSafeZone) {
        continue; // Skip this waypoint
      }

      // Determine waypoint type based on distance and randomness
      let type: 'patrol' | 'interest' | 'rest' | 'forage';
      const roll = Math.random();
      
      if (distance < 10) {
        type = roll < 0.4 ? 'patrol' : roll < 0.7 ? 'rest' : 'forage';
      } else if (distance < 20) {
        type = roll < 0.5 ? 'patrol' : roll < 0.8 ? 'interest' : 'forage';
      } else {
        type = roll < 0.6 ? 'interest' : roll < 0.9 ? 'patrol' : 'forage';
      }

      this.waypoints.push({
        position,
        type,
        priority: Math.random(),
        radius: type === 'rest' ? 1.5 : type === 'interest' ? 2.0 : 1.0
      });
    }

    console.log(`🗺️ [PassiveNPCBehavior] Generated ${this.waypoints.length} waypoints`);
  }

  private selectNewBehavior(): void {
    const roll = Math.random();
    let newState = PassiveBehaviorState.PATROLLING;

    // Choose behavior based on personality
    if (roll < this.personality.restFrequency) {
      newState = PassiveBehaviorState.RESTING;
      this.stateDuration = 2000 + Math.random() * 4000; // 2-6 seconds
    } else if (roll < this.personality.restFrequency + this.personality.investigationCuriosity * 0.3) {
      newState = PassiveBehaviorState.INVESTIGATING;
      this.stateDuration = 8000 + Math.random() * 7000; // 8-15 seconds
    } else if (roll < this.personality.restFrequency + this.personality.investigationCuriosity * 0.3 + 0.1) {
      newState = PassiveBehaviorState.FORAGING;
      this.stateDuration = 5000 + Math.random() * 5000; // 5-10 seconds
    } else {
      newState = PassiveBehaviorState.PATROLLING;
      this.stateDuration = 10000 + Math.random() * 10000; // 10-20 seconds
    }

    this.currentState = newState;
    this.stateTimer = 0;
    this.selectWaypoint();
    
    console.log(`🎯 [PassiveNPCBehavior] Switched to ${newState} for ${(this.stateDuration/1000).toFixed(1)}s`);
  }

  private selectWaypoint(): void {
    if (this.waypoints.length === 0) return;

    let suitableWaypoints = this.waypoints;

    // Filter waypoints based on current behavior
    switch (this.currentState) {
      case PassiveBehaviorState.RESTING:
        suitableWaypoints = this.waypoints.filter(w => w.type === 'rest' || w.type === 'patrol');
        break;
      case PassiveBehaviorState.INVESTIGATING:
        suitableWaypoints = this.waypoints.filter(w => w.type === 'interest');
        break;
      case PassiveBehaviorState.FORAGING:
        suitableWaypoints = this.waypoints.filter(w => w.type === 'forage' || w.type === 'interest');
        break;
      case PassiveBehaviorState.PATROLLING:
        suitableWaypoints = this.waypoints.filter(w => w.type === 'patrol');
        break;
    }

    if (suitableWaypoints.length === 0) {
      suitableWaypoints = this.waypoints;
    }

    // Select waypoint with weighted randomness (closer waypoints have higher chance)
    const distances = suitableWaypoints.map(w => this.position.distanceTo(w.position));
    const maxDistance = Math.max(...distances);
    const weights = distances.map(d => (maxDistance - d + 1) * Math.random());
    const maxWeight = Math.max(...weights);
    const selectedIndex = weights.indexOf(maxWeight);

    this.currentWaypoint = suitableWaypoints[selectedIndex];
  }

  public update(deltaTime: number, currentPosition: THREE.Vector3): {
    targetPosition: THREE.Vector3 | null;
    movementSpeed: number;
    shouldMove: boolean;
    lookDirection: THREE.Vector3;
    behaviorState: PassiveBehaviorState;
  } {
    this.position.copy(currentPosition);
    this.stateTimer += deltaTime * 1000;

    // Check if it's time to change behavior
    if (this.stateTimer >= this.stateDuration) {
      this.selectNewBehavior();
    }

    // Update head look direction
    this.updateLookBehavior(deltaTime);

    // Handle current behavior
    switch (this.currentState) {
      case PassiveBehaviorState.RESTING:
        return this.handleResting();
      
      case PassiveBehaviorState.INVESTIGATING:
      case PassiveBehaviorState.FORAGING:
      case PassiveBehaviorState.PATROLLING:
        return this.handleMovementBehavior();
      
      default:
        return this.handleResting();
    }
  }

  private updateLookBehavior(deltaTime: number): void {
    // Occasionally change look direction
    if (Math.random() < 0.02) { // 2% chance per frame
      const angle = Math.random() * Math.PI * 2;
      this.targetHeadRotation = angle;
    }

    // Smooth head rotation
    const rotationDiff = this.targetHeadRotation - this.headRotation;
    let normalizedDiff = rotationDiff;
    if (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
    if (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;

    if (Math.abs(normalizedDiff) > 0.1) {
      const rotationStep = 2.0 * deltaTime;
      this.headRotation += Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotationStep);
    }

    this.lookDirection.set(
      Math.cos(this.headRotation),
      0,
      Math.sin(this.headRotation)
    );
  }

  private handleResting(): {
    targetPosition: THREE.Vector3 | null;
    movementSpeed: number;
    shouldMove: boolean;
    lookDirection: THREE.Vector3;
    behaviorState: PassiveBehaviorState;
  } {
    return {
      targetPosition: null,
      movementSpeed: 0,
      shouldMove: false,
      lookDirection: this.lookDirection,
      behaviorState: this.currentState
    };
  }

  private handleMovementBehavior(): {
    targetPosition: THREE.Vector3 | null;
    movementSpeed: number;
    shouldMove: boolean;
    lookDirection: THREE.Vector3;
    behaviorState: PassiveBehaviorState;
  } {
    if (!this.currentWaypoint) {
      this.selectWaypoint();
      if (!this.currentWaypoint) {
        return this.handleResting();
      }
    }

    const distanceToWaypoint = this.position.distanceTo(this.currentWaypoint.position);
    
    // Check if we've reached the waypoint
    if (distanceToWaypoint <= this.currentWaypoint.radius) {
      this.selectWaypoint(); // Get new waypoint
    }

    // Calculate movement speed based on behavior and personality
    let speedMultiplier = this.personality.movementSpeed;
    
    switch (this.currentState) {
      case PassiveBehaviorState.INVESTIGATING:
        speedMultiplier *= 1.2; // Slightly faster when curious
        break;
      case PassiveBehaviorState.FORAGING:
        speedMultiplier *= 0.8; // Slower when foraging
        break;
      case PassiveBehaviorState.PATROLLING:
        speedMultiplier *= 1.0; // Normal speed
        break;
    }

    // Update look direction to face movement direction
    if (this.currentWaypoint) {
      const directionToWaypoint = new THREE.Vector3()
        .subVectors(this.currentWaypoint.position, this.position)
        .normalize();
      this.targetHeadRotation = Math.atan2(directionToWaypoint.x, directionToWaypoint.z);
    }

    return {
      targetPosition: this.currentWaypoint?.position || null,
      movementSpeed: speedMultiplier,
      shouldMove: true,
      lookDirection: this.lookDirection,
      behaviorState: this.currentState
    };
  }

  public getCurrentState(): PassiveBehaviorState {
    return this.currentState;
  }

  public getPersonality(): NPCPersonality {
    return this.personality;
  }

  public regenerateWaypoints(): void {
    this.generateWaypoints();
    this.selectWaypoint();
  }
}
