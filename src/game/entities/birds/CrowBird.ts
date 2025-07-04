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
    
    // Create anatomically correct bird body (oriented along X-axis: head=+X, tail=-X)
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.8, 12, 1);
    bodyGeometry.rotateZ(Math.PI / 2); // Rotate to align along X-axis
    const body = new THREE.Mesh(bodyGeometry, this.materials.feather);
    bodyGroup.add(body);

    // Create neck - extends forward from body
    const neckGroup = new THREE.Group();
    const neckGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.25, 8, 1);
    neckGeometry.rotateZ(Math.PI / 2); // Align along X-axis
    const neck = new THREE.Mesh(neckGeometry, this.materials.feather);
    neckGroup.add(neck);
    neckGroup.position.set(0.52, 0.05, 0); // Forward from body front
    bodyGroup.add(neckGroup);

    // Create head - at end of neck
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.12, 8, 6);
    headGeometry.scale(1.3, 1.1, 0.9); // Slightly elongated
    const head = new THREE.Mesh(headGeometry, this.materials.feather);
    headGroup.add(head);
    headGroup.position.set(0.18, 0, 0); // At end of neck
    neckGroup.add(headGroup);
    
    // Create beak - pointing forward
    const beakGeometry = new THREE.ConeGeometry(0.025, 0.12, 6);
    const beak = new THREE.Mesh(beakGeometry, this.materials.beak);
    beak.rotation.z = -Math.PI / 2; // Point forward along +X
    beak.position.set(0.15, -0.02, 0);
    headGroup.add(beak);

    // Create eyes on sides of head
    const eyeGeometry = new THREE.SphereGeometry(0.025, 6, 4);
    const leftEye = new THREE.Mesh(eyeGeometry, this.materials.eye);
    const rightEye = new THREE.Mesh(eyeGeometry, this.materials.eye);
    leftEye.position.set(0.06, 0.04, 0.09);  // Left side of head
    rightEye.position.set(0.06, 0.04, -0.09); // Right side of head
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Create tail - extends backward from body
    const tailGroup = new THREE.Group();
    const tailGeometry = new THREE.ConeGeometry(0.12, 0.35, 8);
    tailGeometry.scale(1.2, 1, 0.4); // Flattened and wide
    const tail = new THREE.Mesh(tailGeometry, this.materials.feather);
    tail.rotation.z = Math.PI / 2; // Point backward along -X
    tailGroup.add(tail);
    tailGroup.position.set(-0.58, 0.02, 0); // Behind body
    bodyGroup.add(tailGroup);

    // Create wings extending outward from body (perpendicular to body axis)
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    const leftWing = this.createAnatomicalWing(true);
    const rightWing = this.createAnatomicalWing(false);
    
    leftWingGroup.add(leftWing);
    rightWingGroup.add(rightWing);
    
    // Attach wings to upper shoulders (slightly forward of body center)
    leftWingGroup.position.set(0.15, 0.12, 0.18);  // Left shoulder
    rightWingGroup.position.set(0.15, 0.12, -0.18); // Right shoulder
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create legs under body center
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createAnatomicalLeg();
    const rightLeg = this.createAnatomicalLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    // Position legs under body center
    leftLegGroup.position.set(0.1, -0.22, 0.08);  // Left leg
    rightLegGroup.position.set(0.1, -0.22, -0.08); // Right leg
    
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
    // Create simple materials for better performance and clarity
    this.materials = {
      feather: new THREE.MeshLambertMaterial({
        color: 0x1a1a1a,
        side: THREE.DoubleSide // Make feathers visible from both sides
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

    // PRIMARY FEATHERS - Create wing surface extending from wingtip backward
    const primaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const featherLength = 0.3 - (i * 0.03); // Longest at wingtip
      const featherGeometry = new THREE.PlaneGeometry(0.06, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      // Position feathers extending backward from hand bone
      feather.position.set(-featherLength / 2, 0, side * (i * 0.02)); // Spread along hand
      
      // Orient feathers to create wing surface extending backward
      feather.rotation.y = side * Math.PI / 2; // Face along wing span direction
      feather.rotation.z = -i * 0.05; // Slight fan spread
      
      handGroup.add(feather);
      primaryFeathers.push(feather);
    }

    // SECONDARY FEATHERS - Wing surface along forearm
    const secondaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const featherLength = 0.25 - (i * 0.02);
      const featherGeometry = new THREE.PlaneGeometry(0.05, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      // Position along forearm bone, extending backward
      feather.position.set(-featherLength / 2, 0, side * (i * 0.04)); 
      
      // Orient to create continuous wing surface
      feather.rotation.y = side * Math.PI / 2; // Face along wing span
      feather.rotation.z = -i * 0.03; // Slight overlap
      
      forearmGroup.add(feather);
      secondaryFeathers.push(feather);
    }

    // COVERT FEATHERS - Small feathers covering the shoulder/humerus junction
    for (let i = 0; i < 4; i++) {
      const featherLength = 0.15 - (i * 0.01);
      const covertGeometry = new THREE.PlaneGeometry(0.04, featherLength);
      const covert = new THREE.Mesh(covertGeometry, this.materials!.feather);
      
      // Position along humerus bone
      covert.position.set(-featherLength / 3, 0, side * (i * 0.03));
      
      // Orient to cover wing base
      covert.rotation.y = side * Math.PI / 2;
      
      humerusGroup.add(covert);
    }

    // Store wing segments for animation
    const segments: WingSegments = {
      upperArm: humerus,
      forearm: forearm,
      hand: hand,
      primaryFeathers: primaryFeathers,
      secondaryFeathers: secondaryFeathers
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

  private createAnatomicalLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    
    // Thigh
    const thighGeometry = new THREE.CapsuleGeometry(0.04, 0.2, 6, 8);
    const thigh = new THREE.Mesh(thighGeometry, this.materials!.leg);
    thigh.position.y = -0.1;
    legGroup.add(thigh);

    // Shin
    const shinGroup = new THREE.Group();
    const shinGeometry = new THREE.CapsuleGeometry(0.03, 0.25, 6, 8);
    const shin = new THREE.Mesh(shinGeometry, this.materials!.leg);
    shin.position.y = -0.125;
    shinGroup.add(shin);
    shinGroup.position.y = -0.2;
    legGroup.add(shinGroup);

    // Simple foot
    const footGroup = new THREE.Group();
    const footGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.12);
    const foot = new THREE.Mesh(footGeometry, this.materials!.leg);
    footGroup.add(foot);
    
    // Simple toes
    for (let i = 0; i < 3; i++) {
      const toeGeometry = new THREE.CapsuleGeometry(0.005, 0.04, 4, 6);
      const toe = new THREE.Mesh(toeGeometry, this.materials!.leg);
      toe.rotation.z = Math.PI / 2;
      toe.position.set((i - 1) * 0.02, 0, 0.04);
      footGroup.add(toe);
    }

    footGroup.position.y = -0.25;
    shinGroup.add(footGroup);

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
    if (!this.wingSegments || !this.bodyParts) return;

    // Get wing groups to access joint structure
    const leftWingGroup = this.bodyParts.leftWing.children[0] as THREE.Group; // Main wing group
    const rightWingGroup = this.bodyParts.rightWing.children[0] as THREE.Group;
    
    if (!leftWingGroup || !rightWingGroup) return;

    // Access joint groups properly
    const leftShoulder = leftWingGroup.children[0] as THREE.Group; // Shoulder group
    const rightShoulder = rightWingGroup.children[0] as THREE.Group;
    
    if (!leftShoulder || !rightShoulder) return;

    const leftHumerus = leftShoulder.children[0] as THREE.Group; // Humerus group  
    const rightHumerus = rightShoulder.children[0] as THREE.Group;
    
    if (!leftHumerus || !rightHumerus) return;

    const leftForearm = leftHumerus.children.find(child => child.userData?.type === 'elbow') as THREE.Group;
    const rightForearm = rightHumerus.children.find(child => child.userData?.type === 'elbow') as THREE.Group;
    
    const leftHand = leftForearm?.children.find(child => child.userData?.type === 'wrist') as THREE.Group;
    const rightHand = rightForearm?.children.find(child => child.userData?.type === 'wrist') as THREE.Group;

    // Apply state-specific wing animations
    switch (this.birdState) {
      case BirdState.IDLE:
      case BirdState.WALKING:
      case BirdState.FORAGING:
        this.animateGroundedWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        break;
        
      case BirdState.ALERT:
        this.animateAlertWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm);
        break;
        
      case BirdState.TAKING_OFF:
        this.animateTakeoffWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        break;
        
      case BirdState.FLYING:
        this.animateFlappingWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        break;
        
      case BirdState.SOARING:
        this.animateSoaringWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        break;
        
      case BirdState.LANDING:
        this.animateLandingWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        break;
    }
  }

  private animateGroundedWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group,
    leftHand: THREE.Group, rightHand: THREE.Group
  ): void {
    // Wings folded against body in natural Z-fold pattern with Z-axis bones
    
    // Shoulder position - neutral
    leftShoulder.rotation.set(0, 0, 0);
    rightShoulder.rotation.set(0, 0, 0);
    
    // Humerus - folded back against body (Z-axis alignment)
    leftHumerus.rotation.set(-0.2, 0.3, 0); // Rotated to fold back
    rightHumerus.rotation.set(0.2, -0.3, 0); // Mirror for right wing
    
    // Forearm - folded inward toward body
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(0, 0, -0.8); // Fold inward along Z-axis
      rightForearm.rotation.set(0, 0, 0.8); // Mirror for right wing
    }
    
    // Hand - tucked close to body
    if (leftHand && rightHand) {
      leftHand.rotation.set(0, 0, -0.4); // Fold inward
      rightHand.rotation.set(0, 0, 0.4); // Mirror for right wing
    }
    
    // Animate feathers tight against body
    this.animateFeathersForRest();
  }

  private animateAlertWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group
  ): void {
    // Slight wing lift, ready for takeoff - Z-axis aligned
    
    // Shoulders slightly raised
    leftShoulder.rotation.set(0, 0, 0.1);
    rightShoulder.rotation.set(0, 0, -0.1);
    
    // Humerus partially extended laterally
    leftHumerus.rotation.set(-0.1, 0.2, 0);
    rightHumerus.rotation.set(0.1, -0.2, 0);
    
    // Forearm partially extended
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(0, 0, -0.5);
      rightForearm.rotation.set(0, 0, 0.5);
    }
  }

  private animateTakeoffWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group,
    leftHand: THREE.Group, rightHand: THREE.Group
  ): void {
    // Powerful upstroke for takeoff - Z-axis aligned
    const takeoffIntensity = 1.2;
    const wingBeat = Math.sin(this.flapCycle) * takeoffIntensity;
    
    // Strong shoulder movement - vertical flapping motion
    leftShoulder.rotation.set(wingBeat * 0.5, 0, 0);
    rightShoulder.rotation.set(-wingBeat * 0.5, 0, 0);
    
    // Humerus drives main power - lateral extension with vertical beat
    leftHumerus.rotation.set(wingBeat * 0.7, 0.1, 0);
    rightHumerus.rotation.set(-wingBeat * 0.7, -0.1, 0);
    
    // Coordinated forearm extension
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(wingBeat * 0.3, 0, -0.3);
      rightForearm.rotation.set(-wingBeat * 0.3, 0, 0.3);
    }
    
    // Hand provides fine control
    if (leftHand && rightHand) {
      leftHand.rotation.set(wingBeat * 0.2, 0, -0.2);
      rightHand.rotation.set(-wingBeat * 0.2, 0, 0.2);
    }
    
    this.animateFeathersForPowerFlight(wingBeat);
  }

  private animateFlappingWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group,
    leftHand: THREE.Group, rightHand: THREE.Group
  ): void {
    // Regular flapping flight - Z-axis aligned
    const flapIntensity = 0.8;
    const wingBeat = Math.sin(this.flapCycle) * flapIntensity;
    
    // Shoulder provides base rhythm - vertical flapping
    leftShoulder.rotation.set(wingBeat * 0.3, 0, 0);
    rightShoulder.rotation.set(-wingBeat * 0.3, 0, 0);
    
    // Humerus main stroke - lateral extension with vertical beat
    leftHumerus.rotation.set(wingBeat * 0.5, 0.1, 0);
    rightHumerus.rotation.set(-wingBeat * 0.5, -0.1, 0);
    
    // Forearm follows with delay
    const forearmPhase = Math.sin(this.flapCycle - 0.2) * flapIntensity;
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(forearmPhase * 0.4, 0, -0.4);
      rightForearm.rotation.set(-forearmPhase * 0.4, 0, 0.4);
    }
    
    // Hand fine-tunes wingtip
    const handPhase = Math.sin(this.flapCycle - 0.4) * flapIntensity;
    if (leftHand && rightHand) {
      leftHand.rotation.set(handPhase * 0.3, 0, -0.3);
      rightHand.rotation.set(-handPhase * 0.3, 0, 0.3);
    }
    
    this.animateFeathersForFlight(wingBeat);
  }

  private animateSoaringWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group,
    leftHand: THREE.Group, rightHand: THREE.Group
  ): void {
    // Wings fully extended for maximum lift - Z-axis aligned
    
    // Shoulders spread wide - lifted for lift generation
    leftShoulder.rotation.set(0.2, 0, 0);
    rightShoulder.rotation.set(-0.2, 0, 0);
    
    // Humerus extended laterally
    leftHumerus.rotation.set(0.1, 0.05, 0);
    rightHumerus.rotation.set(-0.1, -0.05, 0);
    
    // Forearm fully extended
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(0, 0, -0.1);
      rightForearm.rotation.set(0, 0, 0.1);
    }
    
    // Hand extended for maximum span
    if (leftHand && rightHand) {
      leftHand.rotation.set(0, 0, -0.05);
      rightHand.rotation.set(0, 0, 0.05);
    }
    
    // Subtle air current adjustments
    const airCurrent = Math.sin(this.flapCycle * 0.3) * 0.05;
    leftShoulder.rotation.x += airCurrent;
    rightShoulder.rotation.x -= airCurrent;
    
    this.animateFeathersForSoaring();
  }

  private animateLandingWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group,
    leftHand: THREE.Group, rightHand: THREE.Group
  ): void {
    // Wings spread wide for air braking - Z-axis aligned
    
    // Shoulders lifted high for air brake
    leftShoulder.rotation.set(0.4, 0, 0);
    rightShoulder.rotation.set(-0.4, 0, 0);
    
    // Humerus angled up for drag
    leftHumerus.rotation.set(0.3, 0.2, 0);
    rightHumerus.rotation.set(-0.3, -0.2, 0);
    
    // Forearm spread for maximum surface area
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(0, 0, -0.3);
      rightForearm.rotation.set(0, 0, 0.3);
    }
    
    // Hand spread wide
    if (leftHand && rightHand) {
      leftHand.rotation.set(0, 0, -0.2);
      rightHand.rotation.set(0, 0, 0.2);
    }
    
    this.animateFeathersForLanding();
  }

  private animateFeathersForRest(): void {
    if (!this.wingSegments) return;
    
    // Feathers tight against body
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.z = -i * 0.02; // Overlapped
      feather.scale.y = 0.8; // Slightly contracted
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.z = i * 0.02;
      feather.scale.y = 0.8;
    });
  }

  private animateFeathersForPowerFlight(wingBeat: number): void {
    if (!this.wingSegments) return;
    
    // Feathers spread and angled for maximum thrust
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = -Math.PI / 8 * i + wingBeat * 0.6;
      feather.rotation.z = -wingBeat * 0.3;
      feather.scale.y = 1.0;
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = Math.PI / 8 * i - wingBeat * 0.6;
      feather.rotation.z = wingBeat * 0.3;
      feather.scale.y = 1.0;
    });
  }

  private animateFeathersForFlight(wingBeat: number): void {
    if (!this.wingSegments) return;
    
    // Normal flight feather positions
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = -Math.PI / 12 * i + wingBeat * 0.4;
      feather.rotation.z = -wingBeat * 0.2;
      feather.scale.y = 1.0;
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = Math.PI / 12 * i - wingBeat * 0.4;
      feather.rotation.z = wingBeat * 0.2;
      feather.scale.y = 1.0;
    });
  }

  private animateFeathersForSoaring(): void {
    if (!this.wingSegments) return;
    
    const airFlow = Math.sin(this.flapCycle * 0.2) * 0.03;
    
    // Feathers fully extended and slightly adjusting to air currents
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = -Math.PI / 16 * i;
      feather.rotation.z = airFlow + i * 0.01;
      feather.scale.y = 1.1; // Slightly extended
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = Math.PI / 16 * i;
      feather.rotation.z = -airFlow - i * 0.01;
      feather.scale.y = 1.1;
    });
  }

  private animateFeathersForLanding(): void {
    if (!this.wingSegments) return;
    
    // Feathers spread wide for air braking
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = -Math.PI / 6 * i;
      feather.rotation.z = -0.3;
      feather.scale.y = 1.2; // Maximum extension for drag
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.y = Math.PI / 6 * i;
      feather.rotation.z = 0.3;
      feather.scale.y = 1.2;
    });
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