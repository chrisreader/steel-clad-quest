import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { EnemyType } from '../../types/GameTypes';

// Define interfaces locally to avoid circular imports
export interface EnemyBodyParts {
  body: THREE.Mesh | undefined;
  head: THREE.Mesh | undefined;
  leftArm: THREE.Mesh | undefined;
  rightArm: THREE.Mesh | undefined;
  leftElbow: THREE.Mesh | undefined;
  rightElbow: THREE.Mesh | undefined;
  leftWrist: THREE.Mesh | undefined;
  rightWrist: THREE.Mesh | undefined;
  leftLeg: THREE.Mesh | undefined;
  rightLeg: THREE.Mesh | undefined;
  leftKnee: THREE.Mesh | undefined;
  rightKnee: THREE.Mesh | undefined;
  weapon: THREE.Group | undefined;
  hitBox: THREE.Mesh | undefined;
  // NEW: Add shoulder joints for animation
  leftShoulder: THREE.Mesh | undefined;
  rightShoulder: THREE.Mesh | undefined;
}

export interface EnemyBodyResult {
  group: THREE.Group;
  bodyParts: EnemyBodyParts;
  metrics: any;
}

export interface EnemyBodyScale {
  body: {
    height: number;
    radius: number;
  };
  head: {
    radius: number;
  };
  arm: {
    upperRadius: number;
    lowerRadius: number;
    length: number;
  };
  leg: {
    upperRadius: number;
    lowerRadius: number;
    length: number;
  };
}

export interface EnemyBodyMaterials {
  primary: THREE.Material;
  accent: THREE.Material;
}

export interface EnemyBodyNeutralPoses {
  arms: {
    left: THREE.Vector3;
    right: THREE.Vector3;
  };
  elbows: {
    left: THREE.Vector3;
    right: THREE.Vector3;
  };
  wrists: {
    left: THREE.Vector3;
    right: THREE.Vector3;
  };
}

export interface EnemyBodyPositions {
  bodyY: number;
  headY: number;
  shoulderHeight: number;
}

export interface EnemyAnimationMetrics {
  walkCycleSpeed: number;
  legSwingIntensity: number;
  armSwingIntensity: number;
  shoulderMovement: number;
}

export interface EnemyBodyMetrics {
  scale: EnemyBodyScale;
  materials: EnemyBodyMaterials;
  neutralPoses: EnemyBodyNeutralPoses;
  positions: EnemyBodyPositions;
  animationMetrics: EnemyAnimationMetrics;
}

