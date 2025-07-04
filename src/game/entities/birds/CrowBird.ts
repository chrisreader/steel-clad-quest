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
  
  // Enhanced flight systems
  private maxFlightTime: number = 30; // Extended flight duration
  private minFlightTime: number = 10; // Minimum flight before landing allowed
  private flightTimer: number = 0;
  private maxAltitude: number = 35; // Higher ceiling
  private emergencyLanding: boolean = false;

  constructor(id: string) {
    const crowConfig: BirdConfig = {
      species: 'Crow',
      size: 1.0,
      wingspan: 2.4,
      bodyLength: 1.0,
      legLength: 0.6,
      walkSpeed: 1.5,
      flightSpeed: 8.0,
      flightAltitude: { min: 15, max: 35 }, // Extended altitude range
      territoryRadius: 25, // Larger territory for more interesting flights
      alertDistance: 8
    };
    
    super(id, crowConfig);
    
    // Enhanced flight bounds system
    this.maxFlightTime = 30; // Max 30 seconds in air
    this.minFlightTime = 10; // Min 10 seconds before landing
    this.flightTimer = 0;
    this.maxAltitude = 35; // Higher ceiling
    this.emergencyLanding = false;
  }

  protected createBirdBody(): void {
    this.createSimpleMaterials();
    
    const bodyGroup = new THREE.Group();
    
    // Create realistic oval body geometry - larger and more substantial
    const bodyGeometry = new THREE.SphereGeometry(0.2, 16, 12);
    // Scale to create oval bird body proportions (length, height, width)
    bodyGeometry.scale(1.6, 0.9, 1.1);
    const body = new THREE.Mesh(bodyGeometry, this.materials.feather);
    bodyGroup.add(body);

    // Create realistic curved neck with multiple segments for flexibility - scaled proportionally
    const neckGroup = new THREE.Group();
    const neckGeometry = new THREE.CapsuleGeometry(0.07, 0.22, 8, 12);
    neckGeometry.rotateZ(Math.PI / 2); // Orient along X-axis
    const neck = new THREE.Mesh(neckGeometry, this.materials.feather);
    neck.position.set(0.3, 0.08, 0); // Connected to front of body, slightly above
    neckGroup.add(neck);
    bodyGroup.add(neckGroup);

    // Create realistic head with proper proportions - scaled proportionally
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.08, 12, 10);
    headGeometry.scale(1.5, 1.0, 0.9); // Elongated for realistic bird head
    const head = new THREE.Mesh(headGeometry, this.materials.feather);
    headGroup.add(head);
    
    // Dynamic head positioning - starts in walking position (above body)
    headGroup.position.set(0.52, 0.15, 0); // Above body level for walking, scaled up
    bodyGroup.add(headGroup);
    
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

    // Create seamlessly integrated tail
    const tailGroup = new THREE.Group();
    
    // Tail seamlessly flows from oval body - scaled proportionally
    const tailGeometry = new THREE.SphereGeometry(0.12, 12, 8);
    tailGeometry.scale(2.0, 0.7, 1.4); // Elongated and flattened crow tail
    
    // Shape tail to flow naturally from body oval
    const tailPositions = tailGeometry.attributes.position;
    for (let i = 0; i < tailPositions.count; i++) {
      const x = tailPositions.getX(i);
      const y = tailPositions.getY(i);
      const z = tailPositions.getZ(i);
      
      // Create natural tail taper that extends from body
      if (x < 0) {
        const tailIntensity = Math.abs(x) / 0.16;
        tailPositions.setY(i, y * (1 - tailIntensity * 0.4)); // Flatten toward tip
        tailPositions.setZ(i, z * (1 + tailIntensity * 0.3)); // Slight fan spread
      }
    }
    tailPositions.needsUpdate = true;
    tailGeometry.computeVertexNormals();
    
    const tail = new THREE.Mesh(tailGeometry, this.materials.feather);
    tail.position.set(-0.3, -0.03, 0); // Overlaps with body rear for seamless connection, scaled up
    tailGroup.add(tail);
    
    tailGroup.position.set(0, 0, 0); // Attached directly to body
    bodyGroup.add(tailGroup);

    // Create wings extending outward from body (perpendicular to body axis) - scaled positions
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    const leftWing = this.createAnatomicalWing(true);
    const rightWing = this.createAnatomicalWing(false);
    
    leftWingGroup.add(leftWing);
    rightWingGroup.add(rightWing);
    
    // Attach wings to upper shoulders - connected to body surface at body level
    leftWingGroup.position.set(0.2, 0.05, 0.16);  // Left shoulder, at body level
    rightWingGroup.position.set(0.2, 0.05, -0.16); // Right shoulder, at body level
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create legs under body center - properly attached for larger body
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createAnatomicalLeg();
    const rightLeg = this.createAnatomicalLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    // Position legs properly attached to body underside - closer to body, scaled
    leftLegGroup.position.set(0.08, -0.18, 0.1);  // Left leg - attached to larger body
    rightLegGroup.position.set(0.08, -0.18, -0.1); // Right leg - attached to larger body
    
    bodyGroup.add(leftLegGroup);
    bodyGroup.add(rightLegGroup);

    this.bodyParts = {
      body: bodyGroup,
      head: headGroup,
      neck: bodyGroup, // Unified body-neck, so neck reference points to body
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

    // COVERT FEATHERS - Small body coverage feathers (shortest, narrowest base) - THICKER
    const covertFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const featherLength = 0.12 + (i * 0.008); // Small, gradually increasing
      const baseWidth = (0.03 + (i * 0.002)) * 1.8; // Small base width - THICKER
      const tipWidth = baseWidth * 0.4; // Less tapering for body coverage
      
      const featherGeometry = this.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const covert = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      // Position along humerus closer to body, feathers extend along X-axis
      const alongBone = i * 0.035; // Spaced along bone length (Z-axis)
      const offsetFromBone = -0.02; // Slight offset from bone center
      covert.position.set(offsetFromBone, -0.02, side * alongBone);
      
      // Orient feathers to point backward along bird's body (negative X)
      covert.rotation.x = 0; // No rotation around X since feathers are X-aligned
      covert.rotation.y = -(0.1 - i * 0.01); // Flip Y rotation for flipped geometry
      covert.rotation.z = (i * 0.08); // Gradually lift from body
      
      covert.userData.originalRotation = { x: covert.rotation.x, y: covert.rotation.y, z: covert.rotation.z };
      
      humerusGroup.add(covert);
      covertFeathers.push(covert);
    }

    // SECONDARY FEATHERS - Main wing surface (medium size, proper progression) - THICKER
    const secondaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const featherLength = 0.25 + (i * 0.02); // Gradually increasing toward outer wing
      const baseWidth = (0.06 + (i * 0.004)) * 1.6; // Medium base width, getting wider - THICKER
      const tipWidth = baseWidth * 0.3; // More pointed than coverts
      
      const featherGeometry = this.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      // Position along forearm bone, feathers extend along X-axis
      const alongBone = i * 0.03; // Spaced along forearm (Z-axis)
      const offsetFromBone = -0.01; // Slight offset from bone center
      feather.position.set(offsetFromBone, -0.01, side * alongBone);
      
      // Orient feathers to point backward along bird's body (negative X)
      feather.rotation.x = 0; // No rotation around X since feathers are X-aligned
      feather.rotation.y = -(0.15 - i * 0.005); // Flip Y rotation for flipped geometry
      feather.rotation.z = (i * 0.04); // Gradual lift creating wing curve
      
      feather.userData.originalRotation = { x: feather.rotation.x, y: feather.rotation.y, z: feather.rotation.z };
      
      forearmGroup.add(feather);
      secondaryFeathers.push(feather);
    }

    // PRIMARY FEATHERS - Wing control surfaces (largest, longest) - THICKER
    const primaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const featherLength = 0.30 + (i * 0.015); // Longest feathers at wingtip
      const baseWidth = (0.08 + (i * 0.004)) * 1.5; // Large base width for flight control - THICKER
      const tipWidth = baseWidth * 0.2; // Highly pointed for aerodynamics
      
      const featherGeometry = this.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, this.materials!.feather);
      
      // Position along hand bone, feathers extend along X-axis
      const alongBone = i * 0.015; // Close spacing for wingtip control (Z-axis)
      const offsetFromBone = 0; // No offset, attached to bone center
      feather.position.set(offsetFromBone, 0, side * alongBone);
      
      // Orient feathers to point backward along bird's body (negative X)
      const tipEffect = i / 9; // 0 to 1 from body to tip
      feather.rotation.x = 0; // No rotation around X since feathers are X-aligned
      feather.rotation.y = -(0.2 + tipEffect * 0.1); // Flip Y rotation for flipped geometry
      feather.rotation.z = (tipEffect * 0.3); // More lift toward tip
      
      feather.userData.originalRotation = { x: feather.rotation.x, y: feather.rotation.y, z: feather.rotation.z };
      
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
    
    // Track flight time
    if (this.flightMode !== FlightMode.GROUNDED) {
      this.flightTimer += deltaTime;
    } else {
      this.flightTimer = 0;
      this.emergencyLanding = false;
    }
    
    // EMERGENCY BOUNDS AND RECOVERY SYSTEMS
    this.checkEmergencyConditions();
    
    // Skip normal behavior if in emergency mode
    if (this.emergencyLanding) {
      this.executeEmergencyLanding(deltaTime);
      return;
    }
    
    // Check player distance for alert behavior
    if (this.distanceFromPlayer < this.config.alertDistance && this.flightMode === FlightMode.GROUNDED) {
      if (this.distanceFromPlayer < 3) {
        this.startFlight();
        return;
      } else if (this.birdState !== BirdState.ALERT) {
        this.changeState(BirdState.ALERT);
      }
    }

    // Deterministic state transitions based on conditions
    this.updateIntelligentStateMachine();
    this.executeCurrentState(deltaTime);
  }

  private checkEmergencyConditions(): void {
    if (this.position.y > this.maxAltitude || this.flightTimer > this.maxFlightTime) {
      this.emergencyLanding = true;
      this.targetAltitude = this.groundLevel;
    }
  }
  
  private executeEmergencyLanding(deltaTime: number): void {
    this.changeState(BirdState.LANDING);
    this.flightMode = FlightMode.DESCENDING;
    this.isFlapping = false;
    this.velocity.y = Math.min(this.velocity.y - 8 * deltaTime, -3);
    this.velocity.x *= 0.95;
    this.velocity.z *= 0.95;
    
    const feetToBodyDistance = 0.48;
    if (this.position.y <= this.groundLevel + feetToBodyDistance + 1) {
      this.forceGrounding();
    }
  }
  
  private forceGrounding(): void {
    this.flightMode = FlightMode.GROUNDED;
    const feetToBodyDistance = 0.48;
    this.position.y = this.groundLevel + feetToBodyDistance;
    this.velocity.set(0, 0, 0);
    this.mesh.rotation.z = 0;
    this.mesh.rotation.x = 0;
    this.changeState(BirdState.IDLE);
    this.emergencyLanding = false;
    this.flightTimer = 0;
  }

  private updateIntelligentStateMachine(): void {
    // Altitude-based decisions for flying birds
    if (this.flightMode !== FlightMode.GROUNDED) {
      const altitudeAboveGround = this.position.y - this.groundLevel;
      
      // Only allow landing after minimum flight time has passed
      if ((altitudeAboveGround > this.config.flightAltitude.max || this.flightTimer > 25) && 
          this.flightTimer > this.minFlightTime) {
        this.startLanding();
        return;
      }
      
      if (altitudeAboveGround > this.config.flightAltitude.min && this.birdState === BirdState.FLYING) {
        if (Math.random() < 0.1) {
          this.changeState(BirdState.SOARING);
          this.isFlapping = false;
        }
      }
      return;
    }
    
    // Ground state transitions
    if (Date.now() > this.nextStateChange) {
      switch (this.birdState) {
        case BirdState.IDLE:
          const nextAction = Math.random();
          if (nextAction < 0.4) {
            this.changeState(BirdState.WALKING);
          } else if (nextAction < 0.6) {
            this.changeState(BirdState.FORAGING);
          } else if (nextAction < 0.8) {
            this.changeState(BirdState.PREENING);
          } else {
            this.startFlight();
          }
          break;
        case BirdState.WALKING:
        case BirdState.FORAGING:
        case BirdState.PREENING:
          if (Math.random() < 0.6) {
            this.changeState(BirdState.IDLE);
          } else if (Math.random() < 0.3) {
            this.startFlight();
          }
          break;
      }
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
    this.wingBeatIntensity = 1.3; // High intensity for takeoff
    
    // Transition to flying when airborne
    if (this.position.y > this.groundLevel + 2) {
      this.flightMode = FlightMode.CRUISING;
      this.changeState(BirdState.FLYING);
      console.log(`🐦 [CrowBird] Takeoff completed, altitude: ${this.position.y.toFixed(1)}`);
    }
  }

  private executeFlying(deltaTime: number): void {
    this.isFlapping = true;
    this.wingBeatIntensity = 1.0; // Normal flight intensity
    
    // Determine if should switch to soaring
    if (Math.random() < 0.02) { // 2% chance per frame
      this.changeState(BirdState.SOARING);
    }
    
    this.executeCruiseFlight(deltaTime);
  }

  private executeSoaring(deltaTime: number): void {
    // Don't flap during soaring unless needed for altitude
    this.isFlapping = false;
    this.wingBeatIntensity = 1.0; // Reset intensity when not flapping
    
    this.executeCruiseFlight(deltaTime);
  }

  private executeCruiseFlight(deltaTime: number): void {
    // Use enhanced flight path following from base class
    this.followFlightPath(deltaTime);
  }

  private executeLanding(deltaTime: number): void {
    // Landing approach with extended wings (no flapping)
    this.flapCycle += deltaTime * 6;
    this.isFlapping = false; // CRITICAL: No flapping during landing - wings should stay extended
    this.wingBeatIntensity = 0.5; // Keep wings extended but relaxed
    
    // Calculate glide approach - smooth descent with extended wings
    const altitudeToGround = this.position.y - this.groundLevel;
    const isLandingFlare = altitudeToGround < 5.0; // Start flare higher for realistic approach
    
    if (isLandingFlare) {
      // Landing flare - reduce speed and gentle descent with fully extended wings
      this.velocity.x *= 0.94; // Gradual speed reduction
      this.velocity.z *= 0.94;
      this.velocity.y = Math.max(this.velocity.y - 1.2 * deltaTime, -1.0);
      
      // Pitch up slightly for landing flare
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0.1, deltaTime * 2);
    } else {
      // Maintain steady glide approach with extended wings
      this.velocity.x *= 0.99; // Maintain glide speed
      this.velocity.z *= 0.99;
      
      // Steady descent on glide path
      const glideAngle = 0.25; // Shallow glide slope (~14°)
      const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      this.velocity.y = Math.max(this.velocity.y - 0.6 * deltaTime, -currentSpeed * glideAngle);
      
      // Slight nose-down attitude for glide
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, -0.05, deltaTime);
    }
    
    // Land when close to ground
    const feetToBodyDistance = 0.48;
    if (this.position.y <= this.groundLevel + feetToBodyDistance + 0.3) {
      this.flightMode = FlightMode.GROUNDED;
      this.position.y = this.groundLevel + feetToBodyDistance;
      this.velocity.set(0, 0, 0);
      // Reset rotations when landing
      this.mesh.rotation.z = 0;
      this.mesh.rotation.x = 0;
      this.changeState(BirdState.IDLE);
      console.log(`🐦 [CrowBird] Successfully landed with extended wings - feet at ground level ${this.groundLevel}`);
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

  protected generateFlightPath(): void {
    // Use enhanced flight path from base class
    super.generateFlightPath();
  }

  private generateOldFlightPath(): void {
    this.flightPath = [];
    this.currentPathIndex = 0;
    
    const pathLength = 3 + Math.floor(Math.random() * 3); // 3-5 points (shorter paths)
    const centerPoint = this.homePosition.clone();
    
    // Constrain altitude to safe levels
    const targetAltitude = this.config.flightAltitude.min + 
      Math.random() * (this.config.flightAltitude.max - this.config.flightAltitude.min);
    centerPoint.y = Math.min(targetAltitude, this.maxAltitude - 5); // Safety margin
    
    // Circular patrol pattern around home territory
    const currentDirection = this.mesh.rotation.y;
    
    for (let i = 0; i < pathLength; i++) {
      // Create circular patrol with limited radius
      const angleIncrement = (Math.PI * 2) / pathLength;
      const angle = currentDirection + (i * angleIncrement) + (Math.random() - 0.5) * 0.5;
      const radius = Math.min(this.config.territoryRadius * 0.7, 10); // Limit patrol radius
      
      // Conservative altitude changes
      let altitudeVariation: number;
      if (this.birdState === BirdState.SOARING && !this.isFlapping) {
        // Soaring: gradual descent
        altitudeVariation = -Math.random() * 2;
      } else {
        // Normal flight: minimal altitude change
        altitudeVariation = (Math.random() - 0.5) * 3;
      }
      
      const point = new THREE.Vector3(
        this.homePosition.x + Math.cos(angle) * radius,
        Math.max(this.groundLevel + 5, Math.min(centerPoint.y + altitudeVariation, this.maxAltitude - 3)),
        this.homePosition.z + Math.sin(angle) * radius
      );
      
      this.flightPath.push(point);
    }
    
    console.log(`🐦 [CrowBird] Generated flight path with ${pathLength} points, max altitude: ${Math.max(...this.flightPath.map(p => p.y)).toFixed(1)}`);
  }

  protected updateAnimation(deltaTime: number): void {
    if (!this.bodyParts || !this.wingSegments) return;

    // Update animation cycles with variable wing beat intensity
    this.walkCycle += deltaTime * 4;
    this.flapCycle += deltaTime * (this.isFlapping ? 15 * this.wingBeatIntensity : 2);
    this.headBobCycle += deltaTime * 6;

    // Dynamic head positioning based on state
    this.updateDynamicHeadPosition(deltaTime);

    // Animate legs (including flight leg tucking)
    this.animateLegs();

    // Animate walking
    if (this.birdState === BirdState.WALKING && this.velocity.length() > 0.1) {
      this.animateWalk();
    }

    // Animate wings
    this.animateWings();

    // Animate head bobbing
    this.animateHeadBob();
  }

  private updateDynamicHeadPosition(deltaTime: number): void {
    if (!this.bodyParts) return;

    // Determine target head position based on bird state
    let targetY: number;
    let targetX: number;

    switch (this.birdState) {
      case BirdState.IDLE:
      case BirdState.WALKING:
      case BirdState.FORAGING:
      case BirdState.PREENING:
      case BirdState.ALERT:
        // Ground states: head above body for alert, upright posture - scaled for larger body
        targetY = 0.15;
        targetX = 0.52;
        break;
        
      case BirdState.TAKING_OFF:
        // Transitioning: gradually align head with body - scaled for larger body
        targetY = 0.08;
        targetX = 0.47;
        break;
        
      case BirdState.FLYING:
      case BirdState.SOARING:
      case BirdState.LANDING:
        // Flight states: head inline with body for aerodynamic streamlined flight - scaled for larger body
        targetY = 0.0;
        targetX = 0.42;
        break;
        
      default:
        targetY = 0.12;
        targetX = 0.42;
    }

    // Smooth transition to target position
    const lerpSpeed = 2.0; // Transition speed
    this.bodyParts.head.position.y = THREE.MathUtils.lerp(
      this.bodyParts.head.position.y, 
      targetY, 
      deltaTime * lerpSpeed
    );
    this.bodyParts.head.position.x = THREE.MathUtils.lerp(
      this.bodyParts.head.position.x, 
      targetX, 
      deltaTime * lerpSpeed
    );
  }

  private animateWalk(): void {
    if (!this.bodyParts) return;

    // Leg movement
    const leftLegSwing = Math.sin(this.walkCycle) * 0.3;
    const rightLegSwing = Math.sin(this.walkCycle + Math.PI) * 0.3;

    this.bodyParts.leftLeg.rotation.x = leftLegSwing;
    this.bodyParts.rightLeg.rotation.x = rightLegSwing;

    // Subtle forward/backward body movement instead of floating bob
    this.bodyParts.body.position.x = Math.sin(this.walkCycle * 2) * 0.02;
    this.bodyParts.body.position.y = 0; // Keep firmly on ground
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

    // Apply state-specific wing animations - use soaring feather look for all states
    switch (this.birdState) {
      case BirdState.IDLE:
      case BirdState.WALKING:
      case BirdState.FORAGING:
        this.animateGroundedWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        this.animateFeathersForSoaring(); // Use soaring feather look
        break;
        
      case BirdState.ALERT:
        this.animateAlertWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm);
        this.animateFeathersForSoaring(); // Use soaring feather look
        break;
        
      case BirdState.TAKING_OFF:
        this.animateTakeoffWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        this.animateFeathersForSoaring(); // Use soaring feather look
        break;
        
      case BirdState.FLYING:
        this.animateFlappingWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        this.animateFeathersForSoaring(); // Use soaring feather look
        break;
        
      case BirdState.SOARING:
        this.animateSoaringWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        this.animateFeathersForSoaring(); // Keep existing soaring feather look
        break;
        
      case BirdState.LANDING:
        this.animateLandingWings(leftShoulder, rightShoulder, leftHumerus, rightHumerus, leftForearm, rightForearm, leftHand, rightHand);
        this.animateFeathersForSoaring(); // Use soaring feather look
        break;
    }
  }

  private animateGroundedWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group,
    leftHand: THREE.Group, rightHand: THREE.Group
  ): void {
    // Get the main wing groups (parent containers)
    const leftWingGroup = this.bodyParts!.leftWing.children[0] as THREE.Group;
    const rightWingGroup = this.bodyParts!.rightWing.children[0] as THREE.Group;
    
    // Primary wing folding - rotate entire wing assembly backward against body
    leftWingGroup.rotation.set(0, -Math.PI / 2, 0);  // -90° to fold left wing backward
    rightWingGroup.rotation.set(0, Math.PI / 2, 0);   // +90° to fold right wing backward
    
    // Reset all joint rotations to neutral since main rotation handles folding
    leftShoulder.rotation.set(0, 0, 0);
    rightShoulder.rotation.set(0, 0, 0);
    leftHumerus.rotation.set(0, 0, 0);
    rightHumerus.rotation.set(0, 0, 0);
    
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(0, 0, 0);
      rightForearm.rotation.set(0, 0, 0);
    }
    
    if (leftHand && rightHand) {
      leftHand.rotation.set(0, 0, 0);
      rightHand.rotation.set(0, 0, 0);
    }
    
    this.animateFeathersForRest();
  }

  private animateAlertWings(
    leftShoulder: THREE.Group, rightShoulder: THREE.Group,
    leftHumerus: THREE.Group, rightHumerus: THREE.Group,
    leftForearm: THREE.Group, rightForearm: THREE.Group
  ): void {
    leftShoulder.rotation.set(0, 0, 0.1);
    rightShoulder.rotation.set(0, 0, -0.1);
    leftHumerus.rotation.set(-0.1, 0.2, 0);
    rightHumerus.rotation.set(0.1, -0.2, 0);
    
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
    // Get the main wing groups and extend them outward for takeoff
    const leftWingGroup = this.bodyParts!.leftWing.children[0] as THREE.Group;
    const rightWingGroup = this.bodyParts!.rightWing.children[0] as THREE.Group;
    
    // Reset wing group rotations to extend wings outward
    leftWingGroup.rotation.set(0, 0, 0);
    rightWingGroup.rotation.set(0, 0, 0);
    
    const takeoffIntensity = 1.2;
    const wingBeat = Math.sin(this.flapCycle) * takeoffIntensity;
    
    leftShoulder.rotation.set(wingBeat * 0.5, 0, 0);
    rightShoulder.rotation.set(-wingBeat * 0.5, 0, 0);
    leftHumerus.rotation.set(wingBeat * 0.7, 0.1, 0);
    rightHumerus.rotation.set(-wingBeat * 0.7, -0.1, 0);
    
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(wingBeat * 0.3, 0, -0.3);
      rightForearm.rotation.set(-wingBeat * 0.3, 0, 0.3);
    }
    
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
    // Get the main wing groups and extend them outward for flight
    const leftWingGroup = this.bodyParts!.leftWing.children[0] as THREE.Group;
    const rightWingGroup = this.bodyParts!.rightWing.children[0] as THREE.Group;
    
    // Reset wing group rotations to extend wings outward
    leftWingGroup.rotation.set(0, 0, 0);
    rightWingGroup.rotation.set(0, 0, 0);
    
    const flapIntensity = 0.8;
    const wingBeat = Math.sin(this.flapCycle) * flapIntensity;
    
    leftShoulder.rotation.set(wingBeat * 0.3, 0, 0);
    rightShoulder.rotation.set(-wingBeat * 0.3, 0, 0);
    leftHumerus.rotation.set(wingBeat * 0.5, 0.1, 0);
    rightHumerus.rotation.set(-wingBeat * 0.5, -0.1, 0);
    
    const forearmPhase = Math.sin(this.flapCycle - 0.2) * flapIntensity;
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(forearmPhase * 0.4, 0, -0.4);
      rightForearm.rotation.set(-forearmPhase * 0.4, 0, 0.4);
    }
    
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
    // Get the main wing groups and extend them outward for soaring
    const leftWingGroup = this.bodyParts!.leftWing.children[0] as THREE.Group;
    const rightWingGroup = this.bodyParts!.rightWing.children[0] as THREE.Group;
    
    // Reset wing group rotations to extend wings outward
    leftWingGroup.rotation.set(0, 0, 0);
    rightWingGroup.rotation.set(0, 0, 0);
    
    leftShoulder.rotation.set(0.2, 0, 0);
    rightShoulder.rotation.set(-0.2, 0, 0);
    leftHumerus.rotation.set(0.1, 0.05, 0);
    rightHumerus.rotation.set(-0.1, -0.05, 0);
    
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(0, 0, -0.1);
      rightForearm.rotation.set(0, 0, 0.1);
    }
    
    if (leftHand && rightHand) {
      leftHand.rotation.set(0, 0, -0.05);
      rightHand.rotation.set(0, 0, 0.05);
    }
    
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
    // Get the main wing groups and extend them outward for landing
    const leftWingGroup = this.bodyParts!.leftWing.children[0] as THREE.Group;
    const rightWingGroup = this.bodyParts!.rightWing.children[0] as THREE.Group;
    
    // Reset wing group rotations to extend wings outward
    leftWingGroup.rotation.set(0, 0, 0);
    rightWingGroup.rotation.set(0, 0, 0);
    
    leftShoulder.rotation.set(0.4, 0, 0);
    rightShoulder.rotation.set(-0.4, 0, 0);
    leftHumerus.rotation.set(0.3, 0.2, 0);
    rightHumerus.rotation.set(-0.3, -0.2, 0);
    
    if (leftForearm && rightForearm) {
      leftForearm.rotation.set(0, 0, -0.3);
      rightForearm.rotation.set(0, 0, 0.3);
    }
    
    if (leftHand && rightHand) {
      leftHand.rotation.set(0, 0, -0.2);
      rightHand.rotation.set(0, 0, 0.2);
    }
    
    this.animateFeathersForLanding();
  }

  private animateFeathersForRest(): void {
    if (!this.wingSegments) return;
    
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -Math.PI / 2;
      feather.rotation.y = -0.1;
      feather.rotation.z = -i * 0.02;
      feather.scale.y = 0.9;
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -Math.PI / 2;
      feather.rotation.y = 0.1;
      feather.rotation.z = i * 0.02;
      feather.scale.y = 0.9;
    });
    
    this.wingSegments.left.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -Math.PI / 2;
      feather.rotation.y = -0.08;
      feather.rotation.z = -i * 0.02;
      feather.scale.y = 0.9;
    });
    
    this.wingSegments.right.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -Math.PI / 2;
      feather.rotation.y = 0.08;
      feather.rotation.z = i * 0.02;
      feather.scale.y = 0.9;
    });
  }

  private animateFeathersForPowerFlight(wingBeat: number): void {
    if (!this.wingSegments) return;
    
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = wingBeat * 0.3;
      feather.rotation.y = Math.PI / 8 * i - wingBeat * 0.4;
      feather.rotation.z = -wingBeat * 0.2;
      feather.scale.y = 1.1;
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -wingBeat * 0.3;
      feather.rotation.y = -Math.PI / 8 * i + wingBeat * 0.4;
      feather.rotation.z = wingBeat * 0.2;
      feather.scale.y = 1.1;
    });
    
    this.wingSegments.left.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = wingBeat * 0.2;
      feather.rotation.y = Math.PI / 12 * i - wingBeat * 0.3;
      feather.rotation.z = -wingBeat * 0.15;
      feather.scale.y = 1.0;
    });
    
    this.wingSegments.right.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -wingBeat * 0.2;
      feather.rotation.y = -Math.PI / 12 * i + wingBeat * 0.3;
      feather.rotation.z = wingBeat * 0.15;
      feather.scale.y = 1.0;
    });
  }

  private animateFeathersForFlight(wingBeat: number): void {
    if (!this.wingSegments) return;
    
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = wingBeat * 0.2;
      feather.rotation.y = Math.PI / 12 * i - wingBeat * 0.3;
      feather.rotation.z = -wingBeat * 0.15;
      feather.scale.y = 1.0;
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -wingBeat * 0.2;
      feather.rotation.y = -Math.PI / 12 * i + wingBeat * 0.3;
      feather.rotation.z = wingBeat * 0.15;
      feather.scale.y = 1.0;
    });
    
    this.wingSegments.left.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = wingBeat * 0.15;
      feather.rotation.y = Math.PI / 16 * i - wingBeat * 0.2;
      feather.rotation.z = -wingBeat * 0.1;
      feather.scale.y = 1.0;
    });
    
    this.wingSegments.right.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -wingBeat * 0.15;
      feather.rotation.y = -Math.PI / 16 * i + wingBeat * 0.2;
      feather.rotation.z = wingBeat * 0.1;
      feather.scale.y = 1.0;
    });
  }

  private animateFeathersForSoaring(): void {
    if (!this.wingSegments) return;
    
    const airFlow = Math.sin(this.flapCycle * 0.2) * 0.03;
    
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = 0.1 + airFlow;
      feather.rotation.y = Math.PI / 16 * i;
      feather.rotation.z = airFlow + i * 0.01;
      feather.scale.y = 1.1;
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -0.1 - airFlow;
      feather.rotation.y = -Math.PI / 16 * i;
      feather.rotation.z = -airFlow - i * 0.01;
      feather.scale.y = 1.1;
    });
    
    this.wingSegments.left.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = 0.05 + airFlow * 0.5;
      feather.rotation.y = Math.PI / 20 * i;
      feather.rotation.z = airFlow * 0.5;
      feather.scale.y = 1.05;
    });
    
    this.wingSegments.right.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -0.05 - airFlow * 0.5;
      feather.rotation.y = -Math.PI / 20 * i;
      feather.rotation.z = -airFlow * 0.5;
      feather.scale.y = 1.05;
    });
  }

  private animateFeathersForLanding(): void {
    if (!this.wingSegments) return;
    
    this.wingSegments.left.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = 0.4;
      feather.rotation.y = Math.PI / 6 * i;
      feather.rotation.z = 0.3;
      feather.scale.y = 1.2;
    });
    
    this.wingSegments.right.primaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -0.4;
      feather.rotation.y = -Math.PI / 6 * i;
      feather.rotation.z = -0.3;
      feather.scale.y = 1.2;
    });
    
    this.wingSegments.left.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = 0.3;
      feather.rotation.y = Math.PI / 8 * i;
      feather.rotation.z = 0.2;
      feather.scale.y = 1.15;
    });
    
    this.wingSegments.right.secondaryFeathers.forEach((feather, i) => {
      feather.rotation.x = -0.3;
      feather.rotation.y = -Math.PI / 8 * i;
      feather.rotation.z = 0.2;
      feather.scale.y = 1.15;
    });
  }

  private animateLegs(): void {
    if (!this.bodyParts) return;
    
    const leftLegGroup = this.bodyParts.leftLeg;
    const rightLegGroup = this.bodyParts.rightLeg;
    
    if (!leftLegGroup || !rightLegGroup) return;

    if (this.flightMode !== FlightMode.GROUNDED) {
      // Flight leg position - fold both leg groups backward toward tail (negative rotation)
      leftLegGroup.rotation.z = -Math.PI / 4; // 45 degrees backward toward tail
      rightLegGroup.rotation.z = -Math.PI / 4; // Same direction for both legs
    } else {
      // Ground leg position - legs in natural standing position
      leftLegGroup.rotation.z = 0;
      rightLegGroup.rotation.z = 0;
      
      // Walking animation
      if (this.birdState === BirdState.WALKING) {
        const walkDelta = 0.016; // Approximate deltaTime for leg animation
        this.walkCycle += walkDelta * 3;
        const leftLegPhase = Math.sin(this.walkCycle);
        const rightLegPhase = Math.sin(this.walkCycle + Math.PI);
        
        leftLegGroup.rotation.z = leftLegPhase * 0.1;
        rightLegGroup.rotation.z = rightLegPhase * -0.1; // Mirror for right leg
      }
    }
  }

  private animateHeadBob(): void {
    if (!this.bodyParts) return;

    if (this.birdState === BirdState.WALKING || this.birdState === BirdState.FORAGING) {
      this.bodyParts.head.position.x = 0.6 + Math.sin(this.headBobCycle) * 0.05;
      this.bodyParts.head.rotation.x = Math.sin(this.headBobCycle) * 0.1;
    } else {
      if (Math.random() < 0.01) {
        this.bodyParts.head.rotation.y = (Math.random() - 0.5) * 0.5;
      }
    }
  }

  public dispose(): void {
    super.dispose();
  }
}
