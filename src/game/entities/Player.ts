
import * as THREE from 'three';
import { PlayerBody, PlayerStats, WeaponSwingAnimation } from '../../types/GameTypes';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { WeaponManager } from '../weapons/WeaponManager';
import { WeaponAnimationSystem } from '../animation/WeaponAnimationSystem';
import { SwordSwingAnimation } from '../animation/animations/SwordSwingAnimation';

export class Player {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private playerBody: PlayerBody;
  private weaponManager: WeaponManager;
  private weaponAnimationSystem: WeaponAnimationSystem;
  private swordSwingAnimation: SwordSwingAnimation | null = null;
  
  // Player state
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private isSprinting: boolean = false;
  private isAttackingState: boolean = false;
  private health: number = 100;
  private maxHealth: number = 100;
  private stamina: number = 100;
  private maxStamina: number = 100;
  private alive: boolean = true;
  
  // Combat state
  private hitEnemies: Set<any> = new Set();
  private weaponSwing: WeaponSwingAnimation;
  
  // Player stats
  private stats: PlayerStats = {
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
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.group = new THREE.Group();
    
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
      progress: 0
    };
    
    this.weaponManager = new WeaponManager(scene);
    this.weaponAnimationSystem = new WeaponAnimationSystem();
    
    this.createPlayerBody();
    this.scene.add(this.group);
    
    console.log('🏃 [Player] Player created successfully');
  }
  
  private createPlayerBody(): void {
    // Create player body parts
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 6);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBAE });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBAE });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, 1.2, 0);
    leftArm.rotation.z = Math.PI / 8;
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 8;
    rightArm.rotation.x = Math.PI / 3; // Ready position for weapon
    
    // Elbows and wrists as separate objects for articulation
    const elbowGeometry = new THREE.SphereGeometry(0.08, 6, 4);
    const elbowMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDBAE });
    
    const rightElbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
    rightElbow.position.set(0.5, 0.8, 0);
    rightElbow.rotation.x = -0.05; // Slight bend
    
    const leftElbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
    leftElbow.position.set(-0.5, 0.8, 0);
    
    const rightWrist = new THREE.Mesh(elbowGeometry, elbowMaterial);
    rightWrist.position.set(0.5, 0.4, 0);
    rightWrist.rotation.x = -Math.PI / 4;
    
    const leftWrist = new THREE.Mesh(elbowGeometry, elbowMaterial);
    leftWrist.position.set(-0.5, 0.4, 0);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, -0.4, 0);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, -0.4, 0);
    
    // Add all parts to group
    this.group.add(body);
    this.group.add(head);
    this.group.add(leftArm);
    this.group.add(rightArm);
    this.group.add(leftElbow);
    this.group.add(rightElbow);
    this.group.add(leftWrist);
    this.group.add(rightWrist);
    this.group.add(leftLeg);
    this.group.add(rightLeg);
    
    // Store references in playerBody
    this.playerBody = {
      body: body as any,
      head: head as any,
      leftArm: leftArm as any,
      rightArm: rightArm as any,
      leftElbow: leftElbow as any,
      rightElbow: rightElbow as any,
      leftWrist: leftWrist as any,
      rightWrist: rightWrist as any,
      leftLeg: leftLeg as any,
      rightLeg: rightLeg as any
    };
    
    console.log('🏃 [Player] Player body created with articulated joints');
  }
  
  public startSwordSwing(): void {
    const equippedWeapon = this.weaponManager.getEquippedWeapon();
    if (!equippedWeapon) {
      console.log('🗡️ [Player] No weapon equipped, cannot swing');
      return;
    }
    
    const weaponConfig = equippedWeapon.getConfig();
    if (!weaponConfig.swingAnimation) {
      console.log('🗡️ [Player] Weapon has no swing animation config');
      return;
    }
    
    console.log('🗡️ [Player] *** STARTING SWORD SWING ***');
    console.log('🗡️ [Player] Weapon:', weaponConfig.name);
    console.log('🗡️ [Player] Animation config:', weaponConfig.swingAnimation);
    
    // Reset weapon swing state
    this.weaponSwing.isActive = true;
    this.weaponSwing.startTime = this.weaponSwing.clock.getElapsedTime();
    this.weaponSwing.duration = weaponConfig.swingAnimation.duration;
    this.weaponSwing.phases = weaponConfig.swingAnimation.phases;
    this.weaponSwing.rotations = weaponConfig.swingAnimation.rotations;
    this.isAttackingState = true;
    this.hitEnemies.clear();
    
    // Create new sword swing animation instance
    this.swordSwingAnimation = new SwordSwingAnimation(
      this.weaponSwing,
      this.playerBody,
      equippedWeapon
    );
    
    console.log('🗡️ [Player] SwordSwingAnimation created and sword swing started');
  }
  
  public update(deltaTime: number): void {
    // Update weapon swing animation
    if (this.weaponSwing.isActive && this.swordSwingAnimation) {
      this.swordSwingAnimation.update();
      
      // Check if animation is complete
      if (!this.weaponSwing.isActive) {
        this.isAttackingState = false;
        this.swordSwingAnimation = null;
        console.log('🗡️ [Player] Sword swing animation completed');
      }
    }
    
    // Update weapon manager
    this.weaponManager.update(deltaTime);
  }
  
  // Combat methods
  public getAttackPower(): number {
    const weapon = this.weaponManager.getEquippedWeapon();
    return weapon ? weapon.getStats().damage : this.stats.attackPower;
  }
  
  public getSwordHitBox(): THREE.Object3D {
    const weapon = this.weaponManager.getEquippedWeapon();
    return weapon ? weapon.getMesh() : this.group;
  }
  
  public hasHitEnemy(enemy: any): boolean {
    return this.hitEnemies.has(enemy);
  }
  
  public addEnemy(enemy: any): void {
    this.hitEnemies.add(enemy);
  }
  
  public isAttacking(): boolean {
    return this.isAttackingState;
  }
  
  // Movement methods
  public move(direction: THREE.Vector3, deltaTime?: number): void {
    this.velocity.copy(direction);
    this.group.position.add(direction);
    this.position.copy(this.group.position);
  }
  
  public setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.group.position.copy(position);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public setVisualRotation(rotation: number, speed?: number): void {
    this.group.rotation.y = rotation;
  }
  
  // Sprint methods
  public startSprint(): void {
    this.isSprinting = true;
  }
  
  public stopSprint(): void {
    this.isSprinting = false;
  }
  
  public getSprinting(): boolean {
    return this.isSprinting;
  }
  
  public setSprinting(sprinting: boolean): void {
    this.isSprinting = sprinting;
  }
  
  // Health methods
  public isAlive(): boolean {
    return this.alive && this.health > 0;
  }
  
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
  
  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
    }
  }
  
  // Weapon methods
  public equipWeapon(weaponId: string): void {
    this.weaponManager.equipWeapon(weaponId, this.playerBody.rightWrist);
  }
  
  public unequipWeapon(): void {
    this.weaponManager.unequipWeapon();
  }
  
  public getEquippedWeapon(): BaseWeapon | null {
    return this.weaponManager.getEquippedWeapon();
  }
  
  // Getters
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  public getBody(): PlayerBody {
    return this.playerBody;
  }
  
  public getStats(): PlayerStats {
    return { ...this.stats };
  }
  
  public addGold(amount: number): void {
    this.stats.gold += amount;
  }
  
  public addExperience(amount: number): void {
    this.stats.experience += amount;
    // Level up logic could go here
  }
  
  // Bow methods (stubs for compatibility)
  public startBowDraw(): void {
    console.log('🏹 [Player] Bow draw started');
  }
  
  public stopBowDraw(): void {
    console.log('🏹 [Player] Bow draw stopped');
  }
  
  public dispose(): void {
    this.weaponManager.dispose();
    this.scene.remove(this.group);
  }
}
