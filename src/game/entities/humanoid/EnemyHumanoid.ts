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
    
    console.log(`🗡️ [EnemyHumanoid] Created ${config.type} humanoid enemy with enhanced animations`);
  }

  protected createHumanoidBody(position: THREE.Vector3): EnemyBodyResult {
    const humanoidGroup = new THREE.Group();
    const { bodyScale, colors, features } = this.config;
    
    // Calculate positions based on body scale
    const legTopY = 1.4;
    const thighCenterY = legTopY - bodyScale.leg.length / 2;
    const bodyY = legTopY + bodyScale.body.height / 2;
    const bodyTopY = bodyY + bodyScale.body.height / 2;
    const headY = bodyTopY + bodyScale.head.radius;
    const shoulderHeight = bodyTopY;

    // Create textures
    const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
    const metalTexture = TextureGenerator.createMetalTexture(0x444444);

    // === LEGS ===
    const leftLegGeometry = new THREE.CylinderGeometry(
      bodyScale.leg.radius[0], bodyScale.leg.radius[1], bodyScale.leg.length, 16
    );
    const leftLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    leftLeg.position.set(-bodyScale.body.radius * 0.4, thighCenterY, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    humanoidGroup.add(leftLeg);

    const rightLegGeometry = new THREE.CylinderGeometry(
      bodyScale.leg.radius[0], bodyScale.leg.radius[1], bodyScale.leg.length, 16
    );
    const rightLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    rightLeg.position.set(bodyScale.body.radius * 0.4, thighCenterY, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    humanoidGroup.add(rightLeg);

    // === BODY ===
    const bodyGeometry = new THREE.CylinderGeometry(
      bodyScale.body.radius, bodyScale.body.radius * 1.15, bodyScale.body.height, 16
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: colors.skin,
      shininess: 25,
      specular: 0x333333
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = bodyY;
    body.castShadow = true;
    body.receiveShadow = true;
    humanoidGroup.add(body);

    // === HEAD ===
    const headGeometry = new THREE.SphereGeometry(bodyScale.head.radius, 20, 16);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: colors.muscle,
      shininess: 30,
      specular: 0x222222
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = headY;
    head.castShadow = true;
    head.receiveShadow = true;
    humanoidGroup.add(head);

    // === FACIAL FEATURES ===
    if (features.hasEyes && features.eyeConfig) {
      const eyeGeometry = new THREE.SphereGeometry(features.eyeConfig.radius, 12, 8);
      const eyeMaterial = new THREE.MeshPhongMaterial({
        color: features.eyeConfig.color,
        transparent: true,
        opacity: 1,
        emissive: features.eyeConfig.color,
        emissiveIntensity: features.eyeConfig.emissiveIntensity
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

      humanoidGroup.add(leftEye);
      humanoidGroup.add(rightEye);
    }

    if (features.hasTusks && features.tuskConfig) {
      const tuskGeometry = new THREE.ConeGeometry(
        features.tuskConfig.radius, features.tuskConfig.height, 8
      );
      const tuskMaterial = new THREE.MeshPhongMaterial({
        color: features.tuskConfig.color,
        shininess: 60
      });

      const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
      leftTusk.position.set(
        -features.tuskConfig.offsetX,
        headY + features.tuskConfig.offsetY,
        bodyScale.head.radius * features.tuskConfig.offsetZ
      );
      leftTusk.rotation.x = Math.PI;
      leftTusk.castShadow = true;

      const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
      rightTusk.position.set(
        features.tuskConfig.offsetX,
        headY + features.tuskConfig.offsetY,
        bodyScale.head.radius * features.tuskConfig.offsetZ
      );
      rightTusk.rotation.x = Math.PI;
      rightTusk.castShadow = true;

      humanoidGroup.add(leftTusk);
      humanoidGroup.add(rightTusk);
    }

    // === ARMS ===
    const leftArmGeometry = new THREE.CylinderGeometry(
      bodyScale.arm.radius[0], bodyScale.arm.radius[1], bodyScale.arm.length, 16
    );
    leftArmGeometry.translate(0, -bodyScale.arm.length * 0.5, 0);
    const leftArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    leftArm.position.set(-(bodyScale.body.radius + 0.1), shoulderHeight, 0);
    leftArm.rotation.set(-0.393, 0, -0.3);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    humanoidGroup.add(leftArm);

    const rightArmGeometry = new THREE.CylinderGeometry(
      bodyScale.arm.radius[0], bodyScale.arm.radius[1], bodyScale.arm.length, 16
    );
    rightArmGeometry.translate(0, -bodyScale.arm.length * 0.5, 0);
    const rightArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    rightArm.position.set(bodyScale.body.radius + 0.1, shoulderHeight, 0);
    rightArm.rotation.set(-0.393, 0, 0.3);
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    humanoidGroup.add(rightArm);

    // === FOREARMS ===
    const leftElbowGeometry = new THREE.CylinderGeometry(
      bodyScale.forearm.radius[0], bodyScale.forearm.radius[1], bodyScale.forearm.length, 16
    );
    leftElbowGeometry.translate(0, -bodyScale.forearm.length * 0.5, 0);
    const leftElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftElbow = new THREE.Mesh(leftElbowGeometry, leftElbowMaterial);
    leftElbow.position.set(0, -bodyScale.arm.length, 0);
    leftElbow.castShadow = true;
    leftElbow.receiveShadow = true;
    leftArm.add(leftElbow);

    const rightElbowGeometry = new THREE.CylinderGeometry(
      bodyScale.forearm.radius[0], bodyScale.forearm.radius[1], bodyScale.forearm.length, 16
    );
    rightElbowGeometry.translate(0, -bodyScale.forearm.length * 0.5, 0);
    const rightElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightElbow = new THREE.Mesh(rightElbowGeometry, rightElbowMaterial);
    rightElbow.position.set(0, -bodyScale.arm.length, 0);
    rightElbow.castShadow = true;
    rightElbow.receiveShadow = true;
    rightArm.add(rightElbow);

    // === HANDS ===
    const leftWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const leftWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const leftWrist = new THREE.Mesh(leftWristGeometry, leftWristMaterial);
    leftWrist.position.set(0, -bodyScale.forearm.length, 0);
    leftWrist.castShadow = true;
    leftWrist.receiveShadow = true;
    leftElbow.add(leftWrist);

    const rightWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const rightWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const rightWrist = new THREE.Mesh(rightWristGeometry, rightWristMaterial);
    rightWrist.position.set(0, -bodyScale.forearm.length, 0);
    rightWrist.castShadow = true;
    rightWrist.receiveShadow = true;
    rightElbow.add(rightWrist);

    // === SHINS ===
    // FIXED: Correct shin positioning to eliminate gap between upper and lower leg
    const shinRelativeY = -bodyScale.leg.length / 2;

    const leftKneeGeometry = new THREE.CylinderGeometry(
      bodyScale.shin.radius[0], bodyScale.shin.radius[1], bodyScale.shin.length, 16
    );
    // FIXED: Translate geometry to move pivot point to top (knee joint)
    leftKneeGeometry.translate(0, -bodyScale.shin.length * 0.5, 0);
    const leftKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftKnee = new THREE.Mesh(leftKneeGeometry, leftKneeMaterial);
    leftKnee.position.set(0, shinRelativeY, 0);
    leftKnee.castShadow = true;
    leftKnee.receiveShadow = true;
    leftLeg.add(leftKnee);

    const rightKneeGeometry = new THREE.CylinderGeometry(
      bodyScale.shin.radius[0], bodyScale.shin.radius[1], bodyScale.shin.length, 16
    );
    // FIXED: Translate geometry to move pivot point to top (knee joint)
    rightKneeGeometry.translate(0, -bodyScale.shin.length * 0.5, 0);
    const rightKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightKnee = new THREE.Mesh(rightKneeGeometry, rightKneeMaterial);
    rightKnee.position.set(0, shinRelativeY, 0);
    rightKnee.castShadow = true;
    rightKnee.receiveShadow = true;
    rightLeg.add(rightKnee);

    // === WEAPON ===
    let weapon: THREE.Group | undefined;
    if (features.hasWeapon) {
      weapon = this.createWeapon(woodTexture, metalTexture);
      weapon.position.set(0, 0.1, 0);
      weapon.rotation.x = Math.PI / 2 + 0.2; // Back to approximately 111.5°
      leftWrist.add(weapon);
    }

    // === HITBOX ===
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
