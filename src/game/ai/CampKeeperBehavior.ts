import * as THREE from 'three';

export interface CampAction {
  type: 'move' | 'idle' | 'interact';
  target?: THREE.Vector3;
  duration?: number;
}

export interface CampKeeperConfig {
  wanderRadius: number;
  moveSpeed: number;
  pauseDuration: number;
  interactionRadius: number;
}

export class CampKeeperBehavior {
  private config: CampKeeperConfig;
  private currentAction: CampAction = { type: 'idle' };
  private actionStartTime: number = Date.now();
  private currentWaypoint: THREE.Vector3 | null = null;
  private lastWaypointTime: number = 0;
  private campCenter: THREE.Vector3;
  
  // Camp-specific waypoints (relative to camp center)
  private relativeWaypoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 0),      // Near fireplace (center)
    new THREE.Vector3(-2, 0, -2),    // Near tent area
    new THREE.Vector3(2, 0, 2),      // Opposite tent area
    new THREE.Vector3(-3, 0, 1),     // Perimeter patrol
    new THREE.Vector3(3, 0, -1),     // Perimeter patrol
    new THREE.Vector3(-1, 0, 3),     // Camp supplies area
    new THREE.Vector3(1, 0, -3),     // Camp entrance area
  ];
  
  private currentWaypointIndex: number = 0;
  private isAtWaypoint: boolean = false;

  constructor(config: CampKeeperConfig, campCenter: THREE.Vector3) {
    this.config = config;
    this.campCenter = campCenter.clone();
    console.log('🏕️ [CampKeeperBehavior] Initialized with camp center:', this.campCenter, 'config:', {
      wanderRadius: config.wanderRadius,
      moveSpeed: config.moveSpeed,
      pauseDuration: config.pauseDuration,
      interactionRadius: config.interactionRadius
    });
  }

  public update(
    deltaTime: number, 
    npcPosition: THREE.Vector3, 
    playerPosition?: THREE.Vector3
  ): CampAction {
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

  private handlePlayerInteraction(npcPosition: THREE.Vector3, playerPosition: THREE.Vector3): CampAction {
    console.log('👋 [CampKeeper] Greeting player');
    
    this.currentAction = { 
      type: 'interact', 
      duration: 2000 // Brief interaction
    };
    this.actionStartTime = Date.now();
    
    return this.currentAction;
  }

  private handleIdleState(actionDuration: number, npcPosition: THREE.Vector3): CampAction {
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
      
      console.log('🚶 [CampKeeper] Starting movement from idle after', actionDuration, 'ms pause. Moving to waypoint:', nextWaypoint, 'from position:', npcPosition);
      
      return this.currentAction;
    }
    
    // Enhanced idle logging with position tracking
    const remainingTime = this.config.pauseDuration - actionDuration;
    if (remainingTime > 1000) { // Only log if more than 1 second remaining
      console.log('🛌 [CampKeeper] Remaining idle for', remainingTime, 'ms more at position:', {
        x: npcPosition.x.toFixed(2),
        z: npcPosition.z.toFixed(2)
      });
    }
    
    return { type: 'idle' };
  }

  private handleMoveState(npcPosition: THREE.Vector3): CampAction {
    if (!this.currentWaypoint) {
      // No target, switch to idle
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      return this.currentAction;
    }

    const distanceToWaypoint = npcPosition.distanceTo(this.currentWaypoint);
    
    // Check if we've reached the waypoint
    if (distanceToWaypoint < 0.8) {
      console.log('✅ [CampKeeper] Reached waypoint, switching to idle');
      
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

  private handleInteractState(actionDuration: number): CampAction {
    // Interaction duration completed, return to idle
    if (actionDuration > (this.currentAction.duration || 2000)) {
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      
      console.log('💬 [CampKeeper] Finished interaction, returning to idle');
    }
    
    return this.currentAction;
  }

  private selectNextWaypoint(currentPosition: THREE.Vector3): THREE.Vector3 {
    // Choose waypoints in sequence, but skip if too close to current position
    let attempts = 0;
    let selectedWaypoint: THREE.Vector3;
    
    do {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.relativeWaypoints.length;
      // Create absolute waypoint by adding relative waypoint to camp center
      selectedWaypoint = this.campCenter.clone().add(this.relativeWaypoints[this.currentWaypointIndex]);
      attempts++;
    } while (
      currentPosition.distanceTo(selectedWaypoint) < 1.5 && 
      attempts < this.relativeWaypoints.length
    );
    
    // Add slight random variation to make movement less predictable
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 1.0,
      0,
      (Math.random() - 0.5) * 1.0
    );
    
    selectedWaypoint.add(randomOffset);
    
    console.log('🚶 [CampKeeper] Selected waypoint:', selectedWaypoint, 'for camp at:', this.campCenter);
    return selectedWaypoint;
  }

  public getCurrentAction(): CampAction {
    return { ...this.currentAction };
  }

  public isMoving(): boolean {
    return this.currentAction.type === 'move';
  }

  public isInteracting(): boolean {
    return this.currentAction.type === 'interact';
  }

  // Get debug info for camp keeper behavior
  public getDebugInfo(): any {
    return {
      currentAction: this.currentAction.type,
      currentWaypoint: this.currentWaypointIndex,
      isAtWaypoint: this.isAtWaypoint,
      waypointTarget: this.currentWaypoint,
      totalWaypoints: this.relativeWaypoints.length,
      campCenter: this.campCenter
    };
  }
}
