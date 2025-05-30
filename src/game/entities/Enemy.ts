
import * as THREE from 'three';
import { Enemy as EnemyType, Vector3 } from '../../types/GameTypes';

export class Enemy {
  private mesh: THREE.Group;
  private data: EnemyType;
  private attackCooldown = 0;

  constructor(type: EnemyType['type'], position: Vector3) {
    this.data = {
      id: Math.random().toString(36),
      type,
      position: { ...position },
      health: this.getBaseHealth(type),
      maxHealth: this.getBaseHealth(type),
      attack: this.getBaseAttack(type),
      defense: this.getBaseDefense(type),
      speed: this.getBaseSpeed(type),
      goldReward: this.getGoldReward(type),
      experienceReward: this.getExperienceReward(type),
      isAlive: true
    };

    this.createMesh();
    this.mesh.position.set(position.x, position.y, position.z);
  }

  private getBaseHealth(type: EnemyType['type']): number {
    const healthMap = { goblin: 30, orc: 60, skeleton: 45, boss: 200 };
    return healthMap[type];
  }

  private getBaseAttack(type: EnemyType['type']): number {
    const attackMap = { goblin: 8, orc: 15, skeleton: 12, boss: 25 };
    return attackMap[type];
  }

  private getBaseDefense(type: EnemyType['type']): number {
    const defenseMap = { goblin: 2, orc: 8, skeleton: 5, boss: 15 };
    return defenseMap[type];
  }

  private getBaseSpeed(type: EnemyType['type']): number {
    const speedMap = { goblin: 3, orc: 2, skeleton: 2.5, boss: 1.5 };
    return speedMap[type];
  }

  private getGoldReward(type: EnemyType['type']): number {
    const goldMap = { goblin: 10, orc: 25, skeleton: 18, boss: 100 };
    return goldMap[type];
  }

  private getExperienceReward(type: EnemyType['type']): number {
    const expMap = { goblin: 15, orc: 35, skeleton: 25, boss: 150 };
    return expMap[type];
  }

  private createMesh(): void {
    this.mesh = new THREE.Group();

    const color = this.getEnemyColor();
    const size = this.getEnemySize();

    // Create simple enemy representation
    const bodyGeometry = new THREE.BoxGeometry(size, size, size);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;

    this.mesh.add(body);
  }

  private getEnemyColor(): number {
    const colorMap = {
      goblin: 0x228B22,
      orc: 0x8B4513,
      skeleton: 0xDDDDDD,
      boss: 0x8B0000
    };
    return colorMap[this.data.type];
  }

  private getEnemySize(): number {
    const sizeMap = { goblin: 0.8, orc: 1.2, skeleton: 1.0, boss: 2.0 };
    return sizeMap[this.data.type];
  }

  public update(deltaTime: number): void {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
  }

  public takeDamage(damage: number): boolean {
    const actualDamage = Math.max(1, damage - this.data.defense);
    this.data.health = Math.max(0, this.data.health - actualDamage);
    
    if (this.data.health <= 0) {
      this.data.isAlive = false;
      return true; // Enemy died
    }
    
    return false;
  }

  public attack(): number {
    if (this.attackCooldown <= 0) {
      this.attackCooldown = 1.0;
      return this.data.attack;
    }
    return 0;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getData(): EnemyType {
    return { ...this.data };
  }

  public getPosition(): Vector3 {
    return { ...this.data.position };
  }

  public isAlive(): boolean {
    return this.data.isAlive;
  }
}
