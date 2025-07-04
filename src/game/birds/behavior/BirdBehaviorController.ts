import * as THREE from 'three';
import { BirdState, FlightMode, BirdConfig } from '../core/BirdTypes';

export class BirdBehaviorController {
  private birdState: BirdState;
  private flightMode: FlightMode;
  private config: BirdConfig;
  private stateTimer: number = 0;
  private nextStateChange: number = 0;
  private distanceFromPlayer: number = 0;
  
  // Enhanced flight systems
  private maxFlightTime: number = 30; // Extended flight duration
  private minFlightTime: number = 10; // Minimum flight before landing allowed
  private flightTimer: number = 0;
  private maxAltitude: number = 35; // Higher ceiling
  private emergencyLanding: boolean = false;

  constructor(config: BirdConfig) {
    this.config = config;
    this.birdState = BirdState.IDLE;
    this.flightMode = FlightMode.GROUNDED;
    
    // Enhanced flight bounds system
    this.maxFlightTime = 30; // Max 30 seconds in air
    this.minFlightTime = 10; // Min 10 seconds before landing
    this.flightTimer = 0;
    this.maxAltitude = 35; // Higher ceiling
    this.emergencyLanding = false;
    
    this.scheduleNextStateChange();
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3, currentPosition: THREE.Vector3): {
    birdState: BirdState;
    flightMode: FlightMode;
    shouldStartFlight: boolean;
    shouldStartLanding: boolean;
  } {
    this.stateTimer += deltaTime;
    this.distanceFromPlayer = currentPosition.distanceTo(playerPosition);
    
    // Update flight timer if in flight
    if (this.flightMode !== FlightMode.GROUNDED) {
      this.flightTimer += deltaTime;
    } else {
      this.flightTimer = 0;
    }

    // Flight bounds management - LANDING LOGIC
    if (this.flightMode !== FlightMode.GROUNDED) {
      // Emergency landing due to altitude
      if (currentPosition.y > this.maxAltitude) {
        this.emergencyLanding = true;
        console.log(`🐦 [${this.config.species}] Emergency landing - too high: ${currentPosition.y.toFixed(1)} > ${this.maxAltitude}`);
        return {
          birdState: this.birdState,
          flightMode: this.flightMode,
          shouldStartFlight: false,
          shouldStartLanding: true
        };
      }
      
      // Landing due to flight duration (only if minimum flight time met)
      const shouldLandByTime = this.flightTimer > this.maxFlightTime && this.flightTimer >= this.minFlightTime;
      
      if (shouldLandByTime || this.emergencyLanding) {
        this.emergencyLanding = false;
        console.log(`🐦 [${this.config.species}] Landing due to: ${shouldLandByTime ? 'time limit' : 'emergency'} after ${this.flightTimer.toFixed(1)}s flight`);
        return {
          birdState: this.birdState,
          flightMode: this.flightMode,
          shouldStartFlight: false,
          shouldStartLanding: true
        };
      }
    }

    // State management - only check if enough time has passed
    if (Date.now() >= this.nextStateChange) {
      return this.decideNextState();
    }

    return {
      birdState: this.birdState,
      flightMode: this.flightMode,
      shouldStartFlight: false,
      shouldStartLanding: false
    };
  }

  private decideNextState(): {
    birdState: BirdState;
    flightMode: FlightMode;
    shouldStartFlight: boolean;
    shouldStartLanding: boolean;
  } {
    // Player interaction - alert if too close, flee if very close
    if (this.distanceFromPlayer < this.config.alertDistance && this.flightMode === FlightMode.GROUNDED) {
      if (this.distanceFromPlayer < this.config.alertDistance * 0.6) {
        this.changeState(BirdState.ALERT);
        return {
          birdState: this.birdState,
          flightMode: this.flightMode,
          shouldStartFlight: true,
          shouldStartLanding: false
        };
      } else {
        this.changeState(BirdState.ALERT);
        return {
          birdState: this.birdState,
          flightMode: this.flightMode,
          shouldStartFlight: false,
          shouldStartLanding: false
        };
      }
    }

    // Normal state transitions based on current state
    const rand = Math.random();
    
    switch (this.birdState) {
      case BirdState.IDLE:
        if (rand < 0.3) {
          this.changeState(BirdState.WALKING);
        } else if (rand < 0.5) {
          this.changeState(BirdState.FORAGING);
        } else if (rand < 0.7) {
          this.changeState(BirdState.PREENING);
        } else if (rand < 0.85 && this.flightMode === FlightMode.GROUNDED) {
          return {
            birdState: this.birdState,
            flightMode: this.flightMode,
            shouldStartFlight: true,
            shouldStartLanding: false
          };
        }
        break;
        
      case BirdState.WALKING:
      case BirdState.FORAGING:
      case BirdState.PREENING:
        if (rand < 0.4) {
          this.changeState(BirdState.IDLE);
        } else if (rand < 0.7 && this.flightMode === FlightMode.GROUNDED) {
          return {
            birdState: this.birdState,
            flightMode: this.flightMode,
            shouldStartFlight: true,
            shouldStartLanding: false
          };
        }
        break;
        
      case BirdState.ALERT:
        if (this.distanceFromPlayer > this.config.alertDistance * 1.5) {
          this.changeState(BirdState.IDLE);
        }
        break;
    }

    return {
      birdState: this.birdState,
      flightMode: this.flightMode,
      shouldStartFlight: false,
      shouldStartLanding: false
    };
  }

  private scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 5000 + 2000);
  }

  private changeState(newState: BirdState): void {
    if (this.birdState === newState) return;
    
    console.log(`🐦 [${this.config.species}] State change: ${this.birdState} -> ${newState}`);
    this.birdState = newState;
    this.stateTimer = 0;
    this.scheduleNextStateChange();
  }

  public setState(newState: BirdState): void {
    this.changeState(newState);
  }

  public setFlightMode(newMode: FlightMode): void {
    this.flightMode = newMode;
  }

  public getBirdState(): BirdState {
    return this.birdState;
  }

  public getFlightMode(): FlightMode {
    return this.flightMode;
  }
}