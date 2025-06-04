import * as THREE from 'three';
import { PlayerStats, PlayerSpeedInfo } from '../../types/GameTypes';
import { InputState } from '../../types/GameTypes';
import { Inventory } from '../Inventory';
import { Item } from '../../types/GameTypes';
import { EventEmitter } from 'events';

export class Player extends EventEmitter {
  public mesh: THREE.Group;
  public camera: THREE.PerspectiveCamera;
  public stats: PlayerStats;
  public inventory: Inventory;
  public input: InputState;
  public isMoving: boolean = false;
  public isAttacking: boolean = false;
  public isBlocking: boolean = false;
  public lastAttackTime: number = 0;
  public attackCooldown: number = 1000;
  public blockDuration: number = 500;
  public lastBlockTime: number = 0;
  public isAlive: boolean = true;
  public experienceToNextLevel: number;
  public levelUpThreshold: number = 100;
  public gold: number = 0;
  public isSprinting: boolean = false;
  public baseSpeed: number = 5.0;
  public sprintSpeed: number = 7.5;
  public currentSpeed: number = 5.0;
  private speedChangeCallbacks: ((speedInfo: PlayerSpeedInfo) => void)[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    this.mesh.add(this.camera);

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
      attackPower: 10
    };

    this.experienceToNextLevel = this.calculateExperienceToNextLevel();

    this.inventory = new Inventory(this);
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      attack: false,
      block: false,
      inventory: false,
      interact: false,
      jump: false,
      run: false
    };
  }

  public getCurrentSpeedInfo(): PlayerSpeedInfo {
    return {
      baseSpeed: this.baseSpeed,
      currentSpeed: this.currentSpeed,
      isSprinting: this.isSprinting,
      position: this.mesh.position.clone()
    };
  }

  public onSpeedChange(callback: (speedInfo: PlayerSpeedInfo) => void): void {
    this.speedChangeCallbacks.push(callback);
  }

  private notifySpeedChange(): void {
    const speedInfo = this.getCurrentSpeedInfo();
    this.speedChangeCallbacks.forEach(callback => callback(speedInfo));
  }

  public startSprint(): void {
    if (this.stats.stamina > 0) {
      this.isSprinting = true;
      this.currentSpeed = this.sprintSpeed;
      this.notifySpeedChange();
      console.log(`🏃 [Player] Started sprinting - speed: ${this.currentSpeed}`);
    }
  }

  public stopSprint(): void {
    this.isSprinting = false;
    this.currentSpeed = this.baseSpeed;
    this.notifySpeedChange();
    console.log(`🚶 [Player] Stopped sprinting - speed: ${this.currentSpeed}`);
  }

  public getSprinting(): boolean {
    return this.isSprinting;
  }

  public getBaseSpeed(): number {
    return this.baseSpeed;
  }

  public getSprintSpeed(): number {
    return this.sprintSpeed;
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.notifySpeedChange(); // Notify of position change
  }

  public addItem(item: Item): void {
    this.inventory.addItem(item);
  }

  public removeItem(item: Item): void {
    this.inventory.removeItem(item);
  }

  public getStats(): PlayerStats {
    return this.stats;
  }

  public getGold(): number {
    return this.gold;
  }

  public addGold(amount: number): void {
    this.gold += amount;
    this.emit('goldUpdate', this.gold);
  }

  public removeGold(amount: number): void {
    this.gold -= amount;
    this.emit('goldUpdate', this.gold);
  }

  public takeDamage(damage: number): void {
    this.stats.health -= damage;
    if (this.stats.health <= 0) {
      this.stats.health = 0;
      this.isAlive = false;
      console.log('Player has died!');
      this.emit('death');
    }
    this.emit('healthUpdate', this.stats.health);
  }

  public heal(amount: number): void {
    this.stats.health += amount;
    if (this.stats.health > 100) {
      this.stats.health = 100;
    }
    this.emit('healthUpdate', this.stats.health);
  }

  public attack(): void {
    if (Date.now() - this.lastAttackTime > this.attackCooldown) {
      this.isAttacking = true;
      this.lastAttackTime = Date.now();
      console.log('Player is attacking!');

      setTimeout(() => {
        this.isAttacking = false;
      }, 500);
    }
  }

  public startBlock(): void {
    if (Date.now() - this.lastBlockTime > this.blockDuration) {
      this.isBlocking = true;
      this.lastBlockTime = Date.now();
      console.log('Player is blocking!');

      setTimeout(() => {
        this.isBlocking = false;
      }, this.blockDuration);
    }
  }

  public stopBlock(): void {
    this.isBlocking = false;
  }

  public update(delta: number): void {
    this.regenerateStamina(delta);
  }

  public addExperience(experience: number): void {
    this.stats.experience += experience;
    this.emit('experienceUpdate', this.stats.experience);
    this.checkLevelUp();
  }

  private checkLevelUp(): void {
    if (this.stats.experience >= this.experienceToNextLevel) {
      this.levelUp();
    }
  }

  private levelUp(): void {
    this.stats.level++;
    this.stats.experience -= this.experienceToNextLevel;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel();
    this.stats.maxHealth += 10;
    this.stats.health = this.stats.maxHealth;
    this.stats.attack += 2;
    this.stats.defense += 1;
    this.stats.attackPower += 2;

    this.emit('levelUp', this.stats.level);
    this.emit('statsUpdate', this.stats);
    this.emit('healthUpdate', this.stats.health);
    this.emit('experienceUpdate', this.stats.experience);

    console.log(`Player leveled up! New level: ${this.stats.level}`);
  }

  private calculateExperienceToNextLevel(): number {
    return this.levelUpThreshold * this.stats.level;
  }

  private regenerateStamina(delta: number): void {
    if (this.stats.stamina < this.stats.maxStamina) {
      this.stats.stamina += delta * 25;
      if (this.stats.stamina > this.stats.maxStamina) {
        this.stats.stamina = this.stats.maxStamina;
      }
      this.emit('staminaUpdate', this.stats.stamina);
    }
  }

  public useStamina(amount: number): boolean {
    if (this.stats.stamina >= amount) {
      this.stats.stamina -= amount;
      this.emit('staminaUpdate', this.stats.stamina);
      return true;
    }
    return false;
  }
}
