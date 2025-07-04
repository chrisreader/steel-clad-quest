import * as THREE from 'three';
import { BaseBird, BirdState, FlightMode, BirdBodyParts, WingSegments, BirdConfig } from './BaseBird';

export class CrowBird extends BaseBird {
  private wingSegments: { left: WingSegments; right: WingSegments } | null = null;
  private materials: {
    feather: THREE.Material;
    beak: THREE.Material;
    eye: THREE.Material;
    leg: THREE.Material;
  } | null = null;

  constructor(id: string) {
    const crowConfig: BirdConfig = {
      species: 'Crow',
      size: 1.0,
      wingspan: 2.4,
      bodyLength: 1.0,
      legLength: 0.6,
      walkSpeed: 1.5,
      flightSpeed: 8.0,
      flightAltitude: { min: 8, max: 25 },
      territoryRadius: 15,
      alertDistance: 8
    };
    
    super(id, crowConfig);
  }

  protected createBirdBody(): void {
    this.createMaterials();
    
    const bodyGroup = new THREE.Group();
    
    // Create body
    const bodyGeometry = new THREE.SphereGeometry(0.2, 16, 12);
    bodyGeometry.scale(1.6, 0.9, 1.1);
    const body = new THREE.Mesh(bodyGeometry, this.materials!.feather);
    bodyGroup.add(body);

    // Create head
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.08, 12, 10);
    headGeometry.scale(1.5, 1.0, 0.9);
    const head = new THREE.Mesh(headGeometry, this.materials!.feather);
    headGroup.add(head);
    headGroup.position.set(0.3, 0.1, 0);
    bodyGroup.add(headGroup);
    
