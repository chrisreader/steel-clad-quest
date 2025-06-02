import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { EnemyType } from '../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { EnemyAnimationSystem } from '../../animation/EnemyAnimationSystem';

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
  leftShoulder: THREE.Mesh | undefined;
  rightShoulder: THREE.Mesh | undefined;
  weapon: THREE.Group | undefined;
  hitBox: THREE.Mesh | undefined;
}

export interface EnemyBodyMetrics {
  scale: {
    body: { radius: number; height: number };
    head: { radius: number };
    arm: { radius: number; length: number };
    leg: { radius: number; length: number };
  };
  positions: {
    bodyY: number;
    headY: number;
    shoulderHeight: number;
  };
  animationMetrics: {
    walkCycleSpeed: number;
    armSwingIntensity: number;
    legSwingIntensity: number;
    shoulderMovement: number;
  };
  neutralPoses: {
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
    shoulders: {
      left: { x: number; y: number; z: number };
      right: { x: number; y: number; z: number };
    };
  };
}

export interface HumanoidConfig {
  bodyRadius: number;
  bodyHeight: number;
  headRadius: number;
  armRadius: number;
  armLength: number;
  legRadius: number;
  legLength: number;
  shoulderRadius: number;
  colors: {
    skin: number;
    clothing: number;
    metal: number;
  };
}

export class EnemyHumanoid {
  private mesh: THREE.Group;
  private bodyParts: EnemyBodyParts;
  private metrics: EnemyBodyMetrics;
  private animationSystem: EnemyAnimationSystem;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
  // Enemy state
  private health: number;
  private maxHealth: number;
  private isDead: boolean = false;
  private isHit: boolean = false;
  private hitTime: number = 0;
  private deathTime: number = 0;
  private lastAttackTime: number = 0;
  
