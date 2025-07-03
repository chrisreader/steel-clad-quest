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
    
    // Create simple horizontal bird body
    const bodyGeometry = new THREE.SphereGeometry(0.3, 12, 8);
    bodyGeometry.scale(1.2, 0.8, 0.6); // Make it more bird-like
    const body = new THREE.Mesh(bodyGeometry, this.materials.feather);
    bodyGroup.add(body);

    // Create neck - properly connected to body
    const neckGroup = new THREE.Group();
    const neckGeometry = new THREE.SphereGeometry(0.12, 8, 6);
    neckGeometry.scale(1, 1.5, 1);
    const neck = new THREE.Mesh(neckGeometry, this.materials.feather);
    neckGroup.add(neck);
    neckGroup.position.set(0.35, 0.1, 0); // Connected to front of body
    bodyGroup.add(neckGroup);

    // Create head - properly connected to neck
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    headGeometry.scale(1.2, 1, 0.9);
    const head = new THREE.Mesh(headGeometry, this.materials.feather);
    headGroup.add(head);
    headGroup.position.set(0.2, 0, 0); // Connected to neck
    neckGroup.add(headGroup);
    
    // Create simple beak
    const beakGeometry = new THREE.ConeGeometry(0.03, 0.15, 6);
    const beak = new THREE.Mesh(beakGeometry, this.materials.beak);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.18, -0.02, 0);
    headGroup.add(beak);

    // Create simple eyes
    const eyeGeometry = new THREE.SphereGeometry(0.03, 6, 4);
    const leftEye = new THREE.Mesh(eyeGeometry, this.materials.eye);
    const rightEye = new THREE.Mesh(eyeGeometry, this.materials.eye);
    leftEye.position.set(0.08, 0.05, 0.08);
    rightEye.position.set(0.08, 0.05, -0.08);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Create simple tail
    const tailGroup = new THREE.Group();
    const tailGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    tailGeometry.scale(1, 1, 0.3);
    const tail = new THREE.Mesh(tailGeometry, this.materials.feather);
    tail.rotation.z = Math.PI / 2;
    tailGroup.add(tail);
    tailGroup.position.set(-0.4, 0, 0);
    bodyGroup.add(tailGroup);

    // Create simplified wings with proper hierarchy
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    const leftWing = this.createSimpleWing(true);
    const rightWing = this.createSimpleWing(false);
    
    leftWingGroup.add(leftWing);
    rightWingGroup.add(rightWing);
    
    // Attach wings to shoulders of body
    leftWingGroup.position.set(0, 0.1, 0.25);
    rightWingGroup.position.set(0, 0.1, -0.25);
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create simple legs
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createSimpleLeg();
    const rightLeg = this.createSimpleLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    // Attach legs to bottom center of body
    leftLegGroup.position.set(0, -0.25, 0.1);
    rightLegGroup.position.set(0, -0.25, -0.1);
    
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
        color: 0x1a1a1a
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

  private createSimpleWing(isLeft: boolean): THREE.Group {
    const wingGroup = new THREE.Group();
    const side = isLeft ? 1 : -1;
    
    // Humerus (upper arm) - attaches to shoulder, points backward and down
    const humerusGroup = new THREE.Group();
    const humerusGeometry = new THREE.CapsuleGeometry(0.04, 0.35, 6, 8);
    const humerus = new THREE.Mesh(humerusGeometry, this.materials!.feather);
    
    // Position humerus along its length (half length offset)
    humerus.position.set(0, -0.175, 0);
    humerus.rotation.z = side * Math.PI / 6; // Angle backward naturally
    humerusGroup.add(humerus);
    wingGroup.add(humerusGroup);

    // Forearm (radius/ulna) - attaches to end of humerus
    const forearmGroup = new THREE.Group();
    const forearmGeometry = new THREE.CapsuleGeometry(0.03, 0.4, 6, 8);
    const forearm = new THREE.Mesh(forearmGeometry, this.materials!.feather);
    
    // Position forearm relative to humerus end
    forearm.position.set(0, -0.2, 0);
    forearm.rotation.z = side * Math.PI / 8; // Folds back naturally
    forearmGroup.add(forearm);
    
    // Attach forearm to end of humerus
    forearmGroup.position.set(0, -0.35, 0);
    humerusGroup.add(forearmGroup);

    // Hand/Carpometacarpus - attaches to end of forearm
    const handGroup = new THREE.Group();
    const handGeometry = new THREE.CapsuleGeometry(0.025, 0.25, 6, 8);
    const hand = new THREE.Mesh(handGeometry, this.materials!.feather);
    
    // Position hand along its length
    hand.position.set(0, -0.125, 0);
    handGroup.add(hand);
    
    // Attach hand to end of forearm
    handGroup.position.set(0, -0.4, 0);
    forearmGroup.add(handGroup);

    // Wing membranes - connect bones and create wing surface
    // Leading edge membrane (propatagium) - shoulder to wrist
    const leadingMembraneGeometry = new THREE.PlaneGeometry(0.15, 0.4);
    const leadingMembrane = new THREE.Mesh(leadingMembraneGeometry, this.materials!.feather);
    leadingMembrane.position.set(side * 0.075, -0.4, 0);
    leadingMembrane.rotation.z = side * Math.PI / 12;
    humerusGroup.add(leadingMembrane);

    // Main wing surface - connects all bones
    const wingMembraneGeometry = new THREE.PlaneGeometry(0.8, 0.4);
    const wingMembrane = new THREE.Mesh(wingMembraneGeometry, this.materials!.feather);
    wingMembrane.position.set(side * 0.4, -0.2, 0);
    wingMembrane.rotation.y = side * 0.1;
    forearmGroup.add(wingMembrane);

    // Primary feathers - attach to hand area
    const primaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const featherGeometry = new THREE.PlaneGeometry(0.08, 0.3);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      feather.position.set(side * (0.05 + i * 0.04), -0.15 - i * 0.02, 0);
      feather.rotation.z = side * i * 0.1;
      handGroup.add(feather);
      primaryFeathers.push(feather);
    }

    // Secondary feathers - attach along forearm
    const secondaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const featherGeometry = new THREE.PlaneGeometry(0.06, 0.25);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      feather.position.set(side * 0.03, -0.1 - i * 0.08, 0);
      feather.rotation.z = side * i * 0.05;
      forearmGroup.add(feather);
      secondaryFeathers.push(feather);
    }

    // Store wing segments for animation
    const segments: WingSegments = {
      upperArm: humerus,
      forearm: forearm,
      hand: hand,
      primaryFeathers: primaryFeathers,
      secondaryFeathers: secondaryFeathers
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

  private createSimpleLeg(): THREE.Group {
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