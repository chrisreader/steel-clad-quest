import * as THREE from 'three';
import { BirdMaterials } from '../core/BirdTypes';

export class BirdLegFactory {
  public static createAnatomicalLeg(materials: BirdMaterials): THREE.Group {
    const legGroup = new THREE.Group();
    
    // Create leg segment geometries with proper crow proportions
    const upperLegGeometry = new THREE.CapsuleGeometry(0.025, 0.18, 6, 8);
    const lowerLegGeometry = new THREE.CapsuleGeometry(0.02, 0.15, 6, 8); 
    const footGeometry = new THREE.SphereGeometry(0.025, 8, 6);
    footGeometry.scale(1.5, 0.6, 1.2); // Flatten and elongate foot

    // Create leg parts with materials
    const upperLeg = new THREE.Mesh(upperLegGeometry, materials.leg);
    const lowerLeg = new THREE.Mesh(lowerLegGeometry, materials.leg);
    const foot = new THREE.Mesh(footGeometry, materials.leg);

    // Position leg segments to create realistic bird leg structure
    upperLeg.position.set(0, -0.09, 0); // Upper leg hangs down from body
    
    // Create lower leg group for proper joint rotation
    const lowerLegGroup = new THREE.Group();
    lowerLeg.position.set(0, -0.075, 0); // Lower leg extends from upper leg
    lowerLegGroup.add(lowerLeg);
    lowerLegGroup.position.set(0, -0.18, 0); // Position at end of upper leg

    // Position foot at end of lower leg
    foot.position.set(0, -0.15, 0.01); // Slightly forward for natural stance
    lowerLegGroup.add(foot);

    // Create simple toes
    const toeGeometry = new THREE.CapsuleGeometry(0.008, 0.04, 4, 6);
    
    // Front toes
    for (let i = 0; i < 3; i++) {
      const toe = new THREE.Mesh(toeGeometry, materials.leg);
      const angle = (i - 1) * 0.4; // Spread toes
      toe.position.set(
        Math.sin(angle) * 0.03, 
        -0.15, 
        0.025 + Math.cos(angle) * 0.015
      );
      toe.rotation.z = angle;
      lowerLegGroup.add(toe);
    }
    
    // Back toe
    const backToe = new THREE.Mesh(toeGeometry, materials.leg);
    backToe.position.set(0, -0.15, -0.02);
    backToe.rotation.x = -0.2;
    lowerLegGroup.add(backToe);

    // Assemble leg
    legGroup.add(upperLeg);
    legGroup.add(lowerLegGroup);

    // Store joint references for animation
    legGroup.userData = {
      upperLeg: upperLeg,
      lowerLegGroup: lowerLegGroup,
      foot: foot
    };

    return legGroup;
  }
}