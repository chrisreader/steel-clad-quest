import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Capsule } from 'three/examples/jsm/math/Capsule';
import { Octree } from 'three/examples/jsm/math/Octree';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils';
import { PlayerAnimations } from '../../types/AnimationTypes';
import { PlayerBody, PlayerConfig, PlayerEquipment, PlayerSettings, PlayerStats } from '../../types/GameTypes';
import { Attack } from '../combat/Attack';
import { HealthSystem } from '../HealthSystem';
import { Inventory } from '../Inventory';
import { Item } from '../items/Item';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { WeaponAnimationSystem } from '../animation/WeaponAnimationSystem';
import { ExperienceSystem } from '../ExperienceSystem';

interface AnimationConfig {
  idle: string;
  walk: string;
  run: string;
  attack: string;
  die: string;
}

export class Player extends THREE.Group {
  public body: PlayerBody;
  public stats: PlayerStats;
  public settings: PlayerSettings;
  public equipment: PlayerEquipment = {
    head: null,
    body: null,
    legs: null,
    feet: null,
    mainHand: null,
    offHand: null
  };
  public currentWeapon: BaseWeapon | null = null;
  public inventory: Inventory;
  public experienceSystem: ExperienceSystem;
  public healthSystem: HealthSystem;
  public isAttacking: boolean = false;
  public isBowDrawing: boolean = false;
  private config: PlayerConfig;
  private animations: PlayerAnimations = {} as PlayerAnimations;
  private mixer: THREE.AnimationMixer;
  private clock: THREE.Clock;
  private model: THREE.Group;
  private animationsConfig: AnimationConfig;
  private currentAction: THREE.AnimationAction | null = null;
  private movementSpeed: number = 0;
  private sprintSpeedMultiplier: number = 1.75;
  private gravity: number = 25;
  private playerCollider: Capsule;
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private playerDirection: THREE.Vector3 = new THREE.Vector3();
  private movementSystem: any; // Replace 'any' with the actual type of your movement system
  private octree: Octree;
  private canJump: boolean = false;
  private walkCycle: number = 0;
  private camera: THREE.Camera;
  private attack: Attack;
  private weaponAnimationSystem: WeaponAnimationSystem;

  constructor(
    config: PlayerConfig,
    camera: THREE.Camera,
    octree: Octree
  ) {
    super();

    this.config = config;
    this.stats = config.stats;
    this.settings = config.settings;
    this.camera = camera;
    this.octree = octree;
    this.animationsConfig = config.animations;

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
    }

    this.inventory = new Inventory(this.stats.inventorySize);
    this.experienceSystem = new ExperienceSystem(this.stats.initialLevel);
    this.healthSystem = new HealthSystem(this.stats.maxHealth);
    this.weaponAnimationSystem = new WeaponAnimationSystem();

    this.clock = new THREE.Clock();
    this.loadModel().then(() => {
      if (this.model) {
        this.mixer = new THREE.AnimationMixer(this.model);
        this.playAnimation('idle');
      }
    });

