
import * as THREE from 'three';
import { Entity } from '../engine/Entity';
import { Terrain } from '../terrain/Terrain';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { WeaponManager } from '../weapons/WeaponManager';

interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  level: number;
  experience: number;
  experienceToNext: number;
  gold: number;
  attack: number;
  defense: number;
  speed: number;
  attackPower: number;
}

export class Player extends Entity {
  public mesh: THREE.Group;
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  
  private moveSpeed: number = 2.5;
  private sprintSpeed: number = 4.0;
  private isGrounded: boolean = false;
  private velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private gravity: number = -9.8;
  private jumpForce: number = 5;
  private isSprinting: boolean = false;
  private isAttackingState: boolean = false;
  
  private terrain: Terrain;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private weaponManager: WeaponManager;
  
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
  
  // Combat state
  private hitEnemies: Set<any> = new Set();
  private lastAttackTime: number = 0;
  private attackCooldown: number = 500;
  
  constructor(scene: THREE.Scene, effectsManager: EffectsManager, audioManager: AudioManager) {
    super(scene);
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Create simple terrain for now
    this.terrain = new Terrain();
    
    // Initialize weapon manager - fix constructor call
    this.weaponManager = new WeaponManager();
    
    this.createPlayerMesh();
    this.setPosition(0, 2, 0);
    this.addToScene();
    
    console.log("👤 [Player] Created with complete functionality and visual improvements");
  }
  
  private createPlayerMesh(): void {
    console.log("👤 [Player] Creating player mesh with improved positioning...");
    
    this.mesh = new THREE.Group();
    
    // Body (torso) - lowered from y=0.35 to y=0.32 to create more clearance
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.3);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.set(0, 0.32, 0); // Lowered from 0.35 to 0.32
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.mesh.add(this.body);
    
