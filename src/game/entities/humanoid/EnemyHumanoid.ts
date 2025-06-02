import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TextureGenerator } from '../../utils';
import { OrganicLimbGenerator } from '../../utils/OrganicLimbGenerator';
import { EnemyAnimationSystem } from '../../animation/EnemyAnimationSystem';
import { EnemyBodyParts } from '../EnemyBody';

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
  
  bodyScale: {
    body: { radius: number, height: number };
    head: { radius: number };
    arm: { radius: [number, number], length: number };
    forearm: { radius: [number, number], length: number };
    leg: { radius: [number, number], length: number };
    shin: { radius: [number, number], length: number };
  };
  
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

export interface EnemyBodyMetrics {
  scale: {
    body: { radius: number, height: number };
    head: { radius: number };
    arm: { radius: [number, number], length: number };
    forearm: { radius: [number, number], length: number };
    leg: { radius: [number, number], length: number };
    shin: { radius: [number, number], length: number };
  };
  
  positions: {
    bodyY: number;
    headY: number;
    shoulderHeight: number;
    hipHeight: number;
  };
  
  neutralPoses: {
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
    shoulders: {
      left: THREE.Euler;
      right: THREE.Euler;
    };
  };
  
  animationMetrics: {
    walkCycleSpeed: number;
    armSwingIntensity: number;
    legSwingIntensity: number;
    shoulderMovement: number;
  };
}

export class EnemyHumanoid {
  protected mesh: THREE.Group;
  protected config: HumanoidConfig;
  protected bodyParts: EnemyBodyParts;
  protected metrics: EnemyBodyMetrics;
  protected animationSystem: EnemyAnimationSystem;
  protected scene: THREE.Scene;
  protected effectsManager: EffectsManager;
  protected audioManager: AudioManager;
  
  private health: number;
  private maxHealth: number;
  private isDead: boolean = false;
  private deathTime: number = 0;
  private isHit: boolean = false;
  private hitTime: number = 0;
  private lastAttackTime: number = 0;
  
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
    this.maxHealth = config.maxHealth;
    
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    
    this.bodyParts = {
      body: undefined,
      head: undefined,
      leftArm: undefined,
      rightArm: undefined,
      leftElbow: undefined,
      rightElbow: undefined,
      leftWrist: undefined,
      rightWrist: undefined,
      leftLeg: undefined,
      rightLeg: undefined,
      leftKnee: undefined,
      rightKnee: undefined,
      weapon: undefined,
      hitBox: undefined,
      leftShoulder: undefined,
      rightShoulder: undefined,
      leftHip: undefined,
      rightHip: undefined,
      leftFoot: undefined,
      rightFoot: undefined
    };
    
    this.metrics = this.calculateBodyMetrics();
    
    this.createBody();
    this.createHead();
    this.createShoulders();
    this.createArms();
    this.createHips();
    this.createLegs();
    this.createHitBox();
    
    if (config.features.hasEyes) {
      this.createEyes();
    }
    
    if (config.features.hasTusks) {
      this.createTusks();
    }
    
    if (config.features.hasWeapon) {
      this.createWeapon();
    }
    
    this.animationSystem = new EnemyAnimationSystem(this.bodyParts, this.metrics, config.type);
    
    scene.add(this.mesh);
    
