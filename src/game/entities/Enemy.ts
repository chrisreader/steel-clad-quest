import * as THREE from 'three';
import { EnemyType } from '../../types/GameTypes';
import { TextureGenerator } from '../utils';
import { EffectsManager } from '../managers/EffectsManager';
import { AudioManager, SoundCategory } from '../managers/AudioManager';

export class Enemy {
  public mesh: THREE.Group;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public goldReward: number;
  public experienceReward: number;
  public lastAttackTime: number = 0;
  public isDead: boolean = false;
  public deathTime: number = 0;
  public type: EnemyType;
  public leftArm: THREE.Mesh;
  public rightArm: THREE.Mesh;
  public leftLeg: THREE.Mesh;
  public rightLeg: THREE.Mesh;
  public walkTime: number = 0;
  public hitBox: THREE.Mesh;
  public originalMaterials: THREE.Material[];
  public isHit: boolean = false;
  public hitTime: number = 0;
  public deathAnimation = {
    falling: false,
    rotationSpeed: 0.02,
    fallSpeed: 0.01
  };
  public weapon: THREE.Group;
  public body: THREE.Mesh;
  public head: THREE.Mesh;
  public attackRange: number;
  public damageRange: number;
  public attackCooldown: number;
  public points: number;
  public idleTime: number = 0;
  
  protected effectsManager: EffectsManager;
  protected audioManager: AudioManager;
  
  constructor(
    scene: THREE.Scene,
    type: EnemyType,
    health: number,
    speed: number,
    damage: number,
    goldReward: number,
    experienceReward: number,
    attackRange: number,
    damageRange: number,
    attackCooldown: number,
    points: number,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    bodyScale: {
      body: { radius: number; height: number },
      head: { radius: number },
      arm: { radius: [number, number]; length: number },
      forearm: { radius: [number, number]; length: number },
      leg: { radius: [number, number]; length: number },
      shin: { radius: [number, number]; length: number }
    },
    colors: {
      skin: number;
      muscle: number;
      accent: number;
    },
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
    },
    position: THREE.Vector3
  ) {
    this.type = type;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.damage = damage;
    this.goldReward = goldReward;
    this.experienceReward = experienceReward;
    this.attackRange = attackRange;
    this.damageRange = damageRange;
    this.attackCooldown = attackCooldown;
    this.points = points;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(bodyScale.body.radius, bodyScale.body.radius, bodyScale.body.height, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: colors.skin });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = bodyScale.body.height / 2;
    this.body.castShadow = true;
    
    // Head
    const headGeometry = new THREE.SphereGeometry(bodyScale.head.radius, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: colors.skin });
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = bodyScale.body.height + bodyScale.head.radius;
    this.head.castShadow = true;
    
    // Left Arm
    const leftArmGroup = new THREE.Group();
    const leftUpperArmGeometry = new THREE.CylinderGeometry(bodyScale.arm.radius[0], bodyScale.arm.radius[1], bodyScale.arm.length, 16);
    const leftUpperArmMaterial = new THREE.MeshLambertMaterial({ color: colors.muscle });
    this.leftArm = new THREE.Mesh(leftUpperArmGeometry, leftUpperArmMaterial);
    this.leftArm.position.x = bodyScale.body.radius + 0.1;
    this.leftArm.position.y = bodyScale.body.height;
    this.leftArm.position.z = 0;
    this.leftArm.rotation.z = Math.PI / 12;
    this.leftArm.castShadow = true;
    leftArmGroup.add(this.leftArm);
    
    // Right Arm
    const rightArmGroup = new THREE.Group();
    const rightUpperArmGeometry = new THREE.CylinderGeometry(bodyScale.arm.radius[0], bodyScale.arm.radius[1], bodyScale.arm.length, 16);
    const rightUpperArmMaterial = new THREE.MeshLambertMaterial({ color: colors.muscle });
    this.rightArm = new THREE.Mesh(rightUpperArmGeometry, rightUpperArmMaterial);
    this.rightArm.position.x = -bodyScale.body.radius - 0.1;
    this.rightArm.position.y = bodyScale.body.height;
    this.rightArm.position.z = 0;
    this.rightArm.rotation.z = -Math.PI / 12;
    this.rightArm.castShadow = true;
    rightArmGroup.add(this.rightArm);
    
    // Left Leg
    const leftLegGeometry = new THREE.CylinderGeometry(bodyScale.leg.radius[0], bodyScale.leg.radius[1], bodyScale.leg.length, 16);
    const leftLegMaterial = new THREE.MeshLambertMaterial({ color: colors.muscle });
    this.leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    this.leftLeg.position.x = bodyScale.body.radius / 2;
    this.leftLeg.position.y = bodyScale.leg.length / 2 - 0.1;
    this.leftLeg.castShadow = true;
    
    // Right Leg
    const rightLegGeometry = new THREE.CylinderGeometry(bodyScale.leg.radius[0], bodyScale.leg.radius[1], bodyScale.leg.length, 16);
    const rightLegMaterial = new THREE.MeshLambertMaterial({ color: colors.muscle });
    this.rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    this.rightLeg.position.x = -bodyScale.body.radius / 2;
    this.rightLeg.position.y = bodyScale.leg.length / 2 - 0.1;
    this.rightLeg.castShadow = true;
    
    // Hitbox
    const hitBoxGeometry = new THREE.BoxGeometry(bodyScale.body.radius * 2, bodyScale.body.height, bodyScale.body.radius * 2);
    const hitMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    this.hitBox = new THREE.Mesh(hitBoxGeometry, hitMaterial);
    this.hitBox.position.y = bodyScale.body.height / 2;
    
    // Weapon
    this.weapon = new THREE.Group();
    
    // Create enemy mesh
    this.mesh = new THREE.Group();
    this.mesh.add(this.body);
    this.mesh.add(this.head);
    this.mesh.add(leftArmGroup);
    this.mesh.add(rightArmGroup);
    this.mesh.add(this.leftLeg);
    this.mesh.add(this.rightLeg);
    this.mesh.add(this.hitBox);
    this.mesh.add(this.weapon);
    
    this.mesh.position.copy(position);
    
    this.originalMaterials = [];
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        this.originalMaterials.push(child.material);
      }
    });
    
    // Add features
    if (features.hasEyes) {
      this.addEyes(features.eyeConfig, colors.accent);
    }
    if (features.hasTusks) {
      this.addTusks(features.tuskConfig);
    }
    
    // Add weapon
    if (features.hasWeapon) {
      const woodTexture = TextureGenerator.createWoodTexture();
      const metalTexture = TextureGenerator.createMetalTexture();
      this.weapon = this.createWeapon(woodTexture, metalTexture);
      this.mesh.add(this.weapon);
    }
    
    scene.add(this.mesh);
  }
  
  protected createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    const weapon = new THREE.Group();
    
    // Basic sword
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4A2C17,
      shininess: 40,
      map: woodTexture
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = 0.2;
    handle.castShadow = true;
    weapon.add(handle);
    
    const bladeGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.7);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: 0x999999,
      shininess: 100,
      specular: 0xFFFFFF,
      map: metalTexture
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.5;
    blade.position.z = 0.2;
    blade.castShadow = true;
    weapon.add(blade);
    
    return weapon;
  }
  
  private addEyes(eyeConfig: any, accentColor: number): void {
    const eyeRadius = eyeConfig?.radius || 0.07;
    const eyeColor = eyeConfig?.color || 0x000000;
    const emissiveIntensity = eyeConfig?.emissiveIntensity || 0;
    
    const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 12, 12);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: eyeColor,
      emissive: accentColor,
      emissiveIntensity: emissiveIntensity
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(eyeConfig?.offsetX || 0.2, eyeConfig?.offsetY || 0.05, eyeConfig?.offsetZ || 0.5);
    this.head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-(eyeConfig?.offsetX || 0.2), eyeConfig?.offsetY || 0.05, eyeConfig?.offsetZ || 0.5);
    this.head.add(rightEye);
  }
  
  private addTusks(tuskConfig: any): void {
    const tuskRadius = tuskConfig?.radius || 0.05;
    const tuskHeight = tuskConfig?.height || 0.2;
    const tuskColor = tuskConfig?.color || 0xFFFFFF;
    
    const tuskGeometry = new THREE.CylinderGeometry(tuskRadius, tuskRadius * 0.5, tuskHeight, 10);
    const tuskMaterial = new THREE.MeshLambertMaterial({ color: tuskColor });
    
    const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    leftTusk.position.set(tuskConfig?.offsetX || 0.2, tuskConfig?.offsetY || -0.1, tuskConfig?.offsetZ || 0.5);
    leftTusk.rotation.x = -Math.PI / 2;
    this.head.add(leftTusk);
    
    const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    rightTusk.position.set(-(tuskConfig?.offsetX || 0.2), tuskConfig?.offsetY || -0.1, tuskConfig?.offsetZ || 0.5);
    rightTusk.rotation.x = -Math.PI / 2;
    this.head.add(rightTusk);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }
  
  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }
  
  public takeDamage(damage: number, sourcePosition: THREE.Vector3): void {
    if (this.isDead) return;
    
    this.health -= damage;
    this.isHit = true;
    this.hitTime = Date.now();
    
    // Play hurt sound
    this.audioManager.playSound('enemy_hurt');
    
    // Trigger hit effect
    this.effectsManager.createHitEffect(this.mesh.position);
    
    // Check if enemy is dead
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.deathTime = Date.now();
      this.startDeathAnimation();
      
      // Play death sound
      this.audioManager.playSound('enemy_death');
    }
  }
  
  private startDeathAnimation(): void {
    this.deathAnimation.falling = true;
    this.mesh.rotation.x = 0;
    this.mesh.rotation.z = 0;
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) {
      this.updateDeathAnimation(deltaTime);
      return;
    }
    
    if (this.isHit) {
      if (Date.now() - this.hitTime > 200) {
        this.isHit = false;
        this.resetMaterialColor();
      }
    }
    
    this.updateMovement(deltaTime, playerPosition);
  }
  
  private updateMovement(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.idleTime += deltaTime;
    
    // Check if enemy should attack
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    if (distanceToPlayer <= this.attackRange && this.idleTime > 1) {
      this.attack(playerPosition);
      this.idleTime = 0;
      return;
    }
    
    // Move towards the player
    const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
    const moveDistance = this.speed * deltaTime;
    this.mesh.position.x += direction.x * moveDistance;
    this.mesh.position.z += direction.z * moveDistance;
    
    // Rotate to face the player
    this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    
    // Leg animation
    this.walkTime += deltaTime * 5;
    this.leftLeg.rotation.x = Math.sin(this.walkTime) / 3;
    this.rightLeg.rotation.x = Math.sin(this.walkTime + Math.PI) / 3;
    this.leftArm.rotation.x = Math.sin(this.walkTime + Math.PI) / 5;
    this.rightArm.rotation.x = Math.sin(this.walkTime) / 5;
  }
  
  private attack(playerPosition: THREE.Vector3): void {
    const now = Date.now();
    if (now - this.lastAttackTime > this.attackCooldown) {
      this.lastAttackTime = now;
      
      // Check if player is within damage range
      const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
      if (distanceToPlayer <= this.damageRange) {
        // Apply damage to player
        console.log(`Enemy attacks for ${this.damage} damage`);
        
        // Trigger attack effect
        this.effectsManager.createAttackEffect(this.mesh.position);
      }
    }
  }
  
  private updateDeathAnimation(deltaTime: number): void {
    if (this.deathAnimation.falling) {
      this.mesh.rotation.x += this.deathAnimation.rotationSpeed * deltaTime * 2;
      this.mesh.rotation.z += this.deathAnimation.rotationSpeed * deltaTime * 1.5;
      this.mesh.position.y -= this.deathAnimation.fallSpeed * deltaTime * 5;
      
      if (this.mesh.position.y < -5) {
        this.deathAnimation.falling = false;
      }
    }
  }
  
  private resetMaterialColor(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshLambertMaterial).color.set(0xffffff);
      }
    });
  }
  
  public isDeadFor(time: number): boolean {
    return this.isDead && Date.now() - this.deathTime > time;
  }
  
  public getMesh(): THREE.Group {
    return this.mesh;
  }
  
  public getGoldReward(): number {
    return this.goldReward;
  }
  
  public getExperienceReward(): number {
    return this.experienceReward;
  }
  
  public isAlive(): boolean {
    return !this.isDead;
  }
  
  public isAttacking(): boolean {
    return Date.now() - this.lastAttackTime < this.attackCooldown;
  }
  
  public isDeadOrDying(): boolean {
    return this.isDead && this.deathAnimation.falling;
  }
  
  public isIdle(): boolean {
    return this.idleTime > 2;
  }
  
  public isTakingDamage(): boolean {
    return this.isHit;
  }
  
  public isVisible(): boolean {
    return this.mesh.visible;
  }
  
  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }
  
  public dispose(): void {
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }
  }
  
  public static createRandomEnemy(
    scene: THREE.Scene,
    playerPosition: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    difficulty: number = 1
  ): Enemy {
    const enemyType = Math.random() < 0.5 ? EnemyType.GOBLIN : EnemyType.ORC;
    
    // Enemy stats based on type and difficulty
    let health = 50 + difficulty * 20;
    let speed = 2 + difficulty * 0.5;
    let damage = 10 + difficulty * 5;
    let goldReward = 20 + difficulty * 10;
    let experienceReward = 15 + difficulty * 8;
    let attackRange = 3;
    let damageRange = 2;
    let attackCooldown = 1500;
    let points = 25 + difficulty * 15;
    
    // Adjust stats based on enemy type
    if (enemyType === EnemyType.ORC) {
      health *= 1.5;
      damage *= 1.2;
      speed *= 0.8;
      goldReward *= 1.3;
      experienceReward *= 1.2;
      attackRange *= 1.1;
      damageRange *= 1.1;
      attackCooldown *= 1.1;
      points *= 1.4;
    }
    
    // Body scale
    const orcHumanoidConfig = {
      body: { radius: 0.25, height: 1.5 },
      head: { radius: 0.15 },
      arm: { radius: [0.08, 0.06] as [number, number], length: 0.6 },
      forearm: { radius: [0.06, 0.05] as [number, number], length: 0.5 },
      leg: { radius: [0.12, 0.08] as [number, number], length: 0.7 },
      shin: { radius: [0.08, 0.06] as [number, number], length: 0.6 }
    };
    
    // Colors
    const colors = {
      skin: 0x779977,
      muscle: 0x88AA88,
      accent: 0x556655
    };
    
    // Features
    const features = {
      hasEyes: true,
      hasTusks: enemyType === EnemyType.ORC,
      hasWeapon: true
    };
    
    // Create enemy
    const enemy = new Enemy(
      scene,
      enemyType,
      health,
      speed,
      damage,
      goldReward,
      experienceReward,
      attackRange,
      damageRange,
      attackCooldown,
      points,
      effectsManager,
      audioManager,
      orcHumanoidConfig,
      colors,
      features,
      new THREE.Vector3(
        playerPosition.x + Math.random() * 10 - 5,
        0,
        playerPosition.z + Math.random() * 10 - 5
      )
    );
    
    return enemy;
  }
}
