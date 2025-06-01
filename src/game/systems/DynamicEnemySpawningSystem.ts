import * as THREE from 'three';
import { DynamicSpawningSystem } from './DynamicSpawningSystem';
import { SpawnableEntity, SpawningConfig, EntityLifecycleState } from '../../types/SpawnableEntity';
import { Enemy } from '../entities/Enemy';
import { EnemyType } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { CombatSystem } from './CombatSystem';

class SpawnableEnemyWrapper implements SpawnableEntity {
  public id: string;
  public mesh: THREE.Object3D;
  public position: THREE.Vector3;
  public age: number = 0;
  public maxAge: number = 300; // 5 minutes max age
  public state: EntityLifecycleState = EntityLifecycleState.SPAWNING;
  public distanceFromPlayer: number = 0;
  
  private enemy: Enemy;
  private spawnTime: number;
  
  constructor(enemy: Enemy) {
    this.enemy = enemy;
    this.id = `enemy_${Date.now()}_${Math.random()}`;
    this.mesh = enemy.getMesh();
    this.position = enemy.getPosition();
    this.spawnTime = Date.now();
  }
  
  public initialize(position: THREE.Vector3): void {
    this.position.copy(position);
    this.mesh.position.copy(position);
    this.state = EntityLifecycleState.ACTIVE;
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.age += deltaTime;
    this.distanceFromPlayer = this.mesh.position.distanceTo(playerPosition);
    
    // Update the underlying enemy
    this.enemy.update(deltaTime, playerPosition);
    
    // Update state based on enemy status
    if (this.enemy.isDead()) {
      if (this.enemy.isDeadFor(3000)) { // 3 seconds after death
        this.state = EntityLifecycleState.DEAD;
      } else {
        this.state = EntityLifecycleState.DESPAWNING;
      }
    }
    
    // Update position reference
    this.position.copy(this.mesh.position);
  }
  
  public dispose(): void {
    this.enemy.dispose();
  }
  
  public getEnemy(): Enemy {
    return this.enemy;
  }
}

export class DynamicEnemySpawningSystem extends DynamicSpawningSystem<SpawnableEnemyWrapper> {
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private combatSystem: CombatSystem | null = null;
  private difficulty: number = 1;
  
  constructor(
    scene: THREE.Scene, 
    effectsManager: EffectsManager, 
    audioManager: AudioManager,
    config?: Partial<SpawningConfig>
  ) {
    const defaultConfig: SpawningConfig = {
      playerMovementThreshold: 5.0,
      fadeInDistance: 30,
      fadeOutDistance: 45,
      maxEntityDistance: 60,
      minSpawnDistance: 15,
      maxSpawnDistance: 40,
      maxEntities: 8,
      baseSpawnInterval: 5000,
      spawnCountPerTrigger: 2,
      aggressiveCleanupDistance: 80,
      fadedOutTimeout: 10000
    };
    
    super(scene, { ...defaultConfig, ...config });
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    console.log('[DynamicEnemySpawningSystem] Initialized with config:', this.config);
  }
  
  public setCombatSystem(combatSystem: CombatSystem): void {
    this.combatSystem = combatSystem;
    console.log('[DynamicEnemySpawningSystem] Combat system connected');
  }
  
  public setDifficulty(difficulty: number): void {
    this.difficulty = Math.max(1, difficulty);
    console.log('[DynamicEnemySpawningSystem] Difficulty set to:', this.difficulty);
  }
  
  protected createEntity(isInitial: boolean, playerPosition?: THREE.Vector3): SpawnableEnemyWrapper {
    const spawnPosition = this.getSpawnPosition(isInitial, playerPosition);
    
    // Create the enemy using the position-based method
    const enemy = Enemy.createRandomEnemyAtPosition(
      this.scene,
      spawnPosition,
      this.effectsManager,
      this.audioManager,
      this.difficulty
    );
    
    // Wrap it in our spawnable interface
    const wrapper = new SpawnableEnemyWrapper(enemy);
    wrapper.initialize(spawnPosition);
    
    // Register with combat system if available
    if (this.combatSystem) {
      this.combatSystem.registerEnemy(wrapper.getEnemy());
    }
    
    console.log('[DynamicEnemySpawningSystem] Created enemy at position:', spawnPosition);
    return wrapper;
  }
  
  private getSpawnPosition(isInitial: boolean, playerPosition?: THREE.Vector3): THREE.Vector3 {
    if (!playerPosition) {
      // Default spawn around origin if no player position
      const angle = Math.random() * Math.PI * 2;
      const distance = this.config.minSpawnDistance + Math.random() * 10;
      return new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
    }
    
    if (isInitial) {
      // For initial spawn, spread around player more evenly
      const angle = Math.random() * Math.PI * 2;
      const distance = this.config.minSpawnDistance + Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
      return new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        0,
        playerPosition.z + Math.sin(angle) * distance
      );
    } else {
      // For dynamic spawning, use the zone system
      const spawnZone = this.generateSpawnZone(playerPosition);
      return this.getRandomPositionInZone(spawnZone);
    }
  }
  
  protected getSystemName(): string {
    return 'DynamicEnemySpawningSystem';
  }
  
  public getEnemies(): Enemy[] {
    return this.entities.map(wrapper => wrapper.getEnemy());
  }
  
  public getAliveEnemyCount(): number {
    return this.entities.filter(wrapper => !wrapper.getEnemy().isDead()).length;
  }
  
  public cleanup(): void {
    // Remove dead enemies that have been dead for a while
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const wrapper = this.entities[i];
      const enemy = wrapper.getEnemy();
      
      if (enemy.isDead() && enemy.isDeadFor(5000)) { // 5 seconds
        this.removeEntity(i, 'dead-cleanup');
      }
    }
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    super.update(deltaTime, playerPosition);
    
    // Periodic cleanup
    if (Math.random() < 0.01) { // 1% chance per frame
      this.cleanup();
    }
    
    // Adjust difficulty based on time
    const currentTime = Date.now();
    if (currentTime % 30000 < 100) { // Every 30 seconds
      this.setDifficulty(this.difficulty + 0.1);
    }
  }
}