  // Configuration
  private config: HumanoidConfig;
  private goldReward: number;
  private experienceReward: number;
  private speed: number;
  private damage: number;
  private attackRange: number;
  private damageRange: number;
  private attackCooldown: number;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    config: HumanoidConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    enemyType: string = 'orc'
  ) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.config = config;
    
    // Initialize enemy stats
    this.health = 60;
    this.maxHealth = 60;
    this.goldReward = 50;
    this.experienceReward = 25;
    this.speed = 3;
    this.damage = 20;
    this.attackRange = 3.5;
    this.damageRange = 2.5;
    this.attackCooldown = 2000;
    
    this.mesh = new THREE.Group();
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
      leftShoulder: undefined,
      rightShoulder: undefined,
      weapon: undefined,
      hitBox: undefined
    };
    
    this.createMetrics();
    this.createBody();
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    this.animationSystem = new EnemyAnimationSystem(this.bodyParts, this.metrics, enemyType);
    
    console.log(`🗡️ [EnemyHumanoid] Created with enhanced shoulder animations for ${enemyType}`);
  }

  private createMetrics(): void {
    this.metrics = {
      scale: {
        body: { 
          radius: this.config.bodyRadius, 
          height: this.config.bodyHeight 
        },
        head: { 
          radius: this.config.headRadius 
        },
        arm: { 
          radius: this.config.armRadius, 
          length: this.config.armLength 
        },
        leg: { 
          radius: this.config.legRadius, 
          length: this.config.legLength 
        }
      },
      positions: {
        bodyY: this.config.bodyHeight / 2,
        headY: this.config.bodyHeight + this.config.headRadius * 0.8,
        shoulderHeight: this.config.bodyHeight * 0.85
      },
      animationMetrics: {
        walkCycleSpeed: 3.0,
        armSwingIntensity: 0.4,
        legSwingIntensity: 0.3,
        shoulderMovement: 0.15
      },
      neutralPoses: {
        arms: {
          left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: THREE.MathUtils.degToRad(-17.2) },
          right: { x: THREE.MathUtils.degToRad(-15), y: 0, z: THREE.MathUtils.degToRad(10) }
        },
        elbows: {
          left: { x: -0.1, y: 0, z: 0 },
          right: { x: -0.05, y: 0, z: 0 }
        },
        wrists: {
          left: { x: THREE.MathUtils.degToRad(-22.5), y: 0, z: 0 },
          right: { x: THREE.MathUtils.degToRad(-15), y: 0, z: 0 }
        },
        shoulders: {
          left: { x: 0, y: 0, z: THREE.MathUtils.degToRad(-5) },
          right: { x: 0, y: 0, z: THREE.MathUtils.degToRad(5) }
        }
      }
    };
  }

  private createBody(): void {
    // Create invisible hit box
    const hitBoxGeometry = new THREE.BoxGeometry(1.8, 2.4, 1.8);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.bodyParts.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    this.bodyParts.hitBox.position.y = this.config.bodyHeight / 2;
    this.mesh.add(this.bodyParts.hitBox);

    // Create main body (torso)
    const bodyGeometry = new THREE.CylinderGeometry(
      this.config.bodyRadius * 0.9,
      this.config.bodyRadius * 1.1,
      this.config.bodyHeight,
      16
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.clothing,
      shininess: 30
    });
    this.bodyParts.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyParts.body.position.y = this.config.bodyHeight / 2;
    this.bodyParts.body.castShadow = true;
    this.bodyParts.body.receiveShadow = true;
    this.mesh.add(this.bodyParts.body);

    // Create head
    const headGeometry = new THREE.SphereGeometry(this.config.headRadius, 16, 12);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });
    this.bodyParts.head = new THREE.Mesh(headGeometry, headMaterial);
    this.bodyParts.head.position.y = this.metrics.positions.headY;
    this.bodyParts.head.castShadow = true;
    this.bodyParts.head.receiveShadow = true;
    this.mesh.add(this.bodyParts.head);

    // Create more spherical shoulders with better proportions
    this.createShoulders();
    
    // Create arms
    this.createArms();
    
    // Create legs
    this.createLegs();
    
    // Create weapon
    this.createWeapon();
    
    // Add facial features
    this.addFacialFeatures();
  }

  private createShoulders(): void {
    // FIXED: More spherical shoulder geometry with slight flattening
    const shoulderGeometry = new THREE.SphereGeometry(
      this.config.shoulderRadius,
      12,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.8 // Slightly flattened on top for more natural look
    );
    
    // Scale to be more spherical (less oval)
    shoulderGeometry.scale(1.1, 0.9, 1.1); // Slightly wider and deeper, less tall
    
    const shoulderMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });

    // Left shoulder
    this.bodyParts.leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    this.bodyParts.leftShoulder.position.set(
      -(this.config.bodyRadius + this.config.shoulderRadius * 0.6),
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

    // Right shoulder
    this.bodyParts.rightShoulder = new THREE.Mesh(shoulderGeometry.clone(), shoulderMaterial.clone());
    this.bodyParts.rightShoulder.position.set(
      this.config.bodyRadius + this.config.shoulderRadius * 0.6,
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

    console.log('🏗️ [EnemyHumanoid] Created more spherical shoulders with natural positioning');
  }

  private createArms(): void {
    const armGeometry = new THREE.CylinderGeometry(
      this.config.armRadius * 0.8,
      this.config.armRadius,
      this.config.armLength,
      12
    );
    const armMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 25
    });

    // Left arm (weapon arm)
    this.bodyParts.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.bodyParts.leftArm.position.set(
      -(this.config.bodyRadius + this.config.armRadius + 0.1),
      this.metrics.positions.shoulderHeight - this.config.armLength / 2,
      0
    );
    this.bodyParts.leftArm.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.arms.left.x,
      this.metrics.neutralPoses.arms.left.y,
      this.metrics.neutralPoses.arms.left.z
    ));
    this.bodyParts.leftArm.castShadow = true;
    this.bodyParts.leftArm.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftArm);

    // Right arm
    this.bodyParts.rightArm = new THREE.Mesh(armGeometry.clone(), armMaterial.clone());
    this.bodyParts.rightArm.position.set(
      this.config.bodyRadius + this.config.armRadius + 0.1,
      this.metrics.positions.shoulderHeight - this.config.armLength / 2,
      0
    );
    this.bodyParts.rightArm.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.arms.right.x,
      this.metrics.neutralPoses.arms.right.y,
      this.metrics.neutralPoses.arms.right.z
    ));
    this.bodyParts.rightArm.castShadow = true;
    this.bodyParts.rightArm.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightArm);

    // Create elbows and wrists
    this.createElbowsAndWrists();
  }

  private createElbowsAndWrists(): void {
    const elbowGeometry = new THREE.SphereGeometry(this.config.armRadius * 0.7, 12, 8);
    const wristGeometry = new THREE.SphereGeometry(this.config.armRadius * 0.6, 12, 8);
    const jointMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });

    // Left elbow
    this.bodyParts.leftElbow = new THREE.Mesh(elbowGeometry, jointMaterial);
    this.bodyParts.leftElbow.position.set(
      -(this.config.bodyRadius + this.config.armRadius + 0.1),
      this.metrics.positions.shoulderHeight - this.config.armLength,
      0
    );
    this.bodyParts.leftElbow.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.elbows.left.x,
      this.metrics.neutralPoses.elbows.left.y,
      this.metrics.neutralPoses.elbows.left.z
    ));
    this.bodyParts.leftElbow.castShadow = true;
    this.mesh.add(this.bodyParts.leftElbow);

    // Right elbow
    this.bodyParts.rightElbow = new THREE.Mesh(elbowGeometry.clone(), jointMaterial.clone());
    this.bodyParts.rightElbow.position.set(
      this.config.bodyRadius + this.config.armRadius + 0.1,
      this.metrics.positions.shoulderHeight - this.config.armLength,
      0
    );
    this.bodyParts.rightElbow.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.elbows.right.x,
      this.metrics.neutralPoses.elbows.right.y,
      this.metrics.neutralPoses.elbows.right.z
    ));
    this.bodyParts.rightElbow.castShadow = true;
    this.mesh.add(this.bodyParts.rightElbow);

    // Left wrist
    this.bodyParts.leftWrist = new THREE.Mesh(wristGeometry, jointMaterial.clone());
    this.bodyParts.leftWrist.position.set(
      -(this.config.bodyRadius + this.config.armRadius + 0.1),
      this.metrics.positions.shoulderHeight - this.config.armLength * 1.5,
      0
    );
    this.bodyParts.leftWrist.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.wrists.left.x,
      this.metrics.neutralPoses.wrists.left.y,
      this.metrics.neutralPoses.wrists.left.z
    ));
    this.bodyParts.leftWrist.castShadow = true;
    this.mesh.add(this.bodyParts.leftWrist);

    // Right wrist
    this.bodyParts.rightWrist = new THREE.Mesh(wristGeometry.clone(), jointMaterial.clone());
    this.bodyParts.rightWrist.position.set(
      this.config.bodyRadius + this.config.armRadius + 0.1,
      this.metrics.positions.shoulderHeight - this.config.armLength * 1.5,
      0
    );
    this.bodyParts.rightWrist.rotation.copy(new THREE.Euler(
      this.metrics.neutralPoses.wrists.right.x,
      this.metrics.neutralPoses.wrists.right.y,
      this.metrics.neutralPoses.wrists.right.z
    ));
    this.bodyParts.rightWrist.castShadow = true;
    this.mesh.add(this.bodyParts.rightWrist);
  }

  private createLegs(): void {
    const legGeometry = new THREE.CylinderGeometry(
      this.config.legRadius * 0.8,
      this.config.legRadius,
      this.config.legLength,
      12
    );
    const legMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.clothing,
      shininess: 25
    });

    // Left leg
    this.bodyParts.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.bodyParts.leftLeg.position.set(
      -this.config.bodyRadius * 0.5,
      this.config.legLength / 2,
      0
    );
    this.bodyParts.leftLeg.castShadow = true;
    this.bodyParts.leftLeg.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftLeg);

    // Right leg
    this.bodyParts.rightLeg = new THREE.Mesh(legGeometry.clone(), legMaterial.clone());
    this.bodyParts.rightLeg.position.set(
      this.config.bodyRadius * 0.5,
      this.config.legLength / 2,
      0
    );
    this.bodyParts.rightLeg.castShadow = true;
    this.bodyParts.rightLeg.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightLeg);

    // Create knees
    const kneeGeometry = new THREE.SphereGeometry(this.config.legRadius * 0.8, 12, 8);
    const kneeMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.skin,
      shininess: 20
    });

    // Left knee
    this.bodyParts.leftKnee = new THREE.Mesh(kneeGeometry, kneeMaterial);
    this.bodyParts.leftKnee.position.set(
      -this.config.bodyRadius * 0.5,
      0,
      0
    );
    this.bodyParts.leftKnee.castShadow = true;
    this.mesh.add(this.bodyParts.leftKnee);

    // Right knee
    this.bodyParts.rightKnee = new THREE.Mesh(kneeGeometry.clone(), kneeMaterial.clone());
    this.bodyParts.rightKnee.position.set(
      this.config.bodyRadius * 0.5,
      0,
      0
    );
    this.bodyParts.rightKnee.castShadow = true;
    this.mesh.add(this.bodyParts.rightKnee);
  }

  private createWeapon(): void {
    this.bodyParts.weapon = new THREE.Group();

    const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.1, 1.2, 12);
    const shaftMaterial = new THREE.MeshPhongMaterial({
      color: 0x5D4037,
      shininess: 40
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 0.6;
    shaft.castShadow = true;
    this.bodyParts.weapon.add(shaft);

    const axeHeadGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.15);
    const axeHeadMaterial = new THREE.MeshPhongMaterial({
      color: this.config.colors.metal,
      shininess: 80,
      specular: 0x666666
    });
    const axeHead = new THREE.Mesh(axeHeadGeometry, axeHeadMaterial);
    axeHead.position.set(0.3, 1.0, 0);
    axeHead.rotation.z = Math.PI / 2;
    axeHead.castShadow = true;
    this.bodyParts.weapon.add(axeHead);

    this.bodyParts.weapon.position.set(
      -(this.config.bodyRadius + this.config.armRadius + 0.3),
      this.metrics.positions.shoulderHeight - this.config.armLength * 1.2,
      0
    );
    this.bodyParts.weapon.rotation.z = -0.3;
    this.mesh.add(this.bodyParts.weapon);
  }

  private addFacialFeatures(): void {
    if (!this.bodyParts.head) return;

    const eyeGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 1,
      emissive: 0xFF0000,
      emissiveIntensity: 0.3
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, this.metrics.positions.headY + 0.05, this.config.headRadius * 0.8);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.15, this.metrics.positions.headY + 0.05, this.config.headRadius * 0.8);
    this.mesh.add(rightEye);

    const tuskGeometry = new THREE.ConeGeometry(0.05, 0.25, 8);
    const tuskMaterial = new THREE.MeshPhongMaterial({
      color: 0xfffacd,
      shininess: 60
    });

    const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    leftTusk.position.set(-0.15, this.metrics.positions.headY - 0.1, this.config.headRadius * 0.8);
    leftTusk.rotation.x = Math.PI;
    leftTusk.castShadow = true;
    this.mesh.add(leftTusk);

    const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
    rightTusk.position.set(0.15, this.metrics.positions.headY - 0.1, this.config.headRadius * 0.8);
    rightTusk.rotation.x = Math.PI;
    rightTusk.castShadow = true;
    this.mesh.add(rightTusk);
  }

  // Public methods for game integration
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) return;

    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    const isMoving = distanceToPlayer > this.damageRange && distanceToPlayer <= this.attackRange;
    const movementSpeed = isMoving ? this.speed : 0;

    // Update animation system
    this.animationSystem.updateWalkAnimation(deltaTime, isMoving, movementSpeed);

    // Handle attack logic
    const now = Date.now();
    if (distanceToPlayer <= this.damageRange && now - this.lastAttackTime > this.attackCooldown) {
      this.animationSystem.startAttackAnimation();
      this.lastAttackTime = now;
    }

    // Update attack animation
    this.animationSystem.updateAttackAnimation(deltaTime);
  }

  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) return;

    this.health -= damage;
    this.isHit = true;
    this.hitTime = Date.now();

    if (this.health <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.deathTime = Date.now();
  }

  // Getter methods
  public getBodyParts(): EnemyBodyParts {
    return this.bodyParts;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getIsDead(): boolean {
    return this.isDead;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getGoldReward(): number {
    return this.goldReward;
  }

  public getExperienceReward(): number {
    return this.experienceReward;
  }

  public getDistanceFromPlayer(playerPosition: THREE.Vector3): number {
    return this.mesh.position.distanceTo(playerPosition);
  }

  public isInRange(playerPosition: THREE.Vector3, range: number): boolean {
    return this.getDistanceFromPlayer(playerPosition) <= range;
  }

  public isDeadFor(time: number): boolean {
    if (!this.isDead) return false;
    return Date.now() - this.deathTime > time;
  }

  public shouldCleanup(maxDistance: number, playerPosition: THREE.Vector3): boolean {
    if (this.isDead && this.isDeadFor(30000)) return true;
    if (this.getDistanceFromPlayer(playerPosition) > maxDistance) return true;
    return false;
  }

  public getAnimationSystem(): EnemyAnimationSystem {
    return this.animationSystem;
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
