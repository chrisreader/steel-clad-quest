import * as THREE from 'three';
import { BaseBird, BirdState, FlightMode, BirdBodyParts, WingSegments, BirdConfig } from './BaseBird';
import { TextureGenerator } from '../../utils';

export class CrowBird extends BaseBird {
  private wingSegments: { left: WingSegments; right: WingSegments } | null = null;
  private featherTexture: THREE.Texture | null = null;
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
    this.createEnhancedTextures();
    
    const bodyGroup = new THREE.Group();
    
    // Create realistic crow body (wider chest, tapered belly)
    const bodyGeometry = this.createRealisticBodyGeometry();
    const body = new THREE.Mesh(bodyGeometry, this.materials.feather);
    body.rotation.z = Math.PI / 2; // Horizontal orientation
    bodyGroup.add(body);

    // Create neck with proper hierarchy
    const neckGroup = new THREE.Group();
    const neckGeometry = this.createNeckGeometry();
    const neck = new THREE.Mesh(neckGeometry, this.materials.feather);
    neckGroup.add(neck);
    neckGroup.position.set(0.4, 0.1, 0); // Proper neck attachment point
    bodyGroup.add(neckGroup);

    // Create head with realistic crow shape
    const headGroup = new THREE.Group();
    const headGeometry = this.createRealisticHeadGeometry();
    const head = new THREE.Mesh(headGeometry, this.materials.feather);
    headGroup.add(head);
    headGroup.position.set(0.3, 0, 0); // Attach to neck
    neckGroup.add(headGroup);
    
    // Create realistic curved crow beak
    const beakGroup = new THREE.Group();
    const beak = this.createRealisticBeak();
    beakGroup.add(beak);
    beakGroup.position.set(0.25, -0.05, 0);
    headGroup.add(beakGroup);

    // Create realistic eyes with proper positioning
    const { leftEye, rightEye } = this.createRealisticEyes();
    leftEye.position.set(0.15, 0.05, 0.12);
    rightEye.position.set(0.15, 0.05, -0.12);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Create realistic tail fan
    const tailGroup = new THREE.Group();
    const tail = this.createRealisticTail();
    tailGroup.add(tail);
    tailGroup.position.set(-0.5, 0, 0);
    bodyGroup.add(tailGroup);

    // Create wings with proper shoulder attachment
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    const leftWing = this.createRealisticWing(true);
    const rightWing = this.createRealisticWing(false);
    
    leftWingGroup.add(leftWing);
    rightWingGroup.add(rightWing);
    
    // Proper shoulder positioning
    leftWingGroup.position.set(0.1, 0.15, 0.25);
    rightWingGroup.position.set(0.1, 0.15, -0.25);
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create realistic legs with proper proportions
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createRealisticLeg();
    const rightLeg = this.createRealisticLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    // Proper leg attachment points
    leftLegGroup.position.set(-0.1, -0.2, 0.15);
    rightLegGroup.position.set(-0.1, -0.2, -0.15);
    
    bodyGroup.add(leftLegGroup);
    bodyGroup.add(rightLegGroup);

    this.bodyParts = {
      body: bodyGroup,
      head: headGroup,
      neck: neckGroup,
      tail: tailGroup,
      leftWing: leftWingGroup,
      rightWing: rightWingGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      beak: beak, // Use the actual mesh, not the group
      leftEye: leftEye,
      rightEye: rightEye
    };

