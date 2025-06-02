import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { EnemyType } from '../../../types/GameTypes';

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
    body: { radius: number; height: number };
    head: { radius: number };
    arm: { radius: [number, number]; length: number };
    forearm: { radius: [number, number]; length: number };
    leg: { radius: [number, number]; length: number };
    shin: { radius: [number, number]; length: number };
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

export class EnemyHumanoid {
  protected scene: THREE.Scene;
  protected config: HumanoidConfig;
  protected group: THREE.Group;
  protected bodyParts: EnemyBodyParts;
  protected metrics: EnemyBodyMetrics;
  protected isDead: boolean = false;
  protected deathTime: number = 0;
  protected walkTime: number = 0;
  
  constructor(
    scene: THREE.Scene,
    config: HumanoidConfig,
    position: THREE.Vector3,
    effectsManager: any,
    audioManager: any
  ) {
    this.scene = scene;
    this.config = config;
    
    const bodyResult = createEnemyHumanoidBody(
      this.convertToBodyScale(config.bodyScale),
      this.createMaterials(config.colors),
      scene
    );
    
    this.group = bodyResult.group;
    this.bodyParts = bodyResult.bodyParts;
    this.metrics = bodyResult.metrics;
    
    this.group.position.copy(position);
    scene.add(this.group);
  }
  
  private convertToBodyScale(scale: any): EnemyBodyScale {
    return {
      body: scale.body,
      head: scale.head,
      arm: {
        upperRadius: scale.arm.radius[0],
        lowerRadius: scale.arm.radius[1],
        length: scale.arm.length
      },
      leg: {
        upperRadius: scale.leg.radius[0],
        lowerRadius: scale.leg.radius[1],
        length: scale.leg.length
      }
    };
  }
  
  private createMaterials(colors: any): EnemyBodyMaterials {
    return {
      primary: new THREE.MeshPhongMaterial({ color: colors.skin }),
      accent: new THREE.MeshPhongMaterial({ color: colors.muscle })
    };
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Basic update logic - can be overridden by subclasses
  }
  
  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    // Basic damage logic - can be overridden by subclasses
  }
  
  public getMesh(): THREE.Group {
    return this.group;
  }
  
  public getBodyParts(): EnemyBodyParts {
    return this.bodyParts;
  }
  
  public getIsDead(): boolean {
    return this.isDead;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }
  
  public getGoldReward(): number {
    return this.config.goldReward;
  }
  
  public getExperienceReward(): number {
    return this.config.experienceReward;
  }
  
  public isInRange(playerPosition: THREE.Vector3, range: number): boolean {
    return this.group.position.distanceTo(playerPosition) <= range;
  }
  
  public isDeadFor(time: number): boolean {
    if (!this.isDead) return false;
    return Date.now() - this.deathTime > time;
  }
  
  public getDistanceFromPlayer(playerPosition: THREE.Vector3): number {
    return this.group.position.distanceTo(playerPosition);
  }
  
  public shouldCleanup(maxDistance: number, playerPosition: THREE.Vector3): boolean {
    if (this.isDead && this.isDeadFor(30000)) return true;
    if (this.getDistanceFromPlayer(playerPosition) > maxDistance) return true;
    return false;
  }
  
  public dispose(): void {
    this.scene.remove(this.group);
    // Cleanup geometry and materials
    this.group.traverse((child) => {
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
  
  public getAnimationSystem(): any {
    return null; // Can be overridden by subclasses
  }
  
  protected createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    // Base weapon creation - should be overridden by subclasses
    return new THREE.Group();
  }
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

  // === CURVED SHOULDER JOINTS ===
  const shoulderJointGeometry = new THREE.SphereGeometry(0.25, 24, 20);
  
  // Apply custom deformation to create more natural shoulder curve
  const shoulderPositions = shoulderJointGeometry.attributes.position.array as Float32Array;
  for (let i = 0; i < shoulderPositions.length; i += 3) {
    const x = shoulderPositions[i];
    const y = shoulderPositions[i + 1];
    const z = shoulderPositions[i + 2];
    
    // Create more natural shoulder shape with better outer curve
    const distanceFromCenter = Math.abs(x);
    
    // More curved/rounded on the outside
    if (x > 0) { // Right side (positive X)
      shoulderPositions[i] = x * (1.0 + distanceFromCenter * 0.3); // Expand outward
    } else { // Left side (negative X) 
      shoulderPositions[i] = x * (1.0 + distanceFromCenter * 0.3); // Expand outward
    }
    
    // Taper toward center for trap connection
    const centerTaper = 1.0 - (distanceFromCenter * 0.15);
    shoulderPositions[i + 1] = y * 0.85 * centerTaper; // Slightly flatten and taper vertically
    shoulderPositions[i + 2] = z * 0.9; // Slightly compress depth
  }
  shoulderJointGeometry.attributes.position.needsUpdate = true;
  
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
  const trapeziusGeometry = new THREE.PlaneGeometry(0.6, 0.4);
  const leftTrapezius = new THREE.Mesh(trapeziusGeometry, accentMaterial.clone());
  leftTrapezius.position.set(-(bodyScale.body.radius + 0.25), shoulderHeight + 0.15, -0.1);
  leftTrapezius.rotation.y = THREE.MathUtils.degToRad(-25);
  leftTrapezius.rotation.x = THREE.MathUtils.degToRad(-10);
  leftTrapezius.castShadow = true;
  leftTrapezius.receiveShadow = true;
  humanoidGroup.add(leftTrapezius);

  const rightTrapezius = new THREE.Mesh(trapeziusGeometry.clone(), accentMaterial.clone());
  rightTrapezius.position.set(bodyScale.body.radius + 0.25, shoulderHeight + 0.15, -0.1);
  rightTrapezius.rotation.y = THREE.MathUtils.degToRad(25);
  rightTrapezius.rotation.x = THREE.MathUtils.degToRad(-10);
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
