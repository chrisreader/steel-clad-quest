import * as THREE from 'three';

export interface TavernAction {
  type: 'move' | 'idle' | 'interact';
  target?: THREE.Vector3;
  duration?: number;
}

export interface TavernKeeperConfig {
  wanderRadius: number;
  moveSpeed: number;
  pauseDuration: number;
  interactionRadius: number;
}

export class TavernKeeperBehavior {
  private config: TavernKeeperConfig;
  private currentAction: TavernAction = { type: 'idle' };
  private actionStartTime: number = Date.now();
  private currentWaypoint: THREE.Vector3 | null = null;
  private lastWaypointTime: number = 0;
  
  // Tavern-specific waypoints (relative to tavern center)
  private tavernWaypoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, -4),    // Near fireplace
    new THREE.Vector3(-3, 0, -2),   // Near table
    new THREE.Vector3(3, 0, 2),     // Near bar area
    new THREE.Vector3(-2, 0, 4),    // Near entrance
    new THREE.Vector3(2, 0, -3),    // Corner area
    new THREE.Vector3(0, 0, 0)      // Center area
  ];
  
  private currentWaypointIndex: number = 0;
  private isAtWaypoint: boolean = false;

  constructor(config: TavernKeeperConfig) {
    this.config = config;
    console.log('🏠 [TavernKeeperBehavior] Initialized with waypoint-based movement');
  }

  public update(
    deltaTime: number, 
    npcPosition: THREE.Vector3, 
    playerPosition?: THREE.Vector3
  ): TavernAction {
    const now = Date.now();
    const actionDuration = now - this.actionStartTime;

    // Check if we should greet the player when they're nearby
    if (playerPosition && this.shouldGreetPlayer(npcPosition, playerPosition)) {
      return this.handlePlayerInteraction(npcPosition, playerPosition);
    }

    // Handle current action states
    switch (this.currentAction.type) {
      case 'idle':
        return this.handleIdleState(actionDuration, npcPosition);
      
      case 'move':
        return this.handleMoveState(npcPosition);
      
      case 'interact':
        return this.handleInteractState(actionDuration);
      
      default:
        return { type: 'idle' };
    }
  }

  private shouldGreetPlayer(npcPosition: THREE.Vector3, playerPosition: THREE.Vector3): boolean {
    const distance = npcPosition.distanceTo(playerPosition);
    return distance < this.config.interactionRadius && 
           this.currentAction.type !== 'interact' &&
           Date.now() - this.lastWaypointTime > 2000; // Don't interrupt recent movements
  }

  private handlePlayerInteraction(npcPosition: THREE.Vector3, playerPosition: THREE.Vector3): TavernAction {
    // Face the player
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, npcPosition)
      .normalize();
    
    console.log('👋 [TavernKeeper] Greeting player');
    
    this.currentAction = { 
      type: 'interact', 
      duration: 2000 // Brief interaction
    };
    this.actionStartTime = Date.now();
    
    return this.currentAction;
  }

  private handleIdleState(actionDuration: number, npcPosition: THREE.Vector3): TavernAction {
    // After pausing, choose next waypoint to move to
    if (actionDuration > this.config.pauseDuration) {
      const nextWaypoint = this.selectNextWaypoint(npcPosition);
      
      this.currentAction = {
        type: 'move',
        target: nextWaypoint
      };
      this.currentWaypoint = nextWaypoint;
      this.actionStartTime = Date.now();
      this.isAtWaypoint = false;
      
      console.log('🚶 [TavernKeeper] Moving to waypoint:', nextWaypoint);
      
      return this.currentAction;
    }
    
    return { type: 'idle' };
  }

  private handleMoveState(npcPosition: THREE.Vector3): TavernAction {
    if (!this.currentWaypoint) {
      // No target, switch to idle
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      return this.currentAction;
    }

    const distanceToWaypoint = npcPosition.distanceTo(this.currentWaypoint);
    
    // Check if we've reached the waypoint
    if (distanceToWaypoint < 0.8) {
      console.log('✅ [TavernKeeper] Reached waypoint, switching to idle');
      
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      this.lastWaypointTime = Date.now();
      this.isAtWaypoint = true;
      
      return this.currentAction;
    }
    
    // Continue moving to current waypoint
    return {
      type: 'move',
      target: this.currentWaypoint
    };
  }

  private handleInteractState(actionDuration: number): TavernAction {
    // Interaction duration completed, return to idle
    if (actionDuration > (this.currentAction.duration || 2000)) {
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      
      console.log('💬 [TavernKeeper] Finished interaction, returning to idle');
    }
    
    return this.currentAction;
  }

  private selectNextWaypoint(currentPosition: THREE.Vector3): THREE.Vector3 {
    // Choose waypoints in sequence, but skip if too close to current position
    let attempts = 0;
    let selectedWaypoint: THREE.Vector3;
    
    do {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.tavernWaypoints.length;
      selectedWaypoint = this.tavernWaypoints[this.currentWaypointIndex].clone();
      attempts++;
    } while (
      currentPosition.distanceTo(selectedWaypoint) < 2.0 && 
      attempts < this.tavernWaypoints.length
    );
    
    // Add slight random variation to make movement less predictable
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 1.0,
      0,
      (Math.random() - 0.5) * 1.0
    );
    
    selectedWaypoint.add(randomOffset);
    
    return selectedWaypoint;
  }

  public getCurrentAction(): TavernAction {
    return { ...this.currentAction };
  }

  public isMoving(): boolean {
    return this.currentAction.type === 'move';
  }

  public isInteracting(): boolean {
    return this.currentAction.type === 'interact';
  }

  // Get debug info for tavern keeper behavior
  public getDebugInfo(): any {
    return {
      currentAction: this.currentAction.type,
      currentWaypoint: this.currentWaypointIndex,
      isAtWaypoint: this.isAtWaypoint,
      waypointTarget: this.currentWaypoint,
      totalWaypoints: this.tavernWaypoints.length
    };
  }
}
