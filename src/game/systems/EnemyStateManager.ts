import * as THREE from 'three';

export enum EnemyAIState {
  SPAWNING = 'spawning',
  WANDERING = 'wandering', 
  PATROLLING = 'patrolling',
  AWARE = 'aware',
  INVESTIGATING = 'investigating',
  AGGRESSIVE = 'aggressive',
  RETREATING = 'retreating',
  DEAD = 'dead'
}

export interface EnemyAIConfig {
  awarenessRange: number;
  aggressionRange: number;
  maxPursuitDistance: number;
  patrolRadius: number;
  investigationTime: number;
  retreatHealthThreshold: number;
}

export class EnemyStateManager {
  private currentState: EnemyAIState = EnemyAIState.SPAWNING;
  private previousState: EnemyAIState = EnemyAIState.SPAWNING;
  private stateTimer: number = 0;
  private config: EnemyAIConfig;
  private spawnPosition: THREE.Vector3;
  private patrolTarget: THREE.Vector3 | null = null;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private investigationTarget: THREE.Vector3 | null = null;

  constructor(spawnPosition: THREE.Vector3, config: Partial<EnemyAIConfig> = {}) {
    this.spawnPosition = spawnPosition.clone();
    
    // Default config values
    this.config = {
      awarenessRange: 28,
      aggressionRange: 18,
      maxPursuitDistance: 60,
      patrolRadius: 15,
      investigationTime: 5000, // 5 seconds
      retreatHealthThreshold: 0.2, // 20% health
      ...config
    };
  }

  public update(
    deltaTime: number, 
    enemyPosition: THREE.Vector3,
    playerPosition: THREE.Vector3,
    enemyHealth: number,
    maxHealth: number,
    isInSafeZone: boolean = false
  ): EnemyAIState {
    this.stateTimer += deltaTime * 1000;
    
    const distanceToPlayer = enemyPosition.distanceTo(playerPosition);
    const distanceFromSpawn = enemyPosition.distanceTo(this.spawnPosition);
    const healthPercentage = enemyHealth / maxHealth;
    
    // Store last known player position when we can see them
    if (distanceToPlayer <= this.config.awarenessRange) {
      this.lastPlayerPosition.copy(playerPosition);
    }
    
    // Force passive behavior in safe zones
    if (isInSafeZone && this.currentState === EnemyAIState.AGGRESSIVE) {
      this.setState(EnemyAIState.WANDERING);
    }
    
    // State transition logic
    switch (this.currentState) {
      case EnemyAIState.SPAWNING:
        this.handleSpawningState(deltaTime);
        break;
        
      case EnemyAIState.WANDERING:
        this.handleWanderingState(distanceToPlayer, isInSafeZone);
        break;
        
      case EnemyAIState.PATROLLING:
        this.handlePatrollingState(distanceToPlayer, enemyPosition, isInSafeZone);
        break;
        
      case EnemyAIState.AWARE:
        this.handleAwareState(distanceToPlayer, distanceFromSpawn, isInSafeZone);
        break;
        
      case EnemyAIState.INVESTIGATING:
        this.handleInvestigatingState(distanceToPlayer, enemyPosition, isInSafeZone);
        break;
        
      case EnemyAIState.AGGRESSIVE:
        this.handleAggressiveState(distanceToPlayer, distanceFromSpawn, healthPercentage, isInSafeZone);
        break;
        
      case EnemyAIState.RETREATING:
        this.handleRetreatingState(distanceToPlayer, distanceFromSpawn, healthPercentage);
        break;
    }
    
    return this.currentState;
  }

  private handleSpawningState(deltaTime: number): void {
    // Short spawn delay to avoid immediate detection
    if (this.stateTimer > 1000) { // 1 second spawn delay
      this.setState(EnemyAIState.WANDERING);
    }
  }

  private handleWanderingState(distanceToPlayer: number, isInSafeZone: boolean): void {
    // Transition to aware if player is in range and not in safe zone
    if (distanceToPlayer <= this.config.awarenessRange && !isInSafeZone) {
      this.setState(EnemyAIState.AWARE);
      return;
    }
    
    // Occasionally switch to patrolling
    if (this.stateTimer > 8000 && Math.random() < 0.3) { // After 8 seconds, 30% chance
      this.setState(EnemyAIState.PATROLLING);
    }
  }

  private handlePatrollingState(distanceToPlayer: number, enemyPosition: THREE.Vector3, isInSafeZone: boolean): void {
    // Transition to aware if player is in range and not in safe zone
    if (distanceToPlayer <= this.config.awarenessRange && !isInSafeZone) {
      this.setState(EnemyAIState.AWARE);
      return;
    }
    
    // Generate new patrol target if needed
    if (!this.patrolTarget || enemyPosition.distanceTo(this.patrolTarget) < 2) {
      this.generatePatrolTarget();
    }
    
    // Return to wandering after a while
    if (this.stateTimer > 15000) {
      this.setState(EnemyAIState.WANDERING);
    }
  }

  private handleAwareState(distanceToPlayer: number, distanceFromSpawn: number, isInSafeZone: boolean): void {
    // Return to wandering if player moves away or enters safe zone
    if (distanceToPlayer > this.config.awarenessRange || isInSafeZone) {
      this.setState(EnemyAIState.INVESTIGATING);
      return;
    }
    
    // Become aggressive if player gets too close
    if (distanceToPlayer <= this.config.aggressionRange && !isInSafeZone) {
      this.setState(EnemyAIState.AGGRESSIVE);
      return;
    }
    
    // Start investigating if we've been aware for a while
    if (this.stateTimer > 3000) {
      this.setState(EnemyAIState.INVESTIGATING);
    }
  }

