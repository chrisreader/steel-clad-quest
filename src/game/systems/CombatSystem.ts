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
  private camera: THREE.PerspectiveCamera;
  
  // Combat parameters
  private pickupRange: number = 2;
  private attackCooldownMs: number = 768;
  private lastAttackTime: number = 0;
  
  // FPS-style bow mechanics
  private bowReadyToFire: boolean = false;
  
  constructor(
    scene: THREE.Scene,
    player: Player,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    camera: THREE.PerspectiveCamera
  ) {
    this.scene = scene;
    this.player = player;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.camera = camera;
    this.projectileSystem = new ProjectileSystem(scene, player, effectsManager, audioManager);
    console.log("⚔️ [CombatSystem] *** INITIALIZED *** with FIXED arrow orientation and debug");
  }
  
  public update(deltaTime: number): void {
    // Log that combat system is updating
    console.log(`⚔️ [CombatSystem] Updating with deltaTime ${deltaTime}`);
    
    if (this.enemies.length === 0 && this.gold.length === 0) return;
    
    this.lastAttackTime += deltaTime;
    
    this.projectileSystem.setEnemies(this.enemies);
    
    // CRITICAL: Ensure projectile system is updated
    console.log(`⚔️ [CombatSystem] Updating projectile system...`);
    this.projectileSystem.update(deltaTime);
    
    if (this.player.isAttacking() && !this.bowReadyToFire) {
      this.checkPlayerAttacks();
    }
    
    this.checkGoldPickups();
    this.cleanupEntities();
  }
  
  public startPlayerAttack(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    
    console.log("⚔️ [CombatSystem] *** START PLAYER ATTACK *** - FIXED Arrow System");
    console.log("⚔️ [CombatSystem] Current weapon:", currentWeapon ? currentWeapon.getConfig().name : 'none');
    
    if (currentWeapon && currentWeapon.getConfig().type === 'bow') {
      console.log("⚔️ [CombatSystem] 🏹 BOW DETECTED - Preparing FIXED arrow");
      this.bowReadyToFire = true;
      this.player.startBowDraw();
    } else {
      console.log("⚔️ [CombatSystem] ⚔️ MELEE WEAPON - Starting melee attack");
      this.startMeleeAttack();
    }
  }
  
  public stopPlayerAttack(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    
    console.log("⚔️ [CombatSystem] *** STOP PLAYER ATTACK *** - Firing FIXED Arrow");
    
    if (currentWeapon && currentWeapon.getConfig().type === 'bow' && this.bowReadyToFire) {
      console.log("⚔️ [CombatSystem] 🏹 FIRING FIXED ARROW");
      
      this.player.stopBowDraw();
      this.fireIndependentArrow();
    }
    
    this.bowReadyToFire = false;
  }
  
  private fireIndependentArrow(): void {
    console.log("🏹 [CombatSystem] *** FIRING ARROW WITH FIXED ORIENTATION ***");
    
    // Only fire if we have a valid player and camera
    if (!this.player || !this.camera) {
      console.error("🏹 [CombatSystem] Cannot fire arrow: missing player or camera");
      return;
    }
    
    const currentWeapon = this.player.getEquippedWeapon();
    if (!currentWeapon || currentWeapon.getConfig().type !== 'bow') {
      console.warn("🏹 [CombatSystem] ⚠️ Cannot fire - no bow equipped");
      return;
    }
    
    // CRITICAL: Get proper camera direction using getWorldDirection for accuracy
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    // Get player position
    const playerPosition = this.player.getPosition();
    
    // Improved arrow start position - eye level, forward offset
    const arrowStartPos = playerPosition.clone()
      .add(new THREE.Vector3(0, 1.7, 0)) // Eye level at 1.7
      .add(cameraDirection.clone().multiplyScalar(1.0)); // 1 unit in front of player
    
    // Use camera direction directly (already normalized)
    const arrowDirection = cameraDirection.clone();
    
    console.log("🏹 [CombatSystem] FIXED FIRING PARAMETERS:");
    console.log("🏹 [CombatSystem] Player position:", playerPosition);
    console.log("🏹 [CombatSystem] Camera direction:", arrowDirection);
    console.log("🏹 [CombatSystem] Arrow start position:", arrowStartPos);
    console.log("🏹 [CombatSystem] Direction magnitude:", arrowDirection.length());
    
    // Use a good speed for FPS games - increased for better visibility
    const damage = currentWeapon.getConfig().stats.damage;
    const speed = 50; // Increased speed for better debugging
    
    console.log(`🏹 [CombatSystem] FIRING ARROW - Damage: ${damage}, Speed: ${speed}`);
    
    // Fire the arrow through ProjectileSystem
    this.projectileSystem.shootArrow(arrowStartPos, arrowDirection, speed, damage);
    
    console.log("🏹 [CombatSystem] ✅ ARROW FIRED WITH FIXED ORIENTATION");
    
    this.audioManager.play('bow_release');
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
