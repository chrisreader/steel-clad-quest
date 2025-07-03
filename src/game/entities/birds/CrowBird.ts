import * as THREE from 'three';
import { BaseBird, BirdState, FlightMode, BirdBodyParts, WingSegments, BirdConfig } from './BaseBird';
import { TextureGenerator } from '../../utils';

export class CrowBird extends BaseBird {
  private wingSegments: { left: WingSegments; right: WingSegments } | null = null;
  private featherTexture: THREE.Texture | null = null;

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
    this.createFeatherTexture();
    
    const bodyGroup = new THREE.Group();
    
    // Create main body (torso)
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      map: this.featherTexture
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2; // Horizontal orientation
    bodyGroup.add(body);

    // Create head
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 6);
    const headMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      map: this.featherTexture
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    headGroup.add(head);
    headGroup.position.set(0.6, 0, 0);
    
    // Create beak
    const beakGeometry = new THREE.ConeGeometry(0.08, 0.3, 6);
    const beakMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.2, 0, 0);
    headGroup.add(beak);

    // Create eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 4);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.1, 0, 0.15);
    headGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0, -0.15);
    headGroup.add(rightEye);

    // Create neck
    const neckGroup = new THREE.Group();
    const neckGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8);
    const neckMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      map: this.featherTexture
    });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.rotation.z = Math.PI / 2;
    neckGroup.add(neck);
    neckGroup.position.set(0.3, 0, 0);

    // Create tail
    const tailGroup = new THREE.Group();
    const tailGeometry = new THREE.ConeGeometry(0.1, 0.8, 6);
    const tailMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      map: this.featherTexture
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.rotation.z = Math.PI / 2;
    tailGroup.add(tail);
    tailGroup.position.set(-0.6, 0, 0);

    // Create wings
    const leftWing = this.createWing(true);
    const rightWing = this.createWing(false);
    
    leftWing.position.set(0, 0, 0.4);
    rightWing.position.set(0, 0, -0.4);

    // Create legs
    const leftLeg = this.createLeg();
    const rightLeg = this.createLeg();
    
    leftLeg.position.set(-0.2, -0.3, 0.2);
    rightLeg.position.set(-0.2, -0.3, -0.2);

    // Assemble body parts
    bodyGroup.add(headGroup);
    bodyGroup.add(neckGroup);
    bodyGroup.add(tailGroup);
    bodyGroup.add(leftWing);
    bodyGroup.add(rightWing);
    bodyGroup.add(leftLeg);
    bodyGroup.add(rightLeg);

    this.bodyParts = {
      body: bodyGroup,
      head: headGroup,
      neck: neckGroup,
      tail: tailGroup,
      leftWing: leftWing,
      rightWing: rightWing,
      leftLeg: leftLeg,
      rightLeg: rightLeg,
      beak: beak,
      leftEye: leftEye,
      rightEye: rightEye
    };

    this.mesh.add(bodyGroup);
  }

  private createFeatherTexture(): void {
    this.featherTexture = TextureGenerator.createMetalTexture(0x1a1a1a, 50, 0.2);
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