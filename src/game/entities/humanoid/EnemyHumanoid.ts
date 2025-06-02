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
  
  // Body proportions
  bodyScale: BodyScale;
  
  // Colors
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
  
  // Features
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
  
  // Core enemy data
  protected mesh: THREE.Group;
  protected health: number;
  protected isDead: boolean = false;
  protected deathTime: number = 0;
  protected lastAttackTime: number = 0;
  protected isHit: boolean = false;
  protected hitTime: number = 0;
  
  // Enhanced body and animation systems
  protected bodyParts: EnemyBodyParts;
  protected animationSystem: EnemyAnimationSystem;
  
  // Movement state management
  protected movementState: EnemyMovementState = EnemyMovementState.IDLE;
  protected knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
  protected knockbackDuration: number = 0;
  protected stunDuration: number = 0;
  protected targetRotation: number = 0;
  protected rotationSpeed: number = 3.0;
  protected hasInitialOrientation: boolean = false;
  
  // Animation timers
  protected walkTime: number = 0;
  protected idleTime: number = 0;
  
  // Death animation
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
    
    // Create the humanoid body and animation system
    const bodyResult = this.createHumanoidBody(position);
    this.mesh = bodyResult.group;
    this.bodyParts = bodyResult.bodyParts;
    
    // Pass enemy type to animation system for realistic movement
    this.animationSystem = new EnemyAnimationSystem(bodyResult.bodyParts, bodyResult.metrics, config.type);
    
    // Add to scene
    scene.add(this.mesh);
    
    console.log(`🗡️ [EnemyHumanoid] Created ${config.type} humanoid enemy with enhanced visuals`);
  }

  protected createHumanoidBody(position: THREE.Vector3): EnemyBodyResult {
    const humanoidGroup = new THREE.Group();
    const { bodyScale, colors, features } = this.config;
    
    // Calculate positions based on body scale - MAINTAIN EXACT SAME VALUES
    const legTopY = 1.4;
    const thighCenterY = legTopY - bodyScale.leg.length / 2;
    const bodyY = legTopY + bodyScale.body.height / 2;
    const bodyTopY = bodyY + bodyScale.body.height / 2;
    const headY = bodyTopY + bodyScale.head.radius;
    const shoulderHeight = bodyTopY;

    // Create enhanced materials with better definitions
    const skinMaterial = new THREE.MeshPhongMaterial({
      color: colors.skin,
      shininess: 35,
      specular: 0x333333
    });
    
    const muscleMaterial = new THREE.MeshPhongMaterial({
      color: colors.muscle,
      shininess: 40,
      specular: 0x444444
    });

    const accentMaterial = new THREE.MeshPhongMaterial({
      color: colors.accent,
      shininess: 45,
      specular: 0x555555
    });

    // === ENHANCED MUSCULAR LEGS WITH SIMPLE TAPER ===
    const leftLegGeometry = this.createTaperedLimbGeometry(
      bodyScale.leg.radius[1], 
      bodyScale.leg.radius[0], 
      bodyScale.leg.length
    );
    const leftLeg = new THREE.Mesh(leftLegGeometry, muscleMaterial.clone());
    leftLeg.position.set(-bodyScale.body.radius * 0.4, thighCenterY, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    humanoidGroup.add(leftLeg);

    const rightLegGeometry = this.createTaperedLimbGeometry(
      bodyScale.leg.radius[1],
      bodyScale.leg.radius[0],
      bodyScale.leg.length
    );
    const rightLeg = new THREE.Mesh(rightLegGeometry, muscleMaterial.clone());
    rightLeg.position.set(bodyScale.body.radius * 0.4, thighCenterY, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    humanoidGroup.add(rightLeg);

    // === ENHANCED HIP JOINTS - TAPERED FOR SMOOTH CONNECTION ===
    const hipJointGeometry = new THREE.SphereGeometry(0.24, 24, 20);
    const leftHipJoint = new THREE.Mesh(hipJointGeometry, accentMaterial);
    leftHipJoint.position.set(-bodyScale.body.radius * 0.4, legTopY - 0.03, 0);
    leftHipJoint.scale.set(1, 0.8, 1); // Slightly flattened for better connection
    leftHipJoint.castShadow = true;
    leftHipJoint.receiveShadow = true;
    humanoidGroup.add(leftHipJoint);

    const rightHipJoint = new THREE.Mesh(hipJointGeometry, accentMaterial.clone());
    rightHipJoint.position.set(bodyScale.body.radius * 0.4, legTopY - 0.03, 0);
    rightHipJoint.scale.set(1, 0.8, 1); // Slightly flattened for better connection
    rightHipJoint.castShadow = true;
    rightHipJoint.receiveShadow = true;
    humanoidGroup.add(rightHipJoint);

    // === ENHANCED COMPOSITE ANATOMICAL TORSO ===
    const torsoGroup = new THREE.Group();
    
    // Main torso - truncated elliptical cone (widest at shoulders, narrows at waist) - made thicker
    const mainTorsoGeometry = new THREE.CylinderGeometry(
      bodyScale.body.radius * 1.1,  // Top radius (increased from 1.0 to 1.1)
      bodyScale.body.radius * 0.85, // Bottom radius (increased from 0.75 to 0.85)
      bodyScale.body.height,
      32, // More segments for smooth elliptical shape
      8
    );
    
    // Make it elliptical (flatter front-to-back)
    const positions = mainTorsoGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      
      // Calculate angle and radius in the XZ plane
      const angle = Math.atan2(z, x);
      const radius = Math.sqrt(x * x + z * z);
      
      // Modify radius to create elliptical shape (0.8 depth ratio for flatter front-to-back)
      const newRadius = radius * (Math.abs(Math.sin(angle)) * 0.2 + 0.8);
      
      // Apply new coordinates
      positions[i] = Math.cos(angle) * newRadius;
      positions[i + 2] = Math.sin(angle) * newRadius;
    }
    mainTorsoGeometry.attributes.position.needsUpdate = true;
    
    const mainTorso = new THREE.Mesh(mainTorsoGeometry, skinMaterial.clone());
    mainTorso.position.y = bodyY;
    mainTorso.castShadow = true;
    mainTorso.receiveShadow = true;
    torsoGroup.add(mainTorso);

    // Chest Area: Widened shape like inverted pelvis for shoulder connection
    const chestGeometry = new THREE.CylinderGeometry(
      bodyScale.body.radius * 1.2,  // Top radius (wider for shoulders)
      bodyScale.body.radius * 0.85, // Bottom radius (connects to main torso)
      0.5, // Height
      16, 4
    );
    const chest = new THREE.Mesh(chestGeometry, muscleMaterial.clone());
    chest.position.y = bodyTopY - 0.25;
    chest.castShadow = true;
    chest.receiveShadow = true;
    torsoGroup.add(chest);

    // Hip/Pelvis Area: Widened base for connection to legs
    const pelvisGeometry = new THREE.CylinderGeometry(
      bodyScale.body.radius * 0.75, // Top radius (connects to waist)
      bodyScale.body.radius * 0.9,  // Bottom radius (wider hips)
      0.4, // Height
      16, 4
    );
    const pelvis = new THREE.Mesh(pelvisGeometry, skinMaterial.clone());
    pelvis.position.y = legTopY + 0.2;
    pelvis.castShadow = true;
    pelvis.receiveShadow = true;
    torsoGroup.add(pelvis);

    humanoidGroup.add(torsoGroup);
    const body = mainTorso; // Keep reference for animation system

    // === ENHANCED ORCISH HEAD ===
    const headGroup = new THREE.Group();
    
    // Main skull - elongated and more angular
    const skullGeometry = new THREE.SphereGeometry(bodyScale.head.radius, 24, 20);
    const skull = new THREE.Mesh(skullGeometry, muscleMaterial.clone());
    skull.scale.set(1, 1.1, 1.2); // elongated
    skull.position.y = headY;
    skull.castShadow = true;
    skull.receiveShadow = true;
    headGroup.add(skull);

    // Prominent brow ridge
    const browRidgeGeometry = new THREE.BoxGeometry(0.8, 0.15, 0.4);
    const browRidge = new THREE.Mesh(browRidgeGeometry, accentMaterial.clone());
    browRidge.position.set(0, headY + 0.2, bodyScale.head.radius * 0.7);
    browRidge.castShadow = true;
    headGroup.add(browRidge);

    // Protruding jaw
    const jawGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.5);
    const jaw = new THREE.Mesh(jawGeometry, muscleMaterial.clone());
    jaw.position.set(0, headY - 0.25, bodyScale.head.radius * 0.6);
    jaw.castShadow = true;
    headGroup.add(jaw);

    // Flattened nose area
    const noseGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.25);
    const nose = new THREE.Mesh(noseGeometry, accentMaterial.clone());
    nose.position.set(0, headY, bodyScale.head.radius * 0.9);
    nose.castShadow = true;
    headGroup.add(nose);

    // Defined cheekbones
    const cheekGeometry = new THREE.SphereGeometry(0.2, 16, 12);
    const leftCheek = new THREE.Mesh(cheekGeometry, accentMaterial.clone());
    leftCheek.position.set(-0.3, headY - 0.1, bodyScale.head.radius * 0.6);
    leftCheek.scale.set(1, 0.8, 1.2);
    leftCheek.castShadow = true;
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeometry, accentMaterial.clone());
    rightCheek.position.set(0.3, headY - 0.1, bodyScale.head.radius * 0.6);
    rightCheek.scale.set(1, 0.8, 1.2);
    rightCheek.castShadow = true;
    headGroup.add(rightCheek);

    humanoidGroup.add(headGroup);
    const head = skull; // Keep reference for animation system

    // === ENHANCED FACIAL FEATURES ===
    if (features.hasEyes && features.eyeConfig) {
      // Enhanced eye sockets in brow ridge
      const eyeSocketGeometry = new THREE.SphereGeometry(features.eyeConfig.radius * 1.3, 16, 12);
      const eyeSocketMaterial = new THREE.MeshPhongMaterial({
        color: colors.accent,
        shininess: 20
      });

      const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
      leftEyeSocket.position.set(
        -features.eyeConfig.offsetX,
        headY + features.eyeConfig.offsetY - 0.05,
        bodyScale.head.radius * features.eyeConfig.offsetZ * 0.8
      );
      leftEyeSocket.scale.z = 0.4;
      headGroup.add(leftEyeSocket);

      const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial.clone());
      rightEyeSocket.position.set(
        features.eyeConfig.offsetX,
        headY + features.eyeConfig.offsetY - 0.05,
        bodyScale.head.radius * features.eyeConfig.offsetZ * 0.8
      );
      rightEyeSocket.scale.z = 0.4;
      headGroup.add(rightEyeSocket);

      // Enhanced glowing eyes
      const eyeGeometry = new THREE.SphereGeometry(features.eyeConfig.radius, 16, 12);
      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: features.eyeConfig.color,
        transparent: true,
        opacity: 1,
        emissive: features.eyeConfig.color,
        emissiveIntensity: features.eyeConfig.emissiveIntensity,
        shininess: 100
      });

      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(
        -features.eyeConfig.offsetX,
        headY + features.eyeConfig.offsetY,
        bodyScale.head.radius * features.eyeConfig.offsetZ
      );

      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
      rightEye.position.set(
        features.eyeConfig.offsetX,
        headY + features.eyeConfig.offsetY,
        bodyScale.head.radius * features.eyeConfig.offsetZ
      );

      headGroup.add(leftEye);
      headGroup.add(rightEye);
    }

    // Enhanced tusks
    if (features.hasTusks && features.tuskConfig) {
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
        headY + features.tuskConfig.offsetY,
        bodyScale.head.radius * features.tuskConfig.offsetZ
      );
      leftTusk.rotation.x = Math.PI;
      leftTusk.rotation.z = -0.1;
      leftTusk.castShadow = true;

      const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
      rightTusk.position.set(
        features.tuskConfig.offsetX,
        headY + features.tuskConfig.offsetY,
        bodyScale.head.radius * features.tuskConfig.offsetZ
      );
      rightTusk.rotation.x = Math.PI;
      rightTusk.rotation.z = 0.1;
      rightTusk.castShadow = true;

      headGroup.add(leftTusk);
      headGroup.add(rightTusk);
    }

    // === ENHANCED POINTED EARS ===
    const earGeometry = new THREE.ConeGeometry(0.12, 0.4, 12);
    const earMaterial = new THREE.MeshPhongMaterial({
      color: colors.muscle,
      shininess: 25
    });

    const leftEar = new THREE.Mesh(earGeometry, earMaterial.clone());
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

    // === ENHANCED MUSCULAR ARMS ===
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
    leftArm.receiveShadow = true;
    humanoidGroup.add(leftArm);

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
    rightArm.receiveShadow = true;
    humanoidGroup.add(rightArm);

    // === SHOULDER JOINTS - TAPERED FOR SMOOTH ARM CONNECTION ===
    const shoulderJointGeometry = new THREE.SphereGeometry(0.25, 24, 20);
    const leftShoulderJoint = new THREE.Mesh(shoulderJointGeometry, accentMaterial);
    leftShoulderJoint.position.set(-(bodyScale.body.radius + 0.1), shoulderHeight, 0);
    leftShoulderJoint.scale.set(0.9, 1, 0.9); // Slightly compressed for smoother arm connection
    leftShoulderJoint.castShadow = true;
    leftShoulderJoint.receiveShadow = true;
    humanoidGroup.add(leftShoulderJoint);

    const rightShoulderJoint = new THREE.Mesh(shoulderJointGeometry, accentMaterial.clone());
    rightShoulderJoint.position.set(bodyScale.body.radius + 0.1, shoulderHeight, 0);
    rightShoulderJoint.scale.set(0.9, 1, 0.9); // Slightly compressed for smoother arm connection
    rightShoulderJoint.castShadow = true;
    rightShoulderJoint.receiveShadow = true;
    humanoidGroup.add(rightShoulderJoint);

    // === ENHANCED ELBOW JOINTS - TAPERED FOR SMOOTH FOREARM CONNECTION ===
    const elbowJointGeometry = new THREE.SphereGeometry(0.22, 24, 20);
    const leftElbowJoint = new THREE.Mesh(elbowJointGeometry, accentMaterial);
    leftElbowJoint.position.set(0, -bodyScale.arm.length + 0.03, 0);
    leftElbowJoint.scale.set(0.8, 1.2, 0.8); // Elongated vertically for smoother forearm connection
    leftElbowJoint.castShadow = true;
    leftElbowJoint.receiveShadow = true;
    leftArm.add(leftElbowJoint);

    const rightElbowJoint = new THREE.Mesh(elbowJointGeometry, accentMaterial.clone());
    rightElbowJoint.position.set(0, -bodyScale.arm.length + 0.03, 0);
    rightElbowJoint.scale.set(0.8, 1.2, 0.8); // Elongated vertically for smoother forearm connection
    rightElbowJoint.castShadow = true;
    rightElbowJoint.receiveShadow = true;
    rightArm.add(rightElbowJoint);

    // === ENHANCED MUSCULAR FOREARMS ===
    const leftElbowGeometry = this.createTaperedLimbGeometry(
      bodyScale.forearm.radius[1], 
      bodyScale.forearm.radius[0], 
      bodyScale.forearm.length
    );
    leftElbowGeometry.translate(0, -bodyScale.forearm.length * 0.5, 0);
    const leftElbow = new THREE.Mesh(leftElbowGeometry, skinMaterial.clone());
    leftElbow.position.set(0, -bodyScale.arm.length, 0);
    leftElbow.castShadow = true;
    leftElbow.receiveShadow = true;
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
    rightElbow.receiveShadow = true;
    rightArm.add(rightElbow);

    // === ENHANCED HANDS ===
    const leftWristGeometry = new THREE.SphereGeometry(0.17, 20, 16);
    const leftWrist = new THREE.Mesh(leftWristGeometry, muscleMaterial.clone());
    leftWrist.position.set(0, -bodyScale.forearm.length, 0);
    leftWrist.castShadow = true;
    leftWrist.receiveShadow = true;
    leftElbow.add(leftWrist);

    const rightWristGeometry = new THREE.SphereGeometry(0.17, 20, 16);
    const rightWrist = new THREE.Mesh(rightWristGeometry, muscleMaterial.clone());
    rightWrist.position.set(0, -bodyScale.forearm.length, 0);
    rightWrist.castShadow = true;
    rightWrist.receiveShadow = true;
    rightElbow.add(rightWrist);

    // Enhanced claws
    const clawGeometry = new THREE.ConeGeometry(0.03, 0.18, 8);
    const clawMaterial = new THREE.MeshPhongMaterial({
      color: 0x2C1810,
      shininess: 90,
      specular: 0x888888
    });

    for (let i = 0; i < 5; i++) {
      const angle = (i / 4) * Math.PI - Math.PI / 2;
      
      const leftClaw = new THREE.Mesh(clawGeometry, clawMaterial);
      leftClaw.position.set(
        Math.cos(angle) * 0.22,
        -0.12,
        Math.sin(angle) * 0.22
      );
      leftClaw.rotation.x = Math.PI + 0.3;
      leftClaw.castShadow = true;
      leftWrist.add(leftClaw);

      const rightClaw = new THREE.Mesh(clawGeometry, clawMaterial.clone());
      rightClaw.position.set(
        Math.cos(angle) * 0.22,
        -0.12,
        Math.sin(angle) * 0.22
      );
      rightClaw.rotation.x = Math.PI + 0.3;
      rightClaw.castShadow = true;
      rightWrist.add(rightClaw);
    }

    // === ENHANCED MUSCULAR SHINS ===
    const shinRelativeY = -bodyScale.leg.length / 2;

    const leftKneeGeometry = this.createTaperedLimbGeometry(
      bodyScale.shin.radius[1], 
      bodyScale.shin.radius[0], 
      bodyScale.shin.length
    );
    leftKneeGeometry.translate(0, -bodyScale.shin.length * 0.5, 0);
    const leftKnee = new THREE.Mesh(leftKneeGeometry, skinMaterial.clone());
    leftKnee.position.set(0, shinRelativeY, 0);
    leftKnee.castShadow = true;
    leftKnee.receiveShadow = true;
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
    rightKnee.receiveShadow = true;
    rightLeg.add(rightKnee);

    // === ENHANCED KNEE JOINTS - TAPERED FOR SMOOTH SHIN CONNECTION ===
    const kneeJointGeometry = new THREE.SphereGeometry(0.24, 24, 20);
    const leftKneeJoint = new THREE.Mesh(kneeJointGeometry, accentMaterial);
    leftKneeJoint.position.set(0, shinRelativeY + 0.03, 0);
    leftKneeJoint.scale.set(0.8, 1.2, 0.8); // Elongated vertically for smoother shin connection
    leftKneeJoint.castShadow = true;
    leftKneeJoint.receiveShadow = true;
    leftLeg.add(leftKneeJoint);

    const rightKneeJoint = new THREE.Mesh(kneeJointGeometry, accentMaterial.clone());
    rightKneeJoint.position.set(0, shinRelativeY + 0.03, 0);
    rightKneeJoint.scale.set(0.8, 1.2, 0.8); // Elongated vertically for smoother shin connection
    rightKneeJoint.castShadow = true;
    rightKneeJoint.receiveShadow = true;
    rightLeg.add(rightKneeJoint);

    // === ENHANCED FEET ===
    const footGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.7);
    const footMaterial = new THREE.MeshPhongMaterial({
      color: colors.muscle,
      shininess: 30
    });

    const leftFoot = new THREE.Mesh(footGeometry, footMaterial.clone());
    leftFoot.position.set(0, -bodyScale.shin.length, 0.2);
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    leftKnee.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeometry, footMaterial.clone());
    rightFoot.position.set(0, -bodyScale.shin.length, 0.2);
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    rightKnee.add(rightFoot);

    // Enhanced toe claws
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

    // === ENHANCED WEAPON ===
    let weapon: THREE.Group | undefined;
    if (features.hasWeapon) {
      const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
      const metalTexture = TextureGenerator.createMetalTexture(0x444444);
      weapon = this.createWeapon(woodTexture, metalTexture);
      weapon.position.set(0, 0.1, 0);
      weapon.rotation.x = Math.PI / 2 + 0.2;
      leftWrist.add(weapon);
    }

    // === ENHANCED HITBOX ===
    const hitBoxGeometry = new THREE.BoxGeometry(1.8, 2.2, 1.8);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = bodyY;
    humanoidGroup.add(hitBox);

    // === POSITIONING ===
    humanoidGroup.position.copy(position);
    humanoidGroup.castShadow = true;

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

    // Create metrics for animation system
    const metrics: EnemyBodyMetrics = {
      scale: bodyScale,
      positions: {
        legTopY,
        thighCenterY,
        bodyY,
        bodyTopY,
        headY,
        shoulderHeight
      },
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

  /**
   * Creates simple tapered limb geometry without spiral textures
   */
  private createTaperedLimbGeometry(
    topRadius: number,
    bottomRadius: number, 
    height: number
  ): THREE.CylinderGeometry {
    // Simple tapered cylinder - no complex muscle definition to avoid spiral texture
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
    this.idleTime += deltaTime;
    
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
    this.effectsManager.createBloodEffect(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), bloodDirection);
    
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

  // Public interface methods
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
