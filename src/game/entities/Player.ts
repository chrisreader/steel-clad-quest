
import * as THREE from 'three';
import { PlayerStats, Vector3 } from '../../types/GameTypes';

export class Player {
  private mesh: THREE.Group;
  private stats: PlayerStats;
  private position: Vector3;
  private velocity: Vector3;
  private isAttacking = false;
  private attackCooldown = 0;

  constructor() {
    console.log('Creating player...');
    
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
      speed: 5
    };

    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    
    this.createMesh();
  }

  private createMesh(): void {
    this.mesh = new THREE.Group();

    // Create a simple knight representation
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    body.castShadow = true;

    // Head
    const headGeometry = new THREE.SphereGeometry(0.2);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBDB });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.7;
    head.castShadow = true;

    // Helmet
    const helmetGeometry = new THREE.SphereGeometry(0.22);
    const helmetMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.7;
    helmet.castShadow = true;

    // Sword
    const swordGeometry = new THREE.BoxGeometry(0.05, 1, 0.05);
    const swordMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
    const sword = new THREE.Mesh(swordGeometry, swordMaterial);
    sword.position.set(0.4, 1, 0);
    sword.castShadow = true;

    this.mesh.add(body);
    this.mesh.add(head);
    this.mesh.add(helmet);
    this.mesh.add(sword);

    this.mesh.position.set(0, 0, 0);
  }

  public update(deltaTime: number): void {
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Regenerate stamina
    if (this.stats.stamina < this.stats.maxStamina) {
      this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + 20 * deltaTime);
    }

    // Update mesh position
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
  }

  public move(direction: Vector3, deltaTime: number): void {
    const speed = this.stats.speed * deltaTime;
    this.position.x += direction.x * speed;
    this.position.z += direction.z * speed;
    
    // Face movement direction
    if (direction.x !== 0 || direction.z !== 0) {
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }

  public attack(): boolean {
    if (this.attackCooldown <= 0 && this.stats.stamina >= 20) {
      this.isAttacking = true;
      this.attackCooldown = 0.5; // 500ms cooldown
      this.stats.stamina -= 20;
      
      console.log('Player attacks!');
      
      // Reset attack animation after short delay
      setTimeout(() => {
        this.isAttacking = false;
      }, 200);
      
      return true;
    }
    return false;
  }

  public takeDamage(damage: number): void {
    const actualDamage = Math.max(1, damage - this.stats.defense);
    this.stats.health = Math.max(0, this.stats.health - actualDamage);
    console.log(`Player takes ${actualDamage} damage! Health: ${this.stats.health}`);
  }

  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }

  public gainExperience(amount: number): boolean {
    this.stats.experience += amount;
    if (this.stats.experience >= this.stats.experienceToNext) {
      this.levelUp();
      return true;
    }
    return false;
  }

  private levelUp(): void {
    this.stats.level++;
    this.stats.experience -= this.stats.experienceToNext;
    this.stats.experienceToNext = Math.floor(this.stats.experienceToNext * 1.2);
    
    // Increase stats
    this.stats.maxHealth += 20;
    this.stats.health = this.stats.maxHealth;
    this.stats.maxStamina += 10;
    this.stats.stamina = this.stats.maxStamina;
    this.stats.attack += 2;
    this.stats.defense += 1;
    
    console.log(`Level up! Now level ${this.stats.level}`);
  }

  public addGold(amount: number): void {
    this.stats.gold += amount;
  }

  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  public getPosition(): Vector3 {
    return { ...this.position };
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public isAlive(): boolean {
    return this.stats.health > 0;
  }
}
