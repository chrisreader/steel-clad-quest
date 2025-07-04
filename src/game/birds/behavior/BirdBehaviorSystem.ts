import * as THREE from 'three';
import { BirdState, FlightMode } from '../core/BirdTypes';

export class BirdBehaviorSystem {
  private stateTimer: number = 0;
  private nextStateChange: number = 0;
  private maxFlightTime: number = 30;
  private minFlightTime: number = 10;
  private flightTimer: number = 0;
  private maxAltitude: number = 35;
  private emergencyLanding: boolean = false;

  constructor(maxFlightTime?: number, minFlightTime?: number, maxAltitude?: number) {
    this.maxFlightTime = maxFlightTime || 30;
    this.minFlightTime = minFlightTime || 10;
    this.maxAltitude = maxAltitude || 35;
  }

  public updateBehavior(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    currentState: BirdState,
    flightMode: FlightMode,
    position: THREE.Vector3,
    alertDistance: number,
    onStateChange: (newState: BirdState) => void,
    onStartFlight: () => void,
    onStartLanding: () => void
  ): { shouldFollowFlightPath: boolean } {
    this.stateTimer += deltaTime;
    const distanceToPlayer = position.distanceTo(playerPosition);
    
    // Update flight timer
    if (flightMode !== FlightMode.GROUNDED) {
      this.flightTimer += deltaTime;
    } else {
      this.flightTimer = 0;
      this.emergencyLanding = false;
    }

    // Handle emergency landing conditions
    if (this.flightTimer > this.maxFlightTime || position.y > this.maxAltitude) {
      if (!this.emergencyLanding) {
        this.emergencyLanding = true;
        console.log(`🐦 Emergency landing triggered - flight time: ${this.flightTimer.toFixed(1)}s, altitude: ${position.y.toFixed(1)}m`);
      }
      onStartLanding();
      return { shouldFollowFlightPath: false };
    }

    // Player proximity alert system
    if (distanceToPlayer < alertDistance && currentState !== BirdState.ALERT) {
      onStateChange(BirdState.ALERT);
      return { shouldFollowFlightPath: false };
    }

    // State-specific behavior logic
    switch (currentState) {
      case BirdState.IDLE:
        return this.handleIdleState(onStateChange, onStartFlight);
        
      case BirdState.WALKING:
        return this.handleWalkingState(onStateChange);
        
      case BirdState.FORAGING:
        return this.handleForagingState(onStateChange);
        
      case BirdState.ALERT:
        return this.handleAlertState(distanceToPlayer, alertDistance, onStateChange, onStartFlight);
        
      case BirdState.TAKING_OFF:
        return this.handleTakeoffState(flightMode, onStateChange);
        
      case BirdState.FLYING:
        return this.handleFlyingState(onStateChange);
        
      case BirdState.SOARING:
        return this.handleSoaringState(onStateChange, onStartLanding);
        
      case BirdState.LANDING:
        return this.handleLandingState(flightMode, onStateChange);
        
      case BirdState.PREENING:
        return this.handlePreeningState(onStateChange);
        
      default:
        return { shouldFollowFlightPath: false };
    }
  }

  private handleIdleState(
    onStateChange: (newState: BirdState) => void,
    onStartFlight: () => void
  ): { shouldFollowFlightPath: boolean } {
    if (Date.now() > this.nextStateChange) {
      const rand = Math.random();
      if (rand < 0.3) {
        onStateChange(BirdState.WALKING);
      } else if (rand < 0.5) {
        onStateChange(BirdState.FORAGING);
      } else if (rand < 0.65) {
        onStateChange(BirdState.PREENING);
      } else {
        onStartFlight();
      }
    }
    return { shouldFollowFlightPath: false };
  }

  private handleWalkingState(
    onStateChange: (newState: BirdState) => void
  ): { shouldFollowFlightPath: boolean } {
    if (Date.now() > this.nextStateChange) {
      const rand = Math.random();
      if (rand < 0.4) {
        onStateChange(BirdState.IDLE);
      } else if (rand < 0.7) {
        onStateChange(BirdState.FORAGING);
      } else {
        onStateChange(BirdState.PREENING);
      }
    }
    return { shouldFollowFlightPath: false };
  }

  private handleForagingState(
    onStateChange: (newState: BirdState) => void
  ): { shouldFollowFlightPath: boolean } {
    if (Date.now() > this.nextStateChange) {
      const rand = Math.random();
      if (rand < 0.5) {
        onStateChange(BirdState.IDLE);
      } else {
        onStateChange(BirdState.WALKING);
      }
    }
    return { shouldFollowFlightPath: false };
  }

  private handleAlertState(
    distanceToPlayer: number,
    alertDistance: number,
    onStateChange: (newState: BirdState) => void,
    onStartFlight: () => void
  ): { shouldFollowFlightPath: boolean } {
    if (distanceToPlayer > alertDistance * 1.5) {
      onStateChange(BirdState.IDLE);
    } else if (distanceToPlayer < alertDistance * 0.5) {
      onStartFlight();
    }
    return { shouldFollowFlightPath: false };
  }

  private handleTakeoffState(
    flightMode: FlightMode,
    onStateChange: (newState: BirdState) => void
  ): { shouldFollowFlightPath: boolean } {
    if (flightMode === FlightMode.CRUISING) {
      onStateChange(BirdState.FLYING);
    }
    return { shouldFollowFlightPath: true };
  }

  private handleFlyingState(
    onStateChange: (newState: BirdState) => void
  ): { shouldFollowFlightPath: boolean } {
    if (Math.random() < 0.008 && this.flightTimer > 3) {
      onStateChange(BirdState.SOARING);
    }
    return { shouldFollowFlightPath: true };
  }

  private handleSoaringState(
    onStateChange: (newState: BirdState) => void,
    onStartLanding: () => void
  ): { shouldFollowFlightPath: boolean } {
    if (Math.random() < 0.005) {
      onStateChange(BirdState.FLYING);
    } else if (Math.random() < 0.002 && this.flightTimer > this.minFlightTime && !this.emergencyLanding) {
      onStartLanding();
    }
    return { shouldFollowFlightPath: true };
  }

  private handleLandingState(
    flightMode: FlightMode,
    onStateChange: (newState: BirdState) => void
  ): { shouldFollowFlightPath: boolean } {
    if (flightMode === FlightMode.GROUNDED) {
      onStateChange(BirdState.IDLE);
    }
    return { shouldFollowFlightPath: false };
  }

  private handlePreeningState(
    onStateChange: (newState: BirdState) => void
  ): { shouldFollowFlightPath: boolean } {
    if (Date.now() > this.nextStateChange) {
      onStateChange(BirdState.IDLE);
    }
    return { shouldFollowFlightPath: false };
  }

  public scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 5000 + 2000);
  }
}