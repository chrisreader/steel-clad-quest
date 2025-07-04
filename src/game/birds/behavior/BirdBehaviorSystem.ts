import * as THREE from 'three';
import { BirdState, FlightMode, BirdConfig } from '../core/BirdTypes';

export class BirdBehaviorSystem {
  private stateTimer: number = 0;
  private nextStateChange: number = 0;
  
  // Enhanced flight systems
  private maxFlightTime: number = 30; // Extended flight duration
  private minFlightTime: number = 10; // Minimum flight before landing allowed
  private flightTimer: number = 0;
  private maxAltitude: number = 35; // Higher ceiling
  private emergencyLanding: boolean = false;

  constructor(config: BirdConfig) {
    // Enhanced flight bounds system
    this.maxFlightTime = 30; // Max 30 seconds in air
    this.minFlightTime = 10; // Min 10 seconds before landing
    this.flightTimer = 0;
    this.maxAltitude = 35; // Higher ceiling
    this.emergencyLanding = false;
  }

  public updateBehavior(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    birdPosition: THREE.Vector3,
    flightMode: FlightMode,
    birdState: BirdState,
    config: BirdConfig,
    distanceFromPlayer: number,
    groundLevel: number,
    callbacks: {
      changeState: (state: BirdState) => void;
      startFlight: () => void;
      startLanding: () => void;
      forceGrounding: () => void;
    }
  ): { shouldContinue: boolean; emergencyMode: boolean } {
    this.stateTimer += deltaTime;
    
    // Track flight time
    if (flightMode !== FlightMode.GROUNDED) {
      this.flightTimer += deltaTime;
    } else {
      this.flightTimer = 0;
      this.emergencyLanding = false;
    }
    
    // EMERGENCY BOUNDS AND RECOVERY SYSTEMS
    this.checkEmergencyConditions(birdPosition, groundLevel);
    
    // Skip normal behavior if in emergency mode
    if (this.emergencyLanding) {
      this.executeEmergencyLanding(deltaTime, birdPosition, groundLevel, callbacks);
      return { shouldContinue: false, emergencyMode: true };
    }
    
    // Check player distance for alert behavior
    if (distanceFromPlayer < config.alertDistance && flightMode === FlightMode.GROUNDED) {
      if (distanceFromPlayer < 3) {
        callbacks.startFlight();
        return { shouldContinue: false, emergencyMode: false };
      } else if (birdState !== BirdState.ALERT) {
        callbacks.changeState(BirdState.ALERT);
      }
    }

    // Deterministic state transitions based on conditions
    this.updateIntelligentStateMachine(flightMode, birdState, birdPosition, config, groundLevel, callbacks);
    
    return { shouldContinue: true, emergencyMode: false };
  }

  private checkEmergencyConditions(position: THREE.Vector3, groundLevel: number): void {
    if (position.y > this.maxAltitude || this.flightTimer > this.maxFlightTime) {
      this.emergencyLanding = true;
    }
  }
  
  private executeEmergencyLanding(
    deltaTime: number, 
    position: THREE.Vector3, 
    groundLevel: number,
    callbacks: { changeState: (state: BirdState) => void; forceGrounding: () => void }
  ): void {
    callbacks.changeState(BirdState.LANDING);
    
    const feetToBodyDistance = 0.48;
    if (position.y <= groundLevel + feetToBodyDistance + 1) {
      callbacks.forceGrounding();
    }
  }

