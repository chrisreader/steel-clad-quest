import * as THREE from 'three';
import { Enemy, EnemyState } from '../Enemy';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TextureGenerator } from '../../utils';
import {
  BodyScale,
  BodyPositions,
  NeutralPoses,
  AnimationMetrics
} from '../EnemyBodyMetrics';

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
  features: HumanoidFeatures;
}

export interface HumanoidFeatures {
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
}

export class EnemyHumanoid extends Enemy {
  protected config: HumanoidConfig;
  protected bodyParts: {
    body: THREE.Mesh | undefined;
    head: THREE.Group | undefined;
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
  } = {
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
    hitBox: undefined
  };
  protected bodyGroup: THREE.Group;
  protected bodyScale: BodyScale;
  protected bodyPositions: BodyPositions;
  protected neutralPoses: NeutralPoses;
  protected animationMetrics: AnimationMetrics;
  protected colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
  protected features: HumanoidFeatures;
  private currentWalkCyclePhase: number = 0;
  private walkCycleSpeed: number = 0.04;
  private armSwingIntensity: number = 0.4;
  private legSwingIntensity: number = 0.6;
  private shoulderMovement: number = 0.3;
  private elbowMovement: number = 0.5;
  private breathingIntensity: number = 0.02;
  private breathingOffset: number = 0;
  private isAttacking: boolean = false;
  private attackStartTime: number = 0;
  private attackDuration: number = 0.5;
  private originalArmRotation: { left: THREE.Euler; right: THREE.Euler } = {
    left: new THREE.Euler(),
    right: new THREE.Euler()
  };

  constructor(
    scene: THREE.Scene,
    config: HumanoidConfig,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(
      scene,
      config.type,
      config.health,
      config.maxHealth,
      config.speed,
      config.damage,
      config.goldReward,
      config.experienceReward,
      config.attackRange,
      config.damageRange,
      config.attackCooldown,
      config.points,
      config.knockbackResistance,
      effectsManager,
      audioManager
    );

    this.config = config;
    this.bodyScale = config.bodyScale;
    this.colors = config.colors;
    this.features = config.features;

    // Calculate body positions based on scale
    this.bodyPositions = {
      legTopY: this.bodyScale.leg.length,
      thighCenterY: this.bodyScale.leg.length / 2,
      bodyY: this.bodyScale.leg.length + this.bodyScale.body.height / 2,
      bodyTopY: this.bodyScale.leg.length + this.bodyScale.body.height,
      headY:
        this.bodyScale.leg.length +
        this.bodyScale.body.height +
        this.bodyScale.head.radius,
      shoulderHeight:
        this.bodyScale.leg.length + (this.bodyScale.body.height * 4) / 5
    };

    // Define neutral poses
    this.neutralPoses = {
      arms: {
        left: { x: 0, y: 0, z: 0 },
        right: { x: 0, y: 0, z: 0 }
      },
      elbows: {
        left: { x: 0, y: 0, z: 0 },
        right: { x: 0, y: 0, z: 0 }
      },
      wrists: {
        left: { x: 0, y: 0, z: 0 },
        right: { x: 0, y: 0, z: 0 }
      }
    };

    // Define animation metrics
    this.animationMetrics = {
      walkCycleSpeed: 0.04,
      armSwingIntensity: 0.4,
      legSwingIntensity: 0.6,
      shoulderMovement: 0.3,
      elbowMovement: 0.5,
      breathingIntensity: 0.02
    };

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.copy(position);
    this.scene.add(this.bodyGroup);

    this.createBody();
    this.updateHitBox();
    this.add(this.bodyGroup);
  }

