import * as THREE from 'three';
import { BirdState, FlightMode, BirdBodyParts, WingSegments } from '../../entities/birds/BaseBird';

export interface BirdAnimationState {
  walkCycle: number;
  flapCycle: number;
  headBobCycle: number;
  preenchCycle: number;
  alertLevel: number;
  landingPhase: number;
  takeoffPhase: number;
}

export class BirdAnimationController {
  private animationState: BirdAnimationState;
  private bodyParts: BirdBodyParts;
  private wingSegments: { left: WingSegments; right: WingSegments } | null;
  private previousState: BirdState = BirdState.IDLE;
  private stateTransitionTime: number = 0;
  private transitionDuration: number = 0.5; // Smooth transitions

  constructor(bodyParts: BirdBodyParts, wingSegments?: { left: WingSegments; right: WingSegments }) {
    this.bodyParts = bodyParts;
    this.wingSegments = wingSegments || null;
    
    this.animationState = {
      walkCycle: 0,
      flapCycle: 0,
      headBobCycle: 0,
      preenchCycle: 0,
      alertLevel: 0,
      landingPhase: 0,
      takeoffPhase: 0
    };
  }

  public update(
    deltaTime: number, 
    birdState: BirdState, 
    flightMode: FlightMode,
    isFlapping: boolean,
    velocity: THREE.Vector3
  ): void {
    // Handle state transitions
    if (this.previousState !== birdState) {
      this.stateTransitionTime = 0;
      this.previousState = birdState;
    }
    this.stateTransitionTime += deltaTime;

    // Update animation cycles
    this.updateAnimationCycles(deltaTime, birdState, flightMode, isFlapping, velocity);

    // Apply animations based on current state
    this.applyAnimations(birdState, flightMode, isFlapping, velocity);
  }

  private updateAnimationCycles(
    deltaTime: number,
    birdState: BirdState,
    flightMode: FlightMode,
    isFlapping: boolean,
    velocity: THREE.Vector3
  ): void {
    // Walking cycle - based on velocity
    const walkSpeed = velocity.length();
    if (walkSpeed > 0.1 && flightMode === FlightMode.GROUNDED) {
      this.animationState.walkCycle += deltaTime * walkSpeed * 4;
    }

    // Wing flapping cycle
    if (isFlapping) {
      const flapSpeed = flightMode === FlightMode.ASCENDING ? 18 : 12;
      this.animationState.flapCycle += deltaTime * flapSpeed;
    } else {
      // Slow down flapping when soaring
      this.animationState.flapCycle += deltaTime * 2;
    }

    // Head bobbing - varies by state
    let headBobSpeed = 3;
    switch (birdState) {
      case BirdState.WALKING:
      case BirdState.FORAGING:
        headBobSpeed = 6;
        break;
      case BirdState.ALERT:
        headBobSpeed = 8;
        break;
      case BirdState.PREENING:
        headBobSpeed = 1;
        break;
    }
    this.animationState.headBobCycle += deltaTime * headBobSpeed;

    // Preening cycle
    if (birdState === BirdState.PREENING) {
      this.animationState.preenchCycle += deltaTime * 2;
    }

    // Alert level - smooth transitions
    const targetAlertLevel = birdState === BirdState.ALERT ? 1 : 0;
    this.animationState.alertLevel = THREE.MathUtils.lerp(
      this.animationState.alertLevel,
      targetAlertLevel,
      deltaTime * 3
    );

    // Landing and takeoff phases
    if (birdState === BirdState.LANDING) {
      this.animationState.landingPhase = Math.min(1, this.animationState.landingPhase + deltaTime * 2);
    } else {
      this.animationState.landingPhase = Math.max(0, this.animationState.landingPhase - deltaTime * 2);
    }

    if (birdState === BirdState.TAKING_OFF) {
      this.animationState.takeoffPhase = Math.min(1, this.animationState.takeoffPhase + deltaTime * 2);
    } else {
      this.animationState.takeoffPhase = Math.max(0, this.animationState.takeoffPhase - deltaTime * 2);
    }
  }

  private applyAnimations(
    birdState: BirdState,
    flightMode: FlightMode,
    isFlapping: boolean,
    velocity: THREE.Vector3
  ): void {
    // Apply wing animations
    this.animateWings(birdState, flightMode, isFlapping);

    // Apply leg animations
    this.animateLegs(birdState, flightMode, velocity);

    // Apply head and neck animations
    this.animateHeadAndNeck(birdState, velocity);

    // Apply body animations
    this.animateBody(birdState, flightMode, velocity);

    // Apply tail animations
    this.animateTail(birdState, flightMode, velocity);
  }