  private updateIntelligentStateMachine(
    flightMode: FlightMode,
    birdState: BirdState,
    position: THREE.Vector3,
    config: BirdConfig,
    groundLevel: number,
    callbacks: {
      changeState: (state: BirdState) => void;
      startFlight: () => void;
      startLanding: () => void;
    }
  ): void {
    // Altitude-based decisions for flying birds
    if (flightMode !== FlightMode.GROUNDED) {
      const altitudeAboveGround = position.y - groundLevel;
      
      // Only allow landing after minimum flight time has passed
      if ((altitudeAboveGround > config.flightAltitude.max || this.flightTimer > 25) && 
          this.flightTimer > this.minFlightTime) {
        callbacks.startLanding();
        return;
      }
      
      if (altitudeAboveGround > config.flightAltitude.min && birdState === BirdState.FLYING) {
        if (Math.random() < 0.1) {
          callbacks.changeState(BirdState.SOARING);
        }
      }
      return;
    }
    
    // Ground state transitions
    if (Date.now() > this.nextStateChange) {
      switch (birdState) {
        case BirdState.IDLE:
          const nextAction = Math.random();
          if (nextAction < 0.4) {
            callbacks.changeState(BirdState.WALKING);
          } else if (nextAction < 0.6) {
            callbacks.changeState(BirdState.FORAGING);
          } else if (nextAction < 0.8) {
            callbacks.changeState(BirdState.PREENING);
          } else {
            callbacks.startFlight();
          }
          break;
        case BirdState.WALKING:
        case BirdState.FORAGING:
        case BirdState.PREENING:
          if (Math.random() < 0.6) {
            callbacks.changeState(BirdState.IDLE);
          } else if (Math.random() < 0.3) {
            callbacks.startFlight();
          }
          break;
      }
    }
  }

  public executeCurrentState(
    deltaTime: number,
    birdState: BirdState,
    config: BirdConfig,
    position: THREE.Vector3,
    homePosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    groundLevel: number,
    velocity: THREE.Vector3,
    mesh: THREE.Object3D,
    flightCallbacks: {
      setRandomTargetPosition: (range?: number) => void;
      moveTowardTarget: (deltaTime: number, speed: number) => void;
      followFlightPath: (deltaTime: number) => void;
    }
  ): void {
    switch (birdState) {
      case BirdState.WALKING:
        this.executeWalking(deltaTime, config, position, targetPosition, flightCallbacks);
        break;
      case BirdState.FORAGING:
        this.executeForaging(deltaTime, config, flightCallbacks);
        break;
      case BirdState.TAKING_OFF:
        // Handled by physics system
        break;
      case BirdState.FLYING:
        this.executeFlying(deltaTime, flightCallbacks);
        break;
      case BirdState.SOARING:
        this.executeSoaring(deltaTime, flightCallbacks);
        break;
      case BirdState.LANDING:
        // Handled by physics system
        break;
    }
  }

  private executeWalking(
    deltaTime: number,
    config: BirdConfig,
    position: THREE.Vector3,
    targetPosition: THREE.Vector3,
    callbacks: { setRandomTargetPosition: (range?: number) => void; moveTowardTarget: (deltaTime: number, speed: number) => void }
  ): void {
    // Random walk around territory
    if (!targetPosition || position.distanceTo(targetPosition) < 0.5) {
      callbacks.setRandomTargetPosition();
    }
    
    callbacks.moveTowardTarget(deltaTime, config.walkSpeed);
  }

  private executeForaging(
    deltaTime: number,
    config: BirdConfig,
    callbacks: { setRandomTargetPosition: (range?: number) => void; moveTowardTarget: (deltaTime: number, speed: number) => void }
  ): void {
    // Simulate foraging by moving in small steps with pauses
    if (Math.random() < 0.1) {
      callbacks.setRandomTargetPosition(2); // Short range movement
    }
    
    callbacks.moveTowardTarget(deltaTime, config.walkSpeed * 0.5);
  }

  private executeFlying(
    deltaTime: number,
    callbacks: { followFlightPath: (deltaTime: number) => void }
  ): void {
    // Determine if should switch to soaring
    if (Math.random() < 0.02) { // 2% chance per frame
      // Note: state change handled by parent
    }
    
    this.executeCruiseFlight(deltaTime, callbacks);
  }

  private executeSoaring(
    deltaTime: number,
    callbacks: { followFlightPath: (deltaTime: number) => void }
  ): void {
    this.executeCruiseFlight(deltaTime, callbacks);
  }

  private executeCruiseFlight(
    deltaTime: number,
    callbacks: { followFlightPath: (deltaTime: number) => void }
  ): void {
    // Use enhanced flight path following from base class
    callbacks.followFlightPath(deltaTime);
  }

  public scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 5000 + 2000);
  }

  // Getters for state
  public get isEmergencyLanding(): boolean {
    return this.emergencyLanding;
  }

  public get currentFlightTimer(): number {
    return this.flightTimer;
  }

  public resetFlightTimer(): void {
    this.flightTimer = 0;
  }
}