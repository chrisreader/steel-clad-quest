import * as THREE from 'three';
import { WingSegments, BirdMaterials } from '../core/BirdTypes';
import { BirdGeometryFactory } from './BirdGeometryFactory';

export class BirdWingFactory {
  public static createAnatomicalWing(isLeft: boolean, materials: BirdMaterials): { wing: THREE.Group; segments: WingSegments } {
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

    // COVERT FEATHERS - Small body coverage feathers with OVERLAPPING SHINGLE effect
    const covertFeathers: THREE.Mesh[] = [];
    const covertOverlapFactor = 0.65; // Each feather covers 65% of previous feather length
    
    for (let i = 0; i < 6; i++) {
      const featherLength = 0.12 + (i * 0.008); // Small, gradually increasing
      const baseWidth = (0.03 + (i * 0.002)) * 1.8; // Small base width - THICKER
      const tipWidth = baseWidth * 0.4; // Less tapering for body coverage
      
      const featherGeometry = BirdGeometryFactory.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const covert = new THREE.Mesh(featherGeometry, materials.feather); // Use standard feather material
      
      // OVERLAPPING SHINGLE POSITIONING - each feather starts where previous is 65% complete
      const overlapDistance = i * (0.12 + (i-1) * 0.008) * covertOverlapFactor; // Overlap based on previous feather length
      const alongBone = i * 0.022 + overlapDistance * 0.3; // Closer spacing for overlap
      const layerOffset = -0.02 - (i * 0.003); // Layer feathers with Y-offset like shingles
      const depthOffset = i * 0.001; // Slight depth variation for natural look
      
      covert.position.set(layerOffset, layerOffset, side * alongBone);
      
      // NATURAL SHINGLE ORIENTATION - point backward with progressive overlap angle
      covert.rotation.x = -(i * 0.02); // Slight downward angle for shingle effect
      covert.rotation.y = -(0.1 - i * 0.01); // Flip Y rotation for flipped geometry
      covert.rotation.z = (i * 0.08) + (i * 0.015); // Gradually lift from body + overlap angle
      
      covert.userData.originalRotation = { x: covert.rotation.x, y: covert.rotation.y, z: covert.rotation.z };
      
      humerusGroup.add(covert);
      covertFeathers.push(covert);
    }

    // SECONDARY FEATHERS - Main wing surface with OVERLAPPING SHINGLE effect
    const secondaryFeathers: THREE.Mesh[] = [];
    const secondaryOverlapFactor = 0.7; // Each feather covers 70% of previous feather length
    
    for (let i = 0; i < 8; i++) {
      const featherLength = 0.25 + (i * 0.02); // Gradually increasing toward outer wing
      const baseWidth = (0.06 + (i * 0.004)) * 1.6; // Medium base width, getting wider - THICKER
      const tipWidth = baseWidth * 0.3; // More pointed than coverts
      
      const featherGeometry = BirdGeometryFactory.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, materials.wingFeather || materials.feather); // Use wing feather material
      
      // OVERLAPPING SHINGLE POSITIONING - create realistic overlapping pattern
      const prevFeatherLength = i > 0 ? (0.25 + ((i-1) * 0.02)) : 0.25;
      const overlapDistance = i * prevFeatherLength * secondaryOverlapFactor; // Overlap based on previous feather
      const alongBone = i * 0.018 + overlapDistance * 0.25; // Tighter spacing for natural overlap
      const layerOffset = -0.01 - (i * 0.004); // Progressive Y-layering like roof shingles
      const curveOffset = -(i * 0.002); // Natural wing curve positioning
      
      feather.position.set(layerOffset + curveOffset, layerOffset, side * alongBone);
      
      // NATURAL SHINGLE ORIENTATION - progressive overlap angles
      feather.rotation.x = -(i * 0.015); // Downward shingle angle increases toward wing tip
      feather.rotation.y = -(0.15 - i * 0.005); // Flip Y rotation for flipped geometry
      feather.rotation.z = (i * 0.04) + (i * 0.02); // Wing curve + overlap angle
      
      feather.userData.originalRotation = { x: feather.rotation.x, y: feather.rotation.y, z: feather.rotation.z };
      
      forearmGroup.add(feather);
      secondaryFeathers.push(feather);
    }

    // PRIMARY FEATHERS - Wing control surfaces with PRECISE OVERLAPPING SHINGLE effect
    const primaryFeathers: THREE.Mesh[] = [];
    const primaryOverlapFactor = 0.75; // Tightest overlap for wingtip control feathers
    
    for (let i = 0; i < 10; i++) {
      const featherLength = 0.30 + (i * 0.015); // Longest feathers at wingtip
      const baseWidth = (0.08 + (i * 0.004)) * 1.5; // Large base width for flight control - THICKER
      const tipWidth = baseWidth * 0.2; // Highly pointed for aerodynamics
      
      const featherGeometry = BirdGeometryFactory.createTaperedFeatherGeometry(baseWidth, tipWidth, featherLength);
      const feather = new THREE.Mesh(featherGeometry, materials.primaryFeather || materials.feather); // Use primary feather material
      
      // PRECISE OVERLAPPING SHINGLE POSITIONING - wingtip feathers need tight overlap
      const prevFeatherLength = i > 0 ? (0.30 + ((i-1) * 0.015)) : 0.30;
      const overlapDistance = i * prevFeatherLength * primaryOverlapFactor; // Tight overlap for control
      const alongBone = i * 0.012 + overlapDistance * 0.2; // Very tight spacing for precise control
      const layerOffset = -(i * 0.005); // Progressive Y-layering for wingtip
      const tipCurve = -(i * 0.003); // Natural wingtip curve
      
      feather.position.set(tipCurve, layerOffset, side * alongBone);
      
      // PRECISE WINGTIP ORIENTATION - each feather follows wingtip curve
      const tipEffect = i / 9; // 0 to 1 from body to tip
      feather.rotation.x = -(i * 0.012); // Downward angle for wingtip control
      feather.rotation.y = -(0.2 + tipEffect * 0.1); // Flip Y rotation for flipped geometry
      feather.rotation.z = (tipEffect * 0.3) + (i * 0.025); // Wingtip curve + overlap angle
      
      feather.userData.originalRotation = { x: feather.rotation.x, y: feather.rotation.y, z: feather.rotation.z };
      
      handGroup.add(feather);
      primaryFeathers.push(feather);
    }

    const segments: WingSegments = {
      upperArm: humerus,
      forearm: forearm,
      hand: hand,
      primaryFeathers: primaryFeathers,
      secondaryFeathers: secondaryFeathers,
      covertFeathers: covertFeathers
    };

    return { wing: wingGroup, segments };
  }
}