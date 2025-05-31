import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { Enemy } from './Enemy';
import { PlayerBody, Vector3, PlayerStats, Item, WeaponConfig } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { WeaponAnimationSystem } from '../animation/WeaponAnimationSystem';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { HuntingBow } from '../weapons/items/HuntingBow';
import { BowAnimationBridge } from '../animation/BowAnimationBridge';

const GRAVITY = 30;
const STEPS_PER_FRAME = 5;

const USE_LOCAL_MOVEMENT = true;

export class Player {
  public playerCollider: Capsule;
  public playerBody: PlayerBody = {
    group: new THREE.Group(),
    leftArm: new THREE.Group(),
    rightArm: new THREE.Group(),
    leftHand: new THREE.Group(),
    rightHand: new THREE.Group(),
    leftLeg: new THREE.Mesh(),
    rightLeg: new THREE.Mesh(),
    body: new THREE.Mesh(),
    head: new THREE.Mesh(),
    leftUpperArm: new THREE.Mesh(),
    rightUpperArm: new THREE.Mesh(),
    leftForearm: new THREE.Mesh(),
    rightForearm: new THREE.Mesh(),
    leftElbow: new THREE.Group(),
    rightElbow: new THREE.Group(),
    leftWrist: new THREE.Group(),
    rightWrist: new THREE.Group(),
    leftFoot: new THREE.Mesh(),
    rightFoot: new THREE.Mesh()
  };
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public octree: Octree = new Octree();
  public playerVelocity: THREE.Vector3 = new THREE.Vector3();
  public playerDirection: THREE.Vector3 = new THREE.Vector3();
  public playerOnFloor: boolean = false;
  public zDirectionOffset: number = 0;
  public xDirectionOffset: number = 0;
  public fade: number = 0;
  public health: number = 100;
  public maxHealth: number = 100;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public level: number = 1;
  public experience: number = 0;
  public experienceToNext: number = 100;
  public gold: number = 0;
  public attack: number = 10;
  public defense: number = 5;
  public speed: number = 5;
  public attackPower: number = 10;
  public isRunning: boolean = false;
  public canRun: boolean = true;
  public isBlocking: boolean = false;
  public isAttacking: boolean = false;
  public isDead: boolean = false;
  public equippedWeapon: BaseWeapon | null = null;
  public inventory: Item[] = [];
  public stats: PlayerStats = {
    health: this.health,
    maxHealth: this.maxHealth,
    stamina: this.stamina,
    maxStamina: this.maxStamina,
    level: this.level,
    experience: this.experience,
    experienceToNext: this.experienceToNext,
    gold: this.gold,
    attack: this.attack,
    defense: this.defense,
    speed: this.speed,
    attackPower: this.attackPower
  };
  private yOffset: number = 0;
  private enemiesHit: Set<Enemy> = new Set();
  private swordHitBox: THREE.Mesh;
  private effectsManager: EffectsManager;
  private clock: THREE.Clock = new THREE.Clock();
  private weaponAnimationSystem: WeaponAnimationSystem;
  private isDrawingBow: boolean = false;
  private bowAnimationBridge: BowAnimationBridge;
  private sprinting: boolean = false;

  constructor(scene: THREE.Scene, effectsManager: EffectsManager) {
    this.scene = scene;
    this.effectsManager = effectsManager;

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.rotation.order = 'YXZ';

    this.playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);

    this.loadModel();

