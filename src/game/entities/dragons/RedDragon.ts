import * as THREE from 'three';
import { BaseDragon, DragonState, DragonFlightMode, DragonBodyParts, DragonWingMembranes, DragonConfig } from './BaseDragon';
import { TextureGenerator } from '../../utils';

export class RedDragon extends BaseDragon {
  private wingMembranes: { left: DragonWingMembranes; right: DragonWingMembranes } | null = null;
  private materials: {
    scales: THREE.Material;
    belly: THREE.Material;
    horn: THREE.Material;
    eye: THREE.Material;
    claw: THREE.Material;
    membrane: THREE.Material;
    emissive: THREE.Material;
  } | null = null;
  
  // Enhanced flight systems for dragons
  private maxFlightTime: number = 120; // Much longer flight time
  private minFlightTime: number = 30; // Minimum flight before landing
  private flightTimer: number = 0;
  private maxAltitude: number = 80; // Higher ceiling for dragons
  private emergencyLanding: boolean = false;

  constructor(id: string) {
    const dragonConfig: DragonConfig = {
      species: 'Red Dragon',
      size: 10.0, // 10x larger than bird
      wingspan: 24.0, // 10x larger than bird wingspan
      bodyLength: 10.0, // 10x larger than bird body
      neckLength: 8.0, // Long dragon neck
      tailLength: 12.0, // Long dragon tail
      legLength: 6.0, // 10x larger than bird legs
      walkSpeed: 3.0, // Slower but more powerful
      flightSpeed: 12.0, // Faster than birds
      flightAltitude: { min: 30, max: 80 }, // Higher altitude range
      territoryRadius: 100, // Much larger territory
      alertDistance: 25, // Greater awareness
      fireBreathRange: 15, // Dragon-specific
      roarRadius: 50 // Dragon-specific
    };
    
    super(id, dragonConfig);
    
    this.maxFlightTime = 120;
    this.minFlightTime = 30;
    this.flightTimer = 0;
    this.maxAltitude = 80;
    this.emergencyLanding = false;
  }

  protected createDragonBody(): void {
    this.createDragonMaterials();
    
    const bodyGroup = new THREE.Group();
    
    // Create massive dragon body - elongated and powerful
    const bodyGeometry = new THREE.SphereGeometry(2.0, 24, 16); // 10x larger than bird
    bodyGeometry.scale(2.0, 1.2, 1.4); // More elongated dragon proportions
    const body = new THREE.Mesh(bodyGeometry, this.materials!.scales);
    bodyGroup.add(body);

    // Create long, flexible dragon neck
    const neckGroup = new THREE.Group();
    const neckGeometry = new THREE.CapsuleGeometry(0.6, 3.0, 16, 20); // Much larger and longer
    neckGeometry.rotateZ(Math.PI / 2); // Orient along X-axis
    const neck = new THREE.Mesh(neckGeometry, this.materials!.scales);
    neck.position.set(3.5, 1.0, 0); // Connected to front of massive body
    neckGroup.add(neck);
    bodyGroup.add(neckGroup);

    // Create imposing dragon head
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(1.2, 20, 16); // Much larger head
    headGeometry.scale(1.8, 1.2, 1.0); // Elongated dragon skull
    const head = new THREE.Mesh(headGeometry, this.materials!.scales);
    headGroup.add(head);
    
    // Position head at end of neck
    headGroup.position.set(7.0, 2.0, 0);
    bodyGroup.add(headGroup);
    
    // Create dragon jaw
    const jawGeometry = new THREE.SphereGeometry(1.0, 16, 12);
    jawGeometry.scale(1.6, 0.8, 0.9);
    const jaw = new THREE.Mesh(jawGeometry, this.materials!.scales);
    jaw.position.set(0.8, -0.8, 0);
    headGroup.add(jaw);

    // Create dragon horns
    const hornsGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const hornGeometry = new THREE.ConeGeometry(0.15, 1.2, 8);
      const horn = new THREE.Mesh(hornGeometry, this.materials!.horn);
      horn.rotation.x = -Math.PI / 6;
      
      const x = i < 2 ? 0.3 : -0.3;
      const z = i % 2 === 0 ? 0.8 : -0.8;
      horn.position.set(x, 1.0, z);
      hornsGroup.add(horn);
    }
    headGroup.add(hornsGroup);