  private animateWings(birdState: BirdState, flightMode: FlightMode, isFlapping: boolean): void {
    if (!this.wingSegments) return;

    if (isFlapping) {
      // Active flapping animation
      const flapIntensity = this.getFlapIntensity(flightMode, birdState);
      const wingAngle = Math.sin(this.animationState.flapCycle) * flapIntensity;
      
      // Base wing rotation
      this.bodyParts.leftWing.rotation.z = wingAngle + 0.2;
      this.bodyParts.rightWing.rotation.z = -wingAngle - 0.2;

      // Wing segment movements
      this.animateWingSegments(wingAngle, flapIntensity);
      
    } else {
      // Soaring or idle wing position
      const soarAngle = flightMode === FlightMode.GROUNDED ? 0.1 : 0.6;
      
      this.bodyParts.leftWing.rotation.z = THREE.MathUtils.lerp(
        this.bodyParts.leftWing.rotation.z,
        soarAngle,
        0.05
      );
      this.bodyParts.rightWing.rotation.z = THREE.MathUtils.lerp(
        this.bodyParts.rightWing.rotation.z,
        -soarAngle,
        0.05
      );

      // Gentle feather adjustments for air currents
      if (flightMode !== FlightMode.GROUNDED) {
        this.animateFeathersForSoaring();
      }
    }

    // Landing/takeoff specific wing positions
    this.applyLandingTakeoffWingAdjustments();
  }

  private getFlapIntensity(flightMode: FlightMode, birdState: BirdState): number {
    switch (flightMode) {
      case FlightMode.ASCENDING:
        return 0.9 + this.animationState.takeoffPhase * 0.3;
      case FlightMode.CRUISING:
        return 0.7;
      case FlightMode.DESCENDING:
        return 0.5 + this.animationState.landingPhase * 0.2;
      case FlightMode.GROUNDED:
        return birdState === BirdState.ALERT ? 0.3 : 0.2;
      default:
        return 0.6;
    }
  }

