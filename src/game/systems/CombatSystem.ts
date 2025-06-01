import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { ProjectileSystem } from './ProjectileSystem';
import { BaseBow } from '../weapons/bow/BaseBow';

export class CombatSystem {
  private player: Player;
  private enemies: Enemy[] = [];
  private gold: Gold[] = [];
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private projectileSystem: ProjectileSystem;
  
  // Combat parameters
  private pickupRange: number = 2;
  private attackCooldownMs: number = 768;
  private lastAttackTime: number = 0;
  
  // Bow mechanics
  private isDrawingBow: boolean = false;
  private bowDrawStartTime: number = 0;
  
  constructor(
    scene: THREE.Scene,
    player: Player,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.player = player;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.projectileSystem = new ProjectileSystem(scene, player, effectsManager, audioManager);
    console.log("⚔️ [CombatSystem] *** INITIALIZED *** with bow support");
  }
  
  public update(deltaTime: number): void {
    if (this.enemies.length === 0 && this.gold.length === 0) return;
    
    this.lastAttackTime += deltaTime;
    
    this.projectileSystem.setEnemies(this.enemies);
    this.projectileSystem.update(deltaTime);
    
    if (this.isDrawingBow) {
      this.updateBowDrawing(deltaTime);
    }
    
    if (this.player.isAttacking() && !this.isDrawingBow) {
      this.checkPlayerAttacks();
    }
    
    this.checkGoldPickups();
    this.cleanupEntities();
  }
  
  private updateBowDrawing(deltaTime: number): void {
    const currentWeapon = this.player.getEquippedWeapon();
    if (currentWeapon && currentWeapon.getConfig().type === 'bow') {
      const bow = currentWeapon as BaseBow;
      bow.updateCharge(deltaTime);
      
      const chargeLevel = bow.getChargeLevel();
      if (chargeLevel > 0) {
        console.log(`🏹 [CombatSystem] Bow charging: ${(chargeLevel * 100).toFixed(1)}%`);
      }
    }
  }
  
  public startPlayerAttack(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    
    console.log("⚔️ [CombatSystem] *** START PLAYER ATTACK CALLED *** - weapon type:", currentWeapon?.getConfig().type || 'none');
    
    if (currentWeapon && currentWeapon.getConfig().type === 'bow') {
      console.log("⚔️ [CombatSystem] Starting bow attack");
      this.startBowDraw();
    } else {
      console.log("⚔️ [CombatSystem] *** STARTING MELEE ATTACK *** - calling startMeleeAttack()");
      this.startMeleeAttack();
    }
  }
  
  public stopPlayerAttack(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    
    console.log("⚔️ [CombatSystem] Stopping player attack, weapon type:", currentWeapon?.getConfig().type || 'none');
    
    if (currentWeapon && currentWeapon.getConfig().type === 'bow' && this.isDrawingBow) {
      this.releaseBowString();
    }
  }
  
  private startBowDraw(): void {
    console.log("🏹 [CombatSystem] Starting bow draw with enhanced debug");
    this.isDrawingBow = true;
    this.bowDrawStartTime = Date.now();
    
    this.player.startBowDraw();
    this.audioManager.play('bow_draw');
    
    console.log("🏹 [CombatSystem] Bow draw initiated successfully");
  }
  
  private releaseBowString(): void {
    console.log("🏹 [CombatSystem] Releasing bow string with enhanced debug");
    this.isDrawingBow = false;
    
    const currentWeapon = this.player.getEquippedWeapon();
    if (!currentWeapon || currentWeapon.getConfig().type !== 'bow') {
      console.warn("🏹 [CombatSystem] Cannot release bow - no bow equipped");
      return;
    }
    
    const bow = currentWeapon as BaseBow;
    const chargeLevel = bow.getChargeLevel();
    const damage = bow.getChargeDamage();
    const speed = bow.getArrowSpeed();
    
    console.log(`🏹 [CombatSystem] Bow release stats - Charge: ${chargeLevel.toFixed(2)}, Damage: ${damage}, Speed: ${speed}`);
    
    if (chargeLevel > 0.1) {
      const playerPosition = this.player.getPosition();
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      
      const arrowStartPos = playerPosition.clone().add(new THREE.Vector3(0, 1.5, 0));
      this.projectileSystem.shootArrow(arrowStartPos, cameraDirection, speed, damage);
      
      console.log(`🏹 [CombatSystem] Arrow shot successfully from position:`, arrowStartPos);
      
      this.audioManager.play('bow_release');
    } else {
      console.log("🏹 [CombatSystem] Arrow not shot - insufficient charge");
    }
    
    this.player.stopBowDraw();
  }
  