export function createEnemyHumanoidBody(
  bodyScale: EnemyBodyScale,
  bodyMaterials: EnemyBodyMaterials,
  scene: THREE.Scene
): EnemyBodyResult {
  const primaryMaterial = bodyMaterials.primary;
  const accentMaterial = bodyMaterials.accent;

  const humanoidGroup = new THREE.Group();
  humanoidGroup.name = 'humanoidGroup';
  humanoidGroup.castShadow = true;
  humanoidGroup.receiveShadow = true;

  // === HEAD ===
  const headGeometry = new THREE.SphereGeometry(bodyScale.head.radius, 32, 16);
  const headMesh = new THREE.Mesh(headGeometry, primaryMaterial.clone());
  const headY = bodyScale.body.height / 2 + bodyScale.head.radius * 1.2;
  headMesh.position.set(0, headY, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  humanoidGroup.add(headMesh);

  // === BODY ===
  const bodyGeometry = new THREE.CylinderGeometry(
    bodyScale.body.radius,
    bodyScale.body.radius,
    bodyScale.body.height,
    32
  );
  const bodyMesh = new THREE.Mesh(bodyGeometry, primaryMaterial.clone());
  const bodyY = bodyScale.body.height / 2;
  bodyMesh.position.set(0, bodyY, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  humanoidGroup.add(bodyMesh);

  const shoulderHeight = bodyScale.body.height / 2;
  const neutralPoses = {
    arms: {
      left: new THREE.Vector3(THREE.MathUtils.degToRad(10), 0, THREE.MathUtils.degToRad(-15)),
      right: new THREE.Vector3(THREE.MathUtils.degToRad(10), 0, THREE.MathUtils.degToRad(15)),
    },
    elbows: {
      left: new THREE.Vector3(THREE.MathUtils.degToRad(-10), 0, 0),
      right: new THREE.Vector3(THREE.MathUtils.degToRad(-10), 0, 0),
    },
    wrists: {
      left: new THREE.Vector3(THREE.MathUtils.degToRad(5), 0, 0),
      right: new THREE.Vector3(THREE.MathUtils.degToRad(5), 0, 0),
    },
  };

  // === ARMS ===
  const armGeometry = new THREE.CylinderGeometry(
    bodyScale.arm.upperRadius,
    bodyScale.arm.lowerRadius,
    bodyScale.arm.length,
    16, 4
  );
  
  const leftArm = new THREE.Mesh(armGeometry, primaryMaterial.clone());
  leftArm.position.set(-(bodyScale.body.radius + 0.1), shoulderHeight, 0);
  leftArm.rotation.set(neutralPoses.arms.left.x, neutralPoses.arms.left.y, neutralPoses.arms.left.z);
  leftArm.castShadow = true;
  leftArm.receiveShadow = true;
  humanoidGroup.add(leftArm);
  
  const rightArm = new THREE.Mesh(armGeometry, primaryMaterial.clone());
  rightArm.position.set(bodyScale.body.radius + 0.1, shoulderHeight, 0);
  rightArm.rotation.set(neutralPoses.arms.right.x, neutralPoses.arms.right.y, neutralPoses.arms.right.z);
  rightArm.castShadow = true;
  rightArm.receiveShadow = true;
  humanoidGroup.add(rightArm);

  // === CURVED SHOULDER JOINTS - ROUNDED ON OUTSIDE, TAPERED TOWARD CENTER ===
  const shoulderJointGeometry = new THREE.SphereGeometry(0.25, 24, 20);
  
  // Apply custom deformation to create more natural shoulder curve
  const shoulderPositions = shoulderJointGeometry.attributes.position.array;
  for (let i = 0; i < shoulderPositions.length; i += 3) {
    const x = shoulderPositions[i];
    const y = shoulderPositions[i + 1];
    const z = shoulderPositions[i + 2];
    
    // Create more natural shoulder shape:
    // - Rounder/fuller on the outside (away from center)
    // - More tapered toward the center for trap connection
    const distanceFromCenter = Math.abs(x);
    const roundnessFactor = 1.0 + (distanceFromCenter * 0.4); // More volume on outside
    const taperedFactor = 1.0 - (distanceFromCenter * 0.2); // Less volume toward center
    
    shoulderPositions[i] = x * (x > 0 ? roundnessFactor : taperedFactor); // Apply based on side
    shoulderPositions[i + 1] = y * 0.8; // Slightly flatten vertically
    shoulderPositions[i + 2] = z * 0.9; // Slightly compress depth
  }
  shoulderPositions.needsUpdate = true;
  
  const leftShoulderJoint = new THREE.Mesh(shoulderJointGeometry, accentMaterial);
  leftShoulderJoint.position.set(-(bodyScale.body.radius + 0.1), shoulderHeight, 0);
  leftShoulderJoint.castShadow = true;
  leftShoulderJoint.receiveShadow = true;
  humanoidGroup.add(leftShoulderJoint);

  const rightShoulderJoint = new THREE.Mesh(shoulderJointGeometry.clone(), accentMaterial.clone());
  rightShoulderJoint.position.set(bodyScale.body.radius + 0.1, shoulderHeight, 0);
  rightShoulderJoint.castShadow = true;
  rightShoulderJoint.receiveShadow = true;
  humanoidGroup.add(rightShoulderJoint);

  // === TRAPEZIUS MUSCLES ===
  const trapeziusGeometry = new THREE.PlaneGeometry(0.5, 0.3);
  const leftTrapezius = new THREE.Mesh(trapeziusGeometry, accentMaterial.clone());
  leftTrapezius.position.set(-(bodyScale.body.radius + 0.3), shoulderHeight + 0.1, -0.15);
  leftTrapezius.rotation.y = THREE.MathUtils.degToRad(-30);
  leftTrapezius.castShadow = true;
  leftTrapezius.receiveShadow = true;
  humanoidGroup.add(leftTrapezius);

  const rightTrapezius = new THREE.Mesh(trapeziusGeometry.clone(), accentMaterial.clone());
  rightTrapezius.position.set(bodyScale.body.radius + 0.3, shoulderHeight + 0.1, -0.15);
  rightTrapezius.rotation.y = THREE.MathUtils.degToRad(30);
  rightTrapezius.castShadow = true;
  rightTrapezius.receiveShadow = true;
  humanoidGroup.add(rightTrapezius);

  // === ELBOWS ===
  const elbowGeometry = new THREE.SphereGeometry(0.18, 16, 8);
  const leftElbow = new THREE.Mesh(elbowGeometry, accentMaterial.clone());
  leftElbow.position.set(
    -(bodyScale.body.radius + 0.1 + bodyScale.arm.length),
    shoulderHeight,
    0
  );
  leftElbow.castShadow = true;
  leftElbow.receiveShadow = true;
  humanoidGroup.add(leftElbow);

  const rightElbow = new THREE.Mesh(elbowGeometry.clone(), accentMaterial.clone());
  rightElbow.position.set(
    bodyScale.body.radius + 0.1 + bodyScale.arm.length,
    shoulderHeight,
    0
  );
  rightElbow.castShadow = true;
  rightElbow.receiveShadow = true;
  humanoidGroup.add(rightElbow);

  // === WRISTS ===
  const wristGeometry = new THREE.SphereGeometry(0.15, 16, 8);
  const leftWrist = new THREE.Mesh(wristGeometry, accentMaterial.clone());
  leftWrist.position.set(
    -(bodyScale.body.radius + 0.1 + bodyScale.arm.length * 2),
    shoulderHeight,
    0
  );
  humanoidGroup.add(leftWrist);

  const rightWrist = new THREE.Mesh(wristGeometry.clone(), accentMaterial.clone());
  rightWrist.position.set(
    bodyScale.body.radius + 0.1 + bodyScale.arm.length * 2,
    shoulderHeight,
    0
  );
  humanoidGroup.add(rightWrist);

  // === LEGS ===
  const legGeometry = new THREE.CylinderGeometry(
    bodyScale.leg.upperRadius,
    bodyScale.leg.lowerRadius,
    bodyScale.leg.length,
    16, 4
  );
  const leftLeg = new THREE.Mesh(legGeometry, primaryMaterial.clone());
  leftLeg.position.set(-bodyScale.body.radius / 2, bodyScale.leg.length / 2, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  humanoidGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry.clone(), primaryMaterial.clone());
  rightLeg.position.set(bodyScale.body.radius / 2, bodyScale.leg.length / 2, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  humanoidGroup.add(rightLeg);

  // === KNEES ===
  const kneeGeometry = new THREE.SphereGeometry(0.2, 16, 8);
  const leftKnee = new THREE.Mesh(kneeGeometry, accentMaterial.clone());
  leftKnee.position.set(-bodyScale.body.radius / 2, bodyScale.leg.length, 0);
  leftKnee.castShadow = true;
  leftKnee.receiveShadow = true;
  humanoidGroup.add(leftKnee);

  const rightKnee = new THREE.Mesh(kneeGeometry.clone(), accentMaterial.clone());
  rightKnee.position.set(bodyScale.body.radius / 2, bodyScale.leg.length, 0);
  rightKnee.castShadow = true;
  rightKnee.receiveShadow = true;
  humanoidGroup.add(rightKnee);

  // === WEAPON ===
  const weaponGroup = new THREE.Group();
  // Example: Sword (simple representation)
  const swordGeometry = new THREE.BoxGeometry(0.1, 1, 0.05);
  const swordMaterial = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const sword = new THREE.Mesh(swordGeometry, swordMaterial);
  sword.position.set(0, 0.5, 0);
  weaponGroup.add(sword);
  weaponGroup.position.set(
    -(bodyScale.body.radius + 0.1 + bodyScale.arm.length * 2 + 0.2),
    shoulderHeight,
    0.1
  );
  humanoidGroup.add(weaponGroup);

  // === HITBOX ===
  const hitBoxGeometry = new THREE.BoxGeometry(
    bodyScale.body.radius * 2,
    bodyScale.body.height,
    bodyScale.body.radius
  );
  const hitBoxMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0,
    wireframe: false,
  });
  const hitBoxMesh = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
  hitBoxMesh.position.set(0, bodyScale.body.height / 2, 0);
  humanoidGroup.add(hitBoxMesh);

  // Body parts object
  const bodyParts: EnemyBodyParts = {
    body: bodyMesh,
    head: headMesh,
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
    weapon: weaponGroup,
    hitBox: hitBoxMesh,
    // NEW: Add shoulder joints to body parts for animation
    leftShoulder: leftShoulderJoint,
    rightShoulder: rightShoulderJoint
  };

  const metrics: EnemyBodyMetrics = {
    scale: bodyScale,
    materials: bodyMaterials,
    neutralPoses: {
      arms: {
        left: new THREE.Vector3(THREE.MathUtils.degToRad(10), 0, THREE.MathUtils.degToRad(-15)),
        right: new THREE.Vector3(THREE.MathUtils.degToRad(10), 0, THREE.MathUtils.degToRad(15)),
      },
      elbows: {
        left: new THREE.Vector3(THREE.MathUtils.degToRad(-10), 0, 0),
        right: new THREE.Vector3(THREE.MathUtils.degToRad(-10), 0, 0),
      },
      wrists: {
        left: new THREE.Vector3(THREE.MathUtils.degToRad(5), 0, 0),
        right: new THREE.Vector3(THREE.MathUtils.degToRad(5), 0, 0),
      },
    },
    positions: {
      bodyY: bodyY,
      headY: headY,
      shoulderHeight: shoulderHeight,
    },
    animationMetrics: {
      walkCycleSpeed: 1,
      legSwingIntensity: 0.5,
      armSwingIntensity: 0.3,
      shoulderMovement: 0.1,
    },
  };

  return {
    group: humanoidGroup,
    bodyParts: bodyParts,
    metrics: metrics,
  };
}
