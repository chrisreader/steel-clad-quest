import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { EffectsManager } from '../managers/EffectsManager';
import { AudioManager } from '../managers/AudioManager';
import { StateManager } from '../managers/StateManager';
import { PhysicsManager } from '../engine/PhysicsManager';
import { DynamicEnemySpawningSystem } from './DynamicEnemySpawningSystem';

export class CombatSystem {
  private player: Player;
  private enemies: Enemy[] = [];
  private gold: Gold[] = [];
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private stateManager: StateManager;
  private physicsManager: PhysicsManager;
  private lastAttackTime: number = 0;
  private attackCooldown: number = 1000;
  private isAttacking: boolean = false;
  private dynamicEnemySpawningSystem: DynamicEnemySpawningSystem;

  constructor(
    player: Player,
    scene: THREE.Scene,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    stateManager: StateManager,
    physicsManager: PhysicsManager,
    dynamicEnemySpawningSystem: DynamicEnemySpawningSystem
  ) {
    this.player = player;
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.stateManager = stateManager;
    this.physicsManager = physicsManager;
    this.dynamicEnemySpawningSystem = dynamicEnemySpawningSystem;
  }

  public setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;
  }

  public update(deltaTime: number): void {
    this.handlePlayerCombat(deltaTime);
    this.handleGoldCollection();
  }

  private handlePlayerCombat(deltaTime: number): void {
    if (!this.player || !this.player.isAlive()) {
      return;
    }

    if (this.player.isAttacking() && !this.isAttacking) {
      this.isAttacking = true;
      this.attackCooldown = this.player.getAttackCooldown();

      if (performance.now() - this.lastAttackTime >= this.attackCooldown) {
        this.lastAttackTime = performance.now();
        this.handleMeleeAttack();
      }
    } else if (!this.player.isAttacking()) {
      this.isAttacking = false;
    }
  }

  private handleMeleeAttack(): void {
    const playerPosition = this.player.getPosition();
    const attackRange = this.player.getAttackRange();

    this.enemies.forEach(enemy => {
      if (enemy.isDead) return;

      const enemyPosition = enemy.getPosition();
      const distance = playerPosition.distanceTo(enemyPosition);

      if (distance <= attackRange) {
        const damage = this.player.getAttackDamage();
        const knockbackDirection = enemyPosition.clone().sub(playerPosition).normalize();
        this.applyDamage(enemy, damage, knockbackDirection);
      }
    });
  }

  private applyDamage(enemy: Enemy, damage: number, knockbackDirection: THREE.Vector3): void {
    const enemyPosition = enemy.getPosition();

    // Apply damage to the enemy
    enemy.takeDamage(damage, enemyPosition);

    // Play hit sound
    this.audioManager.play('sword_hit');

    // Create blood effect
    this.effectsManager.createBloodEffect(enemyPosition, knockbackDirection, damage);

    // Check if the enemy is dead
    if (enemy.isDead) {
      this.handleEnemyDeath(enemy);
    }
  }

  private handleEnemyDeath(enemy: Enemy): void {
    const enemyPosition = enemy.getPosition();
    const goldReward = enemy.getGoldReward();
    const experienceReward = enemy.getExperienceReward();

    // Increase player's gold and experience
    this.player.addGold(goldReward);
    this.player.addExperience(experienceReward);

    // Update score
    this.stateManager.getGameState().score += enemy.points;

    // Spawn gold
    this.spawnGold(enemyPosition, goldReward);

    // Remove the enemy from the scene and the enemies array
    this.scene.remove(enemy.mesh);
    this.enemies = this.enemies.filter(e => e !== enemy);

    // Update the enemies in the dynamic enemy spawning system
    this.dynamicEnemySpawningSystem.setEnemies(this.enemies);

    console.log(`💀 Enemy killed - spawned ${goldReward} gold and granted ${experienceReward} XP`);
  }

  private handleGoldCollection(): void {
    if (!this.player) {
      return;
    }

    const playerPosition = this.player.getPosition();

    this.gold.forEach(gold => {
      const goldPosition = gold.mesh.position;
      const distance = playerPosition.distanceTo(goldPosition);

      if (distance < 1.5) {
        this.player.addGold(gold.value);
        this.scene.remove(gold.mesh);
        this.gold = this.gold.filter(g => g !== gold && !gold.isDead);
        console.log(`💰 Gold collected - current gold: ${this.player.getGold()}`);
      }
    });

    this.gold = this.gold.filter(gold => !gold.isDead);
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

  public transferGold(gold: Gold[]): void {
    this.gold.push(...gold);
    console.log(`💰 [CombatSystem] Received ${gold.length} gold drops from ProjectileSystem`);
  }

  public clear(): void {
    this.gold.forEach(gold => gold.dispose());
    this.gold = [];
  }

  public dispose(): void {
    this.clear();
  }
}
