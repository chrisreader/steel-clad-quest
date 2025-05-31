
import * as THREE from 'three';
import { FirstPersonCamera, PlayerBody, PlayerStats } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { Sword } from '../weapons/Sword';
import { HuntingBow } from '../weapons/items/HuntingBow';
import { WeaponAnimationSystem } from '../animation/WeaponAnimationSystem';

export class Player {
  private scene: THREE.Scene;
  private camera: FirstPersonCamera;
  private body: PlayerBody;
  private stats: PlayerStats;
  private isSprinting: boolean = false;
  private isMoving: boolean = false;
  private isJumping: boolean = false;
  private isAttackingFlag: boolean = false;
  private canAttack: boolean = true;
  private lastAttackTime: number = 0;
  private attackCooldown: number = 1000;
  private currentLevel: string = 'level1';
  private group: THREE.Group;
  private GRAVITY: number = 30;
  private JUMP_FORCE: number = 15;
  private MAX_SPEED: number = 10;
  private currentSpeed: THREE.Vector3 = new THREE.Vector3();
  private acceleration: THREE.Vector3 = new THREE.Vector3(1, 0.25, 50);
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private falling: boolean = false;
  private onFloor: boolean = false;
  private raycaster: THREE.Raycaster;
  private sword: Sword;
  private huntingBow: HuntingBow;
  private equippedWeapon: BaseWeapon | null = null;
  private swordHitBox: THREE.Mesh;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private enemiesHit: any[] = [];
  private walkCycle: number = 0;
  private clock: THREE.Clock;
  private weaponAnimationSystem: WeaponAnimationSystem;
  private isDrawingBow: boolean = false;
  
  constructor(scene: THREE.Scene, effectsManager: EffectsManager, audioManager: AudioManager) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Initialize camera
    this.camera = {
      camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
      yaw: 0,
      pitch: 0,
      sensitivity: 0.002,
      bobbing: {
        enabled: true,
        amplitude: 0.05,
        frequency: 3,
        phase: 0
      },
      shake: {
        active: false,
        intensity: 0,
        duration: 0,
        startTime: 0
      }
    };
    
    // Initialize player body
    this.body = {
      group: new THREE.Group(),
      leftArm: new THREE.Group(),
      rightArm: new THREE.Group(),
      leftHand: new THREE.Group(),
      rightHand: new THREE.Group(),
      leftLeg: new THREE.Mesh(),
      rightLeg: new THREE.Mesh(),
      body: new THREE.Mesh(),
      head: new THREE.Mesh()
    };
    
    // Initialize stats with all required properties
    this.stats = {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      gold: 0,
      experience: 0,
      experienceToNext: 100,
      level: 1,
      attack: 10,
      defense: 5,
      speed: 5,
      attackPower: 10,
      movementSpeed: 5,
      attackDamage: 10,
      inventorySize: 20,
      initialLevel: 1
    };
    
    // Initialize player group
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);
    this.scene.add(this.group);
    
    // Initialize raycaster
    this.raycaster = new THREE.Raycaster();
    
    // Initialize clock
    this.clock = new THREE.Clock();
    
    // Initialize weapon animation system
    this.weaponAnimationSystem = new WeaponAnimationSystem();
    
    // Create simple sword and bow without model loading for now
    this.createSimpleWeapons();
  }
  
  private createSimpleWeapons(): void {
    // Create a simple sword configuration
    const swordConfig = {
      id: 'steel_sword',
      name: 'Steel Sword',
      type: 'sword' as const,
      stats: {
        damage: 25,
        attackSpeed: 1.5,
        range: 2,
        durability: 100,
        weight: 3
      }
    };
    
    this.sword = new Sword(swordConfig);
    this.swordHitBox = this.sword.createHitBox();
    
    // Initialize hunting bow
    this.huntingBow = new HuntingBow();
    
    // Set initial weapon
    this.equipWeapon('steel_sword');
  }
  
  public update(deltaTime: number): void {
    this.updateMovement(deltaTime);
    this.updateBobbing(deltaTime);
    this.updateCameraShake(deltaTime);
    this.updateWalkCycle(deltaTime);
  }
  
  private updateMovement(deltaTime: number): void {
    // Ground check
    this.onFloor = true; // Simplified for now
    
    // Apply gravity
    if (!this.onFloor) {
      this.velocity.y -= this.GRAVITY * deltaTime;
      this.falling = true;
    } else {
      this.velocity.y = -0.1;
      this.falling = false;
    }
    
    // Jumping
    if (this.isJumping && this.onFloor) {
      this.velocity.y = this.JUMP_FORCE;
      this.isJumping = false;
    }
    
    // Sprinting
    this.MAX_SPEED = this.isSprinting ? 20 : 10;
    
    // Calculate forward and sideways vectors
    const forwardVector = new THREE.Vector3(0, 0, -1);
    forwardVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.yaw);
    forwardVector.normalize();
    const sideVector = new THREE.Vector3(1, 0, 0);
    sideVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.yaw);
    sideVector.normalize();
    
    // Get movement direction
    const movementDirection = new THREE.Vector3();
    if (this.currentSpeed.z !== 0) movementDirection.addScaledVector(forwardVector, this.currentSpeed.z * this.MAX_SPEED);
    if (this.currentSpeed.x !== 0) movementDirection.addScaledVector(sideVector, this.currentSpeed.x * this.MAX_SPEED);
    
    // Normalize movement direction
    movementDirection.normalize();
    
    // Apply acceleration
    this.velocity.add(movementDirection.multiplyScalar(this.acceleration.z * deltaTime));
    
    // Apply friction
    this.velocity.x -= this.velocity.x * 8.0 * deltaTime;
    this.velocity.z -= this.velocity.z * 8.0 * deltaTime;
    
    // Limit speed
    if (this.velocity.length() > this.MAX_SPEED) {
      this.velocity.normalize().multiplyScalar(this.MAX_SPEED);
    }
    
    // Apply velocity
    this.group.position.x += this.velocity.x * deltaTime;
    this.group.position.y += this.velocity.y * deltaTime;
    this.group.position.z += this.velocity.z * deltaTime;
    
    // Update camera position
    this.camera.camera.position.y = 1.5;
  }
  
  private updateBobbing(deltaTime: number): void {
    if (!this.camera.bobbing.enabled || !this.isMoving || !this.onFloor) return;
    
    this.camera.bobbing.phase += deltaTime * this.camera.bobbing.frequency;
    
    this.camera.camera.position.x = Math.sin(this.camera.bobbing.phase) * this.camera.bobbing.amplitude;
    this.camera.camera.position.y += Math.cos(this.camera.bobbing.phase * 2) * this.camera.bobbing.amplitude * 0.5;
  }
  
  private updateCameraShake(deltaTime: number): void {
    if (!this.camera.shake.active) return;
    
    const elapsedTime = this.clock.getElapsedTime() - this.camera.shake.startTime;
    
    if (elapsedTime < this.camera.shake.duration) {
      const shakeFactor = 1 - (elapsedTime / this.camera.shake.duration);
      
      this.camera.camera.rotation.x += (Math.random() - 0.5) * this.camera.shake.intensity * shakeFactor;
      this.camera.camera.rotation.y += (Math.random() - 0.5) * this.camera.shake.intensity * shakeFactor;
      this.camera.camera.rotation.z += (Math.random() - 0.5) * this.camera.shake.intensity * shakeFactor;
    } else {
      this.camera.shake.active = false;
      this.camera.camera.rotation.set(0, 0, 0);
    }
  }
  
  private updateWalkCycle(deltaTime: number): void {
    if (this.isMoving && this.onFloor) {
      const walkSpeed = this.weaponAnimationSystem.getWalkCycleSpeed();
      this.walkCycle += deltaTime * walkSpeed;
    }
  }
  
  public rotateCamera(yawChange: number, pitchChange: number): void {
    this.camera.yaw -= yawChange;
    this.camera.pitch -= pitchChange;
    this.camera.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.pitch));
    
    this.camera.camera.rotation.set(this.camera.pitch, this.camera.yaw, 0);
  }
  
  public move(x: number, z: number): void;
  public move(direction: THREE.Vector3, deltaTime: number): void;
  public move(xOrDirection: number | THREE.Vector3, zOrDeltaTime?: number): void {
    if (typeof xOrDirection === 'number' && typeof zOrDeltaTime === 'number') {
      // Original signature
      this.isMoving = xOrDirection !== 0 || zOrDeltaTime !== 0;
      this.currentSpeed.set(xOrDirection, 0, zOrDeltaTime);
    } else if (xOrDirection instanceof THREE.Vector3 && typeof zOrDeltaTime === 'number') {
      // New signature for MovementSystem
      this.isMoving = xOrDirection.length() > 0;
      const moveSpeed = this.stats.movementSpeed * zOrDeltaTime;
      this.group.position.add(xOrDirection.clone().multiplyScalar(moveSpeed));
    }
  }
  
  public jump(): void {
    this.isJumping = true;
  }
  
  public sprint(sprint: boolean): void {
    this.isSprinting = sprint;
  }
  
  // New sprint methods for MovementSystem
  public getSprinting(): boolean {
    return this.isSprinting;
  }
  
  public startSprint(): void {
    this.isSprinting = true;
  }
  
  public stopSprint(): void {
    this.isSprinting = false;
  }
  
  public startSwordSwing(): void {
    if (!this.canAttack) return;
    
    this.isAttackingFlag = true;
    this.canAttack = false;
    this.enemiesHit = [];
    
    // Play sword swing animation
    this.sword.swing(this.body.rightHand);
    
    // Play sword swing sound
    this.audioManager.play('sword_swing');
    
    // Apply camera shake
    this.applyCameraShake(0.01, 0.2);
    
    // Set timeout to stop attack
    setTimeout(() => {
      this.isAttackingFlag = false;
      this.canAttack = true;
    }, 768);
  }
  
  public startBowDraw(): void {
    if (this.equippedWeapon instanceof HuntingBow) {
      this.isDrawingBow = true;
      this.equippedWeapon.startDrawing();
    }
  }
  
  public stopBowDraw(): void {
    if (this.equippedWeapon instanceof HuntingBow) {
      this.isDrawingBow = false;
      this.equippedWeapon.stopDrawing();
    }
  }
  
  public isAttacking(): boolean {
    return this.isAttackingFlag;
  }
  
  public applyCameraShake(intensity: number, duration: number): void {
    this.camera.shake.active = true;
    this.camera.shake.intensity = intensity;
    this.camera.shake.duration = duration;
    this.camera.shake.startTime = this.clock.getElapsedTime();
  }
  
  public addEnemy(enemy: any): void {
    this.enemiesHit.push(enemy);
  }
  
  public hasHitEnemy(enemy: any): boolean {
    return this.enemiesHit.includes(enemy);
  }
  
  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }
  
  public addGold(value: number): void {
    this.stats.gold += value;
    console.log(`💰 Gold: ${this.stats.gold}`);
  }
  
  public addExperience(value: number): void {
    this.stats.experience += value;
    console.log(`✨ Experience: ${this.stats.experience}`);
    
    if (this.stats.experience >= this.stats.experienceToNext) {
      this.levelUp();
    }
  }
  
  private levelUp(): void {
    this.stats.level++;
    this.stats.experience = 0;
    this.stats.experienceToNext = Math.ceil(this.stats.experienceToNext * 1.5);
    console.log(`🎉 Leveled up to level ${this.stats.level}`);
  }
  
  public equipWeapon(weaponId: string): void {
    console.log(`🗡️ [Player] Equipping weapon: ${weaponId}`);
    
    if (weaponId === 'steel_sword' || weaponId === 'iron_sword' || weaponId === 'wooden_sword') {
      this.equippedWeapon = this.sword;
      this.weaponAnimationSystem.setWeaponType('melee');
      this.body.leftHand.remove(this.huntingBow.getMesh());
      this.body.rightHand.add(this.sword.getMesh());
      this.body.rightHand.add(this.swordHitBox);
    } else if (weaponId === 'hunting_bow') {
      this.equippedWeapon = this.huntingBow;
      this.weaponAnimationSystem.setWeaponType('bow');
      this.body.rightHand.remove(this.sword.getMesh());
      this.body.rightHand.remove(this.swordHitBox);
      this.body.leftHand.add(this.huntingBow.getMesh());
    }
    
    this.weaponAnimationSystem.resetToWeaponStance(this.body);
  }
  
  public unequipWeapon(): void {
    console.log('🗡️ [Player] Unequipping weapon');
    this.equippedWeapon = null;
    this.body.rightHand.remove(this.sword.getMesh());
    this.body.rightHand.remove(this.swordHitBox);
    this.body.leftHand.remove(this.huntingBow.getMesh());
    this.weaponAnimationSystem.setWeaponType('melee');
    this.weaponAnimationSystem.resetToWeaponStance(this.body);
  }
  
  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
  }

  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    console.log(`❤️ [Player] Healed ${amount} HP. Current health: ${this.stats.health}`);
  }

  public isAlive(): boolean {
    return this.stats.health > 0;
  }
  
  // Add public accessor methods for GameEngine
  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }
  
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  public getStats(): PlayerStats {
    return this.stats;
  }
  
  public getBowChargeLevel(): number {
    const currentWeapon = this.getEquippedWeapon();
    if (currentWeapon && currentWeapon.getConfig().type === 'bow' && currentWeapon.getChargeLevel) {
      return currentWeapon.getChargeLevel();
    }
    return 0;
  }
  
  public updateWeaponAnimationWithBowCharge(deltaTime: number): void {
    const bowChargeLevel = this.getBowChargeLevel();
    this.weaponAnimationSystem.updateWalkAnimation(
      this.body,
      this.walkCycle,
      deltaTime,
      this.isMoving,
      this.isSprinting,
      this.isAttacking(),
      this.isDrawingBow,
      bowChargeLevel
    );
  }
}
