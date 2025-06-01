
import * as THREE from 'three';
import { Enemy } from '../entities/characters/Enemy';
import { PhysicsManager } from '../core/PhysicsManager';

export class EnvironmentCollisionManager {
  private physicsManager: PhysicsManager;
  private collisionBoxes: THREE.Box3[] = [];

  constructor(physicsManager: PhysicsManager) {
    this.physicsManager = physicsManager;
  }

  public addEnvironmentObject(object: THREE.Object3D, type: 'static' | 'dynamic' = 'static'): void {
    const box = new THREE.Box3().setFromObject(object);
    this.collisionBoxes.push(box);
    this.physicsManager.addCollisionBox(box);
  }

  public checkEnemyCollisions(enemies: Enemy[]): void {
    enemies.forEach(enemy => {
      const enemyPosition = enemy.getPosition();
      const collision = this.physicsManager.checkCollision(enemyPosition, 0.5);
      
      if (collision) {
        enemy.handleEnvironmentCollision();
      }
    });
  }

  public dispose(): void {
    this.collisionBoxes = [];
  }
}