    console.log(`🏗️ [EnemyHumanoid] Created ${config.type} humanoid enemy`);
  }
  
  private calculateBodyMetrics(): EnemyBodyMetrics {
    const bodyY = this.config.bodyScale.body.height / 2;
    const headY = bodyY + this.config.bodyScale.body.height / 2 + this.config.bodyScale.head.radius * 0.8;
    const shoulderHeight = bodyY + this.config.bodyScale.body.height * 0.35;
    const hipHeight = bodyY - this.config.bodyScale.body.height * 0.35;
    
    return {
      scale: { ...this.config.bodyScale },
      
      positions: {
        bodyY,
        headY,
        shoulderHeight,
        hipHeight
      },
      
      neutralPoses: {
        arms: {
          left: new THREE.Vector3(-0.4, 0, -0.3),
          right: new THREE.Vector3(0.4, 0, -0.3)
        },
        elbows: {
          left: new THREE.Vector3(-0.05, 0, 0),
          right: new THREE.Vector3(-0.05, 0, 0)
        },
        wrists: {
          left: new THREE.Vector3(-0.1, 0, 0),
          right: new THREE.Vector3(-0.1, 0, 0)
        },
        shoulders: {
          left: new THREE.Euler(0, 0, 0.1),
          right: new THREE.Euler(0, 0, -0.1)
        }
      },
      
      animationMetrics: {
        walkCycleSpeed: 5.0,
        armSwingIntensity: 0.4,
        legSwingIntensity: 0.3,
        shoulderMovement: 0.1
      }
    };
  }
  
  private createBody(): void {
    const bodyGeometry = new THREE.CylinderGeometry(
      this.config.bodyScale.body.radius,
      this.config.bodyScale.body.radius * 0.9,
      this.config.bodyScale.body.height,
      16
    );
    
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.muscle,
      shininess: 30
    });
    
    this.bodyParts.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyParts.body.position.y = this.metrics.positions.bodyY;
    this.bodyParts.body.castShadow = true;
    this.bodyParts.body.receiveShadow = true;
    this.mesh.add(this.bodyParts.body);
  }
  
  private createHead(): void {
    const headGeometry = new THREE.SphereGeometry(
      this.config.bodyScale.head.radius,
      16,
      16
    );
    
    const headMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });
    
    this.bodyParts.head = new THREE.Mesh(headGeometry, headMaterial);
    this.bodyParts.head.position.y = this.metrics.positions.headY;
    this.bodyParts.head.castShadow = true;
    this.bodyParts.head.receiveShadow = true;
    this.mesh.add(this.bodyParts.head);
  }
  
  private createShoulders(): void {
    // Create more spherical shoulder geometry with better proportions
    const shoulderRadius = this.config.bodyScale.arm.radius[0] * 1.15; // Slightly smaller for more natural look
    
    // Use higher segment count for smoother, more spherical appearance
    const shoulderGeometry = new THREE.SphereGeometry(shoulderRadius, 16, 12);
    
    // Apply more balanced scaling to maintain spherical shape while adding slight natural flattening
    // - Minimal flattening on top/bottom (Y-axis) to keep spherical
    // - Slight outward curve (X-axis) for natural shoulder shape
    // - Maintain depth (Z-axis)
    shoulderGeometry.scale(1.1, 0.95, 1.0); // More spherical than before
    
    const shoulderMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 25 // Slightly more shine for smoother appearance
    });

    // Left shoulder - positioned with natural offset
    this.bodyParts.leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    this.bodyParts.leftShoulder.position.set(
      -(this.config.bodyScale.body.radius + shoulderRadius * 0.4), // Closer to body for better connection
      this.metrics.positions.shoulderHeight,
      0
    );
    this.bodyParts.leftShoulder.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.shoulders.left.x,
      this.metrics.neutralPoses.shoulders.left.y,
      this.metrics.neutralPoses.shoulders.left.z
    ));
    this.bodyParts.leftShoulder.castShadow = true;
    this.bodyParts.leftShoulder.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftShoulder);

    // Right shoulder - mirrored geometry with natural positioning
    this.bodyParts.rightShoulder = new THREE.Mesh(shoulderGeometry.clone(), shoulderMaterial.clone());
    this.bodyParts.rightShoulder.position.set(
      this.config.bodyScale.body.radius + shoulderRadius * 0.4, // Closer to body for better connection
      this.metrics.positions.shoulderHeight,
      0
    );
    this.bodyParts.rightShoulder.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.shoulders.right.x,
      this.metrics.neutralPoses.shoulders.right.y,
      this.metrics.neutralPoses.shoulders.right.z
    ));
    this.bodyParts.rightShoulder.castShadow = true;
    this.bodyParts.rightShoulder.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightShoulder);

    console.log('🏗️ [EnemyHumanoid] Created more spherical shoulders with improved geometry');
  }
  
  private createArms(): void {
    // Create upper arms
    const upperArmGeometry = OrganicLimbGenerator.createMuscularUpperArm(this.config.bodyScale.arm.length);
    const upperArmMaterial = OrganicLimbGenerator.createMuscleTexture(this.config.colors.muscle);
    
    // Left arm
    this.bodyParts.leftArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
    this.bodyParts.leftArm.position.set(
      -(this.config.bodyScale.body.radius + this.config.bodyScale.arm.radius[0] * 0.5),
      this.metrics.positions.shoulderHeight,
      0
    );
    this.bodyParts.leftArm.rotation.z = THREE.MathUtils.degToRad(-17.2);
    this.bodyParts.leftArm.rotation.x = THREE.MathUtils.degToRad(-22.5);
    this.bodyParts.leftArm.castShadow = true;
    this.bodyParts.leftArm.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftArm);
    
    // Right arm
    this.bodyParts.rightArm = new THREE.Mesh(upperArmGeometry.clone(), upperArmMaterial.clone());
    this.bodyParts.rightArm.position.set(
      this.config.bodyScale.body.radius + this.config.bodyScale.arm.radius[0] * 0.5,
      this.metrics.positions.shoulderHeight,
      0
    );
    this.bodyParts.rightArm.rotation.z = THREE.MathUtils.degToRad(17.2);
    this.bodyParts.rightArm.rotation.x = THREE.MathUtils.degToRad(-22.5);
    this.bodyParts.rightArm.castShadow = true;
    this.bodyParts.rightArm.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightArm);
    
    // Create elbows
    const elbowRadius = this.config.bodyScale.arm.radius[1] * 1.1;
    const elbowGeometry = new THREE.SphereGeometry(elbowRadius, 12, 12);
    const elbowMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });
    
    // Calculate elbow positions
    const leftElbowX = -(this.config.bodyScale.body.radius + this.config.bodyScale.arm.radius[0] * 0.5);
    const rightElbowX = this.config.bodyScale.body.radius + this.config.bodyScale.arm.radius[0] * 0.5;
    const elbowY = this.metrics.positions.shoulderHeight - this.config.bodyScale.arm.length * 0.9;
    
    // Left elbow
    this.bodyParts.leftElbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
    this.bodyParts.leftElbow.position.set(leftElbowX, elbowY, 0);
    this.bodyParts.leftElbow.castShadow = true;
    this.bodyParts.leftElbow.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftElbow);
    
    // Right elbow
    this.bodyParts.rightElbow = new THREE.Mesh(elbowGeometry.clone(), elbowMaterial.clone());
    this.bodyParts.rightElbow.position.set(rightElbowX, elbowY, 0);
    this.bodyParts.rightElbow.castShadow = true;
    this.bodyParts.rightElbow.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightElbow);
    
    // Create forearms
    const forearmGeometry = OrganicLimbGenerator.createMuscularForearm(this.config.bodyScale.forearm.length);
    const forearmMaterial = OrganicLimbGenerator.createMuscleTexture(this.config.colors.muscle);
    
    // Left forearm
    const leftForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    leftForearm.position.set(0, -this.config.bodyScale.forearm.length / 2, 0);
    leftForearm.castShadow = true;
    leftForearm.receiveShadow = true;
    this.bodyParts.leftElbow.add(leftForearm);
    
    // Right forearm
    const rightForearm = new THREE.Mesh(forearmGeometry.clone(), forearmMaterial.clone());
    rightForearm.position.set(0, -this.config.bodyScale.forearm.length / 2, 0);
    rightForearm.castShadow = true;
    rightForearm.receiveShadow = true;
    this.bodyParts.rightElbow.add(rightForearm);
    
    // Create wrists
    const wristRadius = this.config.bodyScale.forearm.radius[1] * 1.1;
    const wristGeometry = new THREE.SphereGeometry(wristRadius, 12, 12);
    const wristMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });
    
    // Left wrist
    this.bodyParts.leftWrist = new THREE.Mesh(wristGeometry, wristMaterial);
    this.bodyParts.leftWrist.position.set(0, -this.config.bodyScale.forearm.length, 0);
    this.bodyParts.leftWrist.castShadow = true;
    this.bodyParts.leftWrist.receiveShadow = true;
    this.bodyParts.leftElbow.add(this.bodyParts.leftWrist);
    
    // Right wrist
    this.bodyParts.rightWrist = new THREE.Mesh(wristGeometry.clone(), wristMaterial.clone());
    this.bodyParts.rightWrist.position.set(0, -this.config.bodyScale.forearm.length, 0);
    this.bodyParts.rightWrist.castShadow = true;
    this.bodyParts.rightWrist.receiveShadow = true;
    this.bodyParts.rightElbow.add(this.bodyParts.rightWrist);
    
    // Create hands
    const handGeometry = new THREE.BoxGeometry(
      wristRadius * 1.5,
      wristRadius * 2,
      wristRadius * 0.8
    );
    const handMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });
    
    // Left hand
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -wristRadius, wristRadius * 0.2);
    leftHand.castShadow = true;
    leftHand.receiveShadow = true;
    this.bodyParts.leftWrist.add(leftHand);
    
    // Right hand
    const rightHand = new THREE.Mesh(handGeometry.clone(), handMaterial.clone());
    rightHand.position.set(0, -wristRadius, wristRadius * 0.2);
    rightHand.castShadow = true;
    rightHand.receiveShadow = true;
    this.bodyParts.rightWrist.add(rightHand);
  }
  
  private createHips(): void {
    const hipRadius = this.config.bodyScale.leg.radius[0] * 1.2;
    const hipGeometry = new THREE.SphereGeometry(hipRadius, 12, 12);
    hipGeometry.scale(1.2, 0.85, 1.0);
    
    const hipMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });
    
    // Left hip
    this.bodyParts.leftHip = new THREE.Mesh(hipGeometry, hipMaterial);
    this.bodyParts.leftHip.position.set(
      -this.config.bodyScale.body.radius * 0.6,
      this.metrics.positions.hipHeight,
      0
    );
    this.bodyParts.leftHip.castShadow = true;
    this.bodyParts.leftHip.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftHip);
    
    // Right hip
    this.bodyParts.rightHip = new THREE.Mesh(hipGeometry.clone(), hipMaterial.clone());
    this.bodyParts.rightHip.position.set(
      this.config.bodyScale.body.radius * 0.6,
      this.metrics.positions.hipHeight,
      0
    );
    this.bodyParts.rightHip.castShadow = true;
    this.bodyParts.rightHip.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightHip);
  }
  
  private createLegs(): void {
    // Create thighs
    const thighGeometry = OrganicLimbGenerator.createMuscularThigh(this.config.bodyScale.leg.length);
    const thighMaterial = OrganicLimbGenerator.createMuscleTexture(this.config.colors.muscle);
    
    // Left thigh
    this.bodyParts.leftLeg = new THREE.Mesh(thighGeometry, thighMaterial);
    this.bodyParts.leftLeg.position.set(
      -this.config.bodyScale.body.radius * 0.6,
      this.metrics.positions.hipHeight,
      0
    );
    this.bodyParts.leftLeg.castShadow = true;
    this.bodyParts.leftLeg.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftLeg);
    
    // Right thigh
    this.bodyParts.rightLeg = new THREE.Mesh(thighGeometry.clone(), thighMaterial.clone());
    this.bodyParts.rightLeg.position.set(
      this.config.bodyScale.body.radius * 0.6,
      this.metrics.positions.hipHeight,
      0
    );
    this.bodyParts.rightLeg.castShadow = true;
    this.bodyParts.rightLeg.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightLeg);
    
    // Create knees
    const kneeRadius = this.config.bodyScale.leg.radius[1] * 1.1;
    const kneeGeometry = new THREE.SphereGeometry(kneeRadius, 12, 12);
    const kneeMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });
    
    // Calculate knee positions
    const leftKneeX = -this.config.bodyScale.body.radius * 0.6;
    const rightKneeX = this.config.bodyScale.body.radius * 0.6;
    const kneeY = this.metrics.positions.hipHeight - this.config.bodyScale.leg.length;
    
    // Left knee
    this.bodyParts.leftKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
    this.bodyParts.leftKnee.position.set(leftKneeX, kneeY, 0);
    this.bodyParts.leftKnee.castShadow = true;
    this.bodyParts.leftKnee.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftKnee);
    
    // Right knee
    this.bodyParts.rightKnee = new THREE.Mesh(kneeGeometry.clone(), kneeMaterial.clone());
    this.bodyParts.rightKnee.position.set(rightKneeX, kneeY, 0);
    this.bodyParts.rightKnee.castShadow = true;
    this.bodyParts.rightKnee.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightKnee);
    
    // Create calves
    const calfGeometry = OrganicLimbGenerator.createMuscularCalf(this.config.bodyScale.shin.length);
    const calfMaterial = OrganicLimbGenerator.createMuscleTexture(this.config.colors.muscle);
    
    // Left calf
    const leftCalf = new THREE.Mesh(calfGeometry, calfMaterial);
    leftCalf.position.set(0, -this.config.bodyScale.shin.length / 2, 0);
    leftCalf.castShadow = true;
    leftCalf.receiveShadow = true;
    this.bodyParts.leftKnee.add(leftCalf);
    
    // Right calf
    const rightCalf = new THREE.Mesh(calfGeometry.clone(), calfMaterial.clone());
    rightCalf.position.set(0, -this.config.bodyScale.shin.length / 2, 0);
    rightCalf.castShadow = true;
    rightCalf.receiveShadow = true;
    this.bodyParts.rightKnee.add(rightCalf);
    
    // Create feet
    const footLength = this.config.bodyScale.shin.radius[1] * 2.5;
    const footWidth = this.config.bodyScale.shin.radius[1] * 1.5;
    const footHeight = this.config.bodyScale.shin.radius[1] * 0.8;
    
    const footGeometry = new THREE.BoxGeometry(footWidth, footHeight, footLength);
    const footMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.accent,
      shininess: 10
    });
    
    // Left foot
    this.bodyParts.leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    this.bodyParts.leftFoot.position.set(0, -this.config.bodyScale.shin.length, footLength * 0.25);
    this.bodyParts.leftFoot.castShadow = true;
    this.bodyParts.leftFoot.receiveShadow = true;
    this.bodyParts.leftKnee.add(this.bodyParts.leftFoot);
    
    // Right foot
    this.bodyParts.rightFoot = new THREE.Mesh(footGeometry.clone(), footMaterial.clone());
    this.bodyParts.rightFoot.position.set(0, -this.config.bodyScale.shin.length, footLength * 0.25);
    this.bodyParts.rightFoot.castShadow = true;
    this.bodyParts.rightFoot.receiveShadow = true;
    this.bodyParts.rightKnee.add(this.bodyParts.rightFoot);
  }
  
  private createHitBox(): void {
    const hitBoxGeometry = new THREE.BoxGeometry(
      this.config.bodyScale.body.radius * 2.5,
      this.config.bodyScale.body.height * 2.5,
      this.config.bodyScale.body.radius * 2.5
    );
    const hitBoxMaterial = new THREE.MeshBasicMaterial({
      visible: false,
      transparent: true,
      opacity: 0
    });
    
    this.bodyParts.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    this.bodyParts.hitBox.position.y = this.config.bodyScale.body.height * 0.5;
    this.mesh.add(this.bodyParts.hitBox);
  }
  
  private createEyes(): void {
    if (!this.config.features.eyeConfig) return;
    
    const { radius, color, emissiveIntensity, offsetX, offsetY, offsetZ } = this.config.features.eyeConfig;
    
    const eyeGeometry = new THREE.SphereGeometry(radius, 12, 12);
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity,
      shininess: 80
    });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(
      -offsetX,
      this.metrics.positions.headY + offsetY,
      offsetZ
    );
    leftEye.castShadow = true;
    this.mesh.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial.clone());
    rightEye.position.set(
      offsetX,
      this.metrics.positions.headY + offsetY,
      offsetZ
    );
    rightEye.castShadow = true;
    this.mesh.add(rightEye);
  }
  
  private createTusks(): void {
    if (!this.config.features.tuskConfig) return;
    
    const { radius, height, color, offsetX, offsetY, offsetZ } = this.config.features.tuskConfig;
    
    const tuskGeometry = new THREE.ConeGeometry(radius, height, 12);
    const tuskMaterial = new THREE.MeshPhongMaterial({
      color,
      shininess: 60
    });
    
    // Left tusk
    const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    leftTusk.position.set(
      -offsetX,
      this.metrics.positions.headY + offsetY,
      offsetZ
    );
    leftTusk.rotation.x = Math.PI;
    leftTusk.rotation.z = -Math.PI / 8;
    leftTusk.castShadow = true;
    this.mesh.add(leftTusk);
    
    // Right tusk
    const rightTusk = new THREE.Mesh(tuskGeometry.clone(), tuskMaterial.clone());
    rightTusk.position.set(
      offsetX,
      this.metrics.positions.headY + offsetY,
      offsetZ
    );
    rightTusk.rotation.x = Math.PI;
    rightTusk.rotation.z = Math.PI / 8;
    rightTusk.castShadow = true;
    this.mesh.add(rightTusk);
  }
  
  protected createWeapon(): void {
    const woodTexture = TextureGenerator.createWoodTexture();
    const metalTexture = TextureGenerator.createMetalTexture();
    
    this.bodyParts.weapon = this.createWeaponMesh(woodTexture, metalTexture);
    
    if (this.bodyParts.leftWrist) {
      this.bodyParts.leftWrist.add(this.bodyParts.weapon);
    }
  }
  
  protected createWeaponMesh(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    const weapon = new THREE.Group();
    
    // Default weapon - simple club
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 12);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513,
      shininess: 30,
      map: woodTexture
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.6;
    handle.castShadow = true;
    weapon.add(handle);
    
    const headGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513,
      shininess: 20,
      map: woodTexture
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = -1.2;
    head.scale.set(1.2, 1.0, 1.2);
    head.castShadow = true;
    weapon.add(head);
    
    // Add metal spikes
    const spikeGeometry = new THREE.ConeGeometry(0.04, 0.15, 8);
    const spikeMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      shininess: 80,
      map: metalTexture
    });
    
    for (let i = 0; i < 8; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial.clone());
      const angle = (i / 8) * Math.PI * 2;
      spike.position.set(
        Math.cos(angle) * 0.2,
        -1.2,
        Math.sin(angle) * 0.2
      );
      spike.rotation.x = Math.PI / 2;
      spike.rotation.z = angle;
      spike.castShadow = true;
      weapon.add(spike);
    }
    
    weapon.rotation.set(0, 0, -0.3);
    
    return weapon;
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) {
      this.updateDeathAnimation(deltaTime);
      return;
    }
    
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    const isMoving = distanceToPlayer > this.config.damageRange && distanceToPlayer < 30;
    
    if (isMoving) {
      this.moveTowardsPlayer(deltaTime, playerPosition);
      this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
    } else {
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    }
    
    if (distanceToPlayer <= this.config.damageRange) {
      this.facePlayer(playerPosition);
      
      const now = Date.now();
      if (now - this.lastAttackTime > this.config.attackCooldown && !this.animationSystem.isAttacking()) {
        this.attack(playerPosition);
        this.lastAttackTime = now;
      }
    }
    
    if (this.animationSystem.isAttacking()) {
      this.animationSystem.updateAttackAnimation(deltaTime);
    }
    
    if (this.isHit && Date.now() - this.hitTime > 300) {
      this.isHit = false;
    }
  }
  
  private moveTowardsPlayer(deltaTime: number, playerPosition: THREE.Vector3): void {
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    direction.y = 0;
    
    const moveAmount = this.config.speed * deltaTime;
    this.mesh.position.add(direction.multiplyScalar(moveAmount));
    
    this.facePlayer(playerPosition);
  }
  
  private facePlayer(playerPosition: THREE.Vector3): void {
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    
    if (direction.length() > 0.001) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = targetRotation;
    }
  }
  
  private attack(playerPosition: THREE.Vector3): void {
    this.animationSystem.startAttackAnimation();
    
    const attackPosition = this.mesh.position.clone();
    attackPosition.y += 1.5;
    
    this.effectsManager.createAttackEffect(attackPosition, 0x880000);
    this.audioManager.play('enemy_attack');
  }
  
  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) return;
    
    this.health -= damage;
    this.isHit = true;
    this.hitTime = Date.now();
    
    // Create hit effect
    const hitPosition = this.mesh.position.clone();
    hitPosition.y += this.config.bodyScale.body.height * 0.7;
    this.effectsManager.createHitEffect(hitPosition);
    
    // Apply knockback
    const knockbackDirection = new THREE.Vector3()
      .subVectors(this.mesh.position, playerPosition)
      .normalize();
    knockbackDirection.y = 0;
    
    const knockbackDistance = 0.3 / this.config.knockbackResistance;
    this.mesh.position.add(knockbackDirection.multiplyScalar(knockbackDistance));
    
    // Create blood effect
    const bloodDirection = knockbackDirection.clone();
    bloodDirection.y = 0.5;
    this.effectsManager.createBloodEffect(hitPosition, bloodDirection);
    
    // Play sound
    this.audioManager.play('enemy_hurt');
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  private die(): void {
    this.isDead = true;
    this.deathTime = Date.now();
    
    // Play death sound
    this.audioManager.play('enemy_death');
    
    // Create death effect
    const deathPosition = this.mesh.position.clone();
    deathPosition.y += this.config.bodyScale.body.height * 0.5;
    this.effectsManager.createDeathEffect(deathPosition);
    
    console.log(`☠️ [EnemyHumanoid] ${this.config.type} has died`);
  }
  
  private updateDeathAnimation(deltaTime: number): void {
    const deathProgress = Math.min((Date.now() - this.deathTime) / 3000, 1);
    
    // Fall over
    this.mesh.rotation.x = deathProgress * Math.PI / 2;
    
    // Sink into ground
    this.mesh.position.y = -deathProgress * 0.5;
    
    // Fade out
    if (deathProgress > 0.7) {
      const opacity = 1 - ((deathProgress - 0.7) / 0.3);
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.transparent = true;
              mat.opacity = opacity;
            });
          } else {
            child.material.transparent = true;
            child.material.opacity = opacity;
          }
        }
      });
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
  
  public getBodyParts(): EnemyBodyParts {
    return this.bodyParts;
  }
  
  public getAnimationSystem(): EnemyAnimationSystem {
    return this.animationSystem;
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
}