  private animateWingSegments(wingAngle: number, flapIntensity: number): void {
    if (!this.wingSegments) return;

    const upperArmRotation = wingAngle * 0.7;
    const forearmRotation = wingAngle * 0.5;
    const handRotation = wingAngle * 0.3;

    // Left wing segments
    this.wingSegments.left.upperArm.rotation.y = upperArmRotation;
    this.wingSegments.left.forearm.rotation.y = forearmRotation;
    this.wingSegments.left.hand.rotation.y = handRotation;

    // Right wing segments
    this.wingSegments.right.upperArm.rotation.y = -upperArmRotation;
    this.wingSegments.right.forearm.rotation.y = -forearmRotation;
    this.wingSegments.right.hand.rotation.y = -handRotation;

    // Animate primary feathers
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = -Math.PI / 12 * i + wingAngle * 0.5;
      feather.rotation.x = Math.sin(this.animationState.flapCycle + i * 0.2) * 0.1 * flapIntensity;
    });

    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = Math.PI / 12 * i - wingAngle * 0.5;
      feather.rotation.x = Math.sin(this.animationState.flapCycle + i * 0.2) * 0.1 * flapIntensity;
    });

    // Animate secondary feathers
    this.wingSegments.left.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.z = Math.sin(this.animationState.flapCycle + i * 0.3) * 0.1 * flapIntensity;
    });

    this.wingSegments.right.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.z = -Math.sin(this.animationState.flapCycle + i * 0.3) * 0.1 * flapIntensity;
    });
  }

  private animateFeathersForSoaring(): void {
    if (!this.wingSegments) return;

    const time = this.animationState.flapCycle * 0.3;
    
    // Subtle feather movements for air currents
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = Math.sin(time + i * 0.5) * 0.05;
    });

    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = Math.sin(time + i * 0.5) * 0.05;
    });
  }

  private applyLandingTakeoffWingAdjustments(): void {
    // Landing: spread wings wide for air braking
    const landingSpread = this.animationState.landingPhase * 0.4;
    
    // Takeoff: aggressive upstroke
    const takeoffPower = this.animationState.takeoffPhase * 0.5;
    
    const totalAdjustment = landingSpread + takeoffPower;
    
    this.bodyParts.leftWing.rotation.z += totalAdjustment;
    this.bodyParts.rightWing.rotation.z -= totalAdjustment;
  }

  private animateLegs(birdState: BirdState, flightMode: FlightMode, velocity: THREE.Vector3): void {
    if (flightMode === FlightMode.GROUNDED) {
      if (birdState === BirdState.WALKING && velocity.length() > 0.1) {
        // Walking animation
        const leftLegSwing = Math.sin(this.animationState.walkCycle) * 0.4;
        const rightLegSwing = Math.sin(this.animationState.walkCycle + Math.PI) * 0.4;

        this.bodyParts.leftLeg.rotation.x = leftLegSwing;
        this.bodyParts.rightLeg.rotation.x = rightLegSwing;
      } else {
        // Standing position
        this.bodyParts.leftLeg.rotation.x = THREE.MathUtils.lerp(
          this.bodyParts.leftLeg.rotation.x, 0, 0.1
        );
        this.bodyParts.rightLeg.rotation.x = THREE.MathUtils.lerp(
          this.bodyParts.rightLeg.rotation.x, 0, 0.1
        );
      }
    } else {
      // Flight mode - tuck legs up
      const tuckAngle = -0.8;
      this.bodyParts.leftLeg.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.leftLeg.rotation.x, tuckAngle, 0.1
      );
      this.bodyParts.rightLeg.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.rightLeg.rotation.x, tuckAngle, 0.1
      );
    }

    // Landing preparation - extend legs
    if (this.animationState.landingPhase > 0) {
      const legExtension = this.animationState.landingPhase * 0.6;
      this.bodyParts.leftLeg.rotation.x = -legExtension;
      this.bodyParts.rightLeg.rotation.x = -legExtension;
    }
  }

  private animateHeadAndNeck(birdState: BirdState, velocity: THREE.Vector3): void {
    // Head bobbing
    let bobIntensity = 0.05;
    let bobOffset = 0;

    switch (birdState) {
      case BirdState.WALKING:
        bobIntensity = 0.08;
        bobOffset = Math.sin(this.animationState.headBobCycle) * bobIntensity;
        break;
      case BirdState.FORAGING:
        bobIntensity = 0.12;
        bobOffset = Math.sin(this.animationState.headBobCycle * 1.5) * bobIntensity;
        break;
      case BirdState.ALERT:
        bobIntensity = 0.03;
        // Quick, alert head movements
        if (Math.random() < 0.02) {
          this.bodyParts.head.rotation.y = (Math.random() - 0.5) * 0.8;
        }
        break;
      default:
        // Preening and other states
        if (birdState === 'preening') {
          const preenAngle = Math.sin(this.animationState.preenchCycle) * 0.6;
          this.bodyParts.head.rotation.z = preenAngle;
          this.bodyParts.neck.rotation.z = preenAngle * 0.5;
          return;
        }
        break;
    }

    // Apply head bob
    this.bodyParts.head.position.x = 0.6 + bobOffset;
    
    // Smooth return of head rotation when not preening  
    if (birdState !== BirdState.PREENING) {
      this.bodyParts.head.rotation.z = THREE.MathUtils.lerp(
        this.bodyParts.head.rotation.z, 0, 0.1
      );
      this.bodyParts.neck.rotation.z = THREE.MathUtils.lerp(
        this.bodyParts.neck.rotation.z, 0, 0.1
      );
    }

    // Neck stretching when alert
    if (this.animationState.alertLevel > 0) {
      this.bodyParts.neck.scale.y = 1 + this.animationState.alertLevel * 0.2;
    } else {
      this.bodyParts.neck.scale.y = THREE.MathUtils.lerp(
        this.bodyParts.neck.scale.y, 1, 0.1
      );
    }
  }

  private animateBody(birdState: BirdState, flightMode: FlightMode, velocity: THREE.Vector3): void {
    // Body position and orientation
    if (flightMode === FlightMode.GROUNDED) {
      // Walking bob
      if (birdState === BirdState.WALKING && velocity.length() > 0.1) {
        this.bodyParts.body.position.y = Math.sin(this.animationState.walkCycle * 2) * 0.03;
      } else {
        this.bodyParts.body.position.y = THREE.MathUtils.lerp(
          this.bodyParts.body.position.y, 0, 0.1
        );
      }
      
      // Ground orientation
      this.bodyParts.body.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.body.rotation.x, 0, 0.1
      );
    } else {
      // Flight orientation - slight nose down
      const flightAngle = -0.1;
      this.bodyParts.body.rotation.x = THREE.MathUtils.lerp(
        this.bodyParts.body.rotation.x, flightAngle, 0.05
      );
    }

    // Alert posture
    if (this.animationState.alertLevel > 0) {
      this.bodyParts.body.rotation.x -= this.animationState.alertLevel * 0.1;
    }
  }

  private animateTail(birdState: BirdState, flightMode: FlightMode, velocity: THREE.Vector3): void {
    // Tail movements for balance and steering
    let tailSway = 0;
    
    if (flightMode !== FlightMode.GROUNDED) {
      // Flight tail movements
      tailSway = Math.sin(this.animationState.flapCycle * 0.3) * 0.1;
      
      // Banking movements
      if (velocity.length() > 0.1) {
        const bankAngle = velocity.x * 0.02; // Simplified banking based on X velocity
        this.bodyParts.tail.rotation.z = bankAngle;
      }
    } else {
      // Ground tail movements
      if (birdState === BirdState.WALKING) {
        tailSway = Math.sin(this.animationState.walkCycle + Math.PI) * 0.05;
      }
      
      this.bodyParts.tail.rotation.z = THREE.MathUtils.lerp(
        this.bodyParts.tail.rotation.z, 0, 0.1
      );
    }

    this.bodyParts.tail.rotation.y = tailSway;

    // Tail fanning during landing
    if (this.animationState.landingPhase > 0) {
      this.bodyParts.tail.scale.y = 1 + this.animationState.landingPhase * 0.3;
    } else {
      this.bodyParts.tail.scale.y = THREE.MathUtils.lerp(
        this.bodyParts.tail.scale.y, 1, 0.1
      );
    }
  }

  public dispose(): void {
    // Cleanup if needed
    console.log('🐦 [BirdAnimationController] Disposed');
  }
}