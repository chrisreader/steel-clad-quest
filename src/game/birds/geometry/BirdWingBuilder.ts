import * as THREE from 'three';
import { BirdMaterials, WingSegments } from '../core/BirdTypes';
import { BirdFeatherBuilder } from './BirdFeatherBuilder';

export class BirdWingBuilder {
  public static createAnatomicalWing(
    isLeft: boolean, 
    materials: BirdMaterials,
    wingSegments: { left?: WingSegments; right?: WingSegments }
  ): { group: THREE.Group; segments: WingSegments } {
    const wingGroup = new THREE.Group();
    const side = isLeft ? 1 : -1;
    
    // SHOULDER/SCAPULA - Base attachment point at bird's body
    const shoulderGroup = new THREE.Group();
    wingGroup.add(shoulderGroup);
    
    // HUMERUS - Upper arm bone that extends OUTWARD from body (along Z-axis for wingspan)
    const humerusGroup = new THREE.Group();
    const humerusGeometry = new THREE.CapsuleGeometry(0.03, 0.24, 6, 8);
    const humerus = new THREE.Mesh(humerusGeometry, materials.feather);
    
    // Orient bone along Z-axis (outward from body to create wingspan width)
    humerus.rotation.x = Math.PI / 2; // Rotate to align along Z-axis
    humerus.position.set(0, 0, side * 0.12); // Extend outward from shoulder
    humerusGroup.add(humerus);
    
    // Attach humerus to shoulder (at body attachment point)
    shoulderGroup.add(humerusGroup);

    // FOREARM - Continues extending outward creating wing length
    const forearmGroup = new THREE.Group();
    const forearmGeometry = new THREE.CapsuleGeometry(0.025, 0.28, 6, 8);
    const forearm = new THREE.Mesh(forearmGeometry, materials.feather);
    
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
    const hand = new THREE.Mesh(handGeometry, materials.feather);
    
    // Continue Z-axis extension to wingtip with slight curve back
    hand.rotation.x = Math.PI / 2; // Align along Z-axis
    hand.position.set(-0.02, 0, side * 0.08); // Slightly curved back and outward
    handGroup.add(hand);
    
    // Position hand at end of forearm (wrist joint)
    handGroup.position.set(0, 0, side * 0.28); // At end of forearm
    forearmGroup.add(handGroup);

    // Create feather groups
    const covertFeathers = this.createCovertFeathers(humerusGroup, materials, side);
    const secondaryFeathers = this.createSecondaryFeathers(forearmGroup, materials, side);
    const primaryFeathers = this.createPrimaryFeathers(handGroup, materials, side);

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

    return { group: wingGroup, segments };
  }

  private static createCovertFeathers(humerusGroup: THREE.Group, materials: BirdMaterials, side: number): THREE.Mesh[] {
    // COVERT FEATHERS - Small body coverage feathers (shortest, narrowest base) - THICKER
    const covertFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const featherLength = 0.12 + (i * 0.008); // Small, gradually increasing
      const baseWidth = (0.03 + (i * 0.002)) * 1.8; // Small base width - THICKER
      const tipWidth = baseWidth * 0.4; // Less tapering for body coverage
      
      const featherGeometry = BirdFeatherBuilder.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const covert = new THREE.Mesh(featherGeometry, materials.feather); // Use standard feather material
      
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
    return covertFeathers;
  }

  private static createSecondaryFeathers(forearmGroup: THREE.Group, materials: BirdMaterials, side: number): THREE.Mesh[] {
    // SECONDARY FEATHERS - Main wing surface (medium size, proper progression) - THICKER
    const secondaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const featherLength = 0.25 + (i * 0.02); // Gradually increasing toward outer wing
      const baseWidth = (0.06 + (i * 0.004)) * 1.6; // Medium base width, getting wider - THICKER
      const tipWidth = baseWidth * 0.3; // More pointed than coverts
      
      const featherGeometry = BirdFeatherBuilder.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, materials.wingFeather || materials.feather); // Use wing feather material
      
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
    return secondaryFeathers;
  }

  private static createPrimaryFeathers(handGroup: THREE.Group, materials: BirdMaterials, side: number): THREE.Mesh[] {
    // PRIMARY FEATHERS - Wing control surfaces (largest, longest) - THICKER
    const primaryFeathers: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const featherLength = 0.30 + (i * 0.015); // Longest feathers at wingtip
      const baseWidth = (0.08 + (i * 0.004)) * 1.5; // Large base width for flight control - THICKER
      const tipWidth = baseWidth * 0.2; // Highly pointed for aerodynamics
      
      const featherGeometry = BirdFeatherBuilder.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, materials.primaryFeather || materials.feather); // Use primary feather material
      
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
    return primaryFeathers;
  }
}