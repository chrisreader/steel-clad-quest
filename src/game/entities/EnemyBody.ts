import * as THREE from 'three';
import { EnemyType } from '../../types/GameTypes';
import { ENEMY_CONFIGURATIONS } from './EnemyBodyConfig';
import { EnemyBodyMetrics } from './EnemyBodyMetrics';

export interface EnemyBodyParts {
  group: THREE.Group;
  body: THREE.Mesh | null;
  head: THREE.Mesh | null;
  leftArm: THREE.Mesh | null;
  rightArm: THREE.Mesh | null;
  leftElbow: THREE.Mesh | null;
  rightElbow: THREE.Mesh | null;
  leftWrist: THREE.Mesh | null;
  rightWrist: THREE.Mesh | null;
  leftLeg: THREE.Mesh | null;
  rightLeg: THREE.Mesh | null;
  leftKnee: THREE.Mesh | null;
  rightKnee: THREE.Mesh | null;
  weapon: THREE.Group | null;
  hitBox: THREE.Mesh;
  leftEye: THREE.Mesh | null;
  rightEye: THREE.Mesh | null;
  leftTusk: THREE.Mesh | null;
  rightTusk: THREE.Mesh | null;
}

export class EnemyBodyBuilder {
  public static createRealisticBody(type: EnemyType, position: THREE.Vector3): { group: THREE.Group; bodyParts: EnemyBodyParts; metrics: EnemyBodyMetrics } {
    const config = ENEMY_CONFIGURATIONS[type];
    const metrics = new EnemyBodyMetrics(config);
    const scale = config.scale;
    const colors = config.colors;
    
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = 0;
    group.castShadow = true;
    
    const bodyParts: EnemyBodyParts = {
      group: group,
      body: null,
      head: null,
      leftArm: null,
      rightArm: null,
      leftElbow: null,
      rightElbow: null,
      leftWrist: null,
      rightWrist: null,
      leftLeg: null,
      rightLeg: null,
      leftKnee: null,
      rightKnee: null,
      weapon: null,
      hitBox: this.createHitBox(config.scale.body.radius * 2, config.scale.body.height, config.scale.body.radius * 2),
      leftEye: null,
      rightEye: null,
      leftTusk: null,
      rightTusk: null,
    };
    
    // Add hitbox
    group.add(bodyParts.hitBox);
    
    // Body
    bodyParts.body = this.createBody(scale.body.radius, scale.body.height, colors.skin);
    bodyParts.body.position.y = metrics.getBodyCenterY();
    group.add(bodyParts.body);
    
    // Head
    bodyParts.head = this.createHead(scale.head.radius, colors.muscle);
    bodyParts.head.position.y = metrics.getHeadCenterY();
    group.add(bodyParts.head);
    
    // Eyes
    if (config.facialFeatures.eyes.enabled) {
      const eyeConfig = config.facialFeatures.eyes;
      bodyParts.leftEye = this.createEye(eyeConfig.radius, eyeConfig.color, eyeConfig.emissiveIntensity);
      bodyParts.leftEye.position.copy(metrics.getEyePosition(true));
      group.add(bodyParts.leftEye);
      
      bodyParts.rightEye = this.createEye(eyeConfig.radius, eyeConfig.color, eyeConfig.emissiveIntensity);
      bodyParts.rightEye.position.copy(metrics.getEyePosition(false));
      group.add(bodyParts.rightEye);
    }
    
    // Tusks
    if (config.facialFeatures.tusks.enabled) {
      const tuskConfig = config.facialFeatures.tusks;
      bodyParts.leftTusk = this.createTusk(tuskConfig.radius, tuskConfig.height, tuskConfig.color);
      bodyParts.leftTusk.position.copy(metrics.getTuskPosition(true));
      group.add(bodyParts.leftTusk);
      
      bodyParts.rightTusk = this.createTusk(tuskConfig.radius, tuskConfig.height, tuskConfig.color);
      bodyParts.rightTusk.position.copy(metrics.getTuskPosition(false));
      group.add(bodyParts.rightTusk);
    }
    
    // Arms
    const armPositionLeft = metrics.getArmPosition(true);
    bodyParts.leftArm = this.createLimb(scale.arm.radius, scale.arm.length, colors.skin);
    bodyParts.leftArm.position.copy(armPositionLeft);
    group.add(bodyParts.leftArm);
    
    const armPositionRight = metrics.getArmPosition(false);
    bodyParts.rightArm = this.createLimb(scale.arm.radius, scale.arm.length, colors.skin);
    bodyParts.rightArm.position.copy(armPositionRight);
    group.add(bodyParts.rightArm);
    
    // Forearms
    bodyParts.leftElbow = this.createLimb(scale.forearm.radius, scale.forearm.length, colors.muscle);
    bodyParts.leftElbow.position.y = -scale.arm.length;
    bodyParts.leftArm.add(bodyParts.leftElbow);
    
    bodyParts.rightElbow = this.createLimb(scale.forearm.radius, scale.forearm.length, colors.muscle);
    bodyParts.rightElbow.position.y = -scale.arm.length;
    bodyParts.rightArm.add(bodyParts.rightElbow);
    
    // Hands (Wrists)
    bodyParts.leftWrist = this.createWrist(scale.forearm.radius[1], colors.accent);
    bodyParts.leftWrist.position.y = -scale.forearm.length;
    bodyParts.leftElbow.add(bodyParts.leftWrist);
    
    bodyParts.rightWrist = this.createWrist(scale.forearm.radius[1], colors.accent);
    bodyParts.rightWrist.position.y = -scale.forearm.length;
    bodyParts.rightElbow.add(bodyParts.rightWrist);
    
    // Legs
    const legPositionLeft = metrics.getLegPosition(true);
    bodyParts.leftLeg = this.createLimb(scale.leg.radius, scale.leg.length, colors.skin);
    bodyParts.leftLeg.position.copy(legPositionLeft);
    group.add(bodyParts.leftLeg);
    
    const legPositionRight = metrics.getLegPosition(false);
    bodyParts.rightLeg = this.createLimb(scale.leg.radius, scale.leg.length, colors.skin);
    bodyParts.rightLeg.position.copy(legPositionRight);
    group.add(bodyParts.rightLeg);
    
    // Shins (Knees)
    bodyParts.leftKnee = this.createLimb(scale.shin.radius, scale.shin.length, colors.muscle);
    bodyParts.leftKnee.position.y = -scale.leg.length;
    bodyParts.leftLeg.add(bodyParts.leftKnee);
    
    bodyParts.rightKnee = this.createLimb(scale.shin.radius, scale.shin.length, colors.muscle);
    bodyParts.rightKnee.position.y = -scale.leg.length;
    bodyParts.rightLeg.add(bodyParts.rightKnee);
    
    // Weapon
    bodyParts.weapon = this.createWeapon();
    bodyParts.weapon.position.set(0.6, scale.arm.length * 0.7, 0);
    bodyParts.rightArm.add(bodyParts.weapon);
    
    // Apply neutral pose
    const neutralRotations = metrics.getNeutralArmRotation();
    bodyParts.leftArm.rotation.copy(neutralRotations.left);
    bodyParts.rightArm.rotation.copy(neutralRotations.right);
    
    return { group, bodyParts, metrics };
  }
  
