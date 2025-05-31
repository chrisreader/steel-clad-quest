
import * as THREE from 'three';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { WeaponManager } from '../weapons/WeaponManager';
import { WeaponAnimationSystem } from '../animation/WeaponAnimationSystem';
import { SwordSwingAnimation } from '../animation/animations/SwordSwingAnimation';
import { PlayerBody, PlayerStats, WeaponSwingAnimation } from '../../types/GameTypes';
import { Enemy } from './Enemy';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';

export class Player {
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private playerGroup: THREE.Group;
  private playerBody: PlayerBody;
  private equippedWeapon: BaseWeapon | null = null;
  private weaponManager: WeaponManager;
  private weaponAnimationSystem: WeaponAnimationSystem;
  private swordSwingAnimation: SwordSwingAnimation | null = null;
  
  // Player stats and state
  private stats: PlayerStats;
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private isMoving: boolean = false;
  private isSprinting: boolean = false;
  private walkCycle: number = 0;
  private alive: boolean = true;
  
  // Combat state
  private weaponSwing: WeaponSwingAnimation;
  private hitEnemies: Enemy[] = [];
  private isBowDrawing: boolean = false;
  private bowDrawStartTime: number = 0;
  
  // Visual rotation state
  private visualYaw: number = 0;
  private visualPitch: number = 0;

  constructor(scene: THREE.Scene, effectsManager: EffectsManager, audioManager: AudioManager) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.weaponManager = new WeaponManager();
    this.weaponAnimationSystem = new WeaponAnimationSystem();
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.playerGroup = new THREE.Group();
    
    // Initialize player stats
    this.stats = {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      experienceToNext: 100,
      gold: 0,
      attack: 10,
      defense: 5,
      speed: 5,
      attackPower: 10
    };
    
    // Initialize weapon swing animation state
    this.weaponSwing = {
      isActive: false,
      duration: 0.64,
      startTime: 0,
      clock: new THREE.Clock(),
      phases: {
        windup: 0.128,
        slash: 0.32,
        recovery: 0.192
      },
      mixer: null,
      action: null,
      rotations: {
        neutral: { x: 0, y: 0, z: 0 },
        windup: { x: 0, y: 0, z: 0 },
        slash: { x: 0, y: 0, z: 0 }
      },
      trail: null,
      hitDetected: false,
      currentPhase: 'windup'
    };
    
    this.createPlayerBody();
    this.scene.add(this.playerGroup);
    console.log('🏃 [Player] *** PLAYER INITIALIZED *** with sword swing animation support');
  }

  private createPlayerBody(): void {
    // Create player body parts as groups
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const body = new THREE.Group();
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.set(0, 0.9, 0);
    bodyMesh.castShadow = true;
    body.add(bodyMesh);
    this.playerGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 6);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB3 });
    const head = new THREE.Group();
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(0, 2.1, 0);
    headMesh.castShadow = true;
    head.add(headMesh);
    this.playerGroup.add(head);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB3 });
    
    const leftArm = new THREE.Group();
    const leftArmMesh = new THREE.Mesh(armGeometry, armMaterial);
    leftArmMesh.position.set(-0.4, 1.2, 0);
    leftArmMesh.castShadow = true;
    leftArm.add(leftArmMesh);
    this.playerGroup.add(leftArm);

    const rightArm = new THREE.Group();
    const rightArmMesh = new THREE.Mesh(armGeometry, armMaterial);
    rightArmMesh.position.set(0.4, 1.2, 0);
    rightArmMesh.castShadow = true;
    rightArm.add(rightArmMesh);
    this.playerGroup.add(rightArm);

    // Elbows
    const elbowGeometry = new THREE.SphereGeometry(0.06, 6, 4);
    const elbowMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB3 });
    
    const leftElbow = new THREE.Group();
    const leftElbowMesh = new THREE.Mesh(elbowGeometry, elbowMaterial);
    leftElbowMesh.position.set(-0.4, 0.9, 0);
    leftElbowMesh.castShadow = true;
    leftElbow.add(leftElbowMesh);
    this.playerGroup.add(leftElbow);

    const rightElbow = new THREE.Group();
    const rightElbowMesh = new THREE.Mesh(elbowGeometry, elbowMaterial);
    rightElbowMesh.position.set(0.4, 0.9, 0);
    rightElbowMesh.castShadow = true;
    rightElbow.add(rightElbowMesh);
    this.playerGroup.add(rightElbow);

    // Forearms
    const forearmGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.5, 6);
    const forearmMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB3 });
    
    const leftForearm = new THREE.Group();
    const leftForearmMesh = new THREE.Mesh(forearmGeometry, forearmMaterial);
    leftForearmMesh.position.set(-0.4, 0.6, 0);
    leftForearmMesh.castShadow = true;
    leftForearm.add(leftForearmMesh);
    this.playerGroup.add(leftForearm);

    const rightForearm = new THREE.Group();
    const rightForearmMesh = new THREE.Mesh(forearmGeometry, forearmMaterial);
    rightForearmMesh.position.set(0.4, 0.6, 0);
    rightForearmMesh.castShadow = true;
    rightForearm.add(rightForearmMesh);
    this.playerGroup.add(rightForearm);

    // Wrists
    const wristGeometry = new THREE.SphereGeometry(0.05, 6, 4);
    const wristMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBB3 });
    
    const leftWrist = new THREE.Group();
    const leftWristMesh = new THREE.Mesh(wristGeometry, wristMaterial);
    leftWristMesh.position.set(-0.4, 0.3, 0);
    leftWristMesh.castShadow = true;
    leftWrist.add(leftWristMesh);
    this.playerGroup.add(leftWrist);

    const rightWrist = new THREE.Group();
    const rightWristMesh = new THREE.Mesh(wristGeometry, wristMaterial);
    rightWristMesh.position.set(0.4, 0.3, 0);
    rightWristMesh.castShadow = true;
    rightWrist.add(rightWristMesh);
    this.playerGroup.add(rightWrist);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.8, 6);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x4A4A4A });
    
    const leftLeg = new THREE.Group();
    const leftLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    leftLegMesh.position.set(-0.15, -0.4, 0);
    leftLegMesh.castShadow = true;
    leftLeg.add(leftLegMesh);
    this.playerGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    const rightLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    rightLegMesh.position.set(0.15, -0.4, 0);
    rightLegMesh.castShadow = true;
    rightLeg.add(rightLegMesh);
    this.playerGroup.add(rightLeg);

    this.playerBody = {
      body,
      head,
      leftArm,
      rightArm,
      leftElbow,
      rightElbow,
      leftForearm,
      rightForearm,
      leftWrist,
      rightWrist,
      leftLeg,
      rightLeg
    };

    // Attach weapon to right wrist if equipped
    if (this.equippedWeapon) {
      this.attachWeaponToWrist();
    }
  }

  public startSwordSwing(): void {
    console.log('🗡️ [Player] *** START SWORD SWING CALLED ***');
    console.log('🗡️ [Player] weaponSwing.isActive before:', this.weaponSwing.isActive);
    
    if (this.weaponSwing.isActive) {
      console.log('🗡️ [Player] *** SWORD SWING ALREADY ACTIVE *** - ignoring new swing');
      return;
    }

    if (!this.equippedWeapon) {
      console.log('🗡️ [Player] *** NO EQUIPPED WEAPON *** - cannot swing');
      return;
    }

    // Reset hit enemies for new swing
    this.hitEnemies = [];
    
    // Start weapon swing animation
    this.weaponSwing.isActive = true;
    this.weaponSwing.startTime = this.weaponSwing.clock.getElapsedTime();
    
    // Get weapon config for animation timing
    const weaponConfig = this.equippedWeapon.getConfig();
    this.weaponSwing.duration = weaponConfig.swingAnimation.duration;
    this.weaponSwing.phases = weaponConfig.swingAnimation.phases;
    
    console.log('🗡️ [Player] *** SWORD SWING STARTED ***');
    console.log('🗡️ [Player] weaponSwing.isActive after:', this.weaponSwing.isActive);
    console.log('🗡️ [Player] weaponSwing.duration:', this.weaponSwing.duration);
    console.log('🗡️ [Player] weaponSwing.startTime:', this.weaponSwing.startTime);
    
    // Create and start sword swing animation
    this.swordSwingAnimation = new SwordSwingAnimation(
      this.weaponSwing, 
      this.playerBody, 
      this.equippedWeapon
    );
    
    console.log('🗡️ [Player] *** SWORD SWING ANIMATION CREATED ***');
  }

  public update(deltaTime: number, isMoving?: boolean): void {
    if (isMoving !== undefined) {
      this.isMoving = isMoving;
    }

    // Update weapon swing animation if active
    if (this.weaponSwing.isActive && this.swordSwingAnimation) {
      console.log('🗡️ [Player] *** UPDATING SWORD SWING ANIMATION ***');
      this.swordSwingAnimation.update();
    }

    // Update weapon animation system for walking
    if (this.equippedWeapon) {
      const weaponType = this.equippedWeapon.getConfig().type;
      if (weaponType === 'bow') {
        this.weaponAnimationSystem.setWeaponType('bow');
      } else {
        this.weaponAnimationSystem.setWeaponType('melee');
      }
    } else {
      this.weaponAnimationSystem.setWeaponType('emptyHands');
    }

    this.weaponAnimationSystem.updateWalkAnimation(
      this.playerBody,
      this.walkCycle,
      deltaTime,
      this.isMoving,
      this.isSprinting,
      this.weaponSwing.isActive,
      this.isBowDrawing
    );

    // Update walk cycle
    if (this.isMoving) {
      const cycleSpeed = this.weaponAnimationSystem.getWalkCycleSpeed();
      this.walkCycle += deltaTime * cycleSpeed * (this.isSprinting ? 1.5 : 1);
    }

    // Update bow charging if active
    if (this.isBowDrawing && this.equippedWeapon && this.equippedWeapon.getConfig().type === 'bow') {
      if (this.equippedWeapon.updateCharge) {
        this.equippedWeapon.updateCharge(deltaTime);
      }
    }
  }

  // Equipment methods
  public equipWeapon(weaponId: string): boolean {
    console.log(`🗡️ [Player] Equipping weapon: ${weaponId}`);
    
    if (this.equippedWeapon) {
      this.unequipWeapon();
    }

    const weapon = this.weaponManager.createWeapon(weaponId);
    if (weapon) {
      this.equippedWeapon = weapon;
      this.equippedWeapon.equip(this.scene);
      this.attachWeaponToWrist();
      console.log(`🗡️ [Player] Successfully equipped: ${weapon.getConfig().name}`);
      return true;
    }
    
    console.warn(`🗡️ [Player] Failed to equip weapon: ${weaponId}`);
    return false;
  }

  public unequipWeapon(): void {
    if (this.equippedWeapon) {
      this.equippedWeapon.unequip(this.scene);
      if (this.playerBody.rightWrist.children.length > 0) {
        this.playerBody.rightWrist.remove(this.playerBody.rightWrist.children[0]);
      }
      this.equippedWeapon = null;
    }
  }

  private attachWeaponToWrist(): void {
    if (this.equippedWeapon && this.playerBody.rightWrist) {
      const weaponMesh = this.equippedWeapon.getMesh();
      this.playerBody.rightWrist.add(weaponMesh);
    }
  }

  // Combat methods
  public isAttacking(): boolean {
    return this.weaponSwing.isActive;
  }

  public getSwordHitBox(): THREE.Mesh {
    if (this.equippedWeapon) {
      return this.equippedWeapon.getHitBox();
    }
    // Return dummy hitbox if no weapon
    const dummyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const dummyMaterial = new THREE.MeshBasicMaterial({ visible: false });
    return new THREE.Mesh(dummyGeometry, dummyMaterial);
  }

  public getAttackPower(): number {
    if (this.equippedWeapon) {
      return this.stats.attack + this.equippedWeapon.getStats().damage;
    }
    return this.stats.attack;
  }

  public hasHitEnemy(enemy: Enemy): boolean {
    return this.hitEnemies.includes(enemy);
  }

  public addEnemy(enemy: Enemy): void {
    if (!this.hitEnemies.includes(enemy)) {
      this.hitEnemies.push(enemy);
    }
  }

  // Bow methods
  public startBowDraw(): void {
    console.log('🏹 [Player] Starting bow draw');
    this.isBowDrawing = true;
    this.bowDrawStartTime = Date.now();
    
    if (this.equippedWeapon && this.equippedWeapon.startDrawing) {
      this.equippedWeapon.startDrawing();
    }
  }

  public stopBowDraw(): void {
    console.log('🏹 [Player] Stopping bow draw');
    this.isBowDrawing = false;
    
    if (this.equippedWeapon && this.equippedWeapon.stopDrawing) {
      this.equippedWeapon.stopDrawing();
    }
  }

  // Health and status methods
  public isAlive(): boolean {
    return this.alive && this.stats.health > 0;
  }

  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    console.log(`🏃 [Player] Healed ${amount}, health now: ${this.stats.health}`);
  }

  public takeDamage(amount: number): void {
    this.stats.health = Math.max(0, this.stats.health - amount);
    if (this.stats.health <= 0) {
      this.alive = false;
    }
  }

  // Movement methods
  public setMoving(moving: boolean): void {
    this.isMoving = moving;
  }

  public setSprinting(sprinting: boolean): void {
    this.isSprinting = sprinting;
  }

  public startSprint(): void {
    this.isSprinting = true;
    console.log('🏃 [Player] Sprint started');
  }

  public stopSprint(): void {
    this.isSprinting = false;
    console.log('🏃 [Player] Sprint stopped');
  }

  public getSprinting(): boolean {
    return this.isSprinting;
  }

  public move(direction: THREE.Vector3, deltaTime: number): void {
    const moveSpeed = this.stats.speed * deltaTime;
    const movement = direction.clone().multiplyScalar(moveSpeed);
    this.position.add(movement);
    this.playerGroup.position.copy(this.position);
    
    // Update weapon hitbox position
    if (this.equippedWeapon) {
      this.equippedWeapon.updateHitBoxPosition(this.position);
    }
  }

  public setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.playerGroup.position.copy(position);

    // Update weapon hitbox position
    if (this.equippedWeapon) {
      this.equippedWeapon.updateHitBoxPosition(position);
    }
  }

  // Visual rotation methods
  public setVisualRotation(yaw: number, pitch: number): void {
    this.visualYaw = yaw;
    this.visualPitch = pitch;
    
    // Apply rotation to player body for visual feedback
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = yaw;
    }
    
    console.log(`TALLER Player visual rotation updated - Yaw: ${yaw} Pitch: ${pitch} Weapon equipped: ${!!this.equippedWeapon}`);
  }

  // Getters
  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  public getPlayerBody(): PlayerBody {
    return this.playerBody;
  }

  public getBody(): PlayerBody {
    return this.playerBody;
  }

  public getGroup(): THREE.Group {
    return this.playerGroup;
  }

  // Stats management
  public addExperience(amount: number): void {
    this.stats.experience += amount;
    if (this.stats.experience >= this.stats.experienceToNext) {
      this.levelUp();
    }
  }

  public addGold(amount: number): void {
    this.stats.gold += amount;
  }

  private levelUp(): void {
    this.stats.level++;
    this.stats.experience -= this.stats.experienceToNext;
    this.stats.experienceToNext = Math.floor(this.stats.experienceToNext * 1.2);
    
    // Increase stats
    this.stats.maxHealth += 10;
    this.stats.health = this.stats.maxHealth;
    this.stats.maxStamina += 5;
    this.stats.stamina = this.stats.maxStamina;
    this.stats.attack += 2;
    this.stats.defense += 1;
    
    console.log(`🎉 [Player] Level up! Now level ${this.stats.level}`);
  }

  public dispose(): void {
    if (this.equippedWeapon) {
      this.unequipWeapon();
    }
    
    // Remove player group from scene
    this.scene.remove(this.playerGroup);
  }
}
