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
    this.createSimpleMaterials();
    
    const bodyGroup = new THREE.Group();
    
    // Create realistic oval body geometry - larger and more substantial
    const bodyGeometry = new THREE.SphereGeometry(0.2, 16, 12);
    bodyGeometry.scale(1.6, 0.9, 1.1);
    const body = new THREE.Mesh(bodyGeometry, this.materials!.feather);
    bodyGroup.add(body);

    // Create realistic curved neck
    const neckGroup = new THREE.Group();
    const neckGeometry = new THREE.CapsuleGeometry(0.07, 0.22, 8, 12);
    neckGeometry.rotateZ(Math.PI / 2);
    const neck = new THREE.Mesh(neckGeometry, this.materials!.feather);
    neck.position.set(0.3, 0.08, 0);
    neckGroup.add(neck);
    bodyGroup.add(neckGroup);

    // Create realistic head
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.08, 12, 10);
    headGeometry.scale(1.5, 1.0, 0.9);
    const head = new THREE.Mesh(headGeometry, this.materials!.feather);
    headGroup.add(head);
    headGroup.position.set(0.52, 0.15, 0);
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
    
    const leftWing = this.createAnatomicalWing(true);
    const rightWing = this.createAnatomicalWing(false);
    
    leftWingGroup.add(leftWing);
    rightWingGroup.add(rightWing);
    
    leftWingGroup.position.set(0.2, 0.05, 0.16);
    rightWingGroup.position.set(0.2, 0.05, -0.16);
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create legs
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createSimpleLeg();
    const rightLeg = this.createSimpleLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    leftLegGroup.position.set(0.08, -0.18, 0.1);
    rightLegGroup.position.set(0.08, -0.18, -0.1);
    
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
      beak: beak,
      leftEye: leftEye,
      rightEye: rightEye
    };

    this.mesh.add(bodyGroup);
  }

  private createSimpleMaterials(): void {
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

  private createTaperedFeatherGeometry(baseWidth: number, tipWidth: number, length: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const thickness = 0.002; // Add slight thickness to make feathers visible from all angles
    
    // Create tapered feather shape with thickness - tips pointing backward (negative X direction)
    const vertices = [
      // Bottom face
      // Base (wider) - at wing bone attachment point
      0, -baseWidth/2, -thickness/2,
      0, baseWidth/2, -thickness/2,
      // Tip (narrower) - extending backward from wing bone
      -length, -tipWidth/2, -thickness/2,
      -length, tipWidth/2, -thickness/2,
      
      // Top face
      // Base (wider) - at wing bone attachment point
      0, -baseWidth/2, thickness/2,
      0, baseWidth/2, thickness/2,
      // Tip (narrower) - extending backward from wing bone
      -length, -tipWidth/2, thickness/2,
      -length, tipWidth/2, thickness/2
    ];
    
    const indices = [
      // Bottom face
      0, 1, 2,  1, 3, 2,
      // Top face  
      4, 6, 5,  5, 6, 7,
      // Front edge
      0, 4, 5,  0, 5, 1,
      // Back edge
      2, 3, 7,  2, 7, 6,
      // Left edge
      0, 2, 6,  0, 6, 4,
      // Right edge
      1, 5, 7,  1, 7, 3
    ];
    
    const uvs = [
      // Bottom face
      0, 0,  0, 1,  1, 0,  1, 1,
      // Top face
      0, 0,  0, 1,  1, 0,  1, 1
    ];
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  private createAnatomicalWing(isLeft: boolean): THREE.Group {
    const wingGroup = new THREE.Group();
    const side = isLeft ? 1 : -1;
    
    // SHOULDER/SCAPULA - Base attachment point at bird's body
    const shoulderGroup = new THREE.Group();
    wingGroup.add(shoulderGroup);
    
    // HUMERUS - Upper arm bone that extends OUTWARD from body (along Z-axis for wingspan)
    const humerusGroup = new THREE.Group();
    const humerusGeometry = new THREE.CapsuleGeometry(0.03, 0.24, 6, 8);
    const humerus = new THREE.Mesh(humerusGeometry, this.materials!.feather);
    
    // Orient bone along Z-axis (outward from body to create wingspan width)
    humerus.rotation.x = Math.PI / 2; // Rotate to align along Z-axis
    humerus.position.set(0, 0, side * 0.12); // Extend outward from shoulder
    humerusGroup.add(humerus);
    
    // Attach humerus to shoulder (at body attachment point)
    shoulderGroup.add(humerusGroup);

    // FOREARM - Continues extending outward creating wing length
    const forearmGroup = new THREE.Group();
    const forearmGeometry = new THREE.CapsuleGeometry(0.025, 0.28, 6, 8);
    const forearm = new THREE.Mesh(forearmGeometry, this.materials!.feather);
    
    // Continue outward extension along Z-axis
    forearm.rotation.x = Math.PI / 2; // Align along Z-axis
    forearm.position.set(0, 0, side * 0.14); // Extend further outward
    forearmGroup.add(forearm);
    
    // Position forearm at end of humerus (elbow joint)
    forearmGroup.position.set(0, 0, side * 0.24); // At end of humerus
    humerusGroup.add(forearmGroup);

    // HAND - Final wing bone segment extending to wingtip
    const handGroup = new THREE.Group();
    const handGeometry = new THREE.CapsuleGeometry(0.02, 0.16, 6, 8);
    const hand = new THREE.Mesh(handGeometry, this.materials!.feather);
    
    // Continue Z-axis extension to wingtip with slight curve back
    hand.rotation.x = Math.PI / 2; // Align along Z-axis
    hand.position.set(-0.02, 0, side * 0.08); // Slightly curved back and outward
    handGroup.add(hand);
    
    // Position hand at end of forearm (wrist joint)
    handGroup.position.set(0, 0, side * 0.28); // At end of forearm
    forearmGroup.add(handGroup);

    // COVERT FEATHERS - Small body coverage feathers
    const covertFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const featherLength = 0.12 + (i * 0.008);
      const baseWidth = (0.03 + (i * 0.002)) * 1.8;
      const tipWidth = baseWidth * 0.4;
      
      const featherGeometry = this.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const covert = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      const alongBone = i * 0.035;
      const offsetFromBone = -0.02;
      covert.position.set(offsetFromBone, -0.02, side * alongBone);
      
      covert.rotation.x = 0;
      covert.rotation.y = -(0.1 - i * 0.01);
      covert.rotation.z = (i * 0.08);
      
      humerusGroup.add(covert);
      covertFeathers.push(covert);
    }

    // SECONDARY FEATHERS - Main wing surface
    const secondaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const featherLength = 0.25 + (i * 0.02);
      const baseWidth = (0.06 + (i * 0.004)) * 1.6;
      const tipWidth = baseWidth * 0.3;
      
      const featherGeometry = this.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      const alongBone = i * 0.03;
      const offsetFromBone = -0.01;
      feather.position.set(offsetFromBone, -0.01, side * alongBone);
      
      feather.rotation.x = 0;
      feather.rotation.y = -(0.15 - i * 0.005);
      feather.rotation.z = (i * 0.04);
      
      forearmGroup.add(feather);
      secondaryFeathers.push(feather);
    }

    // PRIMARY FEATHERS - Wing control surfaces
    const primaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const featherLength = 0.30 + (i * 0.015);
      const baseWidth = (0.08 + (i * 0.004)) * 1.5;
      const tipWidth = baseWidth * 0.2;
      
      const featherGeometry = this.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      const alongBone = i * 0.015;
      const offsetFromBone = 0;
      feather.position.set(offsetFromBone, 0, side * alongBone);
      
      const tipEffect = i / 9;
      feather.rotation.x = 0;
      feather.rotation.y = -(0.2 + tipEffect * 0.1);
      feather.rotation.z = (tipEffect * 0.3);
      
      handGroup.add(feather);
      primaryFeathers.push(feather);
    }

    // Store wing segments for animation
    const segments: WingSegments = {
      upperArm: humerus,
      forearm: forearm,
      hand: hand,
      primaryFeathers: primaryFeathers,
      secondaryFeathers: secondaryFeathers,
      covertFeathers: covertFeathers
    };

    // Store group references for joint animation
    humerusGroup.userData = { type: 'shoulder', segment: humerus };
    forearmGroup.userData = { type: 'elbow', segment: forearm };
    handGroup.userData = { type: 'wrist', segment: hand };

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

  private createSimpleLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    
    const thighGeometry = new THREE.CapsuleGeometry(0.04, 0.2, 6, 8);
    const thigh = new THREE.Mesh(thighGeometry, this.materials!.leg);
    thigh.position.y = -0.1;
    legGroup.add(thigh);

    const shinGroup = new THREE.Group();
    const shinGeometry = new THREE.CapsuleGeometry(0.03, 0.25, 6, 8);
    const shin = new THREE.Mesh(shinGeometry, this.materials!.leg);
    shin.position.y = -0.125;
    shinGroup.add(shin);
    
    shinGroup.position.y = -0.2;
    legGroup.add(shinGroup);

    const footGroup = new THREE.Group();
    const footGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.12);
    const foot = new THREE.Mesh(footGeometry, this.materials!.leg);
    footGroup.add(foot);
    
    footGroup.position.y = -0.375;
    legGroup.add(footGroup);

    return legGroup;
  }

  protected updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.stateTimer += deltaTime;
    
    // EMERGENCY BOUNDS CHECKING - prevent birds from flying too high or far
    this.enforceFlightBounds();
    
    // Check for player proximity - alert behavior
    if (this.distanceFromPlayer < this.config.alertDistance && this.birdState !== BirdState.ALERT) {
      this.changeState(BirdState.ALERT);
      if (this.distanceFromPlayer < this.config.alertDistance * 0.5) {
        this.startFlight();
      }
    }
    
    // Deterministic state changes based on timers instead of pure randomness
    if (this.stateTimer > this.getStateMaxDuration()) {
      this.forceStateChange();
    } else if (Date.now() > this.nextStateChange) {
      this.considerStateChange();
    }
    
    // Execute current state behavior
    this.executeCurrentState(deltaTime);
  }

  private enforceFlightBounds(): void {
    const maxFlightHeight = this.groundLevel + 30; // Absolute ceiling
    const maxDistanceFromHome = 40; // Maximum territory range
    
    // Force landing if flying too high
    if (this.position.y > maxFlightHeight && this.flightMode !== FlightMode.GROUNDED) {
      console.log(`🐦 [CrowBird] Emergency landing: too high (${this.position.y})`);
      this.startLanding();
      return;
    }
    
    // Force return home if too far from territory
    const distanceFromHome = this.position.distanceTo(this.homePosition);
    if (distanceFromHome > maxDistanceFromHome) {
      console.log(`🐦 [CrowBird] Emergency return home: too far (${distanceFromHome})`);
      if (this.flightMode === FlightMode.GROUNDED) {
        this.startFlight(); // Take off to return home
      }
      // Override target to head straight home
      this.targetPosition.copy(this.homePosition);
      this.targetPosition.y = this.groundLevel;
      return;
    }
  }

  private getStateMaxDuration(): number {
    switch (this.birdState) {
      case BirdState.IDLE: return 8;
      case BirdState.WALKING: return 10;
      case BirdState.FORAGING: return 12;
      case BirdState.PREENING: return 6;
      case BirdState.ALERT: return 5;
      case BirdState.TAKING_OFF: return 3;
      case BirdState.FLYING: return 15;
      case BirdState.SOARING: return 20;
      case BirdState.LANDING: return 8;
      default: return 10;
    }
  }

  private forceStateChange(): void {
    console.log(`🐦 [CrowBird] Force state change from ${this.birdState} after ${this.stateTimer}s`);
    
    switch (this.birdState) {
      case BirdState.FLYING:
      case BirdState.SOARING:
        // Force landing after extended flight
        this.startLanding();
        break;
      case BirdState.TAKING_OFF:
        // Force transition to flying if takeoff is stuck
        this.flightMode = FlightMode.CRUISING;
        this.changeState(BirdState.FLYING);
        break;
      case BirdState.LANDING:
        // Force ground contact if landing is stuck
        this.flightMode = FlightMode.GROUNDED;
        this.position.y = this.groundLevel;
        this.velocity.set(0, 0, 0);
        this.changeState(BirdState.IDLE);
        break;
      default:
        // Ground states - random transition
        this.considerStateChange();
        break;
    }
  }

  private considerStateChange(): void {
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
    
    // Realistic takeoff physics with horizontal and vertical components
    const takeoffPower = 8.0;
    const forwardThrust = 3.0;
    
    // Apply upward force with decreasing intensity as bird gains altitude
    const altitudeGained = this.position.y - this.groundLevel;
    const liftMultiplier = Math.max(0.2, 1.0 - (altitudeGained / 8.0));
    
    this.velocity.y += takeoffPower * liftMultiplier * deltaTime;
    
    // Add forward momentum during takeoff
    const takeoffDirection = new THREE.Vector3(1, 0, 0);
    takeoffDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    this.velocity.add(takeoffDirection.multiplyScalar(forwardThrust * deltaTime));
    
    // Transition to flying once airborne
    if (this.position.y > this.groundLevel + 2) {
      this.flightMode = FlightMode.CRUISING;
      this.targetAltitude = this.groundLevel + Math.random() * 15 + 5; // Set initial flight altitude
      this.changeState(BirdState.FLYING);
      console.log(`🐦 [CrowBird] Takeoff complete, transitioning to flight at altitude ${this.position.y}`);
    }
  }

  private executeFlying(deltaTime: number): void {
    this.isFlapping = true;
    
    // Apply realistic flight physics with gravity compensation
    this.applyFlightPhysics(deltaTime);
    
    // Intelligent state switching based on conditions
    if (this.stateTimer > 8 && Math.random() < 0.1) {
      // Switch to soaring after sustained flight
      this.isFlapping = false;
      this.changeState(BirdState.SOARING);
    } else if (this.stateTimer > 12) {
      // Force landing after extended flying
      this.startLanding();
    }
    
    this.executeCruiseFlight(deltaTime);
  }

  private executeSoaring(deltaTime: number): void {
    this.isFlapping = false;
    
    // Apply soaring physics - birds lose altitude gradually when not flapping
    this.applySoaringPhysics(deltaTime);
    
    // Intelligent transition decisions
    if (this.position.y < this.groundLevel + 5) {
      // Too low - start flapping or land
      if (Math.random() < 0.7) {
        this.isFlapping = true;
        this.changeState(BirdState.FLYING);
      } else {
        this.startLanding();
      }
    } else if (this.stateTimer > 15) {
      // Extended soaring - eventually land
      this.startLanding();
    } else if (Math.random() < 0.005) {
      // Occasional return to powered flight
      this.isFlapping = true;
      this.changeState(BirdState.FLYING);
    }
    
    this.executeCruiseFlight(deltaTime);
  }

  private executeLanding(deltaTime: number): void {
    this.isFlapping = true; // Birds flap during landing for control
    
    // Force landing approach toward ground level
    const altitudeToGround = this.position.y - this.groundLevel;
    
    // Calculate landing approach vector toward a ground target
    if (!this.targetPosition || this.targetPosition.y !== this.groundLevel) {
      // Set a landing target near home position
      this.targetPosition.copy(this.homePosition);
      this.targetPosition.y = this.groundLevel;
    }
    
    // Navigate toward landing target
    const landingDirection = this.targetPosition.clone().sub(this.position);
    const horizontalDistance = Math.sqrt(landingDirection.x * landingDirection.x + landingDirection.z * landingDirection.z);
    
    if (altitudeToGround > 3.0) {
      // High approach - maintain forward speed and controlled descent
      landingDirection.normalize();
      this.velocity.x = landingDirection.x * this.config.flightSpeed * 0.6;
      this.velocity.z = landingDirection.z * this.config.flightSpeed * 0.6;
      this.velocity.y = Math.max(this.velocity.y - 3.0 * deltaTime, -2.5);
    } else {
      // Final approach - slow down and descend more carefully
      this.velocity.x *= 0.85;
      this.velocity.z *= 0.85;
      this.velocity.y = Math.max(this.velocity.y - 4.0 * deltaTime, -3.0);
    }
    
    // Ensure bird is always descending during landing
    if (this.velocity.y > 0) {
      this.velocity.y = -0.5;
    }
    
    // Force landing when close to ground
    if (this.position.y <= this.groundLevel + 0.3 || altitudeToGround < 0.5) {
      this.completeLanding();
    }
    
    // Emergency landing timeout
    if (this.stateTimer > 6) {
      console.log(`🐦 [CrowBird] Emergency landing timeout`);
      this.completeLanding();
    }
  }

  private completeLanding(): void {
    this.flightMode = FlightMode.GROUNDED;
    this.position.y = this.groundLevel;
    this.velocity.set(0, 0, 0);
    this.isFlapping = false;
    
    // Reset all rotations for grounded state
    this.mesh.rotation.z = 0;
    this.mesh.rotation.x = 0;
    
    this.changeState(BirdState.IDLE);
    console.log(`🐦 [CrowBird] Landing completed at position:`, this.position);
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
      
      // Smooth velocity transitions instead of instant changes
      const targetVelocity = direction.multiplyScalar(this.config.flightSpeed);
      this.velocity.lerp(targetVelocity, deltaTime * 2);
      
      // Much smoother turning - realistic bird banking
      const targetDirection = Math.atan2(direction.z, direction.x) + Math.PI;
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetDirection, 0.02);
      
      // Very subtle banking during sharp turns only
      const turnRate = Math.abs(this.mesh.rotation.y - targetDirection);
      if (turnRate > 0.5) {
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, Math.sign(direction.z) * 0.1, 0.05);
      } else {
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, 0.1);
      }
      
      if (this.position.distanceTo(target) < 2) {
        this.currentPathIndex++;
      }
    }
  }

  private setRandomTargetPosition(range: number = 8): void {
    // Forward-biased movement: generate targets in a forward arc (±60° from facing direction)
    const currentDirection = this.mesh.rotation.y;
    const forwardBias = (Math.random() - 0.5) * (Math.PI / 3); // ±60° spread
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
    direction.y = 0; // Keep on ground
    
    if (direction.length() > 0.1) {
      direction.normalize();
      this.velocity.copy(direction.multiplyScalar(speed));
      
      // Face movement direction smoothly (bird should face direction of travel)
      const targetDirection = Math.atan2(direction.z, direction.x) + Math.PI;
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetDirection, 0.15);
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
    
    // Forward-biased flight path: bias flight direction forward
    const currentDirection = this.mesh.rotation.y;
    
    for (let i = 0; i < pathLength; i++) {
      // Create forward-biased angle: mostly forward with gentle turns
      const forwardBias = (Math.random() - 0.5) * (Math.PI / 4); // ±45° spread
      const progressiveAngle = currentDirection + (i * 0.2) + forwardBias; // Progressive forward movement
      const radius = this.config.territoryRadius * (0.3 + Math.random() * 0.7);
      
      // Realistic altitude changes based on bird state
      let altitudeVariation: number;
      if (this.birdState === BirdState.SOARING && !this.isFlapping) {
        // Soaring: only flat or downward movement
        altitudeVariation = Math.max(-2, (Math.random() - 0.9) * 2); // Strong downward bias
      } else {
        // Normal flight: can go up or down
        altitudeVariation = (Math.random() - 0.5) * 5;
      }
      
      const point = new THREE.Vector3(
        centerPoint.x + Math.cos(progressiveAngle) * radius,
        centerPoint.y + altitudeVariation,
        centerPoint.z + Math.sin(progressiveAngle) * radius
      );
      
      this.flightPath.push(point);
    }
  }

  // NEW PHYSICS METHODS

  private applyFlightPhysics(deltaTime: number): void {
    // Realistic bird flight physics with gravity compensation
    const gravity = -9.81 * 0.5; // Reduced gravity for flight
    const liftForce = this.isFlapping ? 12.0 : 4.0; // More lift when flapping
    const dragCoefficient = 0.98;
    
    // Apply gravity
    this.velocity.y += gravity * deltaTime;
    
    // Apply lift when flapping
    if (this.isFlapping) {
      this.velocity.y += liftForce * deltaTime;
    }
    
    // Maintain target altitude
    const altitudeDiff = this.targetAltitude - this.position.y;
    if (Math.abs(altitudeDiff) > 2.0) {
      const altitudeCorrection = Math.sign(altitudeDiff) * 2.0 * deltaTime;
      this.velocity.y += altitudeCorrection;
    }
    
    // Apply drag
    this.velocity.multiplyScalar(dragCoefficient);
    
    // Limit velocities to realistic ranges
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -5, 5);
    const maxHorizontalSpeed = this.config.flightSpeed;
    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (horizontalSpeed > maxHorizontalSpeed) {
      this.velocity.x = (this.velocity.x / horizontalSpeed) * maxHorizontalSpeed;
      this.velocity.z = (this.velocity.z / horizontalSpeed) * maxHorizontalSpeed;
    }
  }

  private applySoaringPhysics(deltaTime: number): void {
    // Soaring physics - gradual altitude loss with air current effects
    const gravity = -9.81 * 0.3; // Reduced gravity when soaring
    const thermalLift = Math.sin(Date.now() * 0.001) * 1.5; // Simulated thermals
    const dragCoefficient = 0.995; // Less drag when soaring
    
    // Apply gravity and thermal effects
    this.velocity.y += (gravity + thermalLift) * deltaTime;
    
    // Maintain glide ratio
    const glideRatio = 8; // Typical bird glide ratio
    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (horizontalSpeed > 0.1) {
      const optimalDescentRate = horizontalSpeed / glideRatio;
      if (this.velocity.y < -optimalDescentRate) {
        this.velocity.y = Math.max(this.velocity.y, -optimalDescentRate);
      }
    }
    
    // Apply minimal drag
    this.velocity.multiplyScalar(dragCoefficient);
    
    // Limit velocities
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -3, 2);
  }

  protected updateAnimation(deltaTime: number): void {
    if (!this.bodyParts || !this.wingSegments) return;

    // Update animation cycles
    this.walkCycle += deltaTime * 4;
    this.flapCycle += deltaTime * (this.isFlapping ? 15 : 2);
    this.headBobCycle += deltaTime * 6;

    // Animate wings based on state
    this.animateWings();

    // Animate walking
    if (this.birdState === BirdState.WALKING && this.velocity.length() > 0.1) {
      this.animateWalk();
    }

    // Animate head bobbing
    this.animateHeadBob();
  }

  private animateWings(): void {
    if (!this.bodyParts) return;

    switch (this.birdState) {
      case BirdState.IDLE:
      case BirdState.WALKING:
      case BirdState.FORAGING:
      case BirdState.PREENING:
        // Wings folded against body
        this.bodyParts.leftWing.rotation.z = 0.1;
        this.bodyParts.rightWing.rotation.z = -0.1;
        break;
        
      case BirdState.ALERT:
        // Wings slightly raised
        this.bodyParts.leftWing.rotation.z = 0.3;
        this.bodyParts.rightWing.rotation.z = -0.3;
        break;
        
      case BirdState.TAKING_OFF:
      case BirdState.FLYING:
        // Active flapping
        const flapAngle = Math.sin(this.flapCycle) * 1.2;
        this.bodyParts.leftWing.rotation.z = flapAngle + 0.5;
        this.bodyParts.rightWing.rotation.z = -flapAngle - 0.5;
        break;
        
      case BirdState.SOARING:
        // Wings spread wide
        this.bodyParts.leftWing.rotation.z = 0.8;
        this.bodyParts.rightWing.rotation.z = -0.8;
        break;
        
      case BirdState.LANDING:
        // Wings spread for air braking
        this.bodyParts.leftWing.rotation.z = 1.0;
        this.bodyParts.rightWing.rotation.z = -1.0;
        break;
    }
  }

  private animateWalk(): void {
    if (!this.bodyParts) return;

    // Leg movement
    const leftLegSwing = Math.sin(this.walkCycle) * 0.3;
    const rightLegSwing = Math.sin(this.walkCycle + Math.PI) * 0.3;

    this.bodyParts.leftLeg.rotation.x = leftLegSwing;
    this.bodyParts.rightLeg.rotation.x = rightLegSwing;

    // Body movement
    this.bodyParts.body.position.x = Math.sin(this.walkCycle * 2) * 0.02;
    this.bodyParts.body.position.y = 0;
  }

  private animateHeadBob(): void {
    if (!this.bodyParts) return;

    let bobIntensity = 0.05;
    switch (this.birdState) {
      case BirdState.WALKING:
        bobIntensity = 0.08;
        break;
      case BirdState.FORAGING:
        bobIntensity = 0.12;
        break;
      case BirdState.ALERT:
        bobIntensity = 0.03;
        break;
    }

    const bobOffset = Math.sin(this.headBobCycle) * bobIntensity;
    this.bodyParts.head.position.x = 0.52 + bobOffset;
  }

  public dispose(): void {
    if (this.materials) {
      Object.values(this.materials).forEach(material => {
        material.dispose();
      });
    }
    
    if (this.featherTexture) {
      this.featherTexture.dispose();
    }
    
    super.dispose();
  }
}