    // Create beak
    const beakGeometry = new THREE.ConeGeometry(0.025, 0.12, 6);
    const beak = new THREE.Mesh(beakGeometry, this.materials!.beak);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.15, -0.02, 0);
    headGroup.add(beak);

    // Create eyes
    const eyeGeometry = new THREE.SphereGeometry(0.025, 6, 4);
    const leftEye = new THREE.Mesh(eyeGeometry, this.materials!.eye);
    const rightEye = new THREE.Mesh(eyeGeometry, this.materials!.eye);
    leftEye.position.set(0.06, 0.04, 0.09);
    rightEye.position.set(0.06, 0.04, -0.09);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Create tail
    const tailGroup = new THREE.Group();
    const tailGeometry = new THREE.SphereGeometry(0.12, 12, 8);
    tailGeometry.scale(2.0, 0.7, 1.4);
    const tail = new THREE.Mesh(tailGeometry, this.materials!.feather);
    tail.position.set(-0.3, -0.03, 0);
    tailGroup.add(tail);
    bodyGroup.add(tailGroup);

    // Create wings
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    const leftWing = this.createWing(true);
    const rightWing = this.createWing(false);
    
    leftWingGroup.add(leftWing);
    rightWingGroup.add(rightWing);
    
    leftWingGroup.position.set(0.1, 0.05, 0.2);
    rightWingGroup.position.set(0.1, 0.05, -0.2);
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create legs
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createLeg();
    const rightLeg = this.createLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    leftLegGroup.position.set(0.05, -0.18, 0.08);
    rightLegGroup.position.set(0.05, -0.18, -0.08);
    
    bodyGroup.add(leftLegGroup);
    bodyGroup.add(rightLegGroup);

    this.bodyParts = {
      body: bodyGroup,
      head: headGroup,
      neck: bodyGroup,
      tail: tailGroup,
      leftWing: leftWingGroup,
      rightWing: rightWingGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      beak: beak,
      leftEye: leftEye,
      rightEye: rightEye
    };

    this.mesh.add(bodyGroup);
  }

  private createMaterials(): void {
    this.materials = {
      feather: new THREE.MeshLambertMaterial({
        color: 0x1a1a1a,
        side: THREE.DoubleSide
      }),
      beak: new THREE.MeshLambertMaterial({
        color: 0x2a2a2a
      }),
      eye: new THREE.MeshLambertMaterial({
        color: 0x000000
      }),
      leg: new THREE.MeshLambertMaterial({
        color: 0x333333
      })
    };
  }

  private createWing(isLeft: boolean): THREE.Group {
    const wingGroup = new THREE.Group();
    const side = isLeft ? 1 : -1;
    
    // Wing structure with proper folding capability
    const shoulderGroup = new THREE.Group();
    const elbowGroup = new THREE.Group();
    const wristGroup = new THREE.Group();
    
    // Wing bones
    const humerusGeometry = new THREE.CapsuleGeometry(0.03, 0.24, 6, 8);
    const humerus = new THREE.Mesh(humerusGeometry, this.materials!.feather);
    humerus.rotation.x = Math.PI / 2;
    shoulderGroup.add(humerus);
    
    const forearmGeometry = new THREE.CapsuleGeometry(0.025, 0.28, 6, 8);
    const forearm = new THREE.Mesh(forearmGeometry, this.materials!.feather);
    forearm.rotation.x = Math.PI / 2;
    forearm.position.set(0, 0, side * 0.14);
    elbowGroup.add(forearm);
    
    const handGeometry = new THREE.CapsuleGeometry(0.02, 0.16, 6, 8);
    const hand = new THREE.Mesh(handGeometry, this.materials!.feather);
    hand.rotation.x = Math.PI / 2;
    hand.position.set(0, 0, side * 0.08);
    wristGroup.add(hand);
    
    // Create feathers
    const primaryFeathers = this.createFeatherGroup(8, 0.3, 0.06, side);
    const secondaryFeathers = this.createFeatherGroup(6, 0.25, 0.05, side);
    
    // Attach feathers to wing segments
    wristGroup.add(primaryFeathers);
    elbowGroup.add(secondaryFeathers);
    
    // Assemble wing hierarchy
    elbowGroup.position.set(0, 0, side * 0.12);
    wristGroup.position.set(0, 0, side * 0.14);
    
    shoulderGroup.add(elbowGroup);
    elbowGroup.add(wristGroup);
    wingGroup.add(shoulderGroup);
    
    // Store wing segments for animation
    const segments: WingSegments = {
      upperArm: humerus,
      forearm: forearm,
      hand: hand,
      primaryFeathers: primaryFeathers.children as THREE.Mesh[],
      secondaryFeathers: secondaryFeathers.children as THREE.Mesh[]
    };

    if (!this.wingSegments) {
      this.wingSegments = { left: segments, right: segments };
    } else {
      if (isLeft) {
        this.wingSegments.left = segments;
      } else {
        this.wingSegments.right = segments;
      }
    }

    // Store joint groups for animation
    wingGroup.userData = {
      shoulder: shoulderGroup,
      elbow: elbowGroup,
      wrist: wristGroup
    };

    return wingGroup;
  }

  private createFeatherGroup(count: number, length: number, baseWidth: number, side: number): THREE.Group {
    const featherGroup = new THREE.Group();
    
    for (let i = 0; i < count; i++) {
      const featherLength = length + (i * 0.01);
      const width = baseWidth + (i * 0.002);
      
      const featherGeometry = new THREE.PlaneGeometry(width, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      feather.position.set(-featherLength / 2, 0, side * i * 0.02);
      feather.rotation.y = side * Math.PI / 2;
      
      featherGroup.add(feather);
    }
    
    return featherGroup;
  }

  private createLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    
    const thighGeometry = new THREE.CapsuleGeometry(0.04, 0.2, 6, 8);
    const thigh = new THREE.Mesh(thighGeometry, this.materials!.leg);
    thigh.position.y = -0.1;
    legGroup.add(thigh);

    const shinGeometry = new THREE.CapsuleGeometry(0.03, 0.15, 6, 8);
    const shin = new THREE.Mesh(shinGeometry, this.materials!.leg);
    shin.position.y = -0.28;
    legGroup.add(shin);
    
    return legGroup;
  }

  protected updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.stateTimer += deltaTime;
    const now = Date.now();
    
    // Check for state timeout recovery
    if (this.isStateTimedOut()) {
      console.log(`🐦 [CrowBird] State timeout recovery from ${this.birdState}`);
      this.recoverFromStuckState();
      return;
    }
    
    // Player proximity check
    if (this.distanceFromPlayer < this.config.alertDistance && this.flightMode === FlightMode.GROUNDED) {
      this.changeState(BirdState.TAKING_OFF);
      return;
    }
    
    // State-specific behavior
    switch (this.birdState) {
      case BirdState.IDLE:
        this.handleIdleState();
        break;
      case BirdState.TAKING_OFF:
        this.handleTakeoffState();
        break;
      case BirdState.FLYING:
      case BirdState.SOARING:
        this.handleFlightState();
        break;
      case BirdState.LANDING:
        this.handleLandingState();
        break;
      default:
        if (now > this.nextStateChange) {
          this.chooseRandomState();
        }
        break;
    }
  }

  private recoverFromStuckState(): void {
    console.log(`🐦 [CrowBird] Recovering from stuck state: ${this.birdState}, Flight: ${this.flightMode}`);
    
    // Force to a safe state based on current flight mode
    if (this.flightMode === FlightMode.GROUNDED) {
      this.changeState(BirdState.IDLE);
    } else {
      this.forceLanding();
    }
  }

  private handleIdleState(): void {
    if (Date.now() > this.nextStateChange) {
      const actions = [BirdState.WALKING, BirdState.FORAGING, BirdState.TAKING_OFF];
      const newState = actions[Math.floor(Math.random() * actions.length)];
      this.changeState(newState);
    }
  }

  private handleTakeoffState(): void {
    // Check if successfully airborne
    if (this.position.y > this.groundLevel + 2.0 && this.flightMode === FlightMode.ASCENDING) {
      this.flightMode = FlightMode.CRUISING;
      this.changeState(BirdState.SOARING);
      console.log(`🐦 [CrowBird] Successfully airborne at altitude ${this.position.y.toFixed(1)}`);
    }
  }

  private handleFlightState(): void {
    // Random flight behavior changes
    if (Date.now() > this.nextStateChange) {
      const shouldLand = Math.random() < 0.3;
      if (shouldLand) {
        this.changeState(BirdState.LANDING);
      } else {
        // Continue flying with new parameters
        this.targetAltitude = this.groundLevel + Math.random() * 15 + 5;
        this.scheduleNextStateChange();
      }
    }
    
    // Occasional flapping during soaring
    if (this.birdState === BirdState.SOARING) {
      this.isFlapping = Math.random() < 0.15; // 15% chance of flapping each frame
    }
  }

  private handleLandingState(): void {
    // Landing is complete when we're on the ground
    if (this.flightMode === FlightMode.GROUNDED) {
      this.changeState(BirdState.IDLE);
      console.log(`🐦 [CrowBird] Landing complete`);
    }
  }

  private chooseRandomState(): void {
    const groundStates = [BirdState.IDLE, BirdState.WALKING, BirdState.FORAGING, BirdState.PREENING];
    const flightStates = [BirdState.SOARING, BirdState.LANDING];
    
    let availableStates: BirdState[];
    if (this.flightMode === FlightMode.GROUNDED) {
      availableStates = [...groundStates, BirdState.TAKING_OFF];
    } else {
      availableStates = flightStates;
    }
    
    const newState = availableStates[Math.floor(Math.random() * availableStates.length)];
    this.changeState(newState);
  }

  protected updateAnimation(deltaTime: number): void {
    if (!this.bodyParts || !this.wingSegments) return;

    this.updateWingAnimation(deltaTime);
    this.updateBodyAnimation(deltaTime);
  }

  private updateWingAnimation(deltaTime: number): void {
    if (!this.wingSegments) return;

    const leftWing = this.bodyParts!.leftWing;
    const rightWing = this.bodyParts!.rightWing;

    if (this.wingsExtended) {
      // Extended wings for flight
      this.updateFlightWingPosition(leftWing, rightWing, deltaTime);
    } else {
      // Folded wings for ground
      this.updateFoldedWingPosition(leftWing, rightWing, deltaTime);
    }
  }

  private updateFlightWingPosition(leftWing: THREE.Group, rightWing: THREE.Group, deltaTime: number): void {
    // Extended wing position
    const targetLeftRotation = { x: 0, y: 0, z: Math.PI / 3 }; // Extended outward
    const targetRightRotation = { x: 0, y: 0, z: -Math.PI / 3 };

    // Smooth interpolation to extended position
    this.interpolateRotation(leftWing, targetLeftRotation, deltaTime * 3);
    this.interpolateRotation(rightWing, targetRightRotation, deltaTime * 3);

    // Flapping animation
    if (this.isFlapping) {
      this.flapCycle += deltaTime * 15; // Fast flapping
      const flapIntensity = Math.sin(this.flapCycle) * 0.3;
      
      leftWing.rotation.z += flapIntensity;
      rightWing.rotation.z -= flapIntensity;
    }
  }

  private updateFoldedWingPosition(leftWing: THREE.Group, rightWing: THREE.Group, deltaTime: number): void {
    // Folded wing position against body
    const targetLeftRotation = { x: 0, y: 0, z: Math.PI / 12 }; // Slightly angled down
    const targetRightRotation = { x: 0, y: 0, z: -Math.PI / 12 };

    // Smooth interpolation to folded position
    this.interpolateRotation(leftWing, targetLeftRotation, deltaTime * 4);
    this.interpolateRotation(rightWing, targetRightRotation, deltaTime * 4);
  }

  private interpolateRotation(object: THREE.Group, target: { x: number; y: number; z: number }, factor: number): void {
    object.rotation.x = THREE.MathUtils.lerp(object.rotation.x, target.x, factor);
    object.rotation.y = THREE.MathUtils.lerp(object.rotation.y, target.y, factor);
    object.rotation.z = THREE.MathUtils.lerp(object.rotation.z, target.z, factor);
  }

  private updateBodyAnimation(deltaTime: number): void {
    // Head bobbing for walking
    if (this.birdState === BirdState.WALKING) {
      this.headBobCycle += deltaTime * 8;
      const bobAmount = Math.sin(this.headBobCycle) * 0.02;
      this.bodyParts!.head.position.y = 0.1 + bobAmount;
    }

    // Body pitch for flight
    if (this.flightMode !== FlightMode.GROUNDED) {
      const targetPitch = this.velocity.y * 0.1; // Pitch based on vertical velocity
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, targetPitch, deltaTime * 2);
    } else {
      // Level out when on ground
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, deltaTime * 4);
    }
  }
}