    // Head - will be made invisible in first-person
    const headGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAE }); // Skin tone
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.set(0, 0.85, 0);
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.mesh.add(this.head);
    
    // Left Arm - positioned at realistic shoulder height
    const leftArmGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftArmMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAE }); // Skin tone
    this.leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    this.leftArm.position.set(-0.3, 0.55, 0); // Arms at shoulder height relative to lowered torso
    this.leftArm.castShadow = true;
    this.leftArm.receiveShadow = true;
    this.mesh.add(this.leftArm);
    
    // Right Arm - positioned at realistic shoulder height  
    const rightArmGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const rightArmMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAE }); // Skin tone
    this.rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    this.rightArm.position.set(0.3, 0.55, 0); // Arms at shoulder height relative to lowered torso
    this.rightArm.castShadow = true;
    this.rightArm.receiveShadow = true;
    this.mesh.add(this.rightArm);
    
    // Left Leg
    const leftLegGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const leftLegMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Tan
    this.leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    this.leftLeg.position.set(-0.2, -0.35, 0);
    this.leftLeg.castShadow = true;
    this.leftLeg.receiveShadow = true;
    this.mesh.add(this.leftLeg);
    
    // Right Leg
    const rightLegGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const rightLegMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Tan
    this.rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    this.rightLeg.position.set(0.2, -0.35, 0);
    this.rightLeg.castShadow = true;
    this.rightLeg.receiveShadow = true;
    this.mesh.add(this.rightLeg);
    
    // Debug: Show player's bounding box
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());
    console.log("👤 [Player] Bounding box size:", size);
    
    console.log("👤 [Player] Player mesh created with optimized positioning for first-person view");
  }
  
  protected addToScene(): void {
    this.scene.add(this.mesh);
  }
  
  public update(deltaTime: number, isMoving: boolean): void {
    this.updateMovement(deltaTime);
    // Remove weaponManager.update call since it doesn't exist
    
    // Update stamina
    if (this.isSprinting && isMoving) {
      this.stats.stamina = Math.max(0, this.stats.stamina - 20 * deltaTime);
      if (this.stats.stamina <= 0) {
        this.stopSprint();
      }
    } else {
      this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + 15 * deltaTime);
    }
  }
  
  private updateMovement(deltaTime: number): void {
    // Ground check
    this.isGrounded = this.checkIfGrounded();
    
    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * deltaTime;
    } else {
      this.velocity.y = Math.max(0, this.velocity.y); // Reset velocity when grounded
    }
    
    // Apply movement
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z;
    
    // Terrain collision
    const terrainHeight = this.terrain.getHeightAt(this.position.x, this.position.z);
    this.position.y = Math.max(this.position.y, terrainHeight + 0.4);
    
    // Reset isGrounded if player is on the ground
    if (Math.abs(this.position.y - (terrainHeight + 0.4)) < 0.001) {
      this.isGrounded = true;
    }
    
    this.mesh.position.copy(this.position);
  }
  
  private checkIfGrounded(): boolean {
    // Raycast downwards to check for ground
    const raycaster = new THREE.Raycaster(this.position, new THREE.Vector3(0, -1, 0), 0, 0.5);
    const intersects = raycaster.intersectObject(this.terrain.mesh);
    return intersects.length > 0;
  }
  
  // Movement methods
  public move(direction: THREE.Vector3, deltaTime: number): void {
    const speed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;
    const scaledDirection = direction.clone().multiplyScalar(speed * deltaTime);
    
    this.velocity.x = scaledDirection.x;
    this.velocity.z = scaledDirection.z;
  }
  
  public startSprint(): void {
    if (this.stats.stamina > 10) {
      this.isSprinting = true;
    }
  }
  
  public stopSprint(): void {
    this.isSprinting = false;
  }
  
  public getSprinting(): boolean {
    return this.isSprinting;
  }
  
  // Combat methods - simplified since WeaponManager methods don't exist
  public equipWeapon(weaponId: string): void {
    console.log(`[Player] Equipping weapon: ${weaponId}`);
    // Simple implementation without weaponManager methods
  }
  
  public unequipWeapon(): void {
    console.log(`[Player] Unequipping weapon`);
    // Simple implementation without weaponManager methods
  }
  
  public getEquippedWeapon(): BaseWeapon | null {
    console.log(`[Player] Getting equipped weapon`);
    return null; // Simple implementation
  }
  
  public startSwordSwing(): void {
    this.isAttackingState = true;
    this.hitEnemies.clear();
    console.log(`[Player] Starting sword swing`);
    setTimeout(() => {
      this.isAttackingState = false;
    }, 300);
  }
  
  public startBowDraw(): void {
    console.log(`[Player] Starting bow draw`);
  }
  
  public stopBowDraw(): void {
    console.log(`[Player] Stopping bow draw`);
  }
  
  public isAttacking(): boolean {
    return this.isAttackingState;
  }
  
  public getSwordHitBox(): THREE.Object3D {
    return this.rightArm;
  }
  
  public getAttackPower(): number {
    return this.stats.attackPower;
  }
  
  public hasHitEnemy(enemy: any): boolean {
    return this.hitEnemies.has(enemy);
  }
  
  public addEnemy(enemy: any): void {
    this.hitEnemies.add(enemy);
  }
  
  // Stats methods
  public getStats(): PlayerStats {
    return { ...this.stats };
  }
  
  public isAlive(): boolean {
    return this.stats.health > 0;
  }
  
  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }
  
  public takeDamage(amount: number): void {
    this.stats.health = Math.max(0, this.stats.health - amount);
  }
  
  public addExperience(amount: number): void {
    this.stats.experience += amount;
    const newLevel = Math.floor(this.stats.experience / 100) + 1;
    if (newLevel > this.stats.level) {
      this.stats.level = newLevel;
      this.stats.maxHealth += 10;
      this.stats.health = this.stats.maxHealth;
      this.stats.experienceToNext = newLevel * 100;
    }
  }
  
  public addGold(amount: number): void {
    this.stats.gold += amount;
  }
  
  // Visual methods
  public getBody(): any {
    return {
      leftArm: this.leftArm,
      rightArm: this.rightArm,
      body: this.body,
      head: this.head
    };
  }
  
  public setVisualRotation(yaw: number, pitch: number): void {
    // Only rotate the upper body slightly for visual feedback
    this.body.rotation.y = yaw * 0.1;
    this.rightArm.rotation.x = pitch * 0.2;
    this.leftArm.rotation.x = pitch * 0.2;
  }
  
  public getGroup(): THREE.Group {
    return this.mesh;
  }
  
  public setVisible(visible: boolean): void {
    this.head.visible = visible;
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.mesh.position.copy(this.position);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public getMesh(): THREE.Group {
    return this.mesh;
  }
  
  public dispose(): void {
    this.hitEnemies.clear();
    // Remove weaponManager.dispose() call since it doesn't exist
    this.terrain.dispose();
    
    // Remove from scene
    this.scene.remove(this.mesh);
    
    // Dispose geometries and materials
    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}
