import * as THREE from 'three';
import { BirdState, FlightMode, BirdConfig } from '../BaseBird';

export class BirdStateManager {
  private birdState: BirdState = BirdState.IDLE;
  private flightMode: FlightMode = FlightMode.GROUNDED;
  private stateTimer: number = 0;
  private nextStateChange: number = 0;

  constructor(private config: BirdConfig) {
    this.scheduleNextStateChange();
  }

  public getCurrentState(): BirdState {
    return this.birdState;
  }

  public getFlightMode(): FlightMode {
    return this.flightMode;
  }

  public setFlightMode(mode: FlightMode): void {
    this.flightMode = mode;
  }

  public updateBehavior(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    birdPosition: THREE.Vector3,
    distanceFromPlayer: number
  ): { shouldStartFlight: boolean; shouldStartLanding: boolean } {
    this.stateTimer += deltaTime;
    
    let shouldStartFlight = false;
    let shouldStartLanding = false;

    // Check for state transitions based on time and conditions
    if (Date.now() > this.nextStateChange) {
      if (this.flightMode === FlightMode.GROUNDED) {
        // Ground behavior transitions
        if (this.birdState === BirdState.IDLE) {
          // Sometimes start walking or foraging
          if (Math.random() < 0.6) {
            this.changeState(BirdState.WALKING);
          } else if (Math.random() < 0.3) {
            this.changeState(BirdState.FORAGING);
          } else {
            // Start flight
            shouldStartFlight = true;
          }
        } else if (this.birdState === BirdState.WALKING || this.birdState === BirdState.FORAGING) {
          // Transition back to idle or start flight
          if (Math.random() < 0.4) {
            this.changeState(BirdState.IDLE);
          } else {
            shouldStartFlight = true;
          }
        }
      } else {
        // Flight behavior transitions
        if (this.birdState === BirdState.FLYING) {
          // Sometimes transition to soaring
          if (Math.random() < 0.3) {
            this.changeState(BirdState.SOARING);
          } else if (Math.random() < 0.2) {
            // Start landing
            shouldStartLanding = true;
          }
        } else if (this.birdState === BirdState.SOARING) {
          // Transition back to active flying or start landing
          if (Math.random() < 0.5) {
            this.changeState(BirdState.FLYING);
          } else if (Math.random() < 0.3) {
            shouldStartLanding = true;
          }
        } else if (this.birdState === BirdState.TAKING_OFF) {
          // Transition to flying when takeoff is complete
          if (birdPosition.y > 10) { // Arbitrary height threshold
            this.changeState(BirdState.FLYING);
          }
        }
      }
    }

    // Alert behavior when player is nearby
    if (distanceFromPlayer < this.config.alertDistance && this.birdState !== BirdState.ALERT) {
      this.changeState(BirdState.ALERT);
      
      // High chance to take flight when alerted
      if (this.flightMode === FlightMode.GROUNDED && Math.random() < 0.8) {
        shouldStartFlight = true;
      }
    } else if (distanceFromPlayer > this.config.alertDistance * 1.5 && this.birdState === BirdState.ALERT) {
      // Return to normal behavior when player moves away
      this.changeState(BirdState.IDLE);
    }

    return { shouldStartFlight, shouldStartLanding };
  }

  public changeState(newState: BirdState): void {
    if (this.birdState === newState) return;
    
    console.log(`🐦 [${this.config.species}] State change: ${this.birdState} -> ${newState}`);
    this.birdState = newState;
    this.stateTimer = 0;
    this.scheduleNextStateChange();
  }

  public startFlight(): void {
    this.flightMode = FlightMode.ASCENDING;
    this.changeState(BirdState.TAKING_OFF);
    console.log(`🐦 [${this.config.species}] Starting flight`);
  }

  public startLanding(): void {
    this.flightMode = FlightMode.LANDING_APPROACH;
    this.changeState(BirdState.LANDING);
    console.log(`🐦 [${this.config.species}] Starting landing approach`);
  }

  public completeLanding(): void {
    this.flightMode = FlightMode.GROUNDED;
    this.changeState(BirdState.IDLE);
    console.log(`🐦 [${this.config.species}] Landing completed`);
  }

  private scheduleNextStateChange(): void {
    this.nextStateChange = Date.now() + (Math.random() * 5000 + 2000); // 2-7 seconds
  }
}