    this.swordHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false })
    );
    this.playerBody.rightHand.add(this.swordHitBox);

    this.weaponAnimationSystem = new WeaponAnimationSystem(this.playerBody);
    this.bowAnimationBridge = new BowAnimationBridge(this.weaponAnimationSystem);
  }

  public addEnemy(enemy: Enemy): void {
    this.enemiesHit.add(enemy);
  }

  public hasHitEnemy(enemy: Enemy): boolean {
    return this.enemiesHit.has(enemy);
  }

  public clearEnemies(): void {
    this.enemiesHit.clear();
  }

  public getAttackPower(): number {
    return this.attackPower;
  }

  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }

  public getPlayerMesh(): THREE.Group {
    return this.playerBody.group;
  }

  public getPosition(): THREE.Vector3 {
    return this.playerCollider.start;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public setOctree(octree: Octree): void {
    this.octree = octree;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.playerCollider.start.set(x, y, z);
    this.playerCollider.end.set(x, y + 1, z);
  }

  public removeItemFromInventory(itemToRemove: Item): void {
    const index = this.inventory.findIndex(item => item.id === itemToRemove.id);
    if (index !== -1) {
      this.inventory.splice(index, 1);
    }
  }

  public addItemToInventory(item: Item): void {
    this.inventory.push(item);
  }

  public setEquippedWeapon(weapon: BaseWeapon | null): void {
    if (this.equippedWeapon) {
      this.playerBody.rightHand.remove(this.equippedWeapon.getMesh());
    }

    this.equippedWeapon = weapon;

    if (weapon) {
      this.playerBody.rightHand.add(weapon.getMesh());
      this.weaponAnimationSystem.setWeapon(weapon);
    }
  }

  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
  }

  public takeDamage(damage: number): void {
    this.health -= damage;

    // Cap health
    if (this.health < 0) {
      this.health = 0;
    }

    // Update stats
    this.updateStats();

    // Check if dead
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  public addHealth(health: number): void {
    this.health += health;

    // Cap health
    if (this.health > this.maxHealth) {
      this.health = this.maxHealth;
    }

    // Update stats
    this.updateStats();
  }

  public addStamina(stamina: number): void {
    this.stamina += stamina;

    // Cap stamina
    if (this.stamina > this.maxStamina) {
      this.stamina = this.maxStamina;
    }

    // Update stats
    this.updateStats();
  }

  public removeStamina(stamina: number): void {
    this.stamina -= stamina;

    // Cap stamina
    if (this.stamina < 0) {
      this.stamina = 0;
    }

    // Update stats
    this.updateStats();
  }

  public addExperience(experience: number): void {
    this.experience += experience;

    // Check if level up
    if (this.experience >= this.experienceToNext) {
      this.levelUp();
    }

    // Update stats
    this.updateStats();
  }

  public addGold(gold: number): void {
    this.gold += gold;

    // Update stats
    this.updateStats();
  }

  public levelUp(): void {
    this.level++;
    this.experience = 0;
    this.experienceToNext = Math.ceil(this.experienceToNext * 1.5);
    this.maxHealth = Math.ceil(this.maxHealth * 1.1);
    this.health = this.maxHealth;
    this.maxStamina = Math.ceil(this.maxStamina * 1.1);
    this.stamina = this.maxStamina;
    this.attack = Math.ceil(this.attack * 1.1);
    this.defense = Math.ceil(this.defense * 1.1);
    this.speed = Math.ceil(this.speed * 1.05);
    this.attackPower = Math.ceil(this.attackPower * 1.1);

    // Update stats
    this.updateStats();
  }

  public updateStats(): void {
    this.stats = {
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      level: this.level,
      experience: this.experience,
      experienceToNext: this.experienceToNext,
      gold: this.gold,
      attack: this.attack,
      defense: this.defense,
      speed: this.speed,
      attackPower: this.attackPower
    };
  }

  public getStats(): PlayerStats {
    return this.stats;
  }

  public playerJump(): void {
    if (this.playerOnFloor) {
      this.playerVelocity.y = 12;
    }
  }

  public startSwordSwing(): void {
    if (this.equippedWeapon && this.equippedWeapon.getConfig().type === 'sword') {
      this.isAttacking = true;
      this.weaponAnimationSystem.startSwordSwing();
    }
  }

  public stopSwordSwing(): void {
    this.isAttacking = false;
    this.weaponAnimationSystem.stopSwordSwing();
  }

  public startBowDraw(): void {
    if (this.equippedWeapon && this.equippedWeapon.getConfig().type === 'bow') {
      this.isDrawingBow = true;
      this.weaponAnimationSystem.startBowDraw();
      (this.equippedWeapon as HuntingBow).startDrawing();
    }
  }

  public stopBowDraw(): void {
    if (this.equippedWeapon && this.equippedWeapon.getConfig().type === 'bow') {
      this.isDrawingBow = false;
      this.weaponAnimationSystem.stopBowDraw();
      (this.equippedWeapon as HuntingBow).stopDrawing();
    }
  }

  public playerMove(deltaTime: number, isWalking: boolean, walkDirection: THREE.Vector3): void {
    this.updatePlayer(deltaTime, isWalking, walkDirection);
  }

  updatePlayer(deltaTime: number, isWalking: boolean, walkDirection: THREE.Vector3) {
    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!this.playerOnFloor) {
      this.playerVelocity.y -= GRAVITY * deltaTime;

      // small air resistance
      damping *= 0.1;
    }

    this.playerVelocity.addScaledVector(this.playerVelocity, damping);

    const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);
    this.playerCollider.translate(deltaPosition);

    this.playerCollisions();

    const pos = this.playerCollider.end;

    this.camera.position.copy(pos);
    this.camera.position.y += this.yOffset;

    // Update weapon animation
    this.weaponAnimationSystem.updateWalkAnimation(deltaTime, isWalking, walkDirection);
  }

  playerCollisions() {
    const result = this.octree.capsuleIntersect(this.playerCollider);

    this.playerOnFloor = false;

    if (result) {
      this.playerOnFloor = result.normal.y > 0;

      if (!this.playerOnFloor) {
        this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(this.playerVelocity));
      }

      this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  public update(deltaTime: number, isMoving?: boolean): void {
    const isWalking = this.xDirectionOffset !== 0 || this.zDirectionOffset !== 0;
    const walkDirection = new THREE.Vector3(this.xDirectionOffset, 0, this.zDirectionOffset).normalize();

    if (!USE_LOCAL_MOVEMENT) {
      this.playerMove(deltaTime, isWalking, walkDirection);
    } else {
      // Get forward and sideways vectors
      const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const sideVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

      // Combine the vectors to get the movement direction
      const combinedDirection = new THREE.Vector3();
      combinedDirection.addScaledVector(forwardVector, this.zDirectionOffset);
      combinedDirection.addScaledVector(sideVector, this.xDirectionOffset);

      // Normalize the combined direction
      if (combinedDirection.length() > 0) {
        combinedDirection.normalize();
      }

      this.playerMove(deltaTime, isWalking, combinedDirection);
    }

    this.weaponAnimationSystem.update(deltaTime);

    if (this.isAttacking) {
      this.clearEnemies();
    }

    // Update bow charging if drawing
    if (this.isDrawingBow && this.equippedWeapon && this.equippedWeapon.getConfig().type === 'bow') {
      // Update bow charge
      if (this.equippedWeapon.updateCharge) {
        this.equippedWeapon.updateCharge(deltaTime);
      }
      
      // Update bow animation stages through bridge
      this.bowAnimationBridge.updateBowDrawingStage(this.equippedWeapon as any);
    }
  }

  private loadModel(): void {
    const gltfLoader = new GLTFLoader();

    gltfLoader.load('/knight/scene.gltf', (gltf) => {
      const model = gltf.scene;
      model.scale.set(0.1, 0.1, 0.1);
      model.position.set(0, -0.3, 0);
      this.playerBody.group.add(model);
      this.scene.add(this.playerBody.group);

      // Find the head bone and set the yOffset
      model.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
        }
        if (child.name === 'Head') {
          this.yOffset = child.position.y + 0.7;
        }
        if (child.name === 'Body') {
          this.playerBody.body = child;
        }
        if (child.name === 'Left_shoulder') {
          this.playerBody.leftArm = child;
        }
        if (child.name === 'Right_shoulder') {
          this.playerBody.rightArm = child;
        }
        if (child.name === 'Left_hand') {
          this.playerBody.leftHand = child;
        }
        if (child.name === 'Right_hand') {
          this.playerBody.rightHand = child;
        }
        if (child.name === 'Left_leg') {
          this.playerBody.leftLeg = child;
        }
        if (child.name === 'Right_leg') {
          this.playerBody.rightLeg = child;
        }
      });
    });
  }

  public dispose(): void {
    // Dispose of the geometry and material of each mesh in the playerBody
    for (const key in this.playerBody) {
      if (this.playerBody.hasOwnProperty(key)) {
        const element = this.playerBody[key as keyof PlayerBody];
        if (element instanceof THREE.Mesh) {
          element.geometry.dispose();
          if (Array.isArray(element.material)) {
            element.material.forEach(material => material.dispose());
          } else {
            element.material.dispose();
          }
        }
      }
    }

    // Dispose of the swordHitBox geometry and material
    this.swordHitBox.geometry.dispose();
    if (Array.isArray(this.swordHitBox.material)) {
      this.swordHitBox.material.forEach(material => material.dispose());
    } else {
      this.swordHitBox.material.dispose();
    }
  }

  public getGroup(): THREE.Group {
    return this.playerBody.group;
  }

  public getBody(): PlayerBody {
    return this.playerBody;
  }

  public equipWeapon(weaponId: string): void {
    // Implementation for equipping weapon by ID
    console.log(`Equipping weapon: ${weaponId}`);
  }

  public unequipWeapon(): void {
    // Implementation for unequipping weapon
    console.log('Unequipping weapon');
  }

  public isAlive(): boolean {
    return !this.isDead && this.health > 0;
  }

  public heal(amount: number): void {
    this.addHealth(amount);
  }

  public move(direction: THREE.Vector3, deltaTime: number): void {
    // Apply movement
    const moveVector = direction.clone().multiplyScalar(deltaTime * 5);
    this.playerVelocity.add(moveVector);
  }

  public startSprint(): void {
    this.sprinting = true;
    this.isRunning = true;
  }

  public stopSprint(): void {
    this.sprinting = false;
    this.isRunning = false;
  }

  public getSprinting(): boolean {
    return this.sprinting;
  }

  public setVisualRotation(yaw: number, pitch: number): void {
    // Update visual rotation for first person
    if (this.playerBody.group) {
      this.playerBody.group.rotation.y = yaw;
    }
  }

  public stopSwordSwing(): void {
    this.isAttacking = false;
  }
}