    // Create glowing dragon eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 12, 8);
    const leftEye = new THREE.Mesh(eyeGeometry, this.materials!.eye);
    const rightEye = new THREE.Mesh(eyeGeometry, this.materials!.eye);
    leftEye.position.set(1.0, 0.4, 0.9);
    rightEye.position.set(1.0, 0.4, -0.9);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Create massive dragon tail with spikes
    const tailGroup = new THREE.Group();
    
    // Main tail body
    const tailGeometry = new THREE.SphereGeometry(1.0, 20, 12);
    tailGeometry.scale(3.0, 0.8, 1.2); // Long, tapered tail
    
    // Add natural tail taper
    const tailPositions = tailGeometry.attributes.position;
    for (let i = 0; i < tailPositions.count; i++) {
      const x = tailPositions.getX(i);
      const y = tailPositions.getY(i);
      const z = tailPositions.getZ(i);
      
      if (x < 0) {
        const tailIntensity = Math.abs(x) / 2.0;
        tailPositions.setY(i, y * (1 - tailIntensity * 0.6));
        tailPositions.setZ(i, z * (1 - tailIntensity * 0.3));
      }
    }
    tailPositions.needsUpdate = true;
    tailGeometry.computeVertexNormals();
    
    const tail = new THREE.Mesh(tailGeometry, this.materials!.scales);
    tail.position.set(-4.0, -0.5, 0);
    tailGroup.add(tail);
    