  private static createBody(radius: number, height: number, color: number): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius, radius * 1.1, height, 12);
    const material = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(color).multiplyScalar(1.8),
      shininess: 20,
      specular: 0x222222
    });
    const body = new THREE.Mesh(geometry, material);
    body.castShadow = true;
    body.receiveShadow = true;
    return body;
  }
  
  private static createHead(radius: number, color: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 16, 12);
    const material = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(color).multiplyScalar(1.8),
      shininess: 30
    });
    const head = new THREE.Mesh(geometry, material);
    head.castShadow = true;
    head.receiveShadow = true;
    return head;
  }
  
  private static createLimb(radius: [number, number], length: number, color: number): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius[0], radius[1], length, 12);
    const material = new THREE.MeshPhongMaterial({ 
      color: color,
      shininess: 25
    });
    const limb = new THREE.Mesh(geometry, material);
    limb.castShadow = true;
    limb.receiveShadow = true;
    return limb;
  }
  
  private static createWrist(radius: number, color: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 8, 6);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 50
    });
    const wrist = new THREE.Mesh(geometry, material);
    wrist.castShadow = true;
    wrist.receiveShadow = true;
    return wrist
  }
  
  private static createWeapon(): THREE.Group {
    const weapon = new THREE.Group();
    
    // Shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.8, 12);
    const shaftMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x5D4037,
      shininess: 40
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 0.4;
    shaft.castShadow = true;
    weapon.add(shaft);
    
    // Spikes
    const spikeGeometry = new THREE.ConeGeometry(0.025, 0.12, 8);
    const spikeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x444444,
      shininess: 80,
      specular: 0x666666
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
    
    return weapon;
  }
  
  private static createHitBox(width: number, height: number, depth: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(geometry, material);
    hitBox.position.y = height / 2;
    return hitBox;
  }
  
  private static createEye(radius: number, color: number, emissiveIntensity: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 12, 8);
    const material = new THREE.MeshPhongMaterial({ 
      color: color,
      transparent: true,
      opacity: 1,
      emissive: color,
      emissiveIntensity: emissiveIntensity
    });
    const eye = new THREE.Mesh(geometry, material);
    eye.castShadow = true;
    eye.receiveShadow = true;
    return eye;
  }
  
  private static createTusk(radius: number, height: number, color: number): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(radius, height, 8);
    const material = new THREE.MeshPhongMaterial({ 
      color: color,
      shininess: 60
    });
    const tusk = new THREE.Mesh(geometry, material);
    tusk.rotation.x = Math.PI; // Point downward
    tusk.castShadow = true;
    tusk.receiveShadow = true;
    return tusk;
  }
}

export { EnemyBodyMetrics } from './EnemyBodyMetrics';
