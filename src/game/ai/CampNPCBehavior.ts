import * as THREE from 'three';

export interface CampAction {
  type: 'move' | 'idle' | 'patrol' | 'interact' | 'guard';
  target?: THREE.Vector3;
  lookDirection?: THREE.Vector3;
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
  private campCenter: THREE.Vector3; // Reference point for all waypoints
  
  // Camp-specific waypoints (relative to camp center)
  private campWaypoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 0),      // Near fireplace (center)
    new THREE.Vector3(-2, 0, -1),    // Near tent area (closer)
    new THREE.Vector3(2, 0, 1),      // Opposite tent area (closer)
    new THREE.Vector3(-1, 0, 2),     // Perimeter patrol (closer)
    new THREE.Vector3(1, 0, -2),     // Perimeter patrol (closer)
    new THREE.Vector3(-1.5, 0, 1.5), // Camp supplies area (closer)
    new THREE.Vector3(1.5, 0, -1.5), // Camp entrance area (closer)
    new THREE.Vector3(0, 0, 2.5),    // Outer perimeter (closer)
    new THREE.Vector3(0, 0, -2.5)    // Outer perimeter (closer)
  ];
  
  private currentWaypointIndex: number = 0;
  private isAtWaypoint: boolean = false;
  private isPatrolling: boolean = false;

  constructor(config: CampNPCConfig, campCenter: THREE.Vector3) {
    this.config = config;
    this.campCenter = campCenter.clone();
    console.log(`🏕️ [CampNPCBehavior] Initialized camp behavior at center:`, this.campCenter);
    console.log(`🏕️ [CampNPCBehavior] Config:`, {
      wanderRadius: config.wanderRadius,
      moveSpeed: config.moveSpeed,
      pauseDuration: config.pauseDuration
    });
  }

  public update(
    deltaTime: number, 
    npcPosition: THREE.Vector3, 
    playerPosition?: THREE.Vector3
  ): CampAction {
    const now = Date.now();
    const actionDuration = now - this.actionStartTime;

    // Reduce debug logging spam - only log occasionally
    if (Math.random() < 0.02) { // Only log 2% of the time to reduce spam
      console.log(`🏕️ [CampNPCBehavior] === BEHAVIOR UPDATE ===`);
      console.log(`🏕️ [CampNPCBehavior] Current action: ${this.currentAction.type}`);
      console.log(`🏕️ [CampNPCBehavior] Action duration: ${actionDuration}ms`);
      console.log(`🏕️ [CampNPCBehavior] NPC position:`, npcPosition);
      console.log(`🏕️ [CampNPCBehavior] Camp center:`, this.campCenter);
      console.log(`🏕️ [CampNPCBehavior] Current waypoint:`, this.currentWaypoint);
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
      
      case 'guard':
        return this.handleGuardState(actionDuration);
      
      default:
        console.log(`🏕️ [CampNPCBehavior] Unknown action type: ${this.currentAction.type}, switching to idle`);
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
    const activePauseDuration = this.config.pauseDuration / 2; // 500ms
    
    if (actionDuration > activePauseDuration) {
      // Choose next behavior: 40% patrol, 30% guard, 30% move
      const rand = Math.random();
      
      if (rand < 0.4) {
        return this.startPatrol(npcPosition);
      } else if (rand < 0.7) {
        return this.startGuard();
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
    // Generate patrol target around camp perimeter, relative to camp center
    const angle = Math.random() * Math.PI * 2;
    const distance = this.config.patrolRadius * (0.5 + Math.random() * 0.3); // Reduced distance
    
    const patrolTarget = this.campCenter.clone().add(new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    ));
    
    this.currentAction = {
      type: 'patrol',
      target: patrolTarget
    };
    this.currentWaypoint = patrolTarget;
    this.actionStartTime = Date.now();
    this.isPatrolling = true;
    
    console.log('🛡️ [CampNPC] Starting patrol to:', patrolTarget, 'from camp center:', this.campCenter);
    
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

  private startGuard(): CampAction {
    // Generate random look direction for guard behavior
    const angle = Math.random() * Math.PI * 2;
    const lookDirection = new THREE.Vector3(
      Math.cos(angle),
      0,
      Math.sin(angle)
    );
    
    this.currentAction = {
      type: 'guard',
      lookDirection: lookDirection,
      duration: 2000 + Math.random() * 3000 // 2-5 seconds of guarding
    };
    this.actionStartTime = Date.now();
    
    console.log('👁️ [CampNPC] Starting guard duty, looking towards:', lookDirection);
    
    return this.currentAction;
  }

  private handleGuardState(actionDuration: number): CampAction {
    if (actionDuration > (this.currentAction.duration || 3000)) {
      this.currentAction = { type: 'idle' };
      this.actionStartTime = Date.now();
      
      console.log('👁️ [CampNPC] Finished guard duty, returning to idle');
    }
    
    return this.currentAction;
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

  private selectNextWaypoint(currentPosition: THREE.Vector3): THREE.Vector3 {
    // Generate waypoint relative to camp center, not world origin
    let selectedWaypoint: THREE.Vector3;
    let attempts = 0;
    
    do {
      // Generate a random waypoint around the camp center with reduced distance
      const angle = Math.random() * Math.PI * 2;
      const distance = 1 + Math.random() * 2; // Reduced to 1-3 units from camp center
      
      // Create waypoint relative to camp center
      selectedWaypoint = this.campCenter.clone().add(new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      ));
      
      attempts++;
    } while (
      currentPosition.distanceTo(selectedWaypoint) < 1.0 && 
      attempts < 10
    );
    
    console.log(`🎯 [CampNPC] Selected waypoint relative to camp center ${this.campCenter.x.toFixed(1)}, ${this.campCenter.z.toFixed(1)}:`);
    console.log(`🎯 [CampNPC] Waypoint: ${selectedWaypoint.x.toFixed(1)}, ${selectedWaypoint.z.toFixed(1)}`);
    console.log(`🎯 [CampNPC] Distance from current: ${currentPosition.distanceTo(selectedWaypoint).toFixed(2)}m`);
    
    return selectedWaypoint;
  }
}