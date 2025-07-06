import * as THREE from 'three';

export interface CampAction {
  type: 'move' | 'idle' | 'patrol' | 'interact';
  target?: THREE.Vector3;
  duration?: number;
}

export interface CampNPCConfig {
  wanderRadius: number;
  moveSpeed: number;
  pauseDuration: number;
  interactionRadius: number;
  patrolRadius: number;
}

export class CampNPCBehavior {
  private config: CampNPCConfig;
  private currentAction: CampAction = { type: 'idle' };
  private actionStartTime: number = Date.now();
  private currentWaypoint: THREE.Vector3 | null = null;
  private lastWaypointTime: number = 0;
  
  // Camp-specific waypoints (relative to camp center)
  private campWaypoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 0),      // Near fireplace (center)
    new THREE.Vector3(-4, 0, -2),    // Near tent area
    new THREE.Vector3(4, 0, 2),      // Opposite tent area
    new THREE.Vector3(-2, 0, 4),     // Perimeter patrol
    new THREE.Vector3(2, 0, -4),     // Perimeter patrol
    new THREE.Vector3(-3, 0, 3),     // Camp supplies area
    new THREE.Vector3(3, 0, -3),     // Camp entrance area
    new THREE.Vector3(0, 0, 5),      // Outer perimeter
    new THREE.Vector3(0, 0, -5)      // Outer perimeter
  ];
  
  private currentWaypointIndex: number = 0;
  private isAtWaypoint: boolean = false;
  private isPatrolling: boolean = false;

  constructor(config: CampNPCConfig) {
    this.config = config;
    console.log('🏕️ [CampNPCBehavior] Initialized with camp waypoint movement');
  }

  public update(
    deltaTime: number, 
    npcPosition: THREE.Vector3, 
    playerPosition?: THREE.Vector3
  ): CampAction {
    const now = Date.now();
    const actionDuration = now - this.actionStartTime;

    // Debug logging for camp behavior
    if (Math.random() < 0.005) { // Log occasionally (0.5% chance)
      console.log(`🏕️ [CampNPCBehavior] Current action: ${this.currentAction.type}, Duration: ${actionDuration}ms, Position:`, npcPosition);
    }

    // Check if we should interact with the player when they're nearby
    if (playerPosition && this.shouldInteractWithPlayer(npcPosition, playerPosition)) {
      return this.handlePlayerInteraction(npcPosition, playerPosition);
    }

    // Handle current action states
    switch (this.currentAction.type) {
      case 'idle':
        return this.handleIdleState(actionDuration, npcPosition);
      
      case 'move':
        return this.handleMoveState(npcPosition);
      
      case 'patrol':
        return this.handlePatrolState(npcPosition);
      
      case 'interact':
        return this.handleInteractState(actionDuration);
      
      default:
        return { type: 'idle' };
    }
  }

  private shouldInteractWithPlayer(npcPosition: THREE.Vector3, playerPosition: THREE.Vector3): boolean {
    const distance = npcPosition.distanceTo(playerPosition);
    return distance < this.config.interactionRadius && 
           this.currentAction.type !== 'interact' &&
           Date.now() - this.lastWaypointTime > 2000;
  }

  private handlePlayerInteraction(npcPosition: THREE.Vector3, playerPosition: THREE.Vector3): CampAction {
    console.log('👋 [CampNPC] Acknowledging player presence');
    
    this.currentAction = { 
      type: 'interact', 
      duration: 1500 // Brief acknowledgment
    };
    this.actionStartTime = Date.now();
    
    return this.currentAction;
  }

  private handleIdleState(actionDuration: number, npcPosition: THREE.Vector3): CampAction {
    // After pausing, decide what to do next
    if (actionDuration > this.config.pauseDuration) {
      const shouldPatrol = Math.random() < 0.3; // 30% chance to patrol
      
      if (shouldPatrol) {
        return this.startPatrol(npcPosition);
      } else {
        return this.startMovement(npcPosition);
      }
    }
    
    return { type: 'idle' };
  }

  private startMovement(npcPosition: THREE.Vector3): CampAction {
    const nextWaypoint = this.selectNextWaypoint(npcPosition);
    
    this.currentAction = {
      type: 'move',
      target: nextWaypoint
    };
    this.currentWaypoint = nextWaypoint;
    this.actionStartTime = Date.now();
    this.isAtWaypoint = false;
    this.isPatrolling = false;
    
    console.log('🚶 [CampNPC] Moving to waypoint:', nextWaypoint);
    
    return this.currentAction;
  }

  private startPatrol(npcPosition: THREE.Vector3): CampAction {
    // Generate patrol target around camp perimeter
    const angle = Math.random() * Math.PI * 2;
    const distance = this.config.patrolRadius * (0.7 + Math.random() * 0.3);
    
    const patrolTarget = new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
    
    this.currentAction = {
      type: 'patrol',
      target: patrolTarget
    };
    this.currentWaypoint = patrolTarget;
    this.actionStartTime = Date.now();
    this.isPatrolling = true;
    
    console.log('🛡️ [CampNPC] Starting patrol to:', patrolTarget);
    
    return this.currentAction;
  }

  private handleMoveState(npcPosition: THREE.Vector3): CampAction {
    if (!this.currentWaypoint) {
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      return this.currentAction;
    }

    const distanceToWaypoint = npcPosition.distanceTo(this.currentWaypoint);
    
    if (distanceToWaypoint < 1.0) {
      console.log('✅ [CampNPC] Reached waypoint, switching to idle');
      
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      this.lastWaypointTime = Date.now();
      this.isAtWaypoint = true;
      
      return this.currentAction;
    }
    
    return {
      type: 'move',
      target: this.currentWaypoint
    };
  }

  private handlePatrolState(npcPosition: THREE.Vector3): CampAction {
    if (!this.currentWaypoint) {
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      return this.currentAction;
    }

    const distanceToWaypoint = npcPosition.distanceTo(this.currentWaypoint);
    
    if (distanceToWaypoint < 1.2) {
      console.log('🛡️ [CampNPC] Patrol point reached, returning to idle');
      
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      this.lastWaypointTime = Date.now();
      this.isPatrolling = false;
      
      return this.currentAction;
    }
    
    return {
      type: 'patrol',
      target: this.currentWaypoint
    };
  }

  private handleInteractState(actionDuration: number): CampAction {
    if (actionDuration > (this.currentAction.duration || 1500)) {
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      
      console.log('💬 [CampNPC] Finished interaction, returning to idle');
    }
    
    return this.currentAction;
  }

  private selectNextWaypoint(currentPosition: THREE.Vector3): THREE.Vector3 {
    // Choose camp waypoints in sequence, but skip if too close
    let attempts = 0;
    let selectedWaypoint: THREE.Vector3;
    
    do {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.campWaypoints.length;
      selectedWaypoint = this.campWaypoints[this.currentWaypointIndex].clone();
      attempts++;
    } while (
      currentPosition.distanceTo(selectedWaypoint) < 2.5 && 
      attempts < this.campWaypoints.length
    );
    
    // Add random variation for natural movement
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      0,
      (Math.random() - 0.5) * 1.5
    );
    
    selectedWaypoint.add(randomOffset);
    
    return selectedWaypoint;
  }

  public getCurrentAction(): CampAction {
    return { ...this.currentAction };
  }

  public isMoving(): boolean {
    return this.currentAction.type === 'move' || this.currentAction.type === 'patrol';
  }

  public isInteracting(): boolean {
    return this.currentAction.type === 'interact';
  }

  public getDebugInfo(): any {
    return {
      currentAction: this.currentAction.type,
      currentWaypoint: this.currentWaypointIndex,
      isAtWaypoint: this.isAtWaypoint,
      isPatrolling: this.isPatrolling,
      waypointTarget: this.currentWaypoint,
      totalWaypoints: this.campWaypoints.length
    };
  }
}