
import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { DynamicSpawningSystem } from './DynamicSpawningSystem';
import { SpawnableEntity, EntityLifecycleState, SpawningConfig } from '../../types/SpawnableEntity';
import { EnemyType } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';

// Enemy wrapper to implement SpawnableEntity interface
class SpawnableEnemyWrapper implements SpawnableEntity {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  age: number = 0;
  maxAge: number = 120000; // 2 minutes max age
  state: EntityLifecycleState = EntityLifecycleState.SPAWNING;
  distanceFromPlayer: number = 0;
  
  private enemy: Enemy;
  
  constructor(enemy: Enemy) {
    this.enemy = enemy;
    this.id = `enemy_${Date.now()}_${Math.random()}`;
    this.mesh = enemy.getMesh();
    this.position = enemy.getPosition();
  }
  
  initialize(position: THREE.Vector3): void {
    this.position.copy(position);
    this.mesh.position.copy(position);
    this.state = EntityLifecycleState.ACTIVE;
  }
  
  update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.age += deltaTime * 1000;
    this.distanceFromPlayer = this.position.distanceTo(playerPosition);
    
    // Update enemy
    this.enemy.update(deltaTime, playerPosition);
    
    // Update position reference
    this.position.copy(this.enemy.getPosition());
    
    // Update state based on enemy status
    if (this.enemy.isDead()) {
      this.state = EntityLifecycleState.DEAD;
    }
  }
  
  dispose(): void {
    this.enemy.dispose();
  }
  
  getEnemy(): Enemy {
    return this.enemy;
  }
}

export class DynamicEnemySpawningSystem extends DynamicSpawningSystem<SpawnableEnemyWrapper> {
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private difficulty: number = 1;
  
  constructor(
    scene: THREE.Scene, 
    effectsManager: EffectsManager, 
    audioManager: AudioManager,
    config?: Partial<SpawningConfig>
  ) {
    const defaultConfig: SpawningConfig = {
      playerMovementThreshold: 5,
      fadeInDistance: 15,
      fadeOutDistance: 50,
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
    
    console.log(`[DynamicEnemySpawningSystem] Initialized with max ${this.config.maxEntities} enemies`);
  }
  
  protected createEntity(isInitial: boolean, playerPosition?: THREE.Vector3): SpawnableEnemyWrapper {
    const spawnPosition = this.calculateSpawnPosition(playerPosition);
    
    // Create the actual enemy
    const enemy = Enemy.createRandomEnemy(
      this.scene,
      spawnPosition,
      this.effectsManager,
      this.audioManager,
      this.difficulty
    );
    
    // Wrap it in the spawnable interface
    const wrapper = new SpawnableEnemyWrapper(enemy);
    wrapper.initialize(spawnPosition);
    
    console.log(`[DynamicEnemySpawningSystem] Created enemy at position:`, spawnPosition);
    return wrapper;
  }
  
  protected getSystemName(): string {
    return 'DynamicEnemySpawningSystem';
  }
  
  private calculateSpawnPosition(playerPosition?: THREE.Vector3): THREE.Vector3 {
    if (!playerPosition) {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        0,
        (Math.random() - 0.5) * 40
      );
    }
    
    const angle = Math.random() * Math.PI * 2;
    const distance = this.config.minSpawnDistance + 
                    Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
    
    return new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * distance,
      0,
      playerPosition.z + Math.sin(angle) * distance
    );
  }
  
  public getEnemies(): Enemy[] {
    return this.entities.map(wrapper => wrapper.getEnemy()).filter(enemy => !enemy.isDead());
  }
  
  public getAllEnemyWrappers(): SpawnableEnemyWrapper[] {
    return this.entities;
  }
  
  public setDifficulty(difficulty: number): void {
    this.difficulty = Math.max(1, difficulty);
    console.log(`[DynamicEnemySpawningSystem] Difficulty set to ${this.difficulty}`);
  }
}
