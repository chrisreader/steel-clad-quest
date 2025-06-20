import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { EnemyAnimationSystem } from '../../animation/EnemyAnimationSystem';

// Export all necessary types and interfaces
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
}

export interface BodyScale {
  body: { radius: number; height: number };
  head: { radius: number };
  arm: { radius: [number, number]; length: number };
  forearm: { radius: [number, number]; length: number };
  leg: { radius: [number, number]; length: number };
  shin: { radius: [number, number]; length: number };
}

export interface BodyPositions {
  legTopY: number;
  thighCenterY: number;
  bodyY: number;
  bodyTopY: number;
  headY: number;
  shoulderHeight: number;
}

export interface NeutralPoses {
  arms: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  elbows: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  wrists: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
}

export interface AnimationMetrics {
  walkCycleSpeed: number;
  armSwingIntensity: number;
  legSwingIntensity: number;
  shoulderMovement: number;
  elbowMovement: number;
  breathingIntensity: number;
}

export interface EnemyBodyMetrics {
  scale: BodyScale;
  positions: BodyPositions;
  neutralPoses: NeutralPoses;
  animationMetrics: AnimationMetrics;
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
}

export interface EnemyBodyResult {
  group: THREE.Group;
  bodyParts: EnemyBodyParts;
  metrics: EnemyBodyMetrics;
}

export interface HumanoidConfig {
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  goldReward: number;
  experienceReward: number;
  attackRange: number;
  damageRange: number;
  attackCooldown: number;
  points: number;
  knockbackResistance: number;
  
  bodyScale: BodyScale;
  
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
  
  features: {
    hasEyes: boolean;
    hasTusks: boolean;
    hasWeapon: boolean;
    eyeConfig?: {
      radius: number;
      color: number;
      emissiveIntensity: number;
      offsetX: number;
      offsetY: number;
      offsetZ: number;
    };
    tuskConfig?: {
      radius: number;
      height: number;
      color: number;
      offsetX: number;
      offsetY: number;
      offsetZ: number;
    };
  };
}

export enum EnemyMovementState {
  IDLE = 'idle',
  PURSUING = 'pursuing',
  ATTACKING = 'attacking',
  KNOCKED_BACK = 'knocked_back',
  STUNNED = 'stunned'
}

export abstract class EnemyHumanoid {
  protected scene: THREE.Scene;
  protected effectsManager: EffectsManager;
  protected audioManager: AudioManager;
  protected config: HumanoidConfig;
  
  protected mesh: THREE.Group;
  protected health: number;
  protected isDead: boolean = false;
  protected deathTime: number = 0;
  protected lastAttackTime: number = 0;
  protected isHit: boolean = false;
  protected hitTime: number = 0;
  
  protected bodyParts: EnemyBodyParts;
  protected animationSystem: EnemyAnimationSystem;
  
  protected movementState: EnemyMovementState = EnemyMovementState.IDLE;
  protected knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
  protected knockbackDuration: number = 0;
  protected stunDuration: number = 0;
  protected targetRotation: number = 0;
  protected rotationSpeed: number = 3.0;
  protected hasInitialOrientation: boolean = false;
  
  protected deathAnimation = {
    falling: false,
    rotationSpeed: Math.random() * 0.1 + 0.05,
    fallSpeed: 0
  };

  constructor(
    scene: THREE.Scene,
    config: HumanoidConfig,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.config = config;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.health = config.health;
    
    const bodyResult = this.createHumanoidBody(position);
    this.mesh = bodyResult.group;
    this.bodyParts = bodyResult.bodyParts;
    
    this.animationSystem = new EnemyAnimationSystem(bodyResult.bodyParts, bodyResult.metrics, config.type);
    
    scene.add(this.mesh);
  }

  protected createHumanoidBody(position: THREE.Vector3): EnemyBodyResult {
    const humanoidGroup = new THREE.Group();
    const { bodyScale, colors, features } = this.config;
    
    // Calculate positions
    const legTopY = 1.4;
    const thighCenterY = legTopY - bodyScale.leg.length / 2;
    const bodyY = legTopY + bodyScale.body.height / 2;
    const bodyTopY = bodyY + bodyScale.body.height / 2;
    const headY = bodyTopY + bodyScale.head.radius;
    const shoulderHeight = bodyTopY;

    // Create base materials once
    const baseSkinMaterial = new THREE.MeshPhongMaterial({
      color: colors.skin,
      shininess: 35,
      specular: 0x333333
    });
    
    const baseMuscleMaterial = new THREE.MeshPhongMaterial({
      color: colors.muscle,
      shininess: 40,
      specular: 0x444444
    });

    const baseAccentMaterial = new THREE.MeshPhongMaterial({
      color: colors.accent,
      shininess: 45,
      specular: 0x555555
    });

    // Create legs
    const { leftLeg, rightLeg } = this.createLegs(bodyScale, thighCenterY, baseMuscleMaterial);
    humanoidGroup.add(leftLeg, rightLeg);

    // Create hip joints
    const hipJointGeometry = new THREE.SphereGeometry(0.24, 24, 20);
    const leftHipJoint = new THREE.Mesh(hipJointGeometry, baseAccentMaterial.clone());
    leftHipJoint.position.set(-bodyScale.body.radius * 0.4, legTopY - 0.03, 0);
    leftHipJoint.scale.set(1, 0.8, 1);
    leftHipJoint.castShadow = true;
    humanoidGroup.add(leftHipJoint);

    const rightHipJoint = new THREE.Mesh(hipJointGeometry, baseAccentMaterial.clone());
    rightHipJoint.position.set(bodyScale.body.radius * 0.4, legTopY - 0.03, 0);
    rightHipJoint.scale.set(1, 0.8, 1);
    rightHipJoint.castShadow = true;
    humanoidGroup.add(rightHipJoint);

    // Create torso
    const body = this.createTorso(bodyScale, bodyY, bodyTopY, legTopY, shoulderHeight, baseSkinMaterial, baseMuscleMaterial, baseAccentMaterial);
    humanoidGroup.add(body.parent);

    // Create head
    const head = this.createHead(bodyScale, headY, colors, features, baseMuscleMaterial, baseAccentMaterial);
    humanoidGroup.add(head.parent);

    // Create arms and shoulder joints
    const { leftArm, rightArm, leftElbow, rightElbow, leftWrist, rightWrist, leftShoulderJoint, rightShoulderJoint } = this.createArms(
      bodyScale, shoulderHeight, baseSkinMaterial, baseMuscleMaterial, baseAccentMaterial
    );
    humanoidGroup.add(leftArm, rightArm);
    
    // Add the shoulder joints that were missing!
    humanoidGroup.add(leftShoulderJoint, rightShoulderJoint);

    // Create legs with knees and feet
    const { leftKnee, rightKnee } = this.createShinsAndFeet(
      leftLeg, rightLeg, bodyScale, baseSkinMaterial, baseMuscleMaterial, baseAccentMaterial
    );

    // Create weapon
    let weapon: THREE.Group | undefined;
    if (features.hasWeapon) {
      const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
      const metalTexture = TextureGenerator.createMetalTexture(0x444444);
      weapon = this.createWeapon(woodTexture, metalTexture);
      weapon.position.set(0, 0.1, 0);
      weapon.rotation.x = Math.PI / 2 + 0.2;
      leftWrist.add(weapon);
    }

    // Create hitbox
    const hitBoxGeometry = new THREE.BoxGeometry(1.8, 2.2, 1.8);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = bodyY;
    humanoidGroup.add(hitBox);

    humanoidGroup.position.copy(position);
    humanoidGroup.castShadow = true;

    const bodyParts: EnemyBodyParts = {
      body: body.mesh,
      head: head.mesh,
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

    const metrics: EnemyBodyMetrics = {
      scale: bodyScale,
      positions: { legTopY, thighCenterY, bodyY, bodyTopY, headY, shoulderHeight },
      neutralPoses: {
        arms: {
          left: { x: -0.393, y: 0, z: -0.3 },
          right: { x: -0.393, y: 0, z: 0.3 }
        },
        elbows: {
          left: { x: 0, y: 0, z: 0 },
          right: { x: 0, y: 0, z: 0 }
        },
        wrists: {
          left: { x: 0, y: 0, z: 0 },
          right: { x: 0, y: 0, z: 0 }
        }
      },
      animationMetrics: {
        walkCycleSpeed: 2.5,
        armSwingIntensity: 0.25,
        legSwingIntensity: 0.2,
        shoulderMovement: 0.1,
        elbowMovement: 0.5,
        breathingIntensity: 0.02
      },
      colors
    };

    return { group: humanoidGroup, bodyParts, metrics };
  }

  private createLegs(bodyScale: BodyScale, thighCenterY: number, material: THREE.MeshPhongMaterial) {
    const leftLegGeometry = this.createTaperedLimbGeometry(
      bodyScale.leg.radius[1], 
      bodyScale.leg.radius[0], 
      bodyScale.leg.length
    );
    const leftLeg = new THREE.Mesh(leftLegGeometry, material.clone());
    leftLeg.position.set(-bodyScale.body.radius * 0.4, thighCenterY, 0);
    leftLeg.castShadow = true;

    const rightLegGeometry = this.createTaperedLimbGeometry(
      bodyScale.leg.radius[1],
      bodyScale.leg.radius[0],
      bodyScale.leg.length
    );
    const rightLeg = new THREE.Mesh(rightLegGeometry, material.clone());
    rightLeg.position.set(bodyScale.body.radius * 0.4, thighCenterY, 0);
    rightLeg.castShadow = true;

    return { leftLeg, rightLeg };
  }

  private createTorso(
    bodyScale: BodyScale, 
    bodyY: number, 
    bodyTopY: number, 
    legTopY: number,
    shoulderHeight: number,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    const torsoGroup = new THREE.Group();
    
    // Main torso
    const mainTorsoGeometry = new THREE.CylinderGeometry(
      bodyScale.body.radius * 1.1,
      bodyScale.body.radius * 0.85,
      bodyScale.body.height,
      32, 8
    );
    
    // Make elliptical
    const positions = mainTorsoGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const angle = Math.atan2(z, x);
      const radius = Math.sqrt(x * x + z * z);
      const newRadius = radius * (Math.abs(Math.sin(angle)) * 0.2 + 0.8);
      positions[i] = Math.cos(angle) * newRadius;
      positions[i + 2] = Math.sin(angle) * newRadius;
    }
    mainTorsoGeometry.attributes.position.needsUpdate = true;
    
    const mainTorso = new THREE.Mesh(mainTorsoGeometry, skinMaterial.clone());
    mainTorso.position.y = bodyY;
    mainTorso.castShadow = true;
    torsoGroup.add(mainTorso);

    // Chest
    const chestTopRadius = bodyScale.body.radius * 1.2;
    const chestGeometry = new THREE.CylinderGeometry(
      chestTopRadius,
      bodyScale.body.radius * 0.85,
      0.5, 16, 4
    );
    const chest = new THREE.Mesh(chestGeometry, muscleMaterial.clone());
    chest.position.y = bodyTopY - 0.25;
    chest.castShadow = true;
    torsoGroup.add(chest);

    // Pelvis
    const pelvisGeometry = new THREE.CylinderGeometry(
      bodyScale.body.radius * 0.75,
      bodyScale.body.radius * 0.9,
      0.4, 16, 4
    );
    const pelvis = new THREE.Mesh(pelvisGeometry, skinMaterial.clone());
    pelvis.position.y = legTopY + 0.2;
    pelvis.castShadow = true;
    torsoGroup.add(pelvis);

    // Trapezius muscle - positioned to align bottom edge with chest top edge
    const shoulderJointX = bodyScale.body.radius + 0.1; // Match shoulder joint X position
    
    const trapGeometry = new THREE.CylinderGeometry(
      shoulderJointX * 0.6, // Top radius - taper into shoulder area
      chestTopRadius, // Bottom radius - EXACTLY match chest top radius for seamless transition
      0.35, 20, 6
    );
    
    // Shape the trapezius to taper naturally from chest to shoulders
    const trapPositions = trapGeometry.attributes.position.array;
    for (let i = 0; i < trapPositions.length; i += 3) {
      const x = trapPositions[i];
      const y = trapPositions[i + 1];
      const z = trapPositions[i + 2];
      
      // Normalize Y from -0.175 to 0.175 to 0 to 1
      const normalizedY = (y / 0.35) + 0.5;
      
      // Create the characteristic trapezius shape tapering from chest to shoulders
      const widthMultiplier = 0.85 + (1 - normalizedY) * 0.15;
      const depthMultiplier = 0.9 + (1 - normalizedY) * 0.1;
      
      trapPositions[i] = x * widthMultiplier;
      trapPositions[i + 2] = z * depthMultiplier;
    }
    trapGeometry.attributes.position.needsUpdate = true;
    trapGeometry.computeVertexNormals();
    
    const trapezius = new THREE.Mesh(trapGeometry, muscleMaterial.clone());
    // Position trapezius so its bottom edge aligns with the top edge of the chest
    trapezius.position.y = bodyTopY + 0.175; // bodyTopY + (trapezius height / 2)
    trapezius.castShadow = true;
    torsoGroup.add(trapezius);

    return { parent: torsoGroup, mesh: mainTorso };
  }

  private createHead(
    bodyScale: BodyScale,
    headY: number,
    colors: any,
    features: any,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    const headGroup = new THREE.Group();
    
    // Skull
    const upperSkullGeometry = new THREE.SphereGeometry(bodyScale.head.radius, 24, 20);
    const skullPositions = upperSkullGeometry.attributes.position.array;
    for (let i = 0; i < skullPositions.length; i += 3) {
      const x = skullPositions[i];
      const y = skullPositions[i + 1];
      const z = skullPositions[i + 2];
      
      skullPositions[i + 2] = z * 1.3;
      
      if (y > 0) {
        skullPositions[i] = x * (1 + Math.abs(y) * 0.2);
        skullPositions[i + 1] = y * 1.1;
        
        if (z > 0) {
          skullPositions[i + 2] = z * (1.3 - y * 0.3);
        }
      }
      
      if (y > 0.2 && y < 0.4 && z > 0.3) {
        skullPositions[i + 2] = z * 1.5;
      }
    }
    upperSkullGeometry.attributes.position.needsUpdate = true;
    upperSkullGeometry.computeVertexNormals();
    
    const upperSkull = new THREE.Mesh(upperSkullGeometry, muscleMaterial.clone());
    upperSkull.position.y = headY;
    upperSkull.castShadow = true;
    headGroup.add(upperSkull);

    // Neck
    const neckGeometry = new THREE.CylinderGeometry(
      bodyScale.head.radius * 0.5,
      bodyScale.body.radius * 0.4,
      0.4, 16, 4
    );
    const neck = new THREE.Mesh(neckGeometry, accentMaterial.clone());
    neck.position.y = headY - bodyScale.head.radius - 0.2;
    neck.castShadow = true;
    headGroup.add(neck);

    // Nose
    const noseGeometry = new THREE.SphereGeometry(0.12, 16, 12);
    const nose = new THREE.Mesh(noseGeometry, accentMaterial.clone());
    nose.position.set(0, headY - 0.05, bodyScale.head.radius * 1.2);
    nose.scale.set(1, 0.8, 1.2);
    nose.castShadow = true;
    headGroup.add(nose);

    // Eyes and other features
    if (features.hasEyes && features.eyeConfig) {
      this.addEyes(headGroup, headY, bodyScale, features, accentMaterial);
    }

    if (features.hasTusks && features.tuskConfig) {
      this.addTusks(headGroup, headY, bodyScale, features);
    }

    // Ears
    this.addEars(headGroup, headY, bodyScale, colors, muscleMaterial);

    return { parent: headGroup, mesh: upperSkull };
  }

  private addEyes(
    headGroup: THREE.Group,
    headY: number,
    bodyScale: BodyScale,
    features: any,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    // Eye sockets
    const eyeSocketGeometry = new THREE.SphereGeometry(features.eyeConfig.radius * 1.2, 16, 12);
    const eyeSocketMaterial = accentMaterial.clone();

    const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
    leftEyeSocket.position.set(
      -features.eyeConfig.offsetX,
      headY + features.eyeConfig.offsetY,
      bodyScale.head.radius * features.eyeConfig.offsetZ * 1.1
    );
    leftEyeSocket.scale.z = 0.5;
    headGroup.add(leftEyeSocket);

    const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial.clone());
    rightEyeSocket.position.set(
      features.eyeConfig.offsetX,
      headY + features.eyeConfig.offsetY,
      bodyScale.head.radius * features.eyeConfig.offsetZ * 1.1
    );
    rightEyeSocket.scale.z = 0.5;
    headGroup.add(rightEyeSocket);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(features.eyeConfig.radius, 16, 12);
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B0000,
      transparent: true,
      opacity: 1,
      emissive: 0x440000,
      emissiveIntensity: 0.15,
      shininess: 80
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(
      -features.eyeConfig.offsetX,
      headY + features.eyeConfig.offsetY,
      bodyScale.head.radius * features.eyeConfig.offsetZ * 1.15
    );

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(
      features.eyeConfig.offsetX,
      headY + features.eyeConfig.offsetY,
      bodyScale.head.radius * features.eyeConfig.offsetZ * 1.15
    );

    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(features.eyeConfig.radius * 0.4, 12, 10);
    const pupilMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      shininess: 100
    });

    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, features.eyeConfig.radius * 0.7);
    leftEye.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial.clone());
    rightPupil.position.set(0, 0, features.eyeConfig.radius * 0.7);
    rightEye.add(rightPupil);

    headGroup.add(leftEye);
    headGroup.add(rightEye);
  }

  private addTusks(headGroup: THREE.Group, headY: number, bodyScale: BodyScale, features: any) {
    const tuskGeometry = new THREE.ConeGeometry(
      features.tuskConfig.radius, features.tuskConfig.height, 12
    );
    const tuskMaterial = new THREE.MeshPhongMaterial({
      color: features.tuskConfig.color,
      shininess: 90,
      specular: 0xFFFFFF
    });

    const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    leftTusk.position.set(
      -features.tuskConfig.offsetX,
      headY - 0.3,
      bodyScale.head.radius * 1.0
    );
    leftTusk.rotation.x = Math.PI;
    leftTusk.rotation.z = -0.1;
    leftTusk.castShadow = true;
    headGroup.add(leftTusk);

    const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
    rightTusk.position.set(
      features.tuskConfig.offsetX,
      headY - 0.3,
      bodyScale.head.radius * 1.0
    );
    rightTusk.rotation.x = Math.PI;
    rightTusk.rotation.z = 0.1;
    rightTusk.castShadow = true;
    headGroup.add(rightTusk);
  }

  private addEars(
    headGroup: THREE.Group,
    headY: number,
    bodyScale: BodyScale,
    colors: any,
    muscleMaterial: THREE.MeshPhongMaterial
  ) {
    const earGeometry = new THREE.ConeGeometry(0.12, 0.4, 12);
    const earMaterial = muscleMaterial.clone();

    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-bodyScale.head.radius * 0.9, headY + 0.15, 0);
    leftEar.rotation.z = -Math.PI / 6;
    leftEar.scale.set(0.8, 1.2, 0.6);
    leftEar.castShadow = true;

    const rightEar = new THREE.Mesh(earGeometry, earMaterial.clone());
    rightEar.position.set(bodyScale.head.radius * 0.9, headY + 0.15, 0);
    rightEar.rotation.z = Math.PI / 6;
    rightEar.scale.set(0.8, 1.2, 0.6);
    rightEar.castShadow = true;

    headGroup.add(leftEar);
    headGroup.add(rightEar);
  }

  private createArms(
    bodyScale: BodyScale,
    shoulderHeight: number,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    // Left arm
    const leftArmGeometry = this.createTaperedLimbGeometry(
      bodyScale.arm.radius[1], 
      bodyScale.arm.radius[0], 
      bodyScale.arm.length
    );
    leftArmGeometry.translate(0, -bodyScale.arm.length * 0.5, 0);
    const leftArm = new THREE.Mesh(leftArmGeometry, muscleMaterial.clone());
    leftArm.position.set(-(bodyScale.body.radius + 0.1), shoulderHeight, 0);
    leftArm.rotation.set(-0.393, 0, -0.3);
    leftArm.castShadow = true;

    // Right arm
    const rightArmGeometry = this.createTaperedLimbGeometry(
      bodyScale.arm.radius[1],
      bodyScale.arm.radius[0],
      bodyScale.arm.length
    );
    rightArmGeometry.translate(0, -bodyScale.arm.length * 0.5, 0);
    const rightArm = new THREE.Mesh(rightArmGeometry, muscleMaterial.clone());
    rightArm.position.set(bodyScale.body.radius + 0.1, shoulderHeight, 0);
    rightArm.rotation.set(-0.393, 0, 0.3);
    rightArm.castShadow = true;

    // Shoulder joints - these were missing from the scene!
    const shoulderJointGeometry = new THREE.SphereGeometry(0.25, 24, 20);
    const leftShoulderJoint = new THREE.Mesh(shoulderJointGeometry, accentMaterial.clone());
    leftShoulderJoint.position.set(-(bodyScale.body.radius + 0.1), shoulderHeight, 0);
    leftShoulderJoint.scale.set(0.9, 1, 0.9);
    leftShoulderJoint.castShadow = true;

    const rightShoulderJoint = new THREE.Mesh(shoulderJointGeometry, accentMaterial.clone());
    rightShoulderJoint.position.set(bodyScale.body.radius + 0.1, shoulderHeight, 0);
    rightShoulderJoint.scale.set(0.9, 1, 0.9);
    rightShoulderJoint.castShadow = true;

    // Elbows and forearms
    const { leftElbow, rightElbow, leftWrist, rightWrist } = this.createForearms(
      leftArm, rightArm, bodyScale, skinMaterial, muscleMaterial, accentMaterial
    );

    return { leftArm, rightArm, leftElbow, rightElbow, leftWrist, rightWrist, leftShoulderJoint, rightShoulderJoint };
  }

  private createForearms(
    leftArm: THREE.Mesh,
    rightArm: THREE.Mesh,
    bodyScale: BodyScale,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    // Elbow joints
    const elbowJointGeometry = new THREE.SphereGeometry(0.22, 24, 20);
    const leftElbowJoint = new THREE.Mesh(elbowJointGeometry, accentMaterial.clone());
    leftElbowJoint.position.set(0, -bodyScale.arm.length + 0.03, 0);
    leftElbowJoint.scale.set(0.8, 1.2, 0.8);
    leftElbowJoint.castShadow = true;
    leftArm.add(leftElbowJoint);

    const rightElbowJoint = new THREE.Mesh(elbowJointGeometry, accentMaterial.clone());
    rightElbowJoint.position.set(0, -bodyScale.arm.length + 0.03, 0);
    rightElbowJoint.scale.set(0.8, 1.2, 0.8);
    rightElbowJoint.castShadow = true;
    rightArm.add(rightElbowJoint);

    // Forearms
    const leftElbowGeometry = this.createTaperedLimbGeometry(
      bodyScale.forearm.radius[1], 
      bodyScale.forearm.radius[0], 
      bodyScale.forearm.length
    );
    leftElbowGeometry.translate(0, -bodyScale.forearm.length * 0.5, 0);
    const leftElbow = new THREE.Mesh(leftElbowGeometry, skinMaterial.clone());
    leftElbow.position.set(0, -bodyScale.arm.length, 0);
    leftElbow.castShadow = true;
    leftArm.add(leftElbow);

    const rightElbowGeometry = this.createTaperedLimbGeometry(
      bodyScale.forearm.radius[1],
      bodyScale.forearm.radius[0],
      bodyScale.forearm.length
    );
    rightElbowGeometry.translate(0, -bodyScale.forearm.length * 0.5, 0);
    const rightElbow = new THREE.Mesh(rightElbowGeometry, skinMaterial.clone());
    rightElbow.position.set(0, -bodyScale.arm.length, 0);
    rightElbow.castShadow = true;
    rightArm.add(rightElbow);

    // Hands/wrists
    const { leftWrist, rightWrist } = this.createHands(leftElbow, rightElbow, bodyScale, muscleMaterial);

    return { leftElbow, rightElbow, leftWrist, rightWrist };
  }

  private createHands(
    leftElbow: THREE.Mesh,
    rightElbow: THREE.Mesh,
    bodyScale: BodyScale,
    muscleMaterial: THREE.MeshPhongMaterial
  ) {
    const leftWristGeometry = new THREE.SphereGeometry(0.17, 20, 16);
    const leftWrist = new THREE.Mesh(leftWristGeometry, muscleMaterial.clone());
    leftWrist.position.set(0, -bodyScale.forearm.length, 0);
    leftWrist.castShadow = true;
    leftElbow.add(leftWrist);

    const rightWristGeometry = new THREE.SphereGeometry(0.17, 20, 16);
    const rightWrist = new THREE.Mesh(rightWristGeometry, muscleMaterial.clone());
    rightWrist.position.set(0, -bodyScale.forearm.length, 0);
    rightWrist.castShadow = true;
    rightElbow.add(rightWrist);

    // Add claws
    this.addClaws(leftWrist);
    this.addClaws(rightWrist);

    return { leftWrist, rightWrist };
  }

  private addClaws(wrist: THREE.Mesh) {
    const clawGeometry = new THREE.ConeGeometry(0.03, 0.18, 8);
    const clawMaterial = new THREE.MeshPhongMaterial({
      color: 0x2C1810,
      shininess: 90,
      specular: 0x888888
    });

    for (let i = 0; i < 5; i++) {
      const angle = (i / 4) * Math.PI - Math.PI / 2;
      const claw = new THREE.Mesh(clawGeometry, clawMaterial.clone());
      claw.position.set(
        Math.cos(angle) * 0.22,
        -0.12,
        Math.sin(angle) * 0.22
      );
      claw.rotation.x = Math.PI + 0.3;
      claw.castShadow = true;
      wrist.add(claw);
    }
  }

  private createShinsAndFeet(
    leftLeg: THREE.Mesh,
    rightLeg: THREE.Mesh,
    bodyScale: BodyScale,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    const shinRelativeY = -bodyScale.leg.length / 2;

    // Shins
    const leftKneeGeometry = this.createTaperedLimbGeometry(
      bodyScale.shin.radius[1], 
      bodyScale.shin.radius[0], 
      bodyScale.shin.length
    );
    leftKneeGeometry.translate(0, -bodyScale.shin.length * 0.5, 0);
    const leftKnee = new THREE.Mesh(leftKneeGeometry, skinMaterial.clone());
    leftKnee.position.set(0, shinRelativeY, 0);
    leftKnee.castShadow = true;
    leftLeg.add(leftKnee);

    const rightKneeGeometry = this.createTaperedLimbGeometry(
      bodyScale.shin.radius[1],
      bodyScale.shin.radius[0],
      bodyScale.shin.length
    );
    rightKneeGeometry.translate(0, -bodyScale.shin.length * 0.5, 0);
    const rightKnee = new THREE.Mesh(rightKneeGeometry, skinMaterial.clone());
    rightKnee.position.set(0, shinRelativeY, 0);
    rightKnee.castShadow = true;
    rightLeg.add(rightKnee);

    // Knee joints
    const kneeJointGeometry = new THREE.SphereGeometry(0.24, 24, 20);
    const leftKneeJoint = new THREE.Mesh(kneeJointGeometry, accentMaterial.clone());
    leftKneeJoint.position.set(0, shinRelativeY + 0.03, 0);
    leftKneeJoint.scale.set(0.8, 1.2, 0.8);
    leftKneeJoint.castShadow = true;
    leftLeg.add(leftKneeJoint);

    const rightKneeJoint = new THREE.Mesh(kneeJointGeometry, accentMaterial.clone());
    rightKneeJoint.position.set(0, shinRelativeY + 0.03, 0);
    rightKneeJoint.scale.set(0.8, 1.2, 0.8);
    rightKneeJoint.castShadow = true;
    rightLeg.add(rightKneeJoint);

    // Feet
    this.addFeet(leftKnee, rightKnee, bodyScale, muscleMaterial);

    return { leftKnee, rightKnee };
  }

  private addFeet(
    leftKnee: THREE.Mesh,
    rightKnee: THREE.Mesh,
    bodyScale: BodyScale,
    muscleMaterial: THREE.MeshPhongMaterial
  ) {
    const footGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.7);
    const footMaterial = muscleMaterial.clone();

    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(0, -bodyScale.shin.length, 0.2);
    leftFoot.castShadow = true;
    leftKnee.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeometry, footMaterial.clone());
    rightFoot.position.set(0, -bodyScale.shin.length, 0.2);
    rightFoot.castShadow = true;
    rightKnee.add(rightFoot);

    // Toe claws
    const clawGeometry = new THREE.ConeGeometry(0.03, 0.18, 8);
    const clawMaterial = new THREE.MeshPhongMaterial({
      color: 0x2C1810,
      shininess: 90,
      specular: 0x888888
    });

    for (let i = 0; i < 3; i++) {
      const toeClaw = new THREE.Mesh(clawGeometry, clawMaterial.clone());
      toeClaw.position.set((i - 1) * 0.12, -0.1, 0.35);
      toeClaw.rotation.x = Math.PI / 2;
      toeClaw.castShadow = true;
      leftFoot.add(toeClaw);

      const rightToeClaw = new THREE.Mesh(clawGeometry, clawMaterial.clone());
      rightToeClaw.position.set((i - 1) * 0.12, -0.1, 0.35);
      rightToeClaw.rotation.x = Math.PI / 2;
      rightToeClaw.castShadow = true;
      rightFoot.add(rightToeClaw);
    }
  }

  private createTaperedLimbGeometry(
    topRadius: number,
    bottomRadius: number, 
    height: number
  ): THREE.CylinderGeometry {
    return new THREE.CylinderGeometry(topRadius, bottomRadius, height, 24, 8);
  }

  protected abstract createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group;

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    const now = Date.now();
    
    if (this.isDead) {
      this.updateDeathAnimation(deltaTime);
      return;
    }
    
    if (!this.hasInitialOrientation) {
      this.setInitialOrientation(playerPosition);
      this.hasInitialOrientation = true;
    }
    
    this.updateMovementState(deltaTime);
    
    if (this.animationSystem.isAttacking()) {
      const animationContinues = this.animationSystem.updateAttackAnimation(deltaTime);
      if (!animationContinues) {
        console.log("🗡️ [EnemyHumanoid] Attack animation completed");
      }
    }
    
    if (this.isHit && now - this.hitTime < 300) {
      // Hit feedback handled elsewhere
    } else if (this.isHit) {
      this.isHit = false;
    }
    
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    switch (this.movementState) {
      case EnemyMovementState.KNOCKED_BACK:
        this.handleKnockbackMovement(deltaTime);
        break;
      case EnemyMovementState.STUNNED:
        break;
      default:
        this.handleNormalMovement(deltaTime, playerPosition, distanceToPlayer, now);
        break;
    }
    
    this.updateRotation(deltaTime);
  }

  private setInitialOrientation(playerPosition: THREE.Vector3): void {
    const directionToPlayer = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    directionToPlayer.y = 0;
    
    this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
    this.mesh.rotation.y = this.targetRotation;
  }

  private updateMovementState(deltaTime: number): void {
    if (this.knockbackDuration > 0) {
      this.knockbackDuration -= deltaTime * 1000;
      if (this.knockbackDuration <= 0) {
        this.knockbackVelocity.set(0, 0, 0);
        this.movementState = this.stunDuration > 0 ? EnemyMovementState.STUNNED : EnemyMovementState.IDLE;
      }
    }
    
    if (this.stunDuration > 0) {
      this.stunDuration -= deltaTime * 1000;
      if (this.stunDuration <= 0) {
        this.movementState = EnemyMovementState.IDLE;
      }
    }
  }

  private handleKnockbackMovement(deltaTime: number): void {
    const movement = this.knockbackVelocity.clone().multiplyScalar(deltaTime);
    this.mesh.position.add(movement);
    this.mesh.position.y = 0;
  }

  private handleNormalMovement(deltaTime: number, playerPosition: THREE.Vector3, distanceToPlayer: number, now: number): void {
    if (distanceToPlayer <= this.config.attackRange) {
      this.movementState = EnemyMovementState.PURSUING;
      
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position)
        .normalize();
      directionToPlayer.y = 0;
      
      this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
      
      if (distanceToPlayer > this.config.damageRange) {
        const moveAmount = this.config.speed * deltaTime;
        const newPosition = this.mesh.position.clone();
        newPosition.add(directionToPlayer.multiplyScalar(moveAmount));
        newPosition.y = 0;
        
        this.mesh.position.copy(newPosition);
        this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
      }
      
      if (distanceToPlayer <= this.config.damageRange && now - this.lastAttackTime > this.config.attackCooldown) {
        this.movementState = EnemyMovementState.ATTACKING;
        this.attack(playerPosition);
        this.lastAttackTime = now;
      }
    } else {
      if (distanceToPlayer > this.config.attackRange && distanceToPlayer < 50) {
        this.movementState = EnemyMovementState.PURSUING;
        
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.mesh.position)
          .normalize();
        direction.y = 0;
        
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        const slowMoveAmount = this.config.speed * deltaTime * 0.3;
        const newPosition = this.mesh.position.clone();
        newPosition.add(direction.multiplyScalar(slowMoveAmount));
        newPosition.y = 0;
        
        this.mesh.position.copy(newPosition);
        this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed * 0.3);
      } else {
        this.movementState = EnemyMovementState.IDLE;
        this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
      }
    }
  }

  private updateRotation(deltaTime: number): void {
    if (this.movementState !== EnemyMovementState.KNOCKED_BACK && 
        this.movementState !== EnemyMovementState.STUNNED && 
        this.hasInitialOrientation) {
      
      const currentRotation = this.mesh.rotation.y;
      const rotationDiff = this.targetRotation - currentRotation;
      
      let normalizedDiff = rotationDiff;
      if (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      if (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
      
      if (Math.abs(normalizedDiff) > 0.1) {
        const rotationStep = this.rotationSpeed * deltaTime;
        const newRotation = currentRotation + Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotationStep);
        this.mesh.rotation.y = newRotation;
      }
    }
  }

  private attack(playerPosition: THREE.Vector3): void {
    this.animationSystem.startAttackAnimation();
    
    const attackPosition = this.mesh.position.clone();
    attackPosition.y += 1;
    this.effectsManager.createAttackEffect(attackPosition, 0x880000);
    
    this.audioManager.play('enemy_hurt');
  }

  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) return;
    
    this.health -= damage;
    this.isHit = true;
    this.hitTime = Date.now();
    
    this.effectsManager.createAttackEffect(this.mesh.position.clone(), 0xFFD700);
    
    const knockbackDirection = new THREE.Vector3()
      .subVectors(this.mesh.position, playerPosition)
      .normalize();
    knockbackDirection.y = 0;
    
    const baseKnockback = 3.0;
    const damageMultiplier = Math.min(damage / 20, 2.0);
    const knockbackIntensity = (baseKnockback * damageMultiplier) / this.config.knockbackResistance;
    
    this.knockbackVelocity.copy(knockbackDirection).multiplyScalar(knockbackIntensity);
    this.knockbackDuration = 300;
    this.stunDuration = 150;
    this.movementState = EnemyMovementState.KNOCKED_BACK;
    
    const bloodDirection = knockbackDirection.clone();
    bloodDirection.y = 0.5;
    this.effectsManager.createRealisticBloodEffect(
      this.mesh.position.clone(), 
      bloodDirection
    );
    console.log(`🩸 [EnemyHumanoid] Created death blood decal at position:`, this.mesh.position);
    
    this.audioManager.play('enemy_hurt');
    
    if (this.health <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.deathTime = Date.now();
    this.deathAnimation.falling = true;
    this.movementState = EnemyMovementState.STUNNED;
    
    this.effectsManager.createHitEffect(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    this.audioManager.play('enemy_death');
  }

  private updateDeathAnimation(deltaTime: number): void {
    if (!this.deathAnimation.falling) return;
    
    this.deathAnimation.fallSpeed += deltaTime * 2;
    
    this.mesh.rotation.x += this.deathAnimation.rotationSpeed;
    this.mesh.position.y -= this.deathAnimation.fallSpeed;
    
    const fadeProgress = Math.min((Date.now() - this.deathTime) / 5000, 1);
    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh && child !== this.bodyParts.hitBox) {
        (child.material as THREE.MeshLambertMaterial).transparent = true;
        (child.material as THREE.MeshLambertMaterial).opacity = 1 - fadeProgress;
      }
    });
    
    if (this.mesh.position.y < -2) {
      this.deathAnimation.falling = false;
    }
  }

  public isInRange(playerPosition: THREE.Vector3, range: number): boolean {
    return this.mesh.position.distanceTo(playerPosition) <= range;
  }

  public isDeadFor(time: number): boolean {
    if (!this.isDead) return false;
    return Date.now() - this.deathTime > time;
  }

  public getIsDead(): boolean {
    return this.isDead;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getGoldReward(): number {
    return this.config.goldReward;
  }

  public getExperienceReward(): number {
    return this.config.experienceReward;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getDistanceFromPlayer(playerPosition: THREE.Vector3): number {
    return this.mesh.position.distanceTo(playerPosition);
  }

  public shouldCleanup(maxDistance: number, playerPosition: THREE.Vector3): boolean {
    if (this.isDead && this.isDeadFor(30000)) return true;
    if (this.getDistanceFromPlayer(playerPosition) > maxDistance) return true;
    return false;
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  public getBodyParts(): EnemyBodyParts {
    return this.bodyParts;
  }

  public getAnimationSystem(): EnemyAnimationSystem {
    return this.animationSystem;
  }
}
