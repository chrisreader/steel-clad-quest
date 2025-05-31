import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { ProjectileSystem } from './ProjectileSystem';

export class CombatSystem {
  private player: Player;
  private enemies: Enemy[] = [];
  private gold: Gold[] = [];
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private projectileSystem: ProjectileSystem;
  
  // Combat parameters
  private pickupRange: number = 2; // Range for gold pickup
  private attackCooldownMs: number = 768; // Updated to match new sword duration (0.768s)
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
    // Skip if no enemies
    if (this.enemies.length === 0 && this.gold.length === 0) return;
    
    // Update time since last attack
    this.lastAttackTime += deltaTime;
    
    // Update projectile system
    this.projectileSystem.setEnemies(this.enemies);
    this.projectileSystem.update(deltaTime);
    
    // Update bow drawing if active
    if (this.isDrawingBow) {
      this.updateBowDrawing(deltaTime);
    }
    
    // Check sword collision with enemies (for melee weapons)
    if (this.player.isAttacking() && !this.isDrawingBow) {
      this.checkPlayerAttacks();
    }
    
    // Check gold pickups
    this.checkGoldPickups();
    
    // Clean up dead enemies and gold
    this.cleanupEntities();
  }
  
  private updateBowDrawing(deltaTime: number): void {
    const currentWeapon = this.player.getEquippedWeapon();
    if (currentWeapon && currentWeapon.getConfig().type === 'bow') {
      // Enhanced update bow charge with better debug info
      if (currentWeapon.updateCharge) {
        currentWeapon.updateCharge(deltaTime);
        
        // Debug charge level
        if (currentWeapon.getChargeLevel) {
          const chargeLevel = currentWeapon.getChargeLevel();
          if (chargeLevel > 0) {
            console.log(`🏹 [CombatSystem] Bow charging: ${(chargeLevel * 100).toFixed(1)}%`);
          }
        }
      } else {
        console.warn("🏹 [CombatSystem] Current bow weapon does not support updateCharge method");
      }
    }
  }
  
  public startPlayerAttack(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    
    console.log("⚔️ [CombatSystem] *** START PLAYER ATTACK CALLED *** - weapon type:", currentWeapon?.getConfig().type || 'none');
    console.log("⚔️ [CombatSystem] Player object exists:", !!this.player);
    console.log("⚔️ [CombatSystem] Player startSwordSwing method exists:", typeof this.player.startSwordSwing);
    
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
    
    // Use player bow draw method
    this.player.startBowDraw();
    
    // Play bow draw sound
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
    
    // Get charge level and calculate damage/speed with enhanced debugging
    const chargeLevel = currentWeapon.getChargeLevel ? currentWeapon.getChargeLevel() : 0;
    const damage = currentWeapon.getChargeDamage ? currentWeapon.getChargeDamage() : currentWeapon.getStats().damage;
    const speed = currentWeapon.getArrowSpeed ? currentWeapon.getArrowSpeed() : 20;
    
    console.log(`🏹 [CombatSystem] Bow release stats - Charge: ${chargeLevel.toFixed(2)}, Damage: ${damage}, Speed: ${speed}`);
    
    // Only shoot if there's some charge
    if (chargeLevel > 0.1) {
      // Calculate arrow direction (forward from player)
      const playerPosition = this.player.getPosition();
      const cameraDirection = new THREE.Vector3(0, 0, -1); // Simple forward direction for now
      
      // Shoot arrow with enhanced positioning
      const arrowStartPos = playerPosition.clone().add(new THREE.Vector3(0, 1.5, 0));
      this.projectileSystem.shootArrow(arrowStartPos, cameraDirection, speed, damage);
      
      console.log(`🏹 [CombatSystem] Arrow shot successfully from position:`, arrowStartPos);
      
      // Play bow release sound
      this.audioManager.play('bow_release');
    } else {
      console.log("🏹 [CombatSystem] Arrow not shot - insufficient charge");
    }
    
    // Use player bow draw stop method
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
    
    // Add debugging before calling player method
    console.log("⚔️ [CombatSystem] About to call this.player.startSwordSwing()");
    console.log("⚔️ [CombatSystem] Player method type:", typeof this.player.startSwordSwing);
    
    try {
      this.player.startSwordSwing();
      console.log("⚔️ [CombatSystem] *** PLAYER.STARTSWORDSWING() CALLED SUCCESSFULLY ***");
    } catch (error) {
      console.error("⚔️ [CombatSystem] *** ERROR CALLING PLAYER.STARTSWORDSWING() ***", error);
    }
  }
  
  private checkPlayerAttacks(): void {
    // Get sword hitbox
    const swordHitBox = this.player.getSwordHitBox();
    const swordBox = new THREE.Box3().setFromObject(swordHitBox);
    
    // Get attack power
    const attackPower = this.player.getAttackPower();
    
    // Check each enemy
    this.enemies.forEach(enemy => {
      // Skip dead enemies
      if (enemy.isDead()) return;
      
      // Skip enemies already hit by this swing
      if (this.player.hasHitEnemy(enemy)) return;
      
      // Get enemy hitbox
      const enemyMesh = enemy.getMesh();
      const enemyBox = new THREE.Box3().setFromObject(enemyMesh);
      
      // Check collision
      if (swordBox.intersectsBox(enemyBox)) {
        // Hit enemy
        enemy.takeDamage(attackPower, this.player.getPosition());
        
        // Mark enemy as hit by this swing
        this.player.addEnemy(enemy);
        
        // Play hit sound
        this.audioManager.play('sword_hit');
        
        // Check if enemy died
        if (enemy.isDead()) {
          // Add gold drop
          this.spawnGold(enemy.getPosition(), enemy.getGoldReward());
          
          // Add experience
          this.player.addExperience(enemy.getExperienceReward());
        }
      }
    });
  }
  
  private checkGoldPickups(): void {
    const playerPosition = this.player.getPosition();
    
    // Check each gold
    this.gold.forEach(gold => {
      if (gold.isInRange(playerPosition, this.pickupRange)) {
        // Pickup gold
        this.player.addGold(gold.getValue());
        
        // Mark for removal
        gold.dispose();
        this.gold = this.gold.filter(g => g !== gold);
      }
    });
  }
  
  private cleanupEntities(): void {
    // Clean up enemies that have been dead for more than 30 seconds
    this.enemies = this.enemies.filter(enemy => {
      if (enemy.isDeadFor(30000)) {
        enemy.dispose();
        return false;
      }
      return true;
    });
    
    // No need to clean up gold, as it's removed when picked up
  }
  
  private spawnGold(position: THREE.Vector3, value: number): void {
    // Create gold drop based on value
    // For larger values, split into multiple smaller coins
    if (value <= 25) {
      // Single small coin
      const gold = Gold.createGoldDrop(this.scene, position, value);
      this.gold.push(gold);
    } else if (value <= 50) {
      // Two medium coins
      const halfValue = Math.floor(value / 2);
      for (let i = 0; i < 2; i++) {
        const gold = Gold.createGoldDrop(this.scene, position, halfValue);
        this.gold.push(gold);
      }
    } else {
      // Multiple coins for high values
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
    // Remove all enemies
    this.enemies.forEach(enemy => enemy.dispose());
    this.enemies = [];
    
    // Remove all gold
    this.gold.forEach(gold => gold.dispose());
    this.gold = [];
    
    // Clear projectile system
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
    // Filter alive enemies
    const aliveEnemies = this.enemies.filter(enemy => !enemy.isDead());
    if (aliveEnemies.length === 0) return null;
    
    // Find closest
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