    this.playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), 0.35, 0.5);
    this.movementSpeed = this.stats.movementSpeed;
    this.attack = new Attack(this.stats.attackDamage);

    console.log('🎮 [Player] constructor');
  }

  private async loadModel(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync(this.config.modelPath);
      this.model = gltf.scene;

      this.model.traverse((object: any) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      this.body = {
        head: this.model.getObjectByName('Head') as THREE.Mesh,
        body: this.model.getObjectByName('Body') as THREE.Mesh,
        leftArm: this.model.getObjectByName('LeftArm') as THREE.Mesh,
        rightArm: this.model.getObjectByName('RightArm') as THREE.Mesh,
        leftLeg: this.model.getObjectByName('LeftLeg') as THREE.Mesh,
        rightLeg: this.model.getObjectByName('RightLeg') as THREE.Mesh,
        leftElbow: this.model.getObjectByName('LeftElbow') as THREE.Mesh,
        rightElbow: this.model.getObjectByName('RightElbow') as THREE.Mesh,
        leftHand: this.model.getObjectByName('LeftHand') as THREE.Mesh,
        rightHand: this.model.getObjectByName('RightHand') as THREE.Mesh,
      };

      this.animations = {
        idle: gltf.animations.find((anim) => anim.name === this.animationsConfig.idle),
        walk: gltf.animations.find((anim) => anim.name === this.animationsConfig.walk),
        run: gltf.animations.find((anim) => anim.name === this.animationsConfig.run),
        attack: gltf.animations.find((anim) => anim.name === this.animationsConfig.attack),
        die: gltf.animations.find((anim) => anim.name === this.animationsConfig.die),
      }

      this.model.scale.set(0.75, 0.75, 0.75);
      this.add(this.model);

      console.log('🧍 [Player] Model loaded');
    } catch (error) {
      console.error('Failed to load model:', error);
    }
  }

  public setMovementSystem(movementSystem: any): void {
    this.movementSystem = movementSystem;
  }

  public setOctree(octree: Octree): void {
    this.octree = octree;
  }

  public equipWeapon(weapon: BaseWeapon, slot: 'mainHand' | 'offHand'): void {
    if (this.currentWeapon) {
      this.unequipWeapon();
    }

    this.currentWeapon = weapon;
    this.equipment[slot] = weapon.getConfig();
    this.weaponAnimationSystem.setWeaponType(weapon.getConfig().type);

    if (this.model && this.body.rightHand) {
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
      this.equipment.mainHand = null;
      this.equipment.offHand = null;
      this.weaponAnimationSystem.setWeaponType('emptyHands');
      console.log('Unequipped weapon');
    }
  }

  public attack = (): void => {
    if (!this.isAttacking) {
      this.isAttacking = true;
      this.playAnimation('attack');

      if (this.currentWeapon) {
        this.attack.setDamage(this.currentWeapon.getStats().damage);
        console.log(`⚔️ [Player] Attacking with ${this.currentWeapon.getConfig().name} for ${this.currentWeapon.getStats().damage} damage`);
      }

      // After the attack animation, reset the attacking state
      const attackDuration = 0.5; // Duration of the attack animation in seconds
      setTimeout(() => {
        this.isAttacking = false;
        this.playAnimation('idle');
        console.log('⚔️ [Player] Attack finished');
      }, attackDuration * 1000);
    }
  }

  public startBowDraw = (): void => {
    if (this.currentWeapon && this.currentWeapon.startDrawing) {
      this.isBowDrawing = true;
      this.currentWeapon?.startDrawing();
      console.log('🏹 [Player] Bow draw started');
    }
  }

  public stopBowDraw = (): void => {
    if (this.currentWeapon && this.currentWeapon.stopDrawing) {
      this.isBowDrawing = false;
      this.currentWeapon?.stopDrawing();
      console.log('🏹 [Player] Bow draw stopped');
    }
  }

  public getAttackDamage = (): number => {
    return this.attack.getDamage();
  }

  public getEquipment = (): PlayerEquipment => {
    return this.equipment;
  }

  public addItemToInventory(item: Item): void {
    this.inventory.addItem(item);
  }

  public removeItemFromInventory(item: Item): void {
    this.inventory.removeItem(item);
  }

  public getInventoryItems(): Item[] {
    return this.inventory.getItems();
  }

  public playAnimation(name: string): void {
    if (this.currentAction) {
      this.currentAction.fadeOut(0.25);
      this.currentAction.stop();
    }

    if (this.animations && this.animations[name]) {
      const clip = this.animations[name];
      this.currentAction = this.mixer.clipAction(clip);
      this.currentAction.reset().fadeIn(0.25).play();
    }
  }

  private updateMovement(deltaTime: number): void {
    if (!this.movementSystem) return;

    const input = this.movementSystem.getInput();
    const speedDelta = deltaTime * (this.movementSpeed * (input.sprint ? this.sprintSpeedMultiplier : 1));

    this.playerVelocity.y -= this.gravity * deltaTime;

    this.playerDirection.x = input.right - input.left;
    this.playerDirection.z = input.backward - input.forward;
    this.playerDirection.normalize();

    if (input.forward || input.backward || input.left || input.right) {
      if (input.sprint) {
        this.playAnimation('run');
      } else {
        this.playAnimation('walk');
      }
    } else {
      this.playAnimation('idle');
    }

    if (input.forward || input.backward || input.left || input.right) {
      this.walkCycle += speedDelta * 2;
    }

    if (this.onFloor()) {
      if (input.jump) {
        this.playerVelocity.y = 15;
      } else {
        this.playerVelocity.y = Math.max(0, this.playerVelocity.y);
      }
    }

    this.playerVelocity.x = this.playerDirection.x * speedDelta;
    this.playerVelocity.z = this.playerDirection.z * speedDelta;

    this.applyCollision(deltaTime);

    this.model.position.copy(this.playerCollider.start).add(new THREE.Vector3(0, -0.35, 0));
  }

  private applyCollision(deltaTime: number): void {
    const tempVector = new THREE.Vector3();

    const damping = Math.exp(-4 * deltaTime) - 1;

    this.playerVelocity.addScaledVector(this.playerVelocity, damping);

    const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);

    this.playerCollider.translate(deltaPosition);

    this.colliderRaycast();

    this.constrainPlayerCollider();

    tempVector.copy(this.playerCollider.start).add(new THREE.Vector3(0, -0.35, 0));

    this.camera.position.x += (tempVector.x - this.camera.position.x) * 0.2;
    this.camera.position.z += (tempVector.z - this.camera.position.z) * 0.2;

    this.camera.position.y += (this.model.position.y + 0.75 - this.camera.position.y) * 0.2;
  }

  private colliderRaycast(): void {
    const result = this.octree.capsuleIntersect(this.playerCollider);

    this.canJump = false;

    if (result) {
      this.canJump = result.normal.y > 0.7;

      if (result.normal.y > 0.7) {
        this.playerVelocity.y = 0;
      }

      this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  private constrainPlayerCollider(): void {
    if (this.playerCollider.start.y < 0.35) {
      this.playerCollider.translate(new THREE.Vector3(0, 0.35 - this.playerCollider.start.y, 0));
    }
  }

  private onFloor(): boolean {
    return this.canJump;
  }

  private updateRealisticBowAnimation(): void {
    // REMOVED: Old bow animation system that was conflicting with WeaponAnimationSystem
    // The WeaponAnimationSystem now handles all bow animations including the 4-stage drawing progression
    console.log('🏹 [Player] Old bow animation system disabled - using WeaponAnimationSystem');
  }

  private updateWeaponPositioning(): void {
    if (this.currentWeapon && this.body.rightHand) {
      const weaponMesh = this.currentWeapon.getMesh();
      weaponMesh.position.set(0, 0, 0);
      weaponMesh.rotation.set(0, 0, 0);

      const playerWorldPosition = new THREE.Vector3();
      this.model.getWorldPosition(playerWorldPosition);
      this.currentWeapon.updateHitBoxPosition(playerWorldPosition);
    }
  }

  public update(deltaTime: number): void {
    this.updateMovement(deltaTime);
    this.updateAnimations(deltaTime);
    
    // Update weapon charge if bow is being drawn
    if (this.isBowDrawing && this.currentWeapon && this.currentWeapon.updateCharge) {
      this.currentWeapon.updateCharge(deltaTime);
      console.log('🏹 [Player] FIXED bow animation update - Active:', this.isBowDrawing, 'Charge:', this.currentWeapon.getChargeLevel?.()?.toFixed(2) || '0.00');
    }
    
    // REMOVED: updateRealisticBowAnimation() call - no longer needed
    // The WeaponAnimationSystem handles all bow animations now
    
    this.updateCombat(deltaTime);
    this.updateWeaponPositioning();
    this.healthSystem.update(deltaTime);
  }

  private updateCombat(deltaTime: number): void {
    // Combat logic here
  }

  private updateAnimations(deltaTime: number): void {
    const isMoving = this.movementSystem.isMoving();
    const isSprinting = this.movementSystem.isSprinting();
    
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
      isMoving,
      isSprinting,
      this.isAttacking,
      this.isBowDrawing, // Pass bow drawing state
      weaponChargeLevel  // Pass the actual weapon charge level
    );
    
    console.log(`🎭 [Player] Animation update - Moving: ${isMoving}, Attacking: ${this.isAttacking}, BowDrawing: ${this.isBowDrawing}, ChargeLevel: ${weaponChargeLevel.toFixed(2)}`);
  }

  public getWalkCycleSpeed = (): number => {
    return this.weaponAnimationSystem.getWalkCycleSpeed();
  }

  public dispose(): void {
    // Dispose of resources
  }
}