  private createBody(): void {
    const skinTexture = TextureGenerator.generateTexture(
      this.colors.skin,
      64,
      64
    );
    const muscleTexture = TextureGenerator.generateTexture(
      this.colors.muscle,
      64,
      64
    );
    const woodTexture = TextureGenerator.generateWoodTexture();
    const metalTexture = TextureGenerator.generateMetalTexture();

    const skinMaterial = new THREE.MeshPhongMaterial({
      map: skinTexture,
      shininess: 50
    });
    const muscleMaterial = new THREE.MeshPhongMaterial({
      map: muscleTexture,
      shininess: 50
    });

    // Create body parts
    this.bodyParts.body = this.createBodyPart(
      this.bodyScale.body.radius,
      this.bodyScale.body.height,
      skinMaterial.clone()
    );
    this.bodyParts.body.position.y = this.bodyPositions.bodyY;
    this.bodyGroup.add(this.bodyParts.body);

    this.bodyParts.head = this.createHead(
      this.bodyScale,
      this.bodyPositions.headY,
      skinMaterial,
      muscleMaterial,
      this.features
    );
    this.bodyGroup.add(this.bodyParts.head);

    this.bodyParts.leftArm = this.createArm(
      this.bodyScale.arm.radius,
      this.bodyScale.arm.length,
      muscleMaterial.clone()
    );
    this.bodyParts.leftArm.position.set(
      -this.bodyScale.body.radius - this.bodyScale.arm.radius[1],
      this.bodyPositions.shoulderHeight,
      0
    );
    this.bodyParts.leftArm.rotation.x = this.neutralPoses.arms.left.x;
    this.bodyParts.leftArm.rotation.y = this.neutralPoses.arms.left.y;
    this.bodyParts.leftArm.rotation.z = this.neutralPoses.arms.left.z;
    this.bodyGroup.add(this.bodyParts.leftArm);

    this.bodyParts.rightArm = this.createArm(
      this.bodyScale.arm.radius,
      this.bodyScale.arm.length,
      muscleMaterial.clone()
    );
    this.bodyParts.rightArm.position.set(
      this.bodyScale.body.radius + this.bodyScale.arm.radius[1],
      this.bodyPositions.shoulderHeight,
      0
    );
    this.bodyParts.rightArm.rotation.x = this.neutralPoses.arms.right.x;
    this.bodyParts.rightArm.rotation.y = this.neutralPoses.arms.right.y;
    this.bodyParts.rightArm.rotation.z = this.neutralPoses.arms.right.z;
    this.bodyGroup.add(this.bodyParts.rightArm);

    this.bodyParts.leftElbow = this.createForearm(
      this.bodyScale.forearm.radius,
      this.bodyScale.forearm.length,
      skinMaterial.clone()
    );
    this.bodyParts.leftElbow.position.set(
      0,
      -this.bodyScale.arm.length,
      0
    );
    this.bodyParts.leftArm.add(this.bodyParts.leftElbow);

    this.bodyParts.rightElbow = this.createForearm(
      this.bodyScale.forearm.radius,
      this.bodyScale.forearm.length,
      skinMaterial.clone()
    );
    this.bodyParts.rightElbow.position.set(
      0,
      -this.bodyScale.arm.length,
      0
    );
    this.bodyParts.rightArm.add(this.bodyParts.rightElbow);

    this.bodyParts.leftLeg = this.createLeg(
      this.bodyScale.leg.radius,
      this.bodyScale.leg.length,
      muscleMaterial.clone()
    );
    this.bodyParts.leftLeg.position.set(
      -this.bodyScale.body.radius / 2,
      this.bodyPositions.legTopY,
      0
    );
    this.bodyGroup.add(this.bodyParts.leftLeg);

    this.bodyParts.rightLeg = this.createLeg(
      this.bodyScale.leg.radius,
      this.bodyScale.leg.length,
      muscleMaterial.clone()
    );
    this.bodyParts.rightLeg.position.set(
      this.bodyScale.body.radius / 2,
      this.bodyPositions.legTopY,
      0
    );
    this.bodyGroup.add(this.bodyParts.rightLeg);

    this.bodyParts.leftKnee = this.createShin(
      this.bodyScale.shin.radius,
      this.bodyScale.shin.length,
      skinMaterial.clone()
    );
    this.bodyParts.leftKnee.position.set(
      0,
      -this.bodyScale.leg.length,
      0
    );
    this.bodyParts.leftLeg.add(this.bodyParts.leftKnee);

    this.bodyParts.rightKnee = this.createShin(
      this.bodyScale.shin.radius,
      this.bodyScale.shin.length,
      skinMaterial.clone()
    );
    this.bodyParts.rightKnee.position.set(
      0,
      -this.bodyScale.leg.length,
      0
    );
    this.bodyParts.rightLeg.add(this.bodyParts.rightKnee);

    if (this.features.hasWeapon) {
      this.bodyParts.weapon = this.createWeapon(woodTexture, metalTexture);
      this.bodyParts.weapon.position.set(
        this.bodyScale.body.radius + this.bodyScale.arm.radius[1] + 0.5,
        this.bodyPositions.shoulderHeight - 1,
        0
      );
      this.bodyParts.weapon.rotation.z = -Math.PI / 4; // Adjust the angle as needed
      this.bodyGroup.add(this.bodyParts.weapon);
    }
  }

  private createHead(
    bodyScale: BodyScale,
    headY: number,
    skinMaterial: THREE.Material,
    muscleMaterial: THREE.Material,
    features?: HumanoidFeatures
  ): THREE.Group {
    const headGroup = new THREE.Group();

    // Skull
    const skullGeometry = new THREE.SphereGeometry(
      bodyScale.head.radius,
      32,
      32
    );
    const skull = new THREE.Mesh(skullGeometry, skinMaterial.clone());
    skull.position.set(0, headY, 0);
    skull.castShadow = true;
    headGroup.add(skull);

    // Upper Skull
    const upperSkullGeometry = new THREE.SphereGeometry(
      bodyScale.head.radius * 0.98,
      32,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const upperSkull = new THREE.Mesh(upperSkullGeometry, muscleMaterial.clone());
    upperSkull.position.set(0, headY, 0);
    upperSkull.castShadow = true;
    headGroup.add(upperSkull);

    // === NECK CONNECTION ===
    const neckGeometry = new THREE.CylinderGeometry(
      bodyScale.head.radius * 0.5,  // Top radius (connects to head)
      bodyScale.head.radius * 0.6,  // Bottom radius (connects to body)
      bodyScale.head.radius * 0.4,  // Height
      16
    );
    const neck = new THREE.Mesh(neckGeometry, muscleMaterial.clone());
    neck.position.set(0, headY - bodyScale.head.radius - 0.2, 0);
    neck.castShadow = true;
    neck.receiveShadow = true;
    headGroup.add(neck);

    // === FACIAL FEATURES ===
    if (features) {
      // Eyes
      if (features.hasEyes && features.eyeConfig) {
        const eyeGeometry = new THREE.SphereGeometry(features.eyeConfig.radius, 16, 16);
        const eyeMaterial = new THREE.MeshPhongMaterial({
          color: features.eyeConfig.color,
          emissive: features.eyeConfig.color,
          emissiveIntensity: features.eyeConfig.emissiveIntensity || 0.3
        });

        // Left eye - moved further forward
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(
          -features.eyeConfig.offsetX,
          headY + features.eyeConfig.offsetY,
          features.eyeConfig.offsetZ + 0.3  // Moved forward by 0.3 units
        );
        leftEye.castShadow = true;
        headGroup.add(leftEye);

        // Right eye - moved further forward
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
        rightEye.position.set(
          features.eyeConfig.offsetX,
          headY + features.eyeConfig.offsetY,
          features.eyeConfig.offsetZ + 0.3  // Moved forward by 0.3 units
        );
        rightEye.castShadow = true;
        headGroup.add(rightEye);
      }

      // Tusks
      if (features.hasTusks && features.tuskConfig) {
        const tuskGeometry = new THREE.ConeGeometry(
          features.tuskConfig.radius,
          features.tuskConfig.height,
          8
        );
        const tuskMaterial = new THREE.MeshPhongMaterial({
          color: features.tuskConfig.color,
          shininess: 60
        });

        // Left tusk - moved further forward
        const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
        leftTusk.position.set(
          -features.tuskConfig.offsetX,
          headY + features.tuskConfig.offsetY,
          features.tuskConfig.offsetZ + 0.25  // Moved forward by 0.25 units
        );
        leftTusk.rotation.x = Math.PI; // Point downward
        leftTusk.castShadow = true;
        headGroup.add(leftTusk);

        // Right tusk - moved further forward
        const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
        rightTusk.position.set(
          features.tuskConfig.offsetX,
          headY + features.tuskConfig.offsetY,
          features.tuskConfig.offsetZ + 0.25  // Moved forward by 0.25 units
        );
        rightTusk.rotation.x = Math.PI; // Point downward
        rightTusk.castShadow = true;
        headGroup.add(rightTusk);
      }
    }

    // Nose (simple cone)
    const noseGeometry = new THREE.ConeGeometry(
      bodyScale.head.radius * 0.2,
      bodyScale.head.radius * 0.4,
      8
    );
    const noseMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Example color
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, headY - bodyScale.head.radius * 0.2, bodyScale.head.radius * 0.7);
    nose.rotation.x = -Math.PI / 2;
    nose.castShadow = true;
    headGroup.add(nose);

    // Ears (simple flaps)
    const earGeometry = new THREE.PlaneGeometry(
      bodyScale.head.radius * 0.4,
      bodyScale.head.radius * 0.6
    );
    const earMaterial = new THREE.MeshPhongMaterial({ color: 0xC19A6B, side: THREE.DoubleSide }); // Example color
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-bodyScale.head.radius * 0.6, headY + bodyScale.head.radius * 0.1, bodyScale.head.radius * 0.1);
    leftEar.rotation.y = Math.PI / 6;
    leftEar.castShadow = true;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(bodyScale.head.radius * 0.6, headY + bodyScale.head.radius * 0.1, bodyScale.head.radius * 0.1);
    rightEar.rotation.y = -Math.PI / 6;
    rightEar.castShadow = true;
    headGroup.add(rightEar);

