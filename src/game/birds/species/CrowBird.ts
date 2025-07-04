import * as THREE from 'three';
import { BaseBird } from '../core/BaseBird';
import { BirdConfig, BirdMaterials, WingSegments } from '../core/BirdTypes';
import { BirdMaterialManager } from '../materials/BirdMaterialManager';
import { BirdBodyBuilder } from '../geometry/BirdBodyBuilder';
import { BirdBehaviorSystem } from '../behavior/BirdBehaviorSystem';
import { FlightPhysics } from '../behavior/FlightPhysics';
import { BirdAnimationController } from '../animation/BirdAnimationController';

export class CrowBird extends BaseBird {
  private materials: BirdMaterials | null = null;
  private wingSegments: { left: WingSegments; right: WingSegments } | null = null;
  private behaviorSystem: BirdBehaviorSystem;
  private animationController: BirdAnimationController | null = null;
  private soaringAltitudeLoss: number = 0;

  constructor(id: string) {
    const crowConfig: BirdConfig = {
      species: 'Crow',
      size: 1.0,
      wingspan: 2.4,
      bodyLength: 1.0,
      legLength: 0.6,
      walkSpeed: 1.5,
      flightSpeed: 8.0,
      flightAltitude: { min: 15, max: 35 },
      territoryRadius: 25,
      alertDistance: 8
    };
    
    super(id, crowConfig);
    this.behaviorSystem = new BirdBehaviorSystem(crowConfig);
  }

  protected createBirdBody(): void {
    this.materials = BirdMaterialManager.createCrowMaterials();
    
    const bodyResult = BirdBodyBuilder.createBirdBody(this.materials);
    this.bodyParts = bodyResult.bodyParts;
    this.wingSegments = bodyResult.wingSegments;
    this.mesh.add(bodyResult.mesh);
    
    // Initialize animation controller
    this.animationController = new BirdAnimationController(this.bodyParts, this.wingSegments);
  }

  protected updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
    const result = this.behaviorSystem.updateBehavior(
      deltaTime,
      playerPosition,
      this.position,
      this.flightMode,
      this.birdState,
      this.config,
      this.distanceFromPlayer,
      this.groundLevel,
      {
        changeState: (state) => this.changeState(state),
        startFlight: () => this.startFlight(),
        startLanding: () => this.startLanding(),
        forceGrounding: () => this.forceGrounding()
      }
    );

    if (result.shouldContinue) {
      this.behaviorSystem.executeCurrentState(
        deltaTime,
        this.birdState,
        this.config,
        this.position,
        this.homePosition,
        this.targetPosition,
        this.groundLevel,
        this.velocity,
        this.mesh,
        {
          setRandomTargetPosition: (range) => this.setRandomTargetPosition(range),
          moveTowardTarget: (dt, speed) => this.moveTowardTarget(dt, speed),
          followFlightPath: (dt) => this.followFlightPath(dt)
        }
      );
    }
  }

  protected updateAnimation(deltaTime: number): void {
    if (!this.animationController) return;
    
    this.animationController.update(
      deltaTime,
      this.birdState,
      this.flightMode,
      this.isFlapping,
      this.velocity
    );
  }

  protected updateFlightPhysics(deltaTime: number): void {
    const result = FlightPhysics.updateFlightPhysics(
      deltaTime,
      this.velocity,
      this.position,
      this.isFlapping,
      this.wingBeatIntensity,
      this.birdState,
      this.flightMode,
      this.targetAltitude,
      this.groundLevel
    );
    
    this.soaringAltitudeLoss = result.soaringAltitudeLoss;
    this.isFlapping = result.updatedFlapping;
    this.wingBeatIntensity = result.updatedIntensity;
  }

  private forceGrounding(): void {
    this.flightMode = this.FlightMode.GROUNDED;
    const feetToBodyDistance = 0.48;
    this.position.y = this.groundLevel + feetToBodyDistance;
    this.velocity.set(0, 0, 0);
    this.mesh.rotation.z = 0;
    this.mesh.rotation.x = 0;
    this.changeState(this.BirdState.IDLE);
    this.behaviorSystem.resetFlightTimer();
  }

  private setRandomTargetPosition(range: number = 8): void {
    const currentDirection = this.mesh.rotation.y;
    const forwardBias = (Math.random() - 0.5) * (Math.PI / 3);
    const angle = currentDirection + forwardBias;
    const distance = Math.random() * range;
    
    this.targetPosition.set(
      this.homePosition.x + Math.cos(angle) * distance,
      this.groundLevel,
      this.homePosition.z + Math.sin(angle) * distance
    );
  }

  private moveTowardTarget(deltaTime: number, speed: number): void {
    const direction = this.targetPosition.clone().sub(this.position);
    direction.y = 0;
    
    if (direction.length() > 0.1) {
      direction.normalize();
      this.velocity.copy(direction.multiplyScalar(speed));
      const targetDirection = Math.atan2(direction.z, direction.x);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetDirection, 0.15);
    } else {
      this.velocity.set(0, 0, 0);
    }
  }

  public dispose(): void {
    this.animationController?.dispose();
    super.dispose();
  }
}