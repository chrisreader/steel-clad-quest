import * as THREE from 'three';
import { EffectsManager } from '../../core/EffectsManager';
import { AudioManager, SoundCategory } from '../../core/AudioManager';
import { BaseWeapon } from '../../weapons/base/BaseWeapon';
import { WeaponManager } from '../../weapons/base/WeaponManager';
import { PlayerBody } from './components/PlayerBody';

export class Player {
  private group: THREE.Group;
  private body: PlayerBody;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private weaponManager: WeaponManager;
  
  // Player stats
  private health: number = 100;
  private maxHealth: number = 100;
  private stamina: number = 100;
  private maxStamina: number = 100;
  private gold: number = 0;
  private experience: number = 0;
  private level: number = 1;
  private attackPower: number = 20;
  private isAliveFlag: boolean = true;
  
  // Movement
  private speed: number = 5;
  private isSprintingFlag: boolean = false;
  private staminaDepletionRate: number = 20;
  private staminaRecoveryRate: number = 10;
  private baseSpeed: number = 5;
  private sprintSpeedMultiplier: number = 1.8;
  
  // Rotation
  private visualRotation: { yaw: number; pitch: number } = { yaw: 0, pitch: 0 };
  
  // Sword
  private swordHitBox: THREE.Mesh;
  private isAttackingFlag: boolean = false;
  private currentSwingAnimation: any = null;
  private hitEnemies: Set<any> = new Set();
  private equippedWeapon: BaseWeapon | null = null;
  
  // Bow
  private isDrawingBow: boolean = false;
  
  constructor(scene: THREE.Scene, effectsManager: EffectsManager, audioManager: AudioManager) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.weaponManager = new WeaponManager();
    
    // Create player group
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);
    scene.add(this.group);
    
    // Create player body
    this.body = new PlayerBody(this.group);
    
    // Load and equip default weapon
    this.equipWeapon('wooden_sword');
    
    // Create sword hitbox
    this.swordHitBox = this.createSwordHitBox();
    this.group.add(this.swordHitBox);
    
    console.log("🧍 [Player] Created with new arm positioning");
  }
  
  private createSwordHitBox(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 1.0);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(geometry, material);
    hitBox.position.set(0, 0.5, 0.5);
    return hitBox;
  }
  
  public getBody(): PlayerBody {
    return this.body;
  }
  
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }
  
  public getAttackPower(): number {
    return this.attackPower;
  }
  
  public isAttacking(): boolean {
    return this.isAttackingFlag;
  }
  
  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }
  
  public hasHitEnemy(enemy: any): boolean {
    return this.hitEnemies.has(enemy);
  }
  
  public addEnemy(enemy: any): void {
    this.hitEnemies.add(enemy);
  }
  
  public clearEnemies(): void {
    this.hitEnemies.clear();
  }
  
  public setVisualRotation(yaw: number, pitch: number): void {
    this.visualRotation.yaw = yaw;
    this.visualRotation.pitch = pitch;
  }

  public getStats(): any {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      gold: this.gold,
      experience: this.experience,
      level: this.level,
      attackPower: this.attackPower
    };
  }

  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    console.log(`🏥 [Player] Healed for ${amount}, health now: ${this.health}`);
  }
  
  public update(deltaTime: number, isMoving: boolean): void {
    // Update stamina
    if (this.isSprintingFlag && isMoving) {
      this.stamina = Math.max(0, this.stamina - this.staminaDepletionRate * deltaTime);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecoveryRate * deltaTime);
    }
    
    // Stop sprint if no stamina
    if (this.stamina <= 0) {
      this.stopSprint();
    }
    
    // Update sword hitbox position
    if (this.equippedWeapon) {
      const bladeWorldPosition = new THREE.Vector3();
      this.equippedWeapon.getBladeReference().getWorldPosition(bladeWorldPosition);
      this.equippedWeapon.updateHitBoxPosition(bladeWorldPosition);
    }
    
    // Update player body
    this.body.update(deltaTime, this.visualRotation.yaw, this.visualRotation.pitch, this.isSprintingFlag, isMoving);
  }
  
  public move(direction: THREE.Vector3, deltaTime: number): void {
    // Normalize the movement vector
    direction.normalize();
    
    // Apply sprint speed multiplier
    let currentSpeed = this.baseSpeed;
    if (this.isSprintingFlag) {
      currentSpeed = this.baseSpeed * this.sprintSpeedMultiplier;
    }
    
    // Calculate movement amount
    const moveAmount = currentSpeed * deltaTime;
    
    // Move the player
    this.group.position.x += direction.x * moveAmount;
    this.group.position.z += direction.z * moveAmount;
  }
  
  public startSprint(): void {
    this.isSprintingFlag = true;
    this.speed = this.baseSpeed * this.sprintSpeedMultiplier;
  }
  
  public stopSprint(): void {
    this.isSprintingFlag = false;
    this.speed = this.baseSpeed;
  }
  
  public getSprinting(): boolean {
    return this.isSprintingFlag;
  }
  
  public startSwordSwing(): void {
    if (this.isAttackingFlag) return;
    
    this.isAttackingFlag = true;
    this.hitEnemies.clear();
    
    if (this.equippedWeapon && this.equippedWeapon.getConfig().swingAnimation) {
      const animationConfig = this.equippedWeapon.getConfig().swingAnimation;
      
      // Windup
      this.body.startWindup(animationConfig.duration * animationConfig.phases.windup);
      
      // Slash
      setTimeout(() => {
        this.body.startSlash(animationConfig.duration * animationConfig.phases.slash);
        this.audioManager.play('sword_swing');
      }, animationConfig.duration * animationConfig.phases.windup);
      
      // Recovery
      setTimeout(() => {
        this.body.startRecovery(animationConfig.duration * animationConfig.phases.recovery);
        this.isAttackingFlag = false;
      }, animationConfig.duration * (animationConfig.phases.windup + animationConfig.phases.slash));
    } else {
      console.warn("⚔️ [Player] No swing animation config found for equipped weapon");
      this.isAttackingFlag = false;
    }
  }
  
  public startBowDraw(): void {
    this.isDrawingBow = true;
    this.body.startBowDraw();
    this.audioManager.play('bow_draw');
  }
  
  public stopBowDraw(): void {
    this.isDrawingBow = false;
    this.body.stopBowDraw();
  }
  
  public takeDamage(damage: number): void {
    this.health -= damage;
    this.effectsManager.createHitEffect(this.group.position.clone());
    this.audioManager.play('player_hurt');
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  private die(): void {
    this.isAliveFlag = false;
    this.effectsManager.createExplosion(this.group.position.clone());
    console.log("💀 [Player] Died!");
  }
  
  public isAlive(): boolean {
    return this.isAliveFlag;
  }
  
  public addGold(amount: number): void {
    this.gold += amount;
  }
  
  public getGold(): number {
    return this.gold;
  }
  
  public addExperience(amount: number): void {
    this.experience += amount;
    
    // Level up
    if (this.experience >= this.level * 100) {
      this.level++;
      this.attackPower += 5;
      this.maxHealth += 10;
      this.health = this.maxHealth;
      console.log(`🎉 [Player] Leveled up to level ${this.level}!`);
    }
  }
  
  public getExperience(): number {
    return this.experience;
  }
  
  public getLevel(): number {
    return this.level;
  }
  
  public getHealth(): number {
    return this.health;
  }
  
  public getMaxHealth(): number {
    return this.maxHealth;
  }
  
  public getStamina(): number {
    return this.stamina;
  }
  
  public getMaxStamina(): number {
    return this.maxStamina;
  }
  
  public setOnUpdateHealth(callback: (health: number) => void): void {
    // this.onUpdateHealth = callback;
  }
  
  public setOnUpdateGold(callback: (gold: number) => void): void {
    // this.onUpdateGold = callback;
  }
  
  public setOnUpdateStamina(callback: (stamina: number) => void): void {
    // this.onUpdateStamina = callback;
  }
  
  public equipWeapon(weaponId: string): void {
    const newWeapon = this.weaponManager.createWeapon(weaponId);
    
    if (newWeapon) {
      if (this.equippedWeapon) {
        this.unequipWeapon();
      }
      
      this.equippedWeapon = newWeapon;
      this.equippedWeapon.equip(this.scene);
      this.body.attachWeapon(this.equippedWeapon.getMesh());
      
      console.log(`Equipped weapon: ${weaponId}`);
    } else {
      console.warn(`Failed to equip weapon: ${weaponId}`);
    }
  }
  
  public unequipWeapon(): void {
    if (this.equippedWeapon) {
      this.body.detachWeapon();
      this.equippedWeapon.unequip(this.scene);
      this.equippedWeapon = null;
    }
  }
  
  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
  }
  
  public dispose(): void {
    // Remove the group from the scene
    this.scene.remove(this.group);
    
    // Dispose the geometry and material of each mesh in the group
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    // Dispose sword hitbox
    if (this.swordHitBox) {
      this.swordHitBox.geometry.dispose();
      if (Array.isArray(this.swordHitBox.material)) {
        this.swordHitBox.material.forEach(material => material.dispose());
      } else {
        this.swordHitBox.material.dispose();
      }
    }
    
    // Dispose equipped weapon
    if (this.equippedWeapon) {
      this.equippedWeapon.dispose();
    }
  }
}