    this.mesh.add(bodyGroup);
  }

  private createEnhancedTextures(): void {
    // Create realistic feather texture with iridescent sheen
    this.featherTexture = TextureGenerator.createMetalTexture(0x1a1a1a, 50, 0.3);
    
    // Enhanced materials with proper PBR properties
    this.materials = {
      feather: new THREE.MeshPhysicalMaterial({
        color: 0x1a1a1a,
        map: this.featherTexture,
        roughness: 0.7,
        metalness: 0.1,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1
      }),
      beak: new THREE.MeshPhysicalMaterial({
        color: 0x2a2a2a,
        roughness: 0.2,
        metalness: 0.0
      }),
      eye: new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        roughness: 0.1,
        metalness: 0.0
      }),
      leg: new THREE.MeshPhysicalMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.0
      })
    };
  }

  private createRealisticBodyGeometry(): THREE.BufferGeometry {
    // Create a more bird-like body shape - wider chest, tapered belly
    const shape = new THREE.Shape();
    
    // Define crow body profile
    shape.moveTo(-0.5, 0);
    shape.bezierCurveTo(-0.3, 0.25, 0.1, 0.3, 0.4, 0.2);  // Top curve (back)
    shape.bezierCurveTo(0.45, 0.1, 0.4, -0.1, 0.3, -0.15); // Front taper
    shape.bezierCurveTo(0.1, -0.2, -0.2, -0.25, -0.5, -0.1); // Bottom curve (belly)
    shape.bezierCurveTo(-0.5, -0.05, -0.5, 0.05, -0.5, 0);  // Close
    
    const extrudeSettings = {
      depth: 0.4,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private createNeckGeometry(): THREE.BufferGeometry {
    // Create curved neck geometry
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, 0.05, 0),
      new THREE.Vector3(0.2, 0.1, 0),
      new THREE.Vector3(0.3, 0.12, 0)
    ]);
    
    return new THREE.TubeGeometry(curve, 8, 0.12, 8, false);
  }

  private createRealisticHeadGeometry(): THREE.BufferGeometry {
    // Create more angular crow head shape
    const headShape = new THREE.Shape();
    
    headShape.moveTo(-0.15, 0);
    headShape.bezierCurveTo(-0.1, 0.18, 0.05, 0.2, 0.2, 0.15);  // Top of head
    headShape.bezierCurveTo(0.25, 0.1, 0.25, 0, 0.2, -0.05);    // Front
    headShape.bezierCurveTo(0.15, -0.15, 0, -0.18, -0.15, -0.1); // Bottom
    headShape.bezierCurveTo(-0.18, -0.05, -0.18, 0.05, -0.15, 0); // Back
    
    const extrudeSettings = {
      depth: 0.25,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.01,
      bevelThickness: 0.01
    };
    
    return new THREE.ExtrudeGeometry(headShape, extrudeSettings);
  }

  private createRealisticBeak(): THREE.Mesh {
    // Create curved crow beak
    const beakCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, -0.02, 0),
      new THREE.Vector3(0.2, -0.06, 0),
      new THREE.Vector3(0.25, -0.08, 0)
    ]);
    
    const beakGeometry = new THREE.TubeGeometry(beakCurve, 6, 0.04, 6, false);
    return new THREE.Mesh(beakGeometry, this.materials!.beak);
  }

  private createRealisticEyes(): { leftEye: THREE.Mesh; rightEye: THREE.Mesh } {
    const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 6);
    
    const leftEye = new THREE.Mesh(eyeGeometry, this.materials!.eye);
    const rightEye = new THREE.Mesh(eyeGeometry, this.materials!.eye);
    
    return { leftEye, rightEye };
  }

  private createRealisticTail(): THREE.Group {
    const tailGroup = new THREE.Group();
    
    // Create individual tail feathers in a fan arrangement
    for (let i = 0; i < 7; i++) {
      const featherGeometry = new THREE.PlaneGeometry(0.08, 0.4);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      const angle = (i - 3) * 0.2; // Spread feathers in fan
      feather.rotation.y = angle;
      feather.position.set(Math.sin(angle) * 0.1, 0, Math.cos(angle) * 0.1 - 0.2);
      
      tailGroup.add(feather);
    }
    
    return tailGroup;
  }

  private createRealisticWing(isLeft: boolean): THREE.Group {
    const wingGroup = new THREE.Group();
    
    // Shoulder joint (humerus)
    const shoulderGroup = new THREE.Group();
    const humerusGeometry = new THREE.CapsuleGeometry(0.06, 0.4, 6, 8);
    const humerus = new THREE.Mesh(humerusGeometry, this.materials!.feather);
    humerus.rotation.z = isLeft ? Math.PI / 6 : -Math.PI / 6;
    shoulderGroup.add(humerus);
    wingGroup.add(shoulderGroup);

    // Elbow joint (radius/ulna) - attached to shoulder
    const elbowGroup = new THREE.Group();
    const radiusGeometry = new THREE.CapsuleGeometry(0.04, 0.5, 6, 8);
    const radius = new THREE.Mesh(radiusGeometry, this.materials!.feather);
    radius.rotation.z = isLeft ? Math.PI / 8 : -Math.PI / 8;
    elbowGroup.add(radius);
    elbowGroup.position.set(isLeft ? 0.3 : -0.3, 0, isLeft ? 0.15 : -0.15);
    shoulderGroup.add(elbowGroup);

    // Wrist joint (carpometacarpus) - attached to elbow
    const wristGroup = new THREE.Group();
    const carpusGeometry = new THREE.CapsuleGeometry(0.03, 0.3, 6, 8);
    const carpus = new THREE.Mesh(carpusGeometry, this.materials!.feather);
    wristGroup.add(carpus);
    wristGroup.position.set(isLeft ? 0.4 : -0.4, 0, isLeft ? 0.1 : -0.1);
    elbowGroup.add(wristGroup);

    // Primary flight feathers (10 long feathers from wrist)
    const primaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const featherLength = 0.6 - (i * 0.05); // Decreasing length
      const featherGeometry = new THREE.PlaneGeometry(0.1, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      const featherAngle = (i - 4.5) * 0.1;
      feather.rotation.y = isLeft ? featherAngle : -featherAngle;
      feather.position.set(
        isLeft ? 0.2 + i * 0.05 : -0.2 - i * 0.05,
        0,
        isLeft ? 0.3 - i * 0.03 : -0.3 + i * 0.03
      );
      
      primaryFeathers.push(feather);
      wristGroup.add(feather);
    }

    // Secondary flight feathers (inner wing)
    const secondaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const featherGeometry = new THREE.PlaneGeometry(0.12, 0.4);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      feather.position.set(
        isLeft ? 0.1 + i * 0.04 : -0.1 - i * 0.04,
        0,
        isLeft ? 0.2 - i * 0.02 : -0.2 + i * 0.02
      );
      
      secondaryFeathers.push(feather);
      elbowGroup.add(feather);
    }

    // Covert feathers (wing covering)
    for (let i = 0; i < 6; i++) {
      const covertGeometry = new THREE.PlaneGeometry(0.08, 0.2);
      const covert = new THREE.Mesh(covertGeometry, this.materials!.feather);
      
      covert.position.set(
        isLeft ? 0.05 + i * 0.03 : -0.05 - i * 0.03,
        0.02,
        isLeft ? 0.15 - i * 0.02 : -0.15 + i * 0.02
      );
      
      shoulderGroup.add(covert);
    }

    // Store wing segments for animation
    const segments: WingSegments = {
      upperArm: humerus,
      forearm: radius,
      hand: carpus,
      primaryFeathers,
      secondaryFeathers
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

    return wingGroup;
  }

  private createRealisticLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    
    // Thigh (femur) - thicker, more realistic proportions
    const thighGeometry = new THREE.CapsuleGeometry(0.08, 0.25, 6, 8);
    const thigh = new THREE.Mesh(thighGeometry, this.materials!.leg);
    thigh.position.y = -0.125;
    legGroup.add(thigh);

    // Knee joint
    const kneeGroup = new THREE.Group();
    kneeGroup.position.y = -0.25;
    legGroup.add(kneeGroup);

    // Shin (tibiotarsus) - thinner, longer
    const shinGeometry = new THREE.CapsuleGeometry(0.04, 0.35, 6, 8);
    const shin = new THREE.Mesh(shinGeometry, this.materials!.leg);
    shin.position.y = -0.175;
    kneeGroup.add(shin);

    // Ankle joint
    const ankleGroup = new THREE.Group();
    ankleGroup.position.y = -0.35;
    kneeGroup.add(ankleGroup);

    // Tarsus (foot segment)
    const tarsusGeometry = new THREE.CapsuleGeometry(0.03, 0.1, 6, 8);
    const tarsus = new THREE.Mesh(tarsusGeometry, this.materials!.leg);
    tarsus.position.y = -0.05;
    ankleGroup.add(tarsus);

    // Realistic crow foot with proper toe arrangement
    const footGroup = new THREE.Group();
    footGroup.position.y = -0.1;
    ankleGroup.add(footGroup);

    // Three forward toes
    for (let i = 0; i < 3; i++) {
      const toeGroup = new THREE.Group();
      
      // Toe segments (3 per toe)
      const toeLength = 0.08 - (i * 0.01); // Middle toe longest
      for (let j = 0; j < 3; j++) {
        const segmentLength = toeLength / 3 * (1 - j * 0.2);
        const toeGeometry = new THREE.CapsuleGeometry(0.008, segmentLength, 4, 6);
        const toeSegment = new THREE.Mesh(toeGeometry, this.materials!.leg);
        toeSegment.position.set(0, 0, j * segmentLength * 0.8);
        toeSegment.rotation.x = j * 0.2; // Slight curve
        toeGroup.add(toeSegment);
      }
      
      // Claw at tip
      const clawGeometry = new THREE.ConeGeometry(0.005, 0.02, 4);
      const claw = new THREE.Mesh(clawGeometry, this.materials!.leg);
      claw.position.set(0, 0, toeLength);
      claw.rotation.x = Math.PI / 6; // Curved claw
      toeGroup.add(claw);
      
      // Position toes
      const angle = (i - 1) * 0.4; // Spread toes
      toeGroup.rotation.y = angle;
      toeGroup.position.set(Math.sin(angle) * 0.02, 0, 0.03);
      footGroup.add(toeGroup);
    }

    // Back toe (hallux) - shorter, positioned backwards
    const backToeGroup = new THREE.Group();
    const backToeGeometry = new THREE.CapsuleGeometry(0.006, 0.04, 4, 6);
    const backToe = new THREE.Mesh(backToeGeometry, this.materials!.leg);
    backToeGroup.add(backToe);
    
    const backClawGeometry = new THREE.ConeGeometry(0.004, 0.015, 4);
    const backClaw = new THREE.Mesh(backClawGeometry, this.materials!.leg);
    backClaw.position.set(0, 0, 0.04);
    backClaw.rotation.x = Math.PI / 6;
    backToeGroup.add(backClaw);
    
    backToeGroup.position.set(0, 0, -0.02);
    backToeGroup.rotation.y = Math.PI; // Point backwards
    footGroup.add(backToeGroup);

    return legGroup;
  }

  private createWing(isLeft: boolean): THREE.Group {
    const wingGroup = new THREE.Group();
    
    // Upper arm (shoulder to elbow)
    const upperArmGeometry = new THREE.CapsuleGeometry(0.08, 0.6, 4, 8);
    const featherMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      map: this.featherTexture
    });
    const upperArm = new THREE.Mesh(upperArmGeometry, featherMaterial);
    upperArm.rotation.z = isLeft ? Math.PI / 4 : -Math.PI / 4;
    wingGroup.add(upperArm);

    // Forearm (elbow to wrist)
    const forearmGroup = new THREE.Group();
    const forearmGeometry = new THREE.CapsuleGeometry(0.06, 0.8, 4, 8);
    const forearm = new THREE.Mesh(forearmGeometry, featherMaterial);
    forearm.rotation.z = isLeft ? Math.PI / 6 : -Math.PI / 6;
    forearmGroup.add(forearm);
    forearmGroup.position.set(isLeft ? 0.4 : -0.4, 0, isLeft ? 0.3 : -0.3);

    // Hand (wrist to wingtip)
    const handGroup = new THREE.Group();
    const handGeometry = new THREE.CapsuleGeometry(0.04, 0.6, 4, 8);
    const hand = new THREE.Mesh(handGeometry, featherMaterial);
    handGroup.add(hand);
    handGroup.position.set(isLeft ? 0.6 : -0.6, 0, isLeft ? 0.2 : -0.2);

    // Primary feathers (wingtip feathers)
    const primaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const featherGeometry = new THREE.PlaneGeometry(0.15, 0.4);
      const feather = new THREE.Mesh(featherGeometry, featherMaterial);
      feather.position.set(
        isLeft ? 0.8 + i * 0.1 : -0.8 - i * 0.1,
        0,
        isLeft ? 0.3 - i * 0.05 : -0.3 + i * 0.05
      );
      feather.rotation.y = isLeft ? -Math.PI / 12 * i : Math.PI / 12 * i;
      primaryFeathers.push(feather);
      wingGroup.add(feather);
    }

    // Secondary feathers (inner wing feathers)
    const secondaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const featherGeometry = new THREE.PlaneGeometry(0.2, 0.3);
      const feather = new THREE.Mesh(featherGeometry, featherMaterial);
      feather.position.set(
        isLeft ? 0.3 + i * 0.1 : -0.3 - i * 0.1,
        0,
        isLeft ? 0.4 - i * 0.05 : -0.4 + i * 0.05
      );
      secondaryFeathers.push(feather);
      wingGroup.add(feather);
    }

    wingGroup.add(forearmGroup);
    wingGroup.add(handGroup);

    // Store wing segments for animation
    const segments: WingSegments = {
      upperArm,
      forearm,
      hand,
      primaryFeathers,
      secondaryFeathers
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

    return wingGroup;
  }

  private createLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    
    // Upper leg (thigh)
    const thighGeometry = new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const thigh = new THREE.Mesh(thighGeometry, legMaterial);
    thigh.position.y = -0.15;
    legGroup.add(thigh);

    // Lower leg (shin)
    const shinGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 6);
    const shin = new THREE.Mesh(shinGeometry, legMaterial);
    shin.position.y = -0.5;
    legGroup.add(shin);

    // Foot with toes
    const footGroup = new THREE.Group();
    const footGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.08);
    const foot = new THREE.Mesh(footGeometry, legMaterial);
    footGroup.add(foot);

    // Toes
    for (let i = 0; i < 3; i++) {
      const toeGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4);
      const toe = new THREE.Mesh(toeGeometry, legMaterial);
      toe.rotation.z = Math.PI / 2;
      toe.position.set(0.05, 0, (i - 1) * 0.03);
      footGroup.add(toe);
    }

    footGroup.position.y = -0.7;
    legGroup.add(footGroup);

    return legGroup;
  }

  protected updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.stateTimer += deltaTime;
    
    // Check player distance for alert behavior
    if (this.distanceFromPlayer < this.config.alertDistance && this.flightMode === FlightMode.GROUNDED) {
      if (this.distanceFromPlayer < 3) {
        // Too close - flee by taking flight
        this.startFlight();
        return;
      } else if (this.birdState !== BirdState.ALERT) {
        this.changeState(BirdState.ALERT);
      }
    }

    // State machine
    if (Date.now() > this.nextStateChange) {
      this.updateStateMachine();
    }

    // Execute current state behavior
    this.executeCurrentState(deltaTime);
  }

  private updateStateMachine(): void {
    switch (this.birdState) {
      case BirdState.IDLE:
        const nextAction = Math.random();
        if (nextAction < 0.3) {
          this.changeState(BirdState.WALKING);
        } else if (nextAction < 0.5) {
          this.changeState(BirdState.FORAGING);
        } else if (nextAction < 0.7) {
          this.changeState(BirdState.PREENING);
        } else {
          this.startFlight();
        }
        break;

      case BirdState.WALKING:
      case BirdState.FORAGING:
      case BirdState.PREENING:
        if (Math.random() < 0.4) {
          this.changeState(BirdState.IDLE);
        } else if (Math.random() < 0.2) {
          this.startFlight();
        }
        break;

      case BirdState.FLYING:
      case BirdState.SOARING:
        if (Math.random() < 0.3) {
          this.startLanding();
        }
        break;

      case BirdState.ALERT:
        if (this.distanceFromPlayer > this.config.alertDistance) {
          this.changeState(BirdState.IDLE);
        }
        break;
    }
  }

  private executeCurrentState(deltaTime: number): void {
    switch (this.birdState) {
      case BirdState.WALKING:
        this.executeWalking(deltaTime);
        break;
      case BirdState.FORAGING:
        this.executeForaging(deltaTime);
        break;
      case BirdState.TAKING_OFF:
        this.executeTakeoff(deltaTime);
        break;
      case BirdState.FLYING:
        this.executeFlying(deltaTime);
        break;
      case BirdState.SOARING:
        this.executeSoaring(deltaTime);
        break;
      case BirdState.LANDING:
        this.executeLanding(deltaTime);
        break;
    }
  }

  private executeWalking(deltaTime: number): void {
    // Random walk around territory
    if (!this.targetPosition || this.position.distanceTo(this.targetPosition) < 0.5) {
      this.setRandomTargetPosition();
    }
    
    this.moveTowardTarget(deltaTime, this.config.walkSpeed);
  }

  private executeForaging(deltaTime: number): void {
    // Simulate foraging by moving in small steps with pauses
    if (Math.random() < 0.1) {
      this.setRandomTargetPosition(2); // Short range movement
    }
    
    this.moveTowardTarget(deltaTime, this.config.walkSpeed * 0.5);
  }

  private executeTakeoff(deltaTime: number): void {
    this.isFlapping = true;
    this.velocity.y += 5 * deltaTime;
    
    if (this.position.y > this.groundLevel + 3) {
      this.flightMode = FlightMode.CRUISING;
      this.changeState(BirdState.FLYING);
    }
  }

  private executeFlying(deltaTime: number): void {
    this.isFlapping = true;
    
    // Determine if should switch to soaring
    if (Math.random() < 0.02) { // 2% chance per frame
      this.isFlapping = false;
      this.changeState(BirdState.SOARING);
    }
    
    this.executeCruiseFlight(deltaTime);
  }

  private executeSoaring(deltaTime: number): void {
    this.isFlapping = false;
    
    // Occasionally flap to maintain altitude
    if (Math.random() < 0.01) {
      this.isFlapping = true;
      this.changeState(BirdState.FLYING);
    }
    
    this.executeCruiseFlight(deltaTime);
  }

  private executeCruiseFlight(deltaTime: number): void {
    // Generate flight path if needed
    if (this.flightPath.length === 0 || this.currentPathIndex >= this.flightPath.length) {
      this.generateFlightPath();
    }
    
    // Move along flight path
    if (this.currentPathIndex < this.flightPath.length) {
      const target = this.flightPath[this.currentPathIndex];
      const direction = target.clone().sub(this.position).normalize();
      this.velocity.copy(direction.multiplyScalar(this.config.flightSpeed));
      
      // Face movement direction
      this.mesh.lookAt(this.position.clone().add(this.velocity));
      
      if (this.position.distanceTo(target) < 2) {
        this.currentPathIndex++;
      }
    }
  }

  private executeLanding(deltaTime: number): void {
    this.isFlapping = false;
    
    if (this.position.y <= this.groundLevel + 0.1) {
      this.position.y = this.groundLevel;
      this.flightMode = FlightMode.GROUNDED;
      this.velocity.set(0, 0, 0);
      this.changeState(BirdState.IDLE);
    }
  }

  private setRandomTargetPosition(range: number = 8): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * range;
    
    this.targetPosition.set(
      this.homePosition.x + Math.cos(angle) * distance,
      this.groundLevel,
      this.homePosition.z + Math.sin(angle) * distance
    );
  }

  private moveTowardTarget(deltaTime: number, speed: number): void {
    const direction = this.targetPosition.clone().sub(this.position);
    direction.y = 0; // Keep on ground
    
    if (direction.length() > 0.1) {
      direction.normalize();
      this.velocity.copy(direction.multiplyScalar(speed));
      
      // Face movement direction
      this.mesh.lookAt(this.position.clone().add(direction));
    } else {
      this.velocity.set(0, 0, 0);
    }
  }

  private generateFlightPath(): void {
    this.flightPath = [];
    this.currentPathIndex = 0;
    
    const pathLength = 3 + Math.floor(Math.random() * 4); // 3-6 points
    const centerPoint = this.homePosition.clone();
    centerPoint.y = this.config.flightAltitude.min + 
      Math.random() * (this.config.flightAltitude.max - this.config.flightAltitude.min);
    
    for (let i = 0; i < pathLength; i++) {
      const angle = (i / pathLength) * Math.PI * 2 + Math.random() * 0.5;
      const radius = this.config.territoryRadius * (0.5 + Math.random() * 0.5);
      
      const point = new THREE.Vector3(
        centerPoint.x + Math.cos(angle) * radius,
        centerPoint.y + (Math.random() - 0.5) * 5,
        centerPoint.z + Math.sin(angle) * radius
      );
      
      this.flightPath.push(point);
    }
  }

  protected updateAnimation(deltaTime: number): void {
    if (!this.bodyParts || !this.wingSegments) return;

    // Update animation cycles
    this.walkCycle += deltaTime * 4;
    this.flapCycle += deltaTime * (this.isFlapping ? 15 : 2);
    this.headBobCycle += deltaTime * 6;

    // Animate walking
    if (this.birdState === BirdState.WALKING && this.velocity.length() > 0.1) {
      this.animateWalk();
    }

    // Animate wings
    this.animateWings();

    // Animate head bobbing
    this.animateHeadBob();
  }

  private animateWalk(): void {
    if (!this.bodyParts) return;

    // Leg movement
    const leftLegSwing = Math.sin(this.walkCycle) * 0.3;
    const rightLegSwing = Math.sin(this.walkCycle + Math.PI) * 0.3;

    this.bodyParts.leftLeg.rotation.x = leftLegSwing;
    this.bodyParts.rightLeg.rotation.x = rightLegSwing;

    // Body bob
    this.bodyParts.body.position.y = Math.sin(this.walkCycle * 2) * 0.05;
  }

  private animateWings(): void {
    if (!this.wingSegments) return;

    if (this.isFlapping) {
      // Flapping animation
      const flapIntensity = this.flightMode === FlightMode.GROUNDED ? 0.3 : 0.8;
      const wingAngle = Math.sin(this.flapCycle) * flapIntensity;

      this.bodyParts!.leftWing.rotation.z = wingAngle;
      this.bodyParts!.rightWing.rotation.z = -wingAngle;

      // Feather spread during flap
      this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
        feather.rotation.y = -Math.PI / 12 * i + wingAngle * 0.5;
      });
      this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
        feather.rotation.y = Math.PI / 12 * i - wingAngle * 0.5;
      });
    } else {
      // Soaring position - wings spread
      this.bodyParts!.leftWing.rotation.z = 0.1;
      this.bodyParts!.rightWing.rotation.z = -0.1;

      // Feathers extended for soaring
      this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
        feather.rotation.y = -Math.PI / 24 * i;
      });
      this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
        feather.rotation.y = Math.PI / 24 * i;
      });
    }
  }

  private animateHeadBob(): void {
    if (!this.bodyParts) return;

    // Head bobbing during walk and idle
    if (this.birdState === BirdState.WALKING || this.birdState === BirdState.FORAGING) {
      this.bodyParts.head.position.x = 0.6 + Math.sin(this.headBobCycle) * 0.05;
      this.bodyParts.head.rotation.x = Math.sin(this.headBobCycle) * 0.1;
    } else {
      // Occasional head movements
      if (Math.random() < 0.01) {
        this.bodyParts.head.rotation.y = (Math.random() - 0.5) * 0.5;
      }
    }
  }
}