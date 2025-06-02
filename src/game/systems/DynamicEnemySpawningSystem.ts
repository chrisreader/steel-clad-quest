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
    
    // Check if player is in safe zone
    const playerInSafeZone = this.isPositionInSafeZone(playerPosition);
    
    // Update enemy with safe zone information
    this.enemy.update(deltaTime, playerPosition, playerInSafeZone);
    
    // Update position reference
    this.position.copy(this.enemy.getPosition());
    
    // Update state based on enemy status
    if (this.enemy.isDead()) {
      this.state = EntityLifecycleState.DEAD;
    }
  }
  
  private isPositionInSafeZone(position: THREE.Vector3): boolean {
    const safeZoneCenter = new THREE.Vector3(0, 0, 0);
    const safeZoneRadius = 15;
    return position.distanceTo(safeZoneCenter) < safeZoneRadius;
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
  
  // Safe zone configuration
  private safeZoneCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private safeZoneRadius: number = 15;
  
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
      minSpawnDistance: 20, // Increased to ensure spawning outside safe zone
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
    
    console.log(`[DynamicEnemySpawningSystem] Initialized with safe zone at center, radius ${this.safeZoneRadius}`);
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
      // Spawn away from safe zone center
      const angle = Math.random() * Math.PI * 2;
      const distance = this.safeZoneRadius + this.config.minSpawnDistance;
      return new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
    }
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.config.minSpawnDistance + 
                      Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
      
      const spawnPosition = new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        0,
        playerPosition.z + Math.sin(angle) * distance
      );
      
      // Ensure spawn position is outside safe zone
      if (spawnPosition.distanceTo(this.safeZoneCenter) >= this.safeZoneRadius) {
        return spawnPosition;
      }
      
      attempts++;
    }
    
    // Fallback: spawn at minimum distance from safe zone
    const angle = Math.random() * Math.PI * 2;
    const distance = this.safeZoneRadius + this.config.minSpawnDistance;
    return new THREE.Vector3(
      this.safeZoneCenter.x + Math.cos(angle) * distance,
      0,
      this.safeZoneCenter.z + Math.sin(angle) * distance
    );
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Check if player is in safe zone
    const playerInSafeZone = playerPosition.distanceTo(this.safeZoneCenter) < this.safeZoneRadius;
    
    // If player is in safe zone, reduce spawn rate significantly
    if (playerInSafeZone) {
      // Temporarily increase spawn interval to reduce enemy spawning near safe zone
      const originalInterval = this.config.baseSpawnInterval;
      this.config.baseSpawnInterval = originalInterval * 5; // 5x slower spawning
      
      super.update(deltaTime, playerPosition);
      
      // Restore original interval
      this.config.baseSpawnInterval = originalInterval;
    } else {
      super.update(deltaTime, playerPosition);
    }
    
    // Remove enemies that enter the safe zone
    this.entities = this.entities.filter(wrapper => {
      const enemyPosition = wrapper.getEnemy().getPosition();
      const enemyInSafeZone = enemyPosition.distanceTo(this.safeZoneCenter) < this.safeZoneRadius;
      
      if (enemyInSafeZone && !wrapper.getEnemy().isDead()) {
        console.log(`[DynamicEnemySpawningSystem] Removing enemy that entered safe zone`);
        wrapper.dispose();
        this.scene.remove(wrapper.mesh);
        return false;
      }
      
      return true;
    });
  }
  
  public isPlayerInSafeZone(playerPosition: THREE.Vector3): boolean {
    return playerPosition.distanceTo(this.safeZoneCenter) < this.safeZoneRadius;
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
