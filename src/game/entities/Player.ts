import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Capsule } from 'three/examples/jsm/math/Capsule';
import { Octree } from 'three/examples/jsm/math/Octree';
import { FirstPersonCamera, PlayerBody, PlayerStats } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { Sword } from '../weapons/items/Sword';
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
  private collisionOctree: Octree;
  private playerCollider: Capsule;
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
    
    // Initialize collision octree
    this.collisionOctree = new Octree();
    
    // Initialize player collider
    this.playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
    
    // Initialize raycaster
    this.raycaster = new THREE.Raycaster();
    
    // Initialize clock
    this.clock = new THREE.Clock();
    
    // Initialize weapon animation system
    this.weaponAnimationSystem = new WeaponAnimationSystem();
    
    // Load player model
    this.loadModel().then(() => {
      // Add camera to the head after the model is loaded
      if (this.body.head) {
        this.body.head.add(this.camera.camera);
        this.camera.camera.position.set(0, 0.15, 0);
      }
      
      // Initialize sword
      this.sword = new Sword();
      this.swordHitBox = this.sword.createHitBox();
      this.body.rightHand.add(this.sword.getMesh());
      this.body.rightHand.add(this.swordHitBox);
      
      // Initialize hunting bow
      this.huntingBow = new HuntingBow();
      this.body.leftHand.add(this.huntingBow.getMesh());
      
      // Set initial weapon
      this.setEquippedWeapon('sword');
    });
  }
  
  private async loadModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load('/models/player/scene.gltf', (gltf) => {
        const model = gltf.scene;
        
        // Find and assign body parts
        this.body.body = model.getObjectByName('Body') as THREE.Mesh;
        this.body.head = model.getObjectByName('Head') as THREE.Mesh;
        this.body.leftArm = model.getObjectByName('LeftArm') as THREE.Group;
        this.body.rightArm = model.getObjectByName('RightArm') as THREE.Group;
        this.body.leftHand = model.getObjectByName('LeftHand') as THREE.Group;
        this.body.rightHand = model.getObjectByName('RightHand') as THREE.Group;
        this.body.leftLeg = model.getObjectByName('LeftLeg') as THREE.Mesh;
        this.body.rightLeg = model.getObjectByName('RightLeg') as THREE.Mesh;
        
        // Add elbow and wrist groups
        this.body.leftElbow = model.getObjectByName('LeftElbow') as THREE.Group;
        this.body.rightElbow = model.getObjectByName('RightElbow') as THREE.Group;
        this.body.leftWrist = model.getObjectByName('LeftWrist') as THREE.Group;
        this.body.rightWrist = model.getObjectByName('RightWrist') as THREE.Group;
        
        // Set default arm rotation
        this.body.leftArm.rotation.set(Math.PI / 8, 0, 0);
        this.body.rightArm.rotation.set(Math.PI / 8, 0, 0);
        
        // Set default hand rotation
        this.body.leftHand.rotation.set(-Math.PI / 6, 0, Math.PI / 4);
        this.body.rightHand.rotation.set(0, 0, 0);
        
        // Set default leg rotation
        this.body.leftLeg.rotation.set(0, 0, 0);
        this.body.rightLeg.rotation.set(0, 0, 0);
        
        // Enable shadows
        model.traverse((object: any) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        
        // Add model to group
        this.group.add(model);
        
        // Resolve promise
        resolve();
      }, undefined, (error) => {
        console.error('An error happened while loading the player model', error);
        reject(error);
      });
    });
  }
  
  public update(deltaTime: number, octree: Octree): void {
    this.collisionOctree = octree;
    this.updateMovement(deltaTime);
    this.updateBobbing(deltaTime);
    this.updateCameraShake(deltaTime);
    this.updateCollisions(deltaTime);
    this.updateWalkCycle(deltaTime);
  }
  
  private updateMovement(deltaTime: number): void {
    if (!this.body.body) return;
    
    // Ground check
    this.onFloor = false;
    const rayDirection = new THREE.Vector3(0, -1, 0);
    const rayOrigin = new THREE.Vector3().copy(this.group.position);
    rayOrigin.y += 0.5;
    this.raycaster.set(rayOrigin, rayDirection);
    const intersects = this.raycaster.intersectObjects(this.collisionOctree.triangles, false);
    if (intersects.length > 0 && intersects[0].distance < 0.75) {
      this.onFloor = true;
    }
    
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
  
  private updateCollisions(deltaTime: number): void {
    this.playerCollider.start.copy(this.group.position);
    this.playerCollider.end.copy(this.group.position);
    
    const collision = this.collisionOctree.capsuleIntersect(this.playerCollider);
    
    if (collision) {
      this.velocity.add(collision.normal.multiplyScalar(collision.depth).multiplyScalar(100));
    }
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
  
  public move(x: number, z: number): void {
    this.isMoving = x !== 0 || z !== 0;
    this.currentSpeed.set(x, 0, z);
  }
  
  public jump(): void {
    this.isJumping = true;
  }
  
  public sprint(sprint: boolean): void {
    this.isSprinting = sprint;
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
  
  public setEquippedWeapon(weapon: 'sword' | 'bow'): void {
    if (weapon === 'sword') {
      this.equippedWeapon = this.sword;
      this.weaponAnimationSystem.setWeaponType('melee');
      this.body.leftHand.remove(this.huntingBow.getMesh());
      this.body.rightHand.add(this.sword.getMesh());
      this.body.rightHand.add(this.swordHitBox);
    } else if (weapon === 'bow') {
      this.equippedWeapon = this.huntingBow;
      this.weaponAnimationSystem.setWeaponType('bow');
      this.body.rightHand.remove(this.sword.getMesh());
      this.body.rightHand.remove(this.swordHitBox);
      this.body.leftHand.add(this.huntingBow.getMesh());
    }
    
    this.weaponAnimationSystem.resetToWeaponStance(this.body);
  }
  
  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
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
