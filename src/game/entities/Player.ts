
import * as THREE from 'three';
// Remove problematic import and create a simple capsule alternative
// import { Capsule } from 'three/examples/jsm/math/Capsule';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { PlayerStats } from '../../types/GameTypes';

// Simple capsule replacement to avoid import issues
class SimpleCapsule {
  public start: THREE.Vector3;
  public end: THREE.Vector3;
  public radius: number;

  constructor(start: THREE.Vector3, end: THREE.Vector3, radius: number) {
    this.start = start.clone();
    this.end = end.clone();
    this.radius = radius;
  }
}

interface PlayerBody {
  body: THREE.Mesh | null;
  rightArm: THREE.Mesh | null;
  rightElbow: THREE.Mesh | null;
  rightWrist: THREE.Mesh | null;
  leftArm: THREE.Mesh | null;
}

interface WeaponSwingAnimation {
  isActive: boolean;
  startTime: number;
  clock: THREE.Clock;
}

export class Player {
  public playerCollider: SimpleCapsule;
  public playerVelocity: THREE.Vector3 = new THREE.Vector3();
  public playerDirection: THREE.Vector3 = new THREE.Vector3();
  public playerOnFloor: boolean = false;
  public health: number = 100;
  public maxHealth: number = 100;
  public attackPower: number = 20;
  public speed: number = 10;
  public canJump: boolean = true;
  public gold: number = 0;
  public experience: number = 0;
  public level: number = 1;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public isAttackingVar: boolean = false;
  public isBlocking: boolean = false;
  public isDead: boolean = false;
  public lastAttackTime: number = 0;
  public equippedWeapon: BaseWeapon | null = null;
  public weaponHolstered: boolean = true;
  public playerBody: PlayerBody = {
    body: null,
    rightArm: null,
    rightElbow: null,
    rightWrist: null,
    leftArm: null
  };
  public weaponSwing: WeaponSwingAnimation = {
    isActive: false,
    startTime: 0,
    clock: new THREE.Clock()
  };
  
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private enemiesHitThisSwing: Set<any> = new Set();
  private swordHitBox: THREE.Mesh;
  private bowDrawStartTime: number = 0;
  private bowDrawProgress: number = 0;
  private bowFullyDrawn: boolean = false;
  private playerGroup: THREE.Group;
  private isSprinting: boolean = false;
  
  constructor(
    scene: THREE.Scene,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Setup player collider with simple capsule
    this.playerCollider = new SimpleCapsule(new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(0, 1.9, 0), 0.35);
    
    // Create player group
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);
    
    // Load player model
    this.loadModel();
    
    // Create sword hitbox
    this.swordHitBox = this.createSwordHitBox();
    this.scene.add(this.swordHitBox);
    
    console.log('Player initialized');
  }
  
  public getStats(): PlayerStats {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      gold: this.gold,
      experience: this.experience,
      level: this.level,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      experienceToNext: this.getRequiredExperienceForNextLevel() - this.experience,
      attack: this.attackPower,
      defense: 5, // Default defense value
      speed: this.speed,
      attackPower: this.attackPower
    };
  }
  
  public isAlive(): boolean {
    return !this.isDead && this.health > 0;
  }
  
  public getBody(): PlayerBody {
    return this.playerBody;
  }
  
  public setVisualRotation(yaw: number, pitch: number): void {
    // Update player visual rotation based on camera
    if (this.playerGroup) {
      this.playerGroup.rotation.y = yaw;
    }
  }
  
  public dispose(): void {
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
    }
    if (this.swordHitBox) {
      this.scene.remove(this.swordHitBox);
    }
    if (this.equippedWeapon) {
      this.scene.remove(this.equippedWeapon.getMesh());
    }
  }
  
  public getGroup(): THREE.Group {
    return this.playerGroup;
  }
  
  public startSprint(): void {
    this.isSprinting = true;
    console.log("🏃 [Player] Started sprinting");
  }
  
  public stopSprint(): void {
    this.isSprinting = false;
    console.log("🏃 [Player] Stopped sprinting");
  }
  
  public getSprinting(): boolean {
    return this.isSprinting;
  }
  
  public move(direction: THREE.Vector3, deltaTime: number): void {
    const moveSpeed = this.isSprinting ? this.speed * 1.5 : this.speed;
    const movement = direction.clone().multiplyScalar(moveSpeed * deltaTime);
    
    // Update collider position
    this.playerCollider.start.add(movement);
    this.playerCollider.end.add(movement);
    
    // Update player group position
    if (this.playerGroup) {
      this.playerGroup.position.copy(this.playerCollider.start);
    }
  }
  
  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }
  
  public getSwordSwing(): WeaponSwingAnimation {
    return this.weaponSwing;
  }
  
  public loadModel(): void {
    // Create a simple placeholder for now - in a real implementation this would load a GLTF model
    const geometry = new THREE.CapsuleGeometry(0.35, 1.8, 4, 8);
    const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const playerMesh = new THREE.Mesh(geometry, material);
    
    this.playerGroup.add(playerMesh);
    
    // Create placeholder body parts
    this.playerBody = {
      body: playerMesh,
      rightArm: new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), material),
      rightElbow: new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), material),
      rightWrist: new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), material),
      leftArm: new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), material)
    };
    
    // Position arms
    if (this.playerBody.rightArm) {
      this.playerBody.rightArm.position.set(0.4, 0.5, 0);
      this.playerGroup.add(this.playerBody.rightArm);
    }
    
    if (this.playerBody.leftArm) {
      this.playerBody.leftArm.position.set(-0.4, 0.5, 0);
      this.playerGroup.add(this.playerBody.leftArm);
    }
    
    console.log('Player model loaded');
  }
  
  public addEnemy(enemy: any): void {
    if (!this.enemiesHitThisSwing.has(enemy)) {
      this.enemiesHitThisSwing.add(enemy);
    }
  }
  
  public hasHitEnemy(enemy: any): boolean {
    return this.enemiesHitThisSwing.has(enemy);
  }
  
  public createSwordHitBox(): THREE.Mesh {
    if (this.equippedWeapon) {
      return this.equippedWeapon.createHitBox();
    }
    
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 2.2);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    return new THREE.Mesh(geometry, material);
  }
  
  public equipWeapon(weaponId: string): void {
    console.log(`🗡️ [Player] Equipping weapon: ${weaponId}`);
    // For now, just create a simple sword representation
    if (weaponId.includes('sword')) {
      const swordGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.5);
      const swordMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
      const swordMesh = new THREE.Mesh(swordGeometry, swordMaterial);
      
      // Position sword in right hand
      if (this.playerBody.rightWrist) {
        swordMesh.position.set(0, 0, 0.8);
        this.playerBody.rightWrist.add(swordMesh);
      }
    }
  }
  
  public unequipWeapon(): void {
    console.log('🗡️ [Player] Unequipping weapon');
    if (this.equippedWeapon) {
      this.scene.remove(this.equippedWeapon.getMesh());
      this.equippedWeapon = null;
      this.weaponHolstered = true;
    }
  }
  
  public startSwordSwing(): void {
    if (this.weaponSwing.isActive) {
      console.log("🗡️ [Player] Cannot start sword swing - already swinging");
      return;
    }
    
    this.weaponSwing.isActive = true;
    this.weaponSwing.startTime = this.weaponSwing.clock.getElapsedTime();
    this.enemiesHitThisSwing.clear();
    
    console.log("🗡️ [Player] Started sword swing");
  }
  
  public stopSwordSwing(): void {
    this.weaponSwing.isActive = false;
  }
  
  public startBowDraw(): void {
    this.bowDrawStartTime = Date.now();
    this.bowDrawProgress = 0;
    this.bowFullyDrawn = false;
    console.log("🏹 [Player] Started bow draw");
  }
  
  public stopBowDraw(): void {
    this.bowDrawProgress = Math.min((Date.now() - this.bowDrawStartTime) / 1000, 1);
    this.bowFullyDrawn = this.bowDrawProgress >= 1;
    console.log(`🏹 [Player] Stopped bow draw at ${this.bowDrawProgress * 100}%`);
  }
  
  public getBowDrawProgress(): number {
    return this.bowDrawProgress;
  }
  
  public isBowFullyDrawn(): boolean {
    return this.bowFullyDrawn;
  }
  
  public update(deltaTime: number, isMoving: boolean = false): void {
    // Update weapon animations if equipped and method exists
    if (this.equippedWeapon && 'updateAnimation' in this.equippedWeapon && typeof this.equippedWeapon.updateAnimation === 'function') {
      this.equippedWeapon.updateAnimation();
    }
    
    // Update stamina
    if (this.isSprinting && isMoving) {
      this.stamina = Math.max(0, this.stamina - 20 * deltaTime);
      if (this.stamina <= 0) {
        this.stopSprint();
      }
    } else if (!this.isSprinting) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 30 * deltaTime);
    }
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.playerCollider.start.set(x, y, z);
    this.playerCollider.end.set(x, y + 1, z);
    if (this.playerGroup) {
      this.playerGroup.position.set(x, y, z);
    }
  }
  
  public getPosition(): THREE.Vector3 {
    return this.playerCollider.start.clone();
  }
  
  public getRotation(): number {
    return this.playerGroup ? this.playerGroup.rotation.y : 0;
  }
  
  public takeDamage(damage: number): void {
    this.health -= damage;
    this.health = Math.max(0, this.health);
    
    if (this.health <= 0) {
      this.die();
    }
    
    console.log(`Player took ${damage} damage. Health: ${this.health}`);
  }
  
  public heal(amount: number): void {
    this.health += amount;
    this.health = Math.min(this.maxHealth, this.health);
    console.log(`Player healed ${amount} health. Health: ${this.health}`);
  }
  
  public addGold(amount: number): void {
    this.gold += amount;
    console.log(`Player found ${amount} gold. Total gold: ${this.gold}`);
  }
  
  public removeGold(amount: number): void {
    this.gold -= amount;
    this.gold = Math.max(0, this.gold);
    console.log(`Player spent ${amount} gold. Total gold: ${this.gold}`);
  }
  
  public addExperience(amount: number): void {
    this.experience += amount;
    console.log(`Player gained ${amount} experience. Total experience: ${this.experience}`);
    
    const requiredExperience = this.getRequiredExperienceForNextLevel();
    if (this.experience >= requiredExperience) {
      this.levelUp();
    }
  }
  
  private getRequiredExperienceForNextLevel(): number {
    return 100 * this.level;
  }
  
  private levelUp(): void {
    this.level++;
    this.experience = 0;
    this.maxHealth += 10;
    this.health = this.maxHealth;
    this.attackPower += 2;
    this.speed += 0.5;
    
    this.effectsManager.createLevelUpEffect(this.getPosition());
    this.audioManager.play('level_up');
    
    console.log(`Player leveled up! Level: ${this.level}, Max Health: ${this.maxHealth}, Attack Power: ${this.attackPower}, Speed: ${this.speed}`);
  }
  
  private die(): void {
    this.isDead = true;
    console.log('Player died');
  }
  
  public respawn(position: THREE.Vector3): void {
    this.isDead = false;
    this.health = this.maxHealth;
    this.setPosition(position.x, position.y, position.z);
    console.log('Player respawned');
  }
  
  public isAttacking(): boolean {
    return this.weaponSwing.isActive;
  }
  
  public setAttackPower(attackPower: number): void {
    this.attackPower = attackPower;
  }
  
  public getAttackPower(): number {
    return this.attackPower;
  }
  
  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
  }
}