  private handleInvestigatingState(distanceToPlayer: number, enemyPosition: THREE.Vector3, isInSafeZone: boolean): void {
    // Become aware again if player comes back in range
    if (distanceToPlayer <= this.config.awarenessRange && !isInSafeZone) {
      this.setState(EnemyAIState.AWARE);
      return;
    }
    
    // Set investigation target to last known player position
    if (!this.investigationTarget) {
      this.investigationTarget = this.lastPlayerPosition.clone();
    }
    
    // Check if we've reached investigation target or time limit
    const distanceToTarget = this.investigationTarget ? 
      enemyPosition.distanceTo(this.investigationTarget) : 0;
    
    if (distanceToTarget < 3 || this.stateTimer > this.config.investigationTime) {
      this.setState(EnemyAIState.WANDERING);
    }
  }

  private handleAggressiveState(
    distanceToPlayer: number, 
    distanceFromSpawn: number, 
    healthPercentage: number,
    isInSafeZone: boolean
  ): void {
    // Retreat if health is low
    if (healthPercentage <= this.config.retreatHealthThreshold) {
      this.setState(EnemyAIState.RETREATING);
      return;
    }
    
    // Stop being aggressive in safe zones
    if (isInSafeZone) {
      this.setState(EnemyAIState.WANDERING);
      return;
    }
    
    // Stop pursuing if player is too far from spawn point
    if (distanceFromSpawn > this.config.maxPursuitDistance) {
      this.setState(EnemyAIState.RETREATING);
      return;
    }
    
    // Become aware if player moves away but still in range
    if (distanceToPlayer > this.config.aggressionRange && 
        distanceToPlayer <= this.config.awarenessRange) {
      this.setState(EnemyAIState.AWARE);
    }
  }

  private handleRetreatingState(
    distanceToPlayer: number, 
    distanceFromSpawn: number, 
    healthPercentage: number
  ): void {
    // Return to wandering when back near spawn and player is far
    if (distanceFromSpawn < this.config.patrolRadius && 
        distanceToPlayer > this.config.awarenessRange) {
      this.setState(EnemyAIState.WANDERING);
    }
    
    // If health is restored and player is close, become aggressive again
    if (healthPercentage > this.config.retreatHealthThreshold * 1.5 && 
        distanceToPlayer <= this.config.aggressionRange) {
      this.setState(EnemyAIState.AGGRESSIVE);
    }
  }

  private setState(newState: EnemyAIState): void {
    if (newState !== this.currentState) {
      this.previousState = this.currentState;
      this.currentState = newState;
      this.stateTimer = 0;
      
      // Clear state-specific targets when changing states
      if (newState !== EnemyAIState.PATROLLING) {
        this.patrolTarget = null;
      }
      if (newState !== EnemyAIState.INVESTIGATING) {
        this.investigationTarget = null;
      }
      
      console.log(`🤖 [EnemyStateManager] State changed: ${this.previousState} → ${newState}`);
    }
  }

  private generatePatrolTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * this.config.patrolRadius;
    
    this.patrolTarget = new THREE.Vector3(
      this.spawnPosition.x + Math.cos(angle) * distance,
      this.spawnPosition.y,
      this.spawnPosition.z + Math.sin(angle) * distance
    );
  }

  // Getters
  public getCurrentState(): EnemyAIState {
    return this.currentState;
  }

  public getPreviousState(): EnemyAIState {
    return this.previousState;
  }

  public getStateTimer(): number {
    return this.stateTimer;
  }

  public getPatrolTarget(): THREE.Vector3 | null {
    return this.patrolTarget;
  }

  public getInvestigationTarget(): THREE.Vector3 | null {
    return this.investigationTarget;
  }

  public isAggressive(): boolean {
    return this.currentState === EnemyAIState.AGGRESSIVE;
  }

  public isAware(): boolean {
    return this.currentState === EnemyAIState.AWARE || 
           this.currentState === EnemyAIState.INVESTIGATING ||
           this.currentState === EnemyAIState.AGGRESSIVE;
  }

  public getMovementTarget(enemyPosition: THREE.Vector3, playerPosition: THREE.Vector3): THREE.Vector3 | null {
    switch (this.currentState) {
      case EnemyAIState.PATROLLING:
        return this.patrolTarget;
      
      case EnemyAIState.INVESTIGATING:
        return this.investigationTarget;
        
      case EnemyAIState.AWARE:
      case EnemyAIState.AGGRESSIVE:
        return playerPosition;
        
      case EnemyAIState.RETREATING:
        // Move towards spawn position
        return this.spawnPosition;
        
      default:
        return null;
    }
  }

  public getMovementSpeed(): number {
    switch (this.currentState) {
      case EnemyAIState.WANDERING:
        return 0.3; // Slow wandering
        
      case EnemyAIState.PATROLLING:
        return 0.5; // Moderate patrol speed
        
      case EnemyAIState.AWARE:
        return 0.4; // Cautious approach
        
      case EnemyAIState.INVESTIGATING:
        return 0.6; // Purposeful movement
        
      case EnemyAIState.AGGRESSIVE:
        return 1.0; // Full speed pursuit
        
      case EnemyAIState.RETREATING:
        return 0.8; // Quick retreat
        
      default:
        return 0.1; // Very slow default
    }
  }
}