import * as THREE from 'three';
import { BaseBird } from '../core/BaseBird';
import { BirdState, FlightMode, CROW_CONFIG, WingSegments } from '../core/BirdTypes';
import { BirdMaterials } from '../core/BirdMaterials';
import { BirdBodyBuilder } from '../components/BirdBodyBuilder';
import { BirdBehaviorSystem } from '../behavior/BirdBehaviorSystem';
import { BirdAnimationController } from '../../animation/birds/BirdAnimationController';

export class CrowBird extends BaseBird {
  private wingSegments: { left: WingSegments; right: WingSegments } | null = null;
  private behaviorSystem: BirdBehaviorSystem;
  private animationController: BirdAnimationController | null = null;

  constructor(id: string) {
    super(id, CROW_CONFIG);
    
    // Enhanced flight bounds system
    this.behaviorSystem = new BirdBehaviorSystem(30, 10, 35); // Max 30s flight, min 10s, max altitude 35
  }

  protected createBirdBody(): void {
    const materials = BirdMaterials.createCrowMaterials();
    const bodyBuilder = new BirdBodyBuilder(materials);
    
    const { bodyParts, wingSegments } = bodyBuilder.createBirdBody();
    
    this.bodyParts = bodyParts;
    this.wingSegments = wingSegments;
    this.mesh.add(bodyParts.body);
    
    // Initialize animation controller
    this.animationController = new BirdAnimationController(bodyParts, wingSegments);
  }

  protected updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
    const result = this.behaviorSystem.updateBehavior(
      deltaTime,
      playerPosition,
      this.birdState,
      this.flightMode,
      this.position,
      this.config.alertDistance,
      (newState) => this.changeState(newState),
      () => this.startFlight(),
      () => this.startLanding()
    );

    // Handle flight mode transitions
    this.updateFlightMode(deltaTime);

    // Follow flight path if needed
    if (result.shouldFollowFlightPath) {
      this.followFlightPath(deltaTime);
    }

    // Handle grounded movement
    if (this.flightMode === FlightMode.GROUNDED && 
        (this.birdState === BirdState.WALKING || this.birdState === BirdState.FORAGING)) {
      this.updateGroundMovement(deltaTime);
    }
  }

  protected updateAnimation(deltaTime: number): void {
    if (this.animationController) {
      this.animationController.update(
        deltaTime,
        this.birdState,
        this.flightMode,
        this.isFlapping,
        this.velocity
      );
    }
  }

  private updateFlightMode(deltaTime: number): void {
    const currentAltitude = this.position.y;
    const groundDistance = currentAltitude - this.groundLevel;

    switch (this.flightMode) {
      case FlightMode.ASCENDING:
        if (groundDistance > 8 && currentAltitude >= this.targetAltitude * 0.8) {
          this.flightMode = FlightMode.CRUISING;
          console.log(`🐦 [${this.config.species}] Switched to cruising at altitude: ${currentAltitude.toFixed(1)}`);
        }
        break;

      case FlightMode.CRUISING:
        // Stay in cruising mode during normal flight
        break;

      case FlightMode.LANDING_APPROACH:
        if (groundDistance < 1.0) {
          this.flightMode = FlightMode.GROUNDED;
          this.velocity.set(0, 0, 0);
          console.log(`🐦 [${this.config.species}] Landed successfully`);
        }
        break;
    }
  }

  private updateGroundMovement(deltaTime: number): void {
    // Simple ground movement - small random walks
    if (Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 0.5 + 0.2;
      
      this.velocity.x = Math.cos(angle) * distance;
      this.velocity.z = Math.sin(angle) * distance;
      this.velocity.y = 0;
      
      // Face movement direction
      this.mesh.rotation.y = angle;
    } else {
      // Gradually stop
      this.velocity.x *= 0.95;
      this.velocity.z *= 0.95;
    }
  }

  public dispose(): void {
    super.dispose();
    
    if (this.animationController) {
      this.animationController.dispose();
    }
    
    console.log(`🐦 [CrowBird] Disposed crow-specific resources`);
  }
}