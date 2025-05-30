
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import * as THREE from 'three';

export class CombatSystem {
  private attackRange = 2.0;

  constructor() {
    console.log('Combat System initialized');
  }

  public checkPlayerAttack(player: Player, enemies: Enemy[]): Enemy[] {
    const hitEnemies: Enemy[] = [];
    const playerPos = player.getPosition();

    enemies.forEach(enemy => {
      if (!enemy.isAlive()) return;

      const enemyPos = enemy.getPosition();
      const distance = Math.sqrt(
        Math.pow(playerPos.x - enemyPos.x, 2) +
        Math.pow(playerPos.z - enemyPos.z, 2)
      );

      if (distance <= this.attackRange) {
        const playerStats = player.getStats();
        const enemyDied = enemy.takeDamage(playerStats.attack);
        
        if (enemyDied) {
          const enemyData = enemy.getData();
          player.gainExperience(enemyData.experienceReward);
          player.addGold(enemyData.goldReward);
          console.log(`Enemy defeated! Gained ${enemyData.experienceReward} XP and ${enemyData.goldReward} gold`);
        }
        
        hitEnemies.push(enemy);
      }
    });

    return hitEnemies;
  }

  public checkEnemyAttacks(player: Player, enemies: Enemy[]): void {
    const playerPos = player.getPosition();

    enemies.forEach(enemy => {
      if (!enemy.isAlive()) return;

      const enemyPos = enemy.getPosition();
      const distance = Math.sqrt(
        Math.pow(playerPos.x - enemyPos.x, 2) +
        Math.pow(playerPos.z - enemyPos.z, 2)
      );

      if (distance <= this.attackRange) {
        const damage = enemy.attack();
        if (damage > 0) {
          player.takeDamage(damage);
        }
      }
    });
  }

  public calculateDamage(attacker: any, defender: any): number {
    const baseDamage = attacker.attack || 10;
    const defense = defender.defense || 0;
    return Math.max(1, baseDamage - defense);
  }
}
