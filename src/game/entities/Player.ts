
import * as THREE from 'three';
import { PlayerStats } from '../../types/GameTypes';
import { Attack } from '../combat/Attack';
import { HealthSystem } from '../HealthSystem';
import { Inventory } from '../Inventory';
import { Item } from '../items/Item';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { WeaponAnimationSystem } from '../animation/WeaponAnimationSystem';
import { ExperienceSystem } from '../ExperienceSystem';

interface SimplePlayerBody {
  head: THREE.Mesh | null;
  body: THREE.Mesh | null;
  leftArm: THREE.Mesh | null;
  rightArm: THREE.Mesh | null;
  leftLeg: THREE.Mesh | null;
  rightLeg: THREE.Mesh | null;
  leftElbow: THREE.Mesh | null;
  rightElbow: THREE.Mesh | null;
  leftHand: THREE.Mesh | null;
  rightHand: THREE.Mesh | null;
}

export class Player extends THREE.Group {
  public body: SimplePlayerBody;
  public stats: PlayerStats;
  public currentWeapon: BaseWeapon | null = null;
  public inventory: Inventory;
  public experienceSystem: ExperienceSystem;
  public healthSystem: HealthSystem;
  public isAttacking: boolean = false;
  public isBowDrawing: boolean = false;
  
  private attack: Attack;
  private weaponAnimationSystem: WeaponAnimationSystem;
  private walkCycle: number = 0;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    super();

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Initialize with default stats
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
      attackPower: 10,
      movementSpeed: 5,
      attackDamage: 10,
      inventorySize: 20,
      initialLevel: 1
    };

    this.body = {
      head: null,
      body: null,
      leftArm: null,
      rightArm: null,
      leftLeg: null,
      rightLeg: null,
      leftElbow: null,
      rightElbow: null,
      leftHand: null,
      rightHand: null,
    };

    this.inventory = new Inventory(this.stats.inventorySize);
    this.experienceSystem = new ExperienceSystem(this.stats.initialLevel);
    this.healthSystem = new HealthSystem(this.stats.maxHealth);
    this.weaponAnimationSystem = new WeaponAnimationSystem();
    this.attack = new Attack(this.stats.attackDamage);

    console.log('🎮 [Player] Simple constructor completed');
  }

  public async initialize(): Promise<void> {
    // Simple initialization - no complex model loading
    this.createSimpleBody();
    console.log('🎮 [Player] Simple initialization completed');
  }

  private createSimpleBody(): void {
    // Create simple geometric body for testing
    const headGeometry = new THREE.SphereGeometry(0.2);
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.2);
    const limbGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    
    const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
    
    this.body.head = new THREE.Mesh(headGeometry, material);
    this.body.head.position.set(0, 1.6, 0);
    this.add(this.body.head);
    
    this.body.body = new THREE.Mesh(bodyGeometry, material);
    this.body.body.position.set(0, 1, 0);
    this.add(this.body.body);
    
    // Create arms
    this.body.rightArm = new THREE.Mesh(limbGeometry, material);
    this.body.rightArm.position.set(0.3, 1.2, 0);
    this.add(this.body.rightArm);
    
    this.body.leftArm = new THREE.Mesh(limbGeometry, material);
    this.body.leftArm.position.set(-0.3, 1.2, 0);
    this.add(this.body.leftArm);
    
    // Create simple hand reference (for weapon attachment)
    this.body.rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.05), material);
    this.body.rightHand.position.set(0.3, 0.8, 0);
    this.add(this.body.rightHand);
  }

  public equipWeapon(weapon: BaseWeapon, slot: 'mainHand' | 'offHand'): void {
    if (this.currentWeapon) {
      this.unequipWeapon();
    }

    this.currentWeapon = weapon;
    this.weaponAnimationSystem.setWeaponType(weapon.getConfig().type);

    if (this.body.rightHand) {
      const weaponMesh = weapon.getMesh();
      this.body.rightHand.add(weaponMesh);
      weaponMesh.position.set(0, 0, 0);
      weaponMesh.rotation.set(0, 0, 0);
      this.add(weapon.getHitBox());
      console.log(`Equipped ${weapon.getConfig().name} in ${slot} slot`);
    }
  }

  public unequipWeapon(): void {
    if (this.currentWeapon && this.body.rightHand) {
      this.body.rightHand.remove(this.currentWeapon.getMesh());
      this.remove(this.currentWeapon.getHitBox());
      this.currentWeapon = null;
      this.weaponAnimationSystem.setWeaponType('emptyHands');
      console.log('Unequipped weapon');
    }
  }

  public startBowDraw(): void {
    if (this.currentWeapon && this.currentWeapon.startDrawing) {
      this.isBowDrawing = true;
      this.currentWeapon.startDrawing();
      console.log('🏹 [Player] Bow draw started');
    }
  }

  public stopBowDraw(): void {
    if (this.currentWeapon && this.currentWeapon.stopDrawing) {
      this.isBowDrawing = false;
      this.currentWeapon.stopDrawing();
      console.log('🏹 [Player] Bow draw stopped');
    }
  }

  public attack(): void {
    if (!this.isAttacking) {
      this.isAttacking = true;
      console.log(`⚔️ [Player] Attacking for ${this.attack.getDamage()} damage`);
      
      setTimeout(() => {
        this.isAttacking = false;
        console.log('⚔️ [Player] Attack finished');
      }, 500);
    }
  }

  // Movement methods (simplified)
  public moveForward(deltaTime: number): void {
    this.position.z -= this.stats.movementSpeed * deltaTime;
  }

  public moveBackward(deltaTime: number): void {
    this.position.z += this.stats.movementSpeed * deltaTime;
  }

  public moveLeft(deltaTime: number): void {
    this.position.x -= this.stats.movementSpeed * deltaTime;
  }

  public moveRight(deltaTime: number): void {
    this.position.x += this.stats.movementSpeed * deltaTime;
  }

  public setSprinting(sprinting: boolean): void {
    // Handle sprinting logic
  }

  public update(deltaTime: number): void {
    // Update weapon charge if bow is being drawn
    if (this.isBowDrawing && this.currentWeapon && this.currentWeapon.updateCharge) {
      this.currentWeapon.updateCharge(deltaTime);
      console.log('🏹 [Player] Bow charge update - Active:', this.isBowDrawing, 'Charge:', this.currentWeapon.getChargeLevel?.()?.toFixed(2) || '0.00');
    }
    
    this.updateAnimations(deltaTime);
    this.healthSystem.update(deltaTime);
  }

  private updateAnimations(deltaTime: number): void {
    // Get weapon-specific data for animation
    let weaponChargeLevel = 0;
    if (this.currentWeapon && this.currentWeapon.getChargeLevel) {
      weaponChargeLevel = this.currentWeapon.getChargeLevel();
    }
    
    // Update weapon animations with proper charge level
    this.weaponAnimationSystem.updateWalkAnimation(
      this.body,
      this.walkCycle,
      deltaTime,
      false, // isMoving - simplified
      false, // isSprinting - simplified
      this.isAttacking,
      this.isBowDrawing,
      weaponChargeLevel
    );
    
    console.log(`🎭 [Player] Animation update - Attacking: ${this.isAttacking}, BowDrawing: ${this.isBowDrawing}, ChargeLevel: ${weaponChargeLevel.toFixed(2)}`);
  }

  // Getters for compatibility
  public getStats(): PlayerStats {
    return this.stats;
  }

  public isAlive(): boolean {
    return this.healthSystem.isAlive();
  }

  public heal(amount: number): void {
    this.healthSystem.heal(amount);
  }

  public dispose(): void {
    // Cleanup resources
    if (this.currentWeapon) {
      this.currentWeapon.dispose();
    }
  }
}