    return headGroup;
  }

  protected createBodyPart(
    radius: number,
    height: number,
    material: THREE.Material
  ): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    const bodyPart = new THREE.Mesh(geometry, material);
    bodyPart.castShadow = true;
    return bodyPart;
  }

  protected createArm(
    radius: [number, number],
    length: number,
    material: THREE.Material
  ): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      radius[0],
      radius[1],
      length,
      32
    );
    const arm = new THREE.Mesh(geometry, material);
    arm.castShadow = true;
    return arm;
  }

  protected createForearm(
    radius: [number, number],
    length: number,
    material: THREE.Material
  ): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      radius[0],
      radius[1],
      length,
      32
    );
    const forearm = new THREE.Mesh(geometry, material);
    forearm.castShadow = true;
    return forearm;
  }

  protected createLeg(
    radius: [number, number],
    length: number,
    material: THREE.Material
  ): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      radius[0],
      radius[1],
      length,
      32
    );
    const leg = new THREE.Mesh(geometry, material);
    leg.castShadow = true;
    return leg;
  }

  protected createShin(
    radius: [number, number],
    length: number,
    material: THREE.Material
  ): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      radius[0],
      radius[1],
      length,
      32
    );
    const shin = new THREE.Mesh(geometry, material);
    shin.castShadow = true;
    return shin;
  }

  protected createWeapon(
    woodTexture: THREE.Texture,
    metalTexture: THREE.Texture
  ): THREE.Group {
    // Override this method in subclasses to create specific weapons
    const weapon = new THREE.Group();
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 16);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a2c17,
      map: woodTexture
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = 0.5;
    handle.castShadow = true;
    weapon.add(handle);

    const bladeGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.02);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: 0x999999,
      map: metalTexture
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 1;
    blade.castShadow = true;
    weapon.add(blade);

    return weapon;
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);

    if (this.state === EnemyState.MOVING) {
      this.updateMovementAnimations(deltaTime);
    } else if (this.state === EnemyState.ATTACKING) {
      this.updateAttackAnimation(deltaTime);
    } else {
      this.updateIdleAnimation(deltaTime);
    }
  }

  private updateMovementAnimations(deltaTime: number): void {
    this.currentWalkCyclePhase +=
      deltaTime * this.animationMetrics.walkCycleSpeed;
    this.currentWalkCyclePhase %= Math.PI * 2;

    const armPhaseOffset = Math.PI / 2; // Arms are out of phase with legs

    // Leg and arm movements
    if (this.bodyParts.leftLeg && this.bodyParts.rightLeg) {
      this.bodyParts.leftLeg.rotation.x = Math.sin(this.currentWalkCyclePhase) * this.animationMetrics.legSwingIntensity;
      this.bodyParts.rightLeg.rotation.x = Math.sin(this.currentWalkCyclePhase + Math.PI) * this.animationMetrics.legSwingIntensity;
    }

    if (this.bodyParts.leftArm && this.bodyParts.rightArm) {
      this.bodyParts.leftArm.rotation.x = Math.sin(this.currentWalkCyclePhase + armPhaseOffset) * this.animationMetrics.armSwingIntensity - this.shoulderMovement;
      this.bodyParts.rightArm.rotation.x = Math.sin(this.currentWalkCyclePhase + Math.PI + armPhaseOffset) * this.animationMetrics.armSwingIntensity - this.shoulderMovement;
    }

    // Torso breathing
    this.breathingOffset = Math.sin(this.currentWalkCyclePhase * 2) * this.animationMetrics.breathingIntensity;
    if (this.bodyParts.body) {
      this.bodyParts.body.position.y = this.bodyPositions.bodyY + this.breathingOffset;
    }
  }

  private updateAttackAnimation(deltaTime: number): void {
    if (!this.bodyParts.rightArm || !this.bodyParts.weapon) return;

    const timeSinceAttack = (Date.now() - this.attackStartTime) / 1000;
    let animationProgress = timeSinceAttack / this.attackDuration;

    if (animationProgress >= 1) {
      animationProgress = 1;
      this.isAttacking = false;
    }

    // Define keyframes for the attack animation
    const startRotation = new THREE.Euler(-Math.PI / 8, 0, -Math.PI / 4);
    const endRotation = new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2);

    // Use lerp (linear interpolation) for smooth transitions
    const currentRotation = new THREE.Euler().lerpVectors(
      startRotation,
      endRotation,
      animationProgress
    );

    this.bodyParts.rightArm.rotation.x = currentRotation.x;
    this.bodyParts.rightArm.rotation.y = currentRotation.y;
    this.bodyParts.rightArm.rotation.z = currentRotation.z;

    this.bodyParts.weapon.rotation.x = currentRotation.x;
    this.bodyParts.weapon.rotation.y = currentRotation.y;
    this.bodyParts.weapon.rotation.z = currentRotation.z;
  }

  private updateIdleAnimation(deltaTime: number): void {
    this.breathingOffset = Math.sin(Date.now() / 1000) * this.animationMetrics.breathingIntensity;

    if (this.bodyParts.body) {
      this.bodyParts.body.position.y = this.bodyPositions.bodyY + this.breathingOffset;
    }
  }

  public attack(): void {
    if (this.isAttacking) return;

    this.isAttacking = true;
    this.attackStartTime = Date.now();
  }

  public override dispose(): void {
    super.dispose();

    // Dispose of all geometries and materials
    for (const key in this.bodyParts) {
      if (this.bodyParts.hasOwnProperty(key)) {
        const part = this.bodyParts[key as keyof typeof this.bodyParts];
        if (part) {
          if ((part as THREE.Mesh).geometry) {
            ((part as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
          }
          if ((part as THREE.Mesh).material) {
            if (Array.isArray((part as THREE.Mesh).material)) {
              ((part as THREE.Mesh).material as THREE.Material[]).forEach(
                (material) => material.dispose()
              );
            } else {
              ((part as THREE.Mesh).material as THREE.Material).dispose();
            }
          }
        }
      }
    }
  }
}