    // Add tail spikes
    const spikesGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const spikeGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
      const spike = new THREE.Mesh(spikeGeometry, this.materials!.horn);
      spike.position.set(-1.0 - i * 0.5, 0.8, 0);
      spike.rotation.z = Math.PI;
      spikesGroup.add(spike);
    }
    tailGroup.add(spikesGroup);
    
    bodyGroup.add(tailGroup);

    // Create massive dragon wings
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    const leftWing = this.createDragonWing(true);
    const rightWing = this.createDragonWing(false);
    
    leftWingGroup.add(leftWing);
    rightWingGroup.add(rightWing);
    
    // Attach wings to upper shoulders
    leftWingGroup.position.set(1.0, 1.5, 3.0); // Scaled up positions
    rightWingGroup.position.set(1.0, 1.5, -3.0);
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create powerful dragon legs
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createDragonLeg();
    const rightLeg = this.createDragonLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    // Position legs under body
    leftLegGroup.position.set(0.0, -2.5, 2.0);
    rightLegGroup.position.set(0.0, -2.5, -2.0);
    
    bodyGroup.add(leftLegGroup);
    bodyGroup.add(rightLegGroup);

    // Create dragon arms (front legs)
    const leftArmGroup = new THREE.Group();
    const rightArmGroup = new THREE.Group();
    
    const leftArm = this.createDragonArm();
    const rightArm = this.createDragonArm();
    
    leftArmGroup.add(leftArm);
    rightArmGroup.add(rightArm);
    
    // Position arms at front of body
    leftArmGroup.position.set(2.0, -1.8, 1.5);
    rightArmGroup.position.set(2.0, -1.8, -1.5);
    
    bodyGroup.add(leftArmGroup);
    bodyGroup.add(rightArmGroup);

    this.bodyParts = {
      body: bodyGroup,
      head: headGroup,
      neck: neckGroup,
      tail: tailGroup,
      leftWing: leftWingGroup,
      rightWing: rightWingGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      horns: hornsGroup,
      spikes: spikesGroup,
      jaw: jaw,
      leftEye: leftEye,
      rightEye: rightEye
    };

    this.mesh.add(bodyGroup);
  }

  private createDragonMaterials(): void {
    // Create dragon-specific materials with metallic sheen and fire effects
    this.materials = {
      scales: new THREE.MeshPhongMaterial({
        color: 0x8B0000,          // Deep red dragon scales
        specular: 0xFF6B6B,       // Bright red specular for metallic sheen
        shininess: 60,            // High shininess for scale reflection
        side: THREE.DoubleSide
      }),
      belly: new THREE.MeshPhongMaterial({
        color: 0x654321,          // Darker red-brown belly
        specular: 0x8B4513,       // Subdued specular for softer belly
        shininess: 30,
        side: THREE.DoubleSide
      }),
      horn: new THREE.MeshPhongMaterial({
        color: 0x2F2F2F,          // Dark horn material
        specular: 0x8B8B8B,       // Grey specular for bone-like shine
        shininess: 80,            // Very shiny horns
        emissive: 0x1a0000        // Slight red glow
      }),
      eye: new THREE.MeshPhongMaterial({
        color: 0xFF4500,          // Bright orange-red dragon eyes
        specular: 0xFFFFFF,       // White specular for eye shine
        shininess: 100,           // Very shiny eyes
        emissive: 0xFF1100        // Glowing red eyes
      }),
      claw: new THREE.MeshPhongMaterial({
        color: 0x1C1C1C,          // Dark claws
        specular: 0x4A4A4A,       // Steel-like shine
        shininess: 90,            // Very sharp appearance
        emissive: 0x0a0000        // Slight red tint
      }),
      membrane: new THREE.MeshPhongMaterial({
        color: 0x8B0000,          // Red wing membranes
        specular: 0x4B0000,       // Subtle red specular
        shininess: 20,            // Lower shininess for skin-like texture
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8              // Slightly transparent membranes
      }),
      emissive: new THREE.MeshPhongMaterial({
        color: 0xFF0000,          // Bright red for fire effects
        specular: 0xFF4500,       // Orange specular
        shininess: 40,
        emissive: 0xFF2200        // Strong red glow
      })
    };
  }

  private createDragonWing(isLeft: boolean): THREE.Group {
    const wingGroup = new THREE.Group();
    const side = isLeft ? 1 : -1;
    
    // Wing shoulder/attachment
    const shoulderGroup = new THREE.Group();
    wingGroup.add(shoulderGroup);
    
    // Wing arm bone (humerus equivalent) - extends outward
    const wingArmGroup = new THREE.Group();
    const wingArmGeometry = new THREE.CapsuleGeometry(0.4, 5.0, 12, 16);
    const wingArm = new THREE.Mesh(wingArmGeometry, this.materials!.scales);
    
    wingArm.rotation.x = Math.PI / 2;
    wingArm.position.set(0, 0, side * 2.5);
    wingArmGroup.add(wingArm);
    shoulderGroup.add(wingArmGroup);

    // Wing forearm - continues extension at angle
    const forearmGroup = new THREE.Group();
    const forearmGeometry = new THREE.CapsuleGeometry(0.3, 6.0, 12, 16);
    const forearm = new THREE.Mesh(forearmGeometry, this.materials!.scales);
    
    forearm.rotation.x = Math.PI / 2;
    forearm.rotation.z = side * -0.3; // Angle outward
    forearm.position.set(-1.0, 0, side * 3.0);
    forearmGroup.add(forearm);
    
    forearmGroup.position.set(0, 0, side * 5.0);
    wingArmGroup.add(forearmGroup);

    // Wing finger bones - properly positioned and angled
    const fingerBones: THREE.Mesh[] = [];
    const fingerPositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < 4; i++) {
      const fingerGeometry = new THREE.CapsuleGeometry(0.08, 4.0 - i * 0.3, 8, 12);
      const fingerBone = new THREE.Mesh(fingerGeometry, this.materials!.scales);
      
      // Calculate natural finger spread
      const angle = (i - 1.5) * 0.4; // More natural spread
      const length = 4.0 - i * 0.3; // Decreasing length
      
      fingerBone.rotation.x = Math.PI / 2;
      fingerBone.rotation.z = side * angle;
      
      const baseX = -2.0 - i * 0.8;
      const baseZ = side * (2.0 + i * 0.5);
      fingerBone.position.set(baseX, 0, baseZ);
      
      // Store finger tip positions for membrane creation
      const tipX = baseX - Math.cos(angle) * length;
      const tipZ = baseZ + side * Math.sin(angle) * length;
      fingerPositions.push(new THREE.Vector3(tipX, 0, tipZ));
      
      forearmGroup.add(fingerBone);
      fingerBones.push(fingerBone);
    }

    // Create organic wing membranes between finger bones
    const membranes: THREE.Mesh[] = [];
    
    // Main membrane from wing arm to first finger
    const mainMembrane = this.createWingMembraneGeometry([
      new THREE.Vector3(0, 0, side * 2.5), // Wing arm base
      new THREE.Vector3(-1.0, 0, side * 5.0), // Forearm connection
      fingerPositions[0], // First finger tip
      new THREE.Vector3(-1.0, -1.5, side * 3.0) // Lower attachment
    ], side);
    forearmGroup.add(mainMembrane);
    membranes.push(mainMembrane);
    
    // Membranes between each finger bone
    for (let i = 0; i < fingerPositions.length - 1; i++) {
      const membrane = this.createWingMembraneGeometry([
        fingerPositions[i],
        fingerPositions[i + 1],
        new THREE.Vector3(fingerPositions[i + 1].x, -2.0, fingerPositions[i + 1].z * 0.7),
        new THREE.Vector3(fingerPositions[i].x, -2.0, fingerPositions[i].z * 0.7)
      ], side);
      forearmGroup.add(membrane);
      membranes.push(membrane);
    }
    
    // Trailing edge membrane from last finger to body
    const trailingMembrane = this.createWingMembraneGeometry([
      fingerPositions[fingerPositions.length - 1],
      new THREE.Vector3(-8.0, -1.0, side * 2.0), // Body connection
      new THREE.Vector3(-6.0, -3.0, side * 1.0), // Lower body
      new THREE.Vector3(fingerPositions[fingerPositions.length - 1].x, -2.5, fingerPositions[fingerPositions.length - 1].z * 0.5)
    ], side);
    forearmGroup.add(trailingMembrane);
    membranes.push(trailingMembrane);

    // Store wing segments for animation
    const wingMembranes: DragonWingMembranes = {
      upperMembrane: membranes[0],
      lowerMembrane: membranes[membranes.length - 1],
      fingerBones,
      wingArm,
      wingForearm: forearm
    };
    
    if (isLeft) {
      this.wingMembranes = { left: wingMembranes, right: this.wingMembranes?.right || wingMembranes };
    } else {
      this.wingMembranes = { left: this.wingMembranes?.left || wingMembranes, right: wingMembranes };
    }

    return wingGroup;
  }

  private createWingMembraneGeometry(points: THREE.Vector3[], side: number): THREE.Mesh {
    // Create organic curved membrane between points
    const width = 16;
    const height = 16;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    // Generate vertices with natural membrane sag
    for (let i = 0; i <= height; i++) {
      for (let j = 0; j <= width; j++) {
        const u = j / width;
        const v = i / height;
        
        // Bilinear interpolation between the four corner points
        const x1 = points[0].x * (1 - u) + points[1].x * u;
        const y1 = points[0].y * (1 - u) + points[1].y * u;
        const z1 = points[0].z * (1 - u) + points[1].z * u;
        
        const x2 = points[3].x * (1 - u) + points[2].x * u;
        const y2 = points[3].y * (1 - u) + points[2].y * u;
        const z2 = points[3].z * (1 - u) + points[2].z * u;
        
        const x = x1 * (1 - v) + x2 * v;
        const y = y1 * (1 - v) + y2 * v;
        const z = z1 * (1 - v) + z2 * v;
        
        // Add natural membrane sag (parabolic curve)
        const sagAmount = 0.3;
        const distanceFromEdge = Math.min(u, 1 - u, v, 1 - v);
        const sag = sagAmount * (1 - distanceFromEdge * 4) * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
        
        vertices.push(x, y - Math.abs(sag), z);
        uvs.push(u, v);
      }
    }
    
    // Generate faces
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const a = i * (width + 1) + j;
        const b = a + width + 1;
        
        // Two triangles per quad
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    
    // Enhanced membrane material with organic properties
    const membraneMaterial = new THREE.MeshPhongMaterial({
      color: 0x5D1A1A,          // Darker red for realism
      specular: 0x2D0A0A,       // Subtle specular
      shininess: 5,             // Low shininess for skin-like texture
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,            // Slightly more opaque
      emissive: 0x0A0000,       // Very subtle red glow
    });
    
    return new THREE.Mesh(geometry, membraneMaterial);
  }

  private createDragonLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    
    // Upper leg (thigh)
    const thighGeometry = new THREE.CapsuleGeometry(0.4, 2.5, 12, 16);
    const thigh = new THREE.Mesh(thighGeometry, this.materials!.scales);
    thigh.position.set(0, -1.25, 0);
    legGroup.add(thigh);
    
    // Lower leg (shin)
    const shinGeometry = new THREE.CapsuleGeometry(0.3, 2.0, 10, 14);
    const shin = new THREE.Mesh(shinGeometry, this.materials!.scales);
    shin.position.set(0, -3.5, 0);
    legGroup.add(shin);
    
    // Dragon foot with claws
    const footGeometry = new THREE.SphereGeometry(0.5, 12, 8);
    const foot = new THREE.Mesh(footGeometry, this.materials!.scales);
    foot.position.set(0, -4.5, 0);
    legGroup.add(foot);
    
    // Claws
    for (let i = 0; i < 4; i++) {
      const clawGeometry = new THREE.ConeGeometry(0.1, 0.6, 8);
      const claw = new THREE.Mesh(clawGeometry, this.materials!.claw);
      claw.position.set(0.3 * Math.cos(i * Math.PI / 2), -4.8, 0.3 * Math.sin(i * Math.PI / 2));
      claw.rotation.x = Math.PI;
      legGroup.add(claw);
    }
    
    return legGroup;
  }

  private createDragonArm(): THREE.Group {
    const armGroup = new THREE.Group();
    
    // Upper arm
    const upperArmGeometry = new THREE.CapsuleGeometry(0.35, 2.0, 12, 16);
    const upperArm = new THREE.Mesh(upperArmGeometry, this.materials!.scales);
    upperArm.position.set(0, -1.0, 0);
    armGroup.add(upperArm);
    
    // Forearm
    const forearmGeometry = new THREE.CapsuleGeometry(0.25, 1.5, 10, 14);
    const forearm = new THREE.Mesh(forearmGeometry, this.materials!.scales);
    forearm.position.set(0, -2.2, 0);
    armGroup.add(forearm);
    
    // Dragon hand with claws
    const handGeometry = new THREE.SphereGeometry(0.4, 12, 8);
    const hand = new THREE.Mesh(handGeometry, this.materials!.scales);
    hand.position.set(0, -3.0, 0);
    armGroup.add(hand);
    
    // Hand claws
    for (let i = 0; i < 3; i++) {
      const clawGeometry = new THREE.ConeGeometry(0.08, 0.5, 8);
      const claw = new THREE.Mesh(clawGeometry, this.materials!.claw);
      claw.position.set(0.25 * Math.cos(i * Math.PI / 1.5), -3.3, 0.25 * Math.sin(i * Math.PI / 1.5));
      claw.rotation.x = Math.PI;
      armGroup.add(claw);
    }
    
    return armGroup;
  }

  protected updateDragonBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.stateTimer += deltaTime;
    
    // Update cooldowns
    if (this.roarCooldown > 0) this.roarCooldown -= deltaTime;
    if (this.fireBreathCooldown > 0) this.fireBreathCooldown -= deltaTime;
    
    // Check if player is too close (intimidation)
    if (this.distanceFromPlayer < this.intimidationRadius && this.roarCooldown <= 0) {
      if (Math.random() < 0.3) { // 30% chance to roar at close player
        this.changeState(DragonState.ROARING);
        this.roarCooldown = 10.0; // 10 second cooldown
      }
    }
    
    // Dragon state machine
    switch (this.dragonState) {
      case DragonState.IDLE:
        if (Date.now() > this.nextStateChange) {
          const rand = Math.random();
          if (rand < 0.3) {
            this.changeState(DragonState.PROWLING);
          } else if (rand < 0.6) {
            this.startFlight();
          } else {
            this.changeState(DragonState.ROARING);
          }
        }
        break;
        
      case DragonState.PROWLING:
        // Ground movement behavior
        if (this.stateTimer > 8) {
          if (Math.random() < 0.7) {
            this.startFlight();
          } else {
            this.changeState(DragonState.IDLE);
          }
        }
        break;
        
      case DragonState.TAKING_OFF:
        if (this.position.y > this.groundLevel + 15) {
          this.changeState(DragonState.FLYING);
          this.flightTimer = 0;
        }
        break;
        
      case DragonState.FLYING:
        this.flightTimer += deltaTime;
        this.followFlightPath(deltaTime);
        
        if (this.flightTimer > this.minFlightTime) {
          if (Math.random() < 0.01) { // 1% chance per frame to start soaring
            this.changeState(DragonState.SOARING);
          }
        }
        
        if (this.flightTimer > this.maxFlightTime) {
          this.startLanding();
        }
        break;
        
      case DragonState.SOARING:
        this.followFlightPath(deltaTime);
        
        if (this.stateTimer > 20 || this.position.y < this.groundLevel + 20) {
          this.changeState(DragonState.FLYING);
        }
        break;
        
      case DragonState.LANDING:
        this.followFlightPath(deltaTime);
        
        if (this.position.y <= this.groundLevel + 5) {
          this.flightMode = DragonFlightMode.GROUNDED;
          this.changeState(DragonState.IDLE);
          this.flightTimer = 0;
        }
        break;
        
      case DragonState.ROARING:
        if (this.stateTimer > 3.0) { // 3 second roar
          this.changeState(DragonState.IDLE);
        }
        break;
    }
  }

  protected updateAnimation(deltaTime: number): void {
    if (!this.bodyParts) return;
    
    // Update animation cycles
    this.walkCycle += deltaTime * 2;
    this.flapCycle += deltaTime * (this.isFlapping ? 8 : 2); // Slower wing beats for dragons
    this.neckMovement += deltaTime * 1.5;
    this.tailSway += deltaTime * 0.8;
    
    // Animate wings
    this.animateWings(deltaTime);
    
    // Animate neck movement
    this.animateNeck(deltaTime);
    
    // Animate tail sway
    this.animateTail(deltaTime);
    
    // Animate eyes (glowing effect)
    this.animateEyes(deltaTime);
    
    // Animate breathing (body expansion)
    this.animateBreathing(deltaTime);
  }

  private animateWings(deltaTime: number): void {
    if (!this.bodyParts) return;
    
    if (this.isFlapping) {
      const wingAngle = Math.sin(this.flapCycle) * 0.8; // Slower, more powerful beats
      
      this.bodyParts.leftWing.rotation.z = wingAngle + 0.3;
      this.bodyParts.rightWing.rotation.z = -wingAngle - 0.3;
    } else {
      // Spread wings for soaring or folded for ground
      const targetAngle = this.flightMode === DragonFlightMode.GROUNDED ? 0.2 : 0.8;
      
      this.bodyParts.leftWing.rotation.z = THREE.MathUtils.lerp(
        this.bodyParts.leftWing.rotation.z, targetAngle, 0.02
      );
      this.bodyParts.rightWing.rotation.z = THREE.MathUtils.lerp(
        this.bodyParts.rightWing.rotation.z, -targetAngle, 0.02
      );
    }
  }

  private animateNeck(deltaTime: number): void {
    if (!this.bodyParts) return;
    
    // Slow neck movement for scanning
    const neckSway = Math.sin(this.neckMovement) * 0.1;
    const neckBob = Math.sin(this.neckMovement * 0.7) * 0.05;
    
    this.bodyParts.neck.rotation.y = neckSway;
    this.bodyParts.head.rotation.x = neckBob;
    
    // Alert head movement
    if (this.dragonState === DragonState.ALERT) {
      this.bodyParts.head.rotation.y = Math.sin(this.neckMovement * 4) * 0.2;
    }
  }

  private animateTail(deltaTime: number): void {
    if (!this.bodyParts) return;
    
    // Slow, powerful tail sway
    const tailSwayX = Math.sin(this.tailSway) * 0.15;
    const tailSwayY = Math.sin(this.tailSway * 0.6) * 0.1;
    
    this.bodyParts.tail.rotation.y = tailSwayX;
    this.bodyParts.tail.rotation.x = tailSwayY;
  }

  private animateEyes(deltaTime: number): void {
    if (!this.bodyParts || !this.materials) return;
    
    // Pulsing glow effect
    const glowIntensity = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
    
    const eyeMaterial = this.materials.eye as THREE.MeshPhongMaterial;
    const currentEmissive = eyeMaterial.emissive.getHex();
    const targetEmissive = 0xFF1100;
    
    // Smooth pulsing glow
    eyeMaterial.emissive.setHex(
      THREE.MathUtils.lerp(currentEmissive, targetEmissive, glowIntensity)
    );
  }

  private animateBreathing(deltaTime: number): void {
    if (!this.bodyParts) return;
    
    // Slow breathing animation
    const breathCycle = Math.sin(Date.now() * 0.001) * 0.05 + 1.0;
    this.bodyParts.body.scale.setScalar(breathCycle);
  }
}