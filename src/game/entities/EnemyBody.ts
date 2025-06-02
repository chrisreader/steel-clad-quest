
import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { EnemyType } from '../../types/GameTypes';
import { ENEMY_CONFIGURATIONS } from './EnemyBodyConfig';
import { EnemyBodyMetrics } from './EnemyBodyMetrics';

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

export interface EnemyBodyResult {
  group: THREE.Group;
  bodyParts: EnemyBodyParts;
  metrics: EnemyBodyMetrics;
}

export class EnemyBodyBuilder {
  public static createRealisticBody(enemyType: EnemyType, position: THREE.Vector3): EnemyBodyResult {
    const config = ENEMY_CONFIGURATIONS[enemyType];
    const metrics = new EnemyBodyMetrics(config);
    const bodyGroup = new THREE.Group();
    
    console.log(`🏗️ [EnemyBodyBuilder] Creating ${enemyType} with data-driven configuration`);
    
    // Create body parts using metrics
    const bodyParts = this.createBodyParts(bodyGroup, metrics);
    
    // Position the entire group
    bodyGroup.position.copy(position);
    bodyGroup.castShadow = true;
    
    console.log(`🏗️ [EnemyBodyBuilder] ${enemyType} body created - Center Y: ${metrics.getBodyCenterY()}`);
    
    return { group: bodyGroup, bodyParts, metrics };
  }
  
  private static createBodyParts(bodyGroup: THREE.Group, metrics: EnemyBodyMetrics): EnemyBodyParts {
    const config = metrics.getConfig();
    const scale = metrics.getScale();
    const colors = metrics.getColors();
    
    // === LEGS ===
    const { leftLeg, rightLeg } = this.createLegs(bodyGroup, metrics);
    
    // === BODY ===
    const body = this.createBody(bodyGroup, metrics);
    
    // === HEAD ===
    const head = this.createHead(bodyGroup, metrics);
    
    // === ARMS ===
    const { leftArm, rightArm, leftElbow, rightElbow, leftWrist, rightWrist } = this.createArms(bodyGroup, metrics);
    
    // === SHINS (KNEES) ===
    const { leftKnee, rightKnee } = this.createShins(leftLeg, rightLeg, metrics);
    
    // === WEAPON ===
    const weapon = this.createWeapon(rightWrist, config.type);
    
    // === FACIAL FEATURES ===
    this.createFacialFeatures(bodyGroup, metrics);
    
    // === HITBOX ===
    const hitBox = this.createHitBox(bodyGroup, metrics);
    
    return {
      body, head, leftArm, rightArm, leftElbow, rightElbow,
      leftWrist, rightWrist, leftLeg, rightLeg, leftKnee, rightKnee,
      weapon, hitBox
    };
  }
  
  private static createLegs(bodyGroup: THREE.Group, metrics: EnemyBodyMetrics) {
    const scale = metrics.getScale();
    const colors = metrics.getColors();
    
    // Left leg
    const leftLegGeometry = new THREE.CylinderGeometry(scale.leg.radius[0], scale.leg.radius[1], scale.leg.length, 16);
    const leftLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    leftLeg.position.copy(metrics.getLegPosition(true));
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    bodyGroup.add(leftLeg);
    
    // Right leg
    const rightLegGeometry = new THREE.CylinderGeometry(scale.leg.radius[0], scale.leg.radius[1], scale.leg.length, 16);
    const rightLegMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    rightLeg.position.copy(metrics.getLegPosition(false));
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    bodyGroup.add(rightLeg);
    
    return { leftLeg, rightLeg };
  }
  
  private static createBody(bodyGroup: THREE.Group, metrics: EnemyBodyMetrics) {
    const scale = metrics.getScale();
    const colors = metrics.getColors();
    
    const bodyGeometry = new THREE.CylinderGeometry(scale.body.radius, scale.body.radius * 1.15, scale.body.height, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: colors.skin,
      shininess: 25,
      specular: 0x333333
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = metrics.getBodyCenterY();
    body.castShadow = true;
    body.receiveShadow = true;
    bodyGroup.add(body);
    
    return body;
  }
  
  private static createHead(bodyGroup: THREE.Group, metrics: EnemyBodyMetrics) {
    const scale = metrics.getScale();
    const colors = metrics.getColors();
    
    const headGeometry = new THREE.SphereGeometry(scale.head.radius, 20, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: colors.muscle,
      shininess: 30,
      specular: 0x222222
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = metrics.getHeadCenterY();
    head.castShadow = true;
    head.receiveShadow = true;
    bodyGroup.add(head);
    
    return head;
  }
  
  private static createArms(bodyGroup: THREE.Group, metrics: EnemyBodyMetrics) {
    const scale = metrics.getScale();
    const colors = metrics.getColors();
    const neutralRotations = metrics.getNeutralArmRotation();
    
    // Left arm system
    const leftArmGeometry = new THREE.CylinderGeometry(scale.arm.radius[0], scale.arm.radius[1], scale.arm.length, 16);
    const leftArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    leftArm.position.copy(metrics.getArmPosition(true));
    leftArm.rotation.copy(neutralRotations.left);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    bodyGroup.add(leftArm);
    
    // Right arm system  
    const rightArmGeometry = new THREE.CylinderGeometry(scale.arm.radius[0], scale.arm.radius[1], scale.arm.length, 16);
    const rightArmMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 25 });
    const rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    rightArm.position.copy(metrics.getArmPosition(false));
    rightArm.rotation.copy(neutralRotations.right);
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    bodyGroup.add(rightArm);
    
    // Forearms (elbows)
    const leftElbowGeometry = new THREE.CylinderGeometry(scale.forearm.radius[0], scale.forearm.radius[1], scale.forearm.length, 16);
    const leftElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftElbow = new THREE.Mesh(leftElbowGeometry, leftElbowMaterial);
    leftElbow.position.set(0, -scale.arm.length * 0.6, 0);
    leftElbow.castShadow = true;
    leftElbow.receiveShadow = true;
    leftArm.add(leftElbow);
    
    const rightElbowGeometry = new THREE.CylinderGeometry(scale.forearm.radius[0], scale.forearm.radius[1], scale.forearm.length, 16);
    const rightElbowMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightElbow = new THREE.Mesh(rightElbowGeometry, rightElbowMaterial);
    rightElbow.position.set(0, -scale.arm.length * 0.6, 0);
    rightElbow.castShadow = true;
    rightElbow.receiveShadow = true;
    rightArm.add(rightElbow);
    
    // Hands (wrists)
    const leftWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const leftWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const leftWrist = new THREE.Mesh(leftWristGeometry, leftWristMaterial);
    leftWrist.position.set(0, -scale.forearm.length * 0.6, 0);
    leftWrist.castShadow = true;
    leftWrist.receiveShadow = true;
    leftElbow.add(leftWrist);
    
    const rightWristGeometry = new THREE.SphereGeometry(0.15, 12, 10);
    const rightWristMaterial = new THREE.MeshPhongMaterial({ color: colors.muscle, shininess: 30 });
    const rightWrist = new THREE.Mesh(rightWristGeometry, rightWristMaterial);
    rightWrist.position.set(0, -scale.forearm.length * 0.6, 0);
    rightWrist.castShadow = true;
    rightWrist.receiveShadow = true;
    rightElbow.add(rightWrist);
    
    return { leftArm, rightArm, leftElbow, rightElbow, leftWrist, rightWrist };
  }
  
