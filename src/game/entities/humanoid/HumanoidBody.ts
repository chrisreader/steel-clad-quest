
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { HumanoidBodyMetrics, HumanoidType, HumanoidBodyMetricsCalculator } from './HumanoidBodyMetrics';

export interface HumanoidBodyParts {
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

export interface HumanoidBodyResult {
  group: THREE.Group;
  bodyParts: HumanoidBodyParts;
  metrics: HumanoidBodyMetrics;
}

export class HumanoidBodyBuilder {
  public static createHumanoidBody(
    type: HumanoidType,
    position: THREE.Vector3,
    features: HumanoidFeatures
  ): HumanoidBodyResult {
    const metrics = HumanoidBodyMetricsCalculator.calculateMetrics(type);
    const humanoidGroup = new THREE.Group();
    const { scale, positions, colors } = metrics;

    // Create textures
    const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
    const metalTexture = TextureGenerator.createMetalTexture(0x444444);

    // === LEGS ===
    const leftLegGeometry = new THREE.CylinderGeometry(
      scale.leg.radius[0], scale.leg.radius[1], scale.leg.length, 16
    );
    const leftLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    leftLeg.position.set(-scale.body.radius * 0.4, positions.thighCenterY, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    humanoidGroup.add(leftLeg);

    const rightLegGeometry = new THREE.CylinderGeometry(
      scale.leg.radius[0], scale.leg.radius[1], scale.leg.length, 16
    );
    const rightLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    rightLeg.position.set(scale.body.radius * 0.4, positions.thighCenterY, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    humanoidGroup.add(rightLeg);

    // === BODY ===
    const bodyGeometry = new THREE.CylinderGeometry(
      scale.body.radius, scale.body.radius * 1.15, scale.body.height, 16
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: colors.skin,
      shininess: 25,
      specular: 0x333333
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = positions.bodyY;
    body.castShadow = true;
    body.receiveShadow = true;
    humanoidGroup.add(body);

    // === HEAD ===
    const headGeometry = new THREE.SphereGeometry(scale.head.radius, 20, 16);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: colors.muscle,
      shininess: 30,
      specular: 0x222222
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = positions.headY;
    head.castShadow = true;
    head.receiveShadow = true;
    humanoidGroup.add(head);

    // === FACIAL FEATURES ===
    if (features.hasEyes && features.eyeConfig) {
      this.addEyes(humanoidGroup, positions, scale, features.eyeConfig);
    }

    if (features.hasTusks && features.tuskConfig) {
      this.addTusks(humanoidGroup, positions, scale, features.tuskConfig);
    }

    // === ARMS WITH CORRECT PIVOT POINTS ===
    const leftArmGeometry = new THREE.CylinderGeometry(
      scale.arm.radius[0], scale.arm.radius[1], scale.arm.length, 16
    );
    leftArmGeometry.translate(0, -scale.arm.length * 0.5, 0);
    const leftArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    leftArm.position.set(-(scale.body.radius + 0.1), positions.shoulderHeight, 0);
    leftArm.rotation.set(
      metrics.neutralPoses.arms.left.x,
      metrics.neutralPoses.arms.left.y,
      metrics.neutralPoses.arms.left.z
    );
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    humanoidGroup.add(leftArm);

    const rightArmGeometry = new THREE.CylinderGeometry(
      scale.arm.radius[0], scale.arm.radius[1], scale.arm.length, 16
    );
    rightArmGeometry.translate(0, -scale.arm.length * 0.5, 0);
    const rightArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    rightArm.position.set(scale.body.radius + 0.1, positions.shoulderHeight, 0);
    rightArm.rotation.set(
      metrics.neutralPoses.arms.right.x,
      metrics.neutralPoses.arms.right.y,
      metrics.neutralPoses.arms.right.z
    );
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    humanoidGroup.add(rightArm);

    // === FOREARMS WITH CORRECT PIVOT POINTS ===
    const leftElbowGeometry = new THREE.CylinderGeometry(
      scale.forearm.radius[0], scale.forearm.radius[1], scale.forearm.length, 16
    );
    leftElbowGeometry.translate(0, -scale.forearm.length * 0.5, 0);
    const leftElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftElbow = new THREE.Mesh(leftElbowGeometry, leftElbowMaterial);
    leftElbow.position.set(0, -scale.arm.length, 0);
    leftElbow.castShadow = true;
    leftElbow.receiveShadow = true;
    leftArm.add(leftElbow);

    const rightElbowGeometry = new THREE.CylinderGeometry(
      scale.forearm.radius[0], scale.forearm.radius[1], scale.forearm.length, 16
    );
    rightElbowGeometry.translate(0, -scale.forearm.length * 0.5, 0);
    const rightElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightElbow = new THREE.Mesh(rightElbowGeometry, rightElbowMaterial);
    rightElbow.position.set(0, -scale.arm.length, 0);
    rightElbow.castShadow = true;
    rightElbow.receiveShadow = true;
    rightArm.add(rightElbow);

    // === HANDS ===
    const leftWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const leftWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const leftWrist = new THREE.Mesh(leftWristGeometry, leftWristMaterial);
    leftWrist.position.set(0, -scale.forearm.length, 0);
    leftWrist.castShadow = true;
    leftWrist.receiveShadow = true;
    leftElbow.add(leftWrist);

    const rightWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const rightWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const rightWrist = new THREE.Mesh(rightWristGeometry, rightWristMaterial);
    rightWrist.position.set(0, -scale.forearm.length, 0);
    rightWrist.castShadow = true;
    rightWrist.receiveShadow = true;
    rightElbow.add(rightWrist);

    // === SHINS ===
    const shinRelativeY = (positions.thighCenterY - scale.leg.length / 2) - scale.shin.length / 2 - positions.thighCenterY;

    const leftKneeGeometry = new THREE.CylinderGeometry(
      scale.shin.radius[0], scale.shin.radius[1], scale.shin.length, 16
    );
    const leftKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftKnee = new THREE.Mesh(leftKneeGeometry, leftKneeMaterial);
    leftKnee.position.set(0, shinRelativeY, 0);
    leftKnee.castShadow = true;
    leftKnee.receiveShadow = true;
    leftLeg.add(leftKnee);

    const rightKneeGeometry = new THREE.CylinderGeometry(
      scale.shin.radius[0], scale.shin.radius[1], scale.shin.length, 16
    );
    const rightKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightKnee = new THREE.Mesh(rightKneeGeometry, rightKneeMaterial);
    rightKnee.position.set(0, shinRelativeY, 0);
    rightKnee.castShadow = true;
    rightKnee.receiveShadow = true;
    rightLeg.add(rightKnee);

    // === WEAPON ===
    let weapon: THREE.Group | undefined;
    if (features.hasWeapon) {
      weapon = this.createWeapon(type, woodTexture, metalTexture);
      weapon.position.set(0, 0.1, 0);
      weapon.rotation.x = Math.PI / 2 + 0.2;
      leftWrist.add(weapon);
    }

    // === HITBOX ===
    const hitBoxGeometry = new THREE.BoxGeometry(1.8, 2.2, 1.8);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = positions.bodyY;
    humanoidGroup.add(hitBox);

    // === POSITIONING ===
    humanoidGroup.position.copy(position);
    humanoidGroup.castShadow = true;

    const bodyParts: HumanoidBodyParts = {
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

    console.log(`🗡️ [HumanoidBodyBuilder] Created ${type} humanoid with standardized body structure`);

    return { group: humanoidGroup, bodyParts, metrics };
  }

  private static addEyes(
    group: THREE.Group,
    positions: any,
    scale: any,
    eyeConfig: any
  ): void {
    const eyeGeometry = new THREE.SphereGeometry(eyeConfig.radius, 12, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: eyeConfig.color,
      transparent: true,
      opacity: 1,
      emissive: eyeConfig.color,
      emissiveIntensity: eyeConfig.emissiveIntensity
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(
      -eyeConfig.offsetX,
      positions.headY + eyeConfig.offsetY,
      scale.head.radius * eyeConfig.offsetZ
    );

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(
      eyeConfig.offsetX,
      positions.headY + eyeConfig.offsetY,
      scale.head.radius * eyeConfig.offsetZ
    );

    group.add(leftEye);
    group.add(rightEye);
  }

  private static addTusks(
    group: THREE.Group,
    positions: any,
    scale: any,
    tuskConfig: any
  ): void {
    const tuskGeometry = new THREE.ConeGeometry(
      tuskConfig.radius, tuskConfig.height, 8
    );
    const tuskMaterial = new THREE.MeshPhongMaterial({
      color: tuskConfig.color,
      shininess: 60
    });

    const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    leftTusk.position.set(
      -tuskConfig.offsetX,
      positions.headY + tuskConfig.offsetY,
      scale.head.radius * tuskConfig.offsetZ
    );
    leftTusk.rotation.x = Math.PI;
    leftTusk.castShadow = true;

    const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
    rightTusk.position.set(
      tuskConfig.offsetX,
      positions.headY + tuskConfig.offsetY,
      scale.head.radius * tuskConfig.offsetZ
    );
    rightTusk.rotation.x = Math.PI;
    rightTusk.castShadow = true;

    group.add(leftTusk);
    group.add(rightTusk);
  }

  private static createWeapon(type: HumanoidType, woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    const weapon = new THREE.Group();

    if (type === HumanoidType.ORC) {
      // Large battle axe for orcs
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

    } else {
      // Smaller weapon for goblins/humans
      const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.8, 12);
      const shaftMaterial = new THREE.MeshPhongMaterial({
        color: 0x5D4037,
        shininess: 40,
        map: woodTexture
      });
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.position.y = 0.4;
      shaft.castShadow = true;
      weapon.add(shaft);

      // Spikes or blade depending on type
      const spikeGeometry = new THREE.ConeGeometry(0.025, 0.12, 8);
      const spikeMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        shininess: 80,
        specular: 0x666666,
        map: metalTexture
      });

      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial.clone());
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(
          Math.cos(angle) * 0.09,
          0.7,
          Math.sin(angle) * 0.09
        );
        spike.rotation.x = Math.PI / 2;
        spike.rotation.z = angle;
        spike.castShadow = true;
        weapon.add(spike);
      }
    }

    return weapon;
  }
}