  private startMeleeAttack(): void {
    const now = Date.now();
    const timeSinceLastAttack = now - this.lastAttackTime;
    
    console.log("⚔️ [CombatSystem] *** START MELEE ATTACK *** - Time since last attack:", timeSinceLastAttack, "Cooldown:", this.attackCooldownMs);
    
    if (timeSinceLastAttack < this.attackCooldownMs) {
      console.log("⚔️ [CombatSystem] *** ATTACK BLOCKED BY COOLDOWN ***");
      return;
    }
    
    console.log("⚔️ [CombatSystem] *** COOLDOWN PASSED *** - calling player.startSwordSwing()");
    this.lastAttackTime = now;
    
    try {
      this.player.startSwordSwing();
      console.log("⚔️ [CombatSystem] *** PLAYER.STARTSWORDSWING() CALLED SUCCESSFULLY ***");
    } catch (error) {
      console.error("⚔️ [CombatSystem] *** ERROR CALLING PLAYER.STARTSWORDSWING() ***", error);
    }
  }
  
  private checkPlayerAttacks(): void {
    const swordHitBox = this.player.getSwordHitBox();
    const swordBox = new THREE.Box3().setFromObject(swordHitBox);
    
    const attackPower = this.player.getAttackPower();
    
    this.enemies.forEach(enemy => {
      if (enemy.isDead()) return;
      
      if (this.player.hasHitEnemy(enemy)) return;
      
      const enemyMesh = enemy.getMesh();
      const enemyBox = new THREE.Box3().setFromObject(enemyMesh);
      
      if (swordBox.intersectsBox(enemyBox)) {
        enemy.takeDamage(attackPower, this.player.getPosition());
        
        this.player.addEnemy(enemy);
        
        this.audioManager.play('sword_hit');
        
        if (enemy.isDead()) {
          this.spawnGold(enemy.getPosition(), enemy.getGoldReward());
          
          this.player.addExperience(enemy.getExperienceReward());
        }
      }
    });
  }
  
  private checkGoldPickups(): void {
    const playerPosition = this.player.getPosition();
    
    this.gold.forEach(gold => {
      if (gold.isInRange(playerPosition, this.pickupRange)) {
        this.player.addGold(gold.getValue());
        
        gold.dispose();
        this.gold = this.gold.filter(g => g !== gold);
      }
    });
  }
  
  private cleanupEntities(): void {
    this.enemies = this.enemies.filter(enemy => {
      if (enemy.isDeadFor(30000)) {
        enemy.dispose();
        return false;
      }
      return true;
    });
  }
  
  private spawnGold(position: THREE.Vector3, value: number): void {
    if (value <= 25) {
      const gold = Gold.createGoldDrop(this.scene, position, value);
      this.gold.push(gold);
    } else if (value <= 50) {
      const halfValue = Math.floor(value / 2);
      for (let i = 0; i < 2; i++) {
        const gold = Gold.createGoldDrop(this.scene, position, halfValue);
        this.gold.push(gold);
      }
    } else {
      const coinCount = Math.min(5, Math.ceil(value / 20));
      const coinValue = Math.floor(value / coinCount);
      
      for (let i = 0; i < coinCount; i++) {
        const gold = Gold.createGoldDrop(this.scene, position, coinValue);
        this.gold.push(gold);
      }
    }
  }
  
  public addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }
  
  public getEnemies(): Enemy[] {
    return this.enemies;
  }
  
  public getEnemiesCount(): number {
    return this.enemies.filter(enemy => !enemy.isDead()).length;
  }
  
  public getGold(): Gold[] {
    return this.gold;
  }
  
  public getGoldCount(): number {
    return this.gold.length;
  }
  
  public clear(): void {
    this.enemies.forEach(enemy => enemy.dispose());
    this.enemies = [];
    
    this.gold.forEach(gold => gold.dispose());
    this.gold = [];
    
    this.projectileSystem.clear();
  }
  
  public spawnRandomEnemies(count: number, playerPosition: THREE.Vector3, difficulty: number = 1): void {
    for (let i = 0; i < count; i++) {
      const enemy = Enemy.createRandomEnemy(
        this.scene,
        playerPosition,
        this.effectsManager,
        this.audioManager,
        difficulty
      );
      this.enemies.push(enemy);
    }
  }
  
  public getClosestEnemy(position: THREE.Vector3): Enemy | null {
    const aliveEnemies = this.enemies.filter(enemy => !enemy.isDead());
    if (aliveEnemies.length === 0) return null;
    
    let closest = aliveEnemies[0];
    let closestDistance = closest.getPosition().distanceTo(position);
    
    for (let i = 1; i < aliveEnemies.length; i++) {
      const distance = aliveEnemies[i].getPosition().distanceTo(position);
      if (distance < closestDistance) {
        closest = aliveEnemies[i];
        closestDistance = distance;
      }
    }
    
    return closest;
  }
  
  public getEnemiesInRange(position: THREE.Vector3, range: number): Enemy[] {
    return this.enemies.filter(
      enemy => !enemy.isDead() && enemy.getPosition().distanceTo(position) <= range
    );
  }
  
  public dispose(): void {
    this.clear();
    this.projectileSystem.dispose();
  }
}