  private static createShins(leftLeg: THREE.Mesh, rightLeg: THREE.Mesh, metrics: EnemyBodyMetrics) {
    const scale = metrics.getScale();
    const colors = metrics.getColors();
    
    // Left shin
    const leftKneeGeometry = new THREE.CylinderGeometry(scale.shin.radius[0], scale.shin.radius[1], scale.shin.length, 16);
    const leftKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const leftKnee = new THREE.Mesh(leftKneeGeometry, leftKneeMaterial);
    leftKnee.position.set(0, metrics.getShinRelativeY(), 0);
    leftKnee.castShadow = true;
    leftKnee.receiveShadow = true;
    leftLeg.add(leftKnee);
    
    // Right shin
    const rightKneeGeometry = new THREE.CylinderGeometry(scale.shin.radius[0], scale.shin.radius[1], scale.shin.length, 16);
    const rightKneeMaterial = new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 20 });
    const rightKnee = new THREE.Mesh(rightKneeGeometry, rightKneeMaterial);
    rightKnee.position.set(0, metrics.getShinRelativeY(), 0);
    rightKnee.castShadow = true;
    rightKnee.receiveShadow = true;
    rightLeg.add(rightKnee);
    
    return { leftKnee, rightKnee };
  }
  
  private static createWeapon(rightWrist: THREE.Mesh, enemyType: EnemyType): THREE.Group {
    const weapon = new THREE.Group();
    const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
    const metalTexture = TextureGenerator.createMetalTexture(0x444444);
    
    if (enemyType === EnemyType.ORC) {
      // Large battle axe
      const handleGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1.8, 16);
      const handleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4A2C17, shininess: 40, map: woodTexture
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.y = 0.9;
      handle.castShadow = true;
      weapon.add(handle);
      
      // Double-headed axe blade
      const bladeGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.1);
      const bladeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666, shininess: 100, specular: 0xFFFFFF, map: metalTexture
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
    } else {
      // Goblin spiked club
      const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.8, 12);
      const shaftMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x5D4037, shininess: 40, map: woodTexture
      });
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.position.y = 0.4;
      shaft.castShadow = true;
      weapon.add(shaft);
      
      // Spikes
      const spikeGeometry = new THREE.ConeGeometry(0.025, 0.12, 8);
      const spikeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x444444, shininess: 80, specular: 0x666666, map: metalTexture
      });
      
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial.clone());
        const angle = (i / 6) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.09, 0.7, Math.sin(angle) * 0.09);
        spike.rotation.x = Math.PI / 2;
        spike.rotation.z = angle;
        spike.castShadow = true;
        weapon.add(spike);
      }
      
      weapon.position.set(0.5, 0.6, 0);
      weapon.rotation.z = -0.5;
    }
    
    rightWrist.add(weapon);
    return weapon;
  }
  
  private static createFacialFeatures(bodyGroup: THREE.Group, metrics: EnemyBodyMetrics): void {
    const scale = metrics.getScale();
    const headY = metrics.getHeadCenterY();
    const config = metrics.getConfig();
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.12, 12, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFF0000, transparent: true, opacity: 1,
      emissive: 0xFF0000, emissiveIntensity: 0.4
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, headY + 0.05, scale.head.radius * 0.85);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.2, headY + 0.05, scale.head.radius * 0.85);
    bodyGroup.add(leftEye);
    bodyGroup.add(rightEye);
    
    // Tusks (for orcs)
    if (config.type === EnemyType.ORC) {
      const tuskGeometry = new THREE.ConeGeometry(0.08, 0.35, 8);
      const tuskMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFACD, shininess: 60 });
      const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
      leftTusk.position.set(-0.2, headY - 0.15, scale.head.radius * 0.85);
      leftTusk.rotation.x = Math.PI;
      leftTusk.castShadow = true;
      const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
      rightTusk.position.set(0.2, headY - 0.15, scale.head.radius * 0.85);
      rightTusk.rotation.x = Math.PI;
      rightTusk.castShadow = true;
      bodyGroup.add(leftTusk);
      bodyGroup.add(rightTusk);
    }
  }
  
  private static createHitBox(bodyGroup: THREE.Group, metrics: EnemyBodyMetrics): THREE.Mesh {
    const config = metrics.getConfig();
    const hitBoxSize = config.type === EnemyType.ORC ? 
      { width: 1.8, height: 2.2, depth: 1.8 } :
      { width: 1.2, height: 1.8, depth: 1.2 };
    
    const hitBoxGeometry = new THREE.BoxGeometry(hitBoxSize.width, hitBoxSize.height, hitBoxSize.depth);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = metrics.getBodyCenterY();
    bodyGroup.add(hitBox);
    
    return hitBox;
  }
  
  // Legacy method for backward compatibility
  public static createRealisticOrcBody(position: THREE.Vector3): {
    group: THREE.Group;
    bodyParts: EnemyBodyParts;
  } {
    const result = this.createRealisticBody(EnemyType.ORC, position);
    return { group: result.group, bodyParts: result.bodyParts };
  }
}
