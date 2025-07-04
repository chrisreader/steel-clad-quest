import * as THREE from 'three';
import { BirdMaterials, BirdBodyParts, WingSegments } from '../core/BirdTypes';
import { BirdWingBuilder } from './BirdWingBuilder';
import { BirdLegBuilder } from './BirdLegBuilder';

export class BirdBodyBuilder {
  public static createBirdBody(materials: BirdMaterials): { 
    bodyParts: BirdBodyParts, 
    wingSegments: { left: WingSegments; right: WingSegments },
    mesh: THREE.Group 
  } {
    const bodyGroup = new THREE.Group();
    
    // Create realistic oval body geometry - larger and more substantial
    const bodyGeometry = new THREE.SphereGeometry(0.2, 16, 12);
    // Scale to create oval bird body proportions (length, height, width)
    bodyGeometry.scale(1.6, 0.9, 1.1);
    const body = new THREE.Mesh(bodyGeometry, materials.feather);
    bodyGroup.add(body);

    // Create realistic curved neck with multiple segments for flexibility - scaled proportionally
    const neckGroup = new THREE.Group();
    const neckGeometry = new THREE.CapsuleGeometry(0.07, 0.22, 8, 12);
    neckGeometry.rotateZ(Math.PI / 2); // Orient along X-axis
    const neck = new THREE.Mesh(neckGeometry, materials.feather);
    neck.position.set(0.3, 0.08, 0); // Connected to front of body, slightly above
    neckGroup.add(neck);
    bodyGroup.add(neckGroup);

    // Create realistic head with proper proportions - scaled proportionally
    const headGroup = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.08, 12, 10);
    headGeometry.scale(1.5, 1.0, 0.9); // Elongated for realistic bird head
    const head = new THREE.Mesh(headGeometry, materials.feather);
    headGroup.add(head);
    
    // Dynamic head positioning - starts in walking position (above body)
    headGroup.position.set(0.52, 0.15, 0); // Above body level for walking, scaled up
    bodyGroup.add(headGroup);
    
    // Create beak - pointing forward
    const beakGeometry = new THREE.ConeGeometry(0.025, 0.12, 6);
    const beak = new THREE.Mesh(beakGeometry, materials.beak);
    beak.rotation.z = -Math.PI / 2; // Point forward along +X
    beak.position.set(0.15, -0.02, 0);
    headGroup.add(beak);

    // Create eyes on sides of head
    const eyeGeometry = new THREE.SphereGeometry(0.025, 6, 4);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eye);
    const rightEye = new THREE.Mesh(eyeGeometry, materials.eye);
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
    
    const tail = new THREE.Mesh(tailGeometry, materials.feather);
    tail.position.set(-0.3, -0.03, 0); // Overlaps with body rear for seamless connection, scaled up
    tailGroup.add(tail);
    
    tailGroup.position.set(0, 0, 0); // Attached directly to body
    bodyGroup.add(tailGroup);

    // Create wings extending outward from body (perpendicular to body axis) - scaled positions
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    let wingSegments: { left?: WingSegments; right?: WingSegments } = {};
    
    const leftWingResult = BirdWingBuilder.createAnatomicalWing(true, materials, wingSegments);
    const rightWingResult = BirdWingBuilder.createAnatomicalWing(false, materials, wingSegments);
    
    leftWingGroup.add(leftWingResult.group);
    rightWingGroup.add(rightWingResult.group);
    
    wingSegments.left = leftWingResult.segments;
    wingSegments.right = rightWingResult.segments;
    
    // Attach wings to upper shoulders - connected to body surface at body level
    leftWingGroup.position.set(0.2, 0.05, 0.16);  // Left shoulder, at body level
    rightWingGroup.position.set(0.2, 0.05, -0.16); // Right shoulder, at body level
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create legs under body center - properly attached for larger body
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = BirdLegBuilder.createAnatomicalLeg(materials);
    const rightLeg = BirdLegBuilder.createAnatomicalLeg(materials);
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
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

    return { 
      bodyParts, 
      wingSegments: wingSegments as { left: WingSegments; right: WingSegments },
      mesh: bodyGroup 
    };
  }
}