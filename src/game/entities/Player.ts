import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { Capsule } from 'three/examples/jsm/math/Capsule';
import { Weapon, BaseBow, Sword } from '../weapons';
import { WeaponConfig } from '../weapons/BaseWeapon';
import { BowConfig } from '../weapons/Bow';
import { SwordConfig } from '../weapons/Sword';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { LevelManager } from '../managers/LevelManager';

interface PlayerBody {
  body: THREE.Mesh | null;
  rightArm: THREE.Mesh | null;
  rightElbow: THREE.Mesh | null;
  rightWrist: THREE.Mesh | null;
}

interface WeaponSwingAnimation {
  isActive: boolean;
  startTime: number;
  clock: THREE.Clock;
}

export class Player {
  public playerCollider: Capsule;
  public playerVelocity: THREE.Vector3 = new THREE.Vector3();
  public playerDirection: THREE.Vector3 = new THREE.Vector3();
  public playerOnFloor: boolean = false;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  public scene: THREE.Scene;
  public health: number = 100;
  public maxHealth: number = 100;
  public attackPower: number = 20;
  public speed: number = 10;
  public canJump: boolean = true;
  public gold: number = 0;
  public experience: number = 0;
  public level: number = 1;
  public isAttackingVar: boolean = false;
  public isBlocking: boolean = false;
  public isDead: boolean = false;
  public lastAttackTime: number = 0;
  public equippedWeapon: Weapon | null = null;
  public weaponHolstered: boolean = true;
  public playerBody: PlayerBody = {
    body: null,
    rightArm: null,
    rightElbow: null,
    rightWrist: null
  };
  public weaponSwing: WeaponSwingAnimation = {
    isActive: false,
    startTime: 0,
    clock: new THREE.Clock()
  };
  private enemiesHitThisSwing: Set<any> = new Set();
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private levelManager: LevelManager;
  private swordHitBox: THREE.Mesh;
  private bowDrawStartTime: number = 0;
  private bowDrawProgress: number = 0;
  private bowFullyDrawn: boolean = false;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    levelManager: LevelManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.levelManager = levelManager;
    
    // Setup player collider
    this.playerCollider = new Capsule(new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(0, 1.9, 0), 0.35);
    
    // Setup camera controls
    this.controls = new OrbitControls(camera, scene.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 5;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(0, 1.2, 0);
    
    // Load player model
    this.loadModel();
    
    // Create sword hitbox
    this.swordHitBox = this.createSwordHitBox();
    this.scene.add(this.swordHitBox);
    
    console.log('Player initialized');
  }
  
  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }
  
  public getSwordSwing(): WeaponSwingAnimation {
    return this.weaponSwing;
  }
  
  public loadModel(): void {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/models/character/scene.gltf', (gltf) => {
      const model = gltf.scene;
      model.traverse((object: any) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      
      model.scale.set(0.02, 0.02, 0.02);
      model.rotation.y = Math.PI;
      this.scene.add(model);
      
      // Assign player body parts
      this.playerBody = {
        body: model.getObjectByName('Body') as THREE.Mesh,
        rightArm: model.getObjectByName('RightArm') as THREE.Mesh,
        rightElbow: model.getObjectByName('RightForeArm') as THREE.Mesh,
        rightWrist: model.getObjectByName('RightHand') as THREE.Mesh
      };
      
      console.log('Player model loaded');
    }, undefined, (error) => {
      console.error('An error happened while loading the player model', error);
    });
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
  
  public equipWeapon(weapon: Weapon): void {
    if (this.equippedWeapon) {
      this.unequipWeapon();
    }
    
    this.equippedWeapon = weapon;
    this.scene.add(weapon.getMesh());
    this.weaponHolstered = false;
    
    // Update sword hitbox
    this.scene.remove(this.swordHitBox);
    this.swordHitBox = this.createSwordHitBox();
    this.scene.add(this.swordHitBox);
    
    console.log(`Equipped weapon: ${weapon.getConfig().name}`);
  }
  
  public unequipWeapon(): void {
    if (this.equippedWeapon) {
      this.scene.remove(this.equippedWeapon.getMesh());
      this.equippedWeapon = null;
      this.weaponHolstered = true;
      
      // Update sword hitbox
      this.scene.remove(this.swordHitBox);
      this.swordHitBox = this.createSwordHitBox();
      this.scene.add(this.swordHitBox);
      
      console.log('Unequipped weapon');
    }
  }
  
  public startSwordSwing(): void {
    if (!this.equippedWeapon || this.weaponSwing.isActive) {
      console.log("🗡️ [Player] Cannot start sword swing - no weapon or already swinging");
      return;
    }
    
    const weaponType = this.equippedWeapon.getConfig().type;
    if (!['sword', 'axe', 'mace'].includes(weaponType)) {
      console.log("🗡️ [Player] Cannot start sword swing - weapon is not melee type");
      return;
    }
    
    this.weaponSwing.isActive = true;
    this.weaponSwing.startTime = this.weaponSwing.clock.getElapsedTime();
    this.enemiesHitThisSwing.clear();
    
    // Initialize StandardSwordBehavior with EffectsManager if not already done
    const sword = this.equippedWeapon as any;
    if (sword.initializeStandardBehavior && !sword.standardBehavior) {
      sword.initializeStandardBehavior(this.weaponSwing, this.playerBody, this.effectsManager);
      console.log("🗡️ [Player] Initialized StandardSwordBehavior with EffectsManager");
    }
    
    console.log("🗡️ [Player] Started sword swing with standardized system");
  }
  
  public stopSwordSwing(): void {
    this.weaponSwing.isActive = false;
  }
  
  public startBowDraw(): void {
    if (!this.equippedWeapon || this.equippedWeapon.getConfig().type !== 'bow') {
      console.warn("🏹 [Player] Cannot start bow draw - no bow equipped");
      return;
    }
    
    this.bowDrawStartTime = Date.now();
    this.bowDrawProgress = 0;
    this.bowFullyDrawn = false;
    console.log("🏹 [Player] Started bow draw");
  }
  
  public stopBowDraw(): void {
    if (!this.equippedWeapon || this.equippedWeapon.getConfig().type !== 'bow') {
      console.warn("🏹 [Player] Cannot stop bow draw - no bow equipped");
      return;
    }
    
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
  
  public update(deltaTime: number): void {
    this.controls.update();
    
    if (this.equippedWeapon && ['sword', 'axe', 'mace'].includes(this.equippedWeapon.getConfig().type)) {
      this.equippedWeapon.updateAnimation();
    }
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.playerCollider.start.set(x, y, z);
    this.playerCollider.end.set(x, y + 1, z);
    this.camera.position.set(x, y + 0.8, z);
    this.controls.target.set(x, y + 1.2, z);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.playerCollider.start.clone();
  }
  
  public getRotation(): number {
    return this.controls.getAzimuthalAngle();
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
    this.levelManager.updateLevelUI();
    
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
  
  public getEquippedWeapon(): Weapon | null {
    return this.equippedWeapon;
  }
}

