import * as THREE from 'three';
import { BirdBodyParts, BirdMaterialSet } from '../core/BirdTypes';
import { BirdWingSystem } from './BirdWingSystem';

export class BirdBodyBuilder {
  private materials: BirdMaterialSet;
  private wingSystem: BirdWingSystem;

  constructor(materials: BirdMaterialSet) {
    this.materials = materials;
    this.wingSystem = new BirdWingSystem(materials);
  }

  public createBirdBody(): { bodyParts: BirdBodyParts; wingSegments: { left: any; right: any } } {
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
    const tailGroup = this.createTail();
    bodyGroup.add(tailGroup);

    // Create wings
    const { leftWingGroup, rightWingGroup, wingSegments } = this.wingSystem.createWings();
    
    // Attach wings to upper shoulders - connected to body surface at body level
    leftWingGroup.position.set(0.2, 0.05, 0.16);  // Left shoulder, at body level
    rightWingGroup.position.set(0.2, 0.05, -0.16); // Right shoulder, at body level
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create legs under body center - properly attached for larger body
    const { leftLegGroup, rightLegGroup } = this.createLegs();
    
    // Position legs properly attached to body underside - closer to body, scaled
    leftLegGroup.position.set(0.08, -0.18, 0.1);  // Left leg - attached to larger body
    rightLegGroup.position.set(0.08, -0.18, -0.1); // Right leg - attached to larger body
    
    bodyGroup.add(leftLegGroup);
    bodyGroup.add(rightLegGroup);

    const bodyParts: BirdBodyParts = {
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

    return { bodyParts, wingSegments };
  }

  private createTail(): THREE.Group {
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
    return tailGroup;
  }

  private createLegs(): { leftLegGroup: THREE.Group; rightLegGroup: THREE.Group } {
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = this.createAnatomicalLeg();
    const rightLeg = this.createAnatomicalLeg();
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);

    return { leftLegGroup, rightLegGroup };
  }

  private createAnatomicalLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    
    // Create upper leg (thigh)
    const thighGeometry = new THREE.CapsuleGeometry(0.02, 0.12, 6, 8);
    const thigh = new THREE.Mesh(thighGeometry, this.materials.leg);
    thigh.position.set(0, -0.06, 0);
    legGroup.add(thigh);
    
    // Create lower leg (shin)
    const shinGeometry = new THREE.CapsuleGeometry(0.015, 0.18, 6, 8);
    const shin = new THREE.Mesh(shinGeometry, this.materials.leg);
    shin.position.set(0, -0.21, 0);
    legGroup.add(shin);
    
    // Create foot with simple toes
    const footGeometry = new THREE.SphereGeometry(0.025, 8, 6);
    footGeometry.scale(2.0, 0.5, 1.0);
    const foot = new THREE.Mesh(footGeometry, this.materials.leg);
    foot.position.set(0.02, -0.32, 0);
    legGroup.add(foot);
    
    // Add simple toes
    for (let i = 0; i < 3; i++) {
      const toeGeometry = new THREE.CapsuleGeometry(0.008, 0.04, 4, 4);
      const toe = new THREE.Mesh(toeGeometry, this.materials.leg);
      toe.position.set(0.05, -0.34, (i - 1) * 0.02);
      toe.rotation.z = Math.PI / 6;
      legGroup.add(toe);
    }
    
    return legGroup;
  }
}