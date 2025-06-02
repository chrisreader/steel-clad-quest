
import * as THREE from 'three';
import { TextureGenerator } from '../utils';

export interface EnemyBodyParts {
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftElbow: THREE.Mesh;
  rightElbow: THREE.Mesh;
  leftWrist: THREE.Mesh;
  rightWrist: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftKnee: THREE.Mesh;
  rightKnee: THREE.Mesh;
  weapon?: THREE.Group;
  hitBox: THREE.Mesh;
}

export class EnemyBodyBuilder {
  public static createRealisticOrcBody(position: THREE.Vector3): {
    group: THREE.Group;
    bodyParts: EnemyBodyParts;
  } {
    const orcGroup = new THREE.Group();
    
    // === IMPROVED SCALE CONFIGURATION ===
    const scale = {
      body: { radius: 0.55, height: 1.4 },
      head: { radius: 0.5 },
      arm: { radius: [0.18, 0.22], length: 1.1 },
      forearm: { radius: [0.16, 0.18], length: 0.9 },
      leg: { radius: [0.22, 0.26], length: 0.7 },     // Upper leg (thigh)
      shin: { radius: [0.18, 0.20], length: 0.65 }    // Lower leg (shin)
    };
    
    // Orc colors (darker, more menacing)
    const colors = {
      skin: 0x4A5D23,
      muscle: 0x5D7A2A,
      accent: 0x3A4D1A
    };
    
    const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
    const metalTexture = TextureGenerator.createMetalTexture(0x444444);
    
    // === LEG POSITIONING ===
    const legTopY = 1.4;
    const thighCenterY = legTopY - scale.leg.length / 2;
    
    const leftLegGeometry = new THREE.CylinderGeometry(scale.leg.radius[0], scale.leg.radius[1], scale.leg.length, 16);
    const leftLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    leftLeg.position.set(
      -scale.body.radius * 0.4,
      thighCenterY,
      0
    );
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    orcGroup.add(leftLeg);
    
    const rightLegGeometry = new THREE.CylinderGeometry(scale.leg.radius[0], scale.leg.radius[1], scale.leg.length, 16);
    const rightLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    rightLeg.position.set(
      scale.body.radius * 0.4,
      thighCenterY,
      0
    );
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    orcGroup.add(rightLeg);
    
    // === BODY POSITIONING ===
    const bodyGeometry = new THREE.CylinderGeometry(scale.body.radius, scale.body.radius * 1.15, scale.body.height, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: colors.skin,
      shininess: 25,
      specular: 0x333333
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = legTopY + scale.body.height / 2; // 1.4 + 0.7 = 2.1
    body.castShadow = true;
    body.receiveShadow = true;
    orcGroup.add(body);
    
    // === HEAD POSITIONING (FIXED - NO GAP) ===
    const bodyTopY = body.position.y + scale.body.height / 2; // 2.1 + 0.7 = 2.8
    const headGeometry = new THREE.SphereGeometry(scale.head.radius, 20, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: colors.muscle,
      shininess: 30,
      specular: 0x222222
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    // Position head so its bottom touches body top (no gap)
    head.position.y = bodyTopY + scale.head.radius; // 2.8 + 0.5 = 3.3 (removed the +0.1 gap)
    head.castShadow = true;
    head.receiveShadow = true;
    orcGroup.add(head);
    
    // Create intimidating red eyes (updated for new head position)
    const eyeGeometry = new THREE.SphereGeometry(0.12, 12, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFF0000,
      transparent: true,
      opacity: 1,
      emissive: 0xFF0000,
      emissiveIntensity: 0.4
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, head.position.y + 0.05, scale.head.radius * 0.85);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.2, head.position.y + 0.05, scale.head.radius * 0.85);
    orcGroup.add(leftEye);
    orcGroup.add(rightEye);
    
    // Create tusks (updated for new head position)
    const tuskGeometry = new THREE.ConeGeometry(0.08, 0.35, 8);
    const tuskMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFFFACD,
      shininess: 60
    });
    const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    leftTusk.position.set(-0.2, head.position.y - 0.15, scale.head.radius * 0.85);
    leftTusk.rotation.x = Math.PI;
    leftTusk.castShadow = true;
    const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
    rightTusk.position.set(0.2, head.position.y - 0.15, scale.head.radius * 0.85);
    rightTusk.rotation.x = Math.PI;
    rightTusk.castShadow = true;
    orcGroup.add(leftTusk);
    orcGroup.add(rightTusk);
    
    // === ARM POSITIONING (FIXED - HIGHER SHOULDERS) ===
    // Position shoulders higher up on the torso for better proportions
    const shoulderHeight = body.position.y + scale.body.height * 0.25; // 2.1 + 0.35 = 2.45 (was 2.59, now higher)
    
    // LEFT ARM SYSTEM
    const leftArmGeometry = new THREE.CylinderGeometry(scale.arm.radius[0], scale.arm.radius[1], scale.arm.length, 16);
    const leftArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    leftArm.position.set(-(scale.body.radius + 0.25), shoulderHeight, 0);
    leftArm.rotation.x = 0.393; // ~22.5 degrees forward
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    orcGroup.add(leftArm);
    
    // Left elbow (forearm)
    const leftElbowGeometry = new THREE.CylinderGeometry(scale.forearm.radius[0], scale.forearm.radius[1], scale.forearm.length, 16);
    const leftElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftElbow = new THREE.Mesh(leftElbowGeometry, leftElbowMaterial);
    leftElbow.position.set(0, -scale.arm.length * 0.6, 0);
    leftElbow.castShadow = true;
    leftElbow.receiveShadow = true;
    leftArm.add(leftElbow);
    
    // Left wrist (hand)
    const leftWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const leftWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const leftWrist = new THREE.Mesh(leftWristGeometry, leftWristMaterial);
    leftWrist.position.set(0, -scale.forearm.length * 0.6, 0);
    leftWrist.castShadow = true;
    leftWrist.receiveShadow = true;
    leftElbow.add(leftWrist);
    
    // RIGHT ARM SYSTEM (weapon arm)
    const rightArmGeometry = new THREE.CylinderGeometry(scale.arm.radius[0], scale.arm.radius[1], scale.arm.length, 16);
    const rightArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    rightArm.position.set(scale.body.radius + 0.25, shoulderHeight, 0);
    rightArm.rotation.x = 0.393; // ~22.5 degrees forward
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    orcGroup.add(rightArm);
    
    // Right elbow (forearm)
    const rightElbowGeometry = new THREE.CylinderGeometry(scale.forearm.radius[0], scale.forearm.radius[1], scale.forearm.length, 16);
    const rightElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightElbow = new THREE.Mesh(rightElbowGeometry, rightElbowMaterial);
    rightElbow.position.set(0, -scale.arm.length * 0.6, 0);
    rightElbow.castShadow = true;
    rightElbow.receiveShadow = true;
    rightArm.add(rightElbow);
    
    // Right wrist (hand)
    const rightWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const rightWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const rightWrist = new THREE.Mesh(rightWristGeometry, rightWristMaterial);
    rightWrist.position.set(0, -scale.forearm.length * 0.6, 0);
    rightWrist.castShadow = true;
    rightWrist.receiveShadow = true;
    rightElbow.add(rightWrist);
    
    // === SHIN/FOOT POSITIONING ===
    const thighBottomY = thighCenterY - scale.leg.length / 2;
    const shinCenterY = thighBottomY - scale.shin.length / 2;
    const shinRelativeY = shinCenterY - thighCenterY;
    
    const leftKneeGeometry = new THREE.CylinderGeometry(scale.shin.radius[0], scale.shin.radius[1], scale.shin.length, 16);
    const leftKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftKnee = new THREE.Mesh(leftKneeGeometry, leftKneeMaterial);
    leftKnee.position.set(0, shinRelativeY, 0);
    leftKnee.castShadow = true;
    leftKnee.receiveShadow = true;
    leftLeg.add(leftKnee);
    
    // Right knee (shin)
    const rightKneeGeometry = new THREE.CylinderGeometry(scale.shin.radius[0], scale.shin.radius[1], scale.shin.length, 16);
    const rightKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightKnee = new THREE.Mesh(rightKneeGeometry, rightKneeMaterial);
    rightKnee.position.set(0, shinRelativeY, 0);
    rightKnee.castShadow = true;
    rightKnee.receiveShadow = true;
    rightLeg.add(rightKnee);
    
    // Create intimidating weapon
    const weapon = new THREE.Group();
    
    // Large battle axe handle
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1.8, 16);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A2C17,
      shininess: 40,
      map: woodTexture
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = 0.9;
    handle.castShadow = true;
    weapon.add(handle);
    
    // Double-headed axe blade
    const bladeGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.1);
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x666666,
      shininess: 100,
      specular: 0xFFFFFF,
      map: metalTexture
    });
    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade1.position.set(0.25, 1.5, 0);
    blade1.rotation.z = Math.PI / 6;
    blade1.castShadow = true;
    weapon.add(blade1);
    
    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial.clone());
    blade2.position.set(-0.25, 1.5, 0);
    blade2.rotation.z = -Math.PI / 6;
    blade2.castShadow = true;
    weapon.add(blade2);
    
    weapon.position.set(0.3, 0, 0);
    weapon.rotation.z = -0.3;
    rightWrist.add(weapon);
    
    // === HITBOX POSITIONING ===
    const hitBoxGeometry = new THREE.BoxGeometry(1.8, 2.2, 1.8);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = body.position.y;
    orcGroup.add(hitBox);
    
    // === FINAL GROUP POSITIONING ===
    orcGroup.position.copy(position);
    orcGroup.castShadow = true;
    
    const bodyParts: EnemyBodyParts = {
      body,
      head,
      leftArm,
      rightArm,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      weapon,
      hitBox
    };
    
    console.log("🗡️ [EnemyBodyBuilder] FIXED: Head and arms positioned properly - no floating gaps");
    console.log(`🗡️ [EnemyBodyBuilder] Head: Y=${head.position.y} (sits on body top at Y=${bodyTopY})`);
    console.log(`🗡️ [EnemyBodyBuilder] Shoulders: Y=${shoulderHeight} (higher on torso for better proportions)`);
    
    return { group: orcGroup, bodyParts };
  }
}
