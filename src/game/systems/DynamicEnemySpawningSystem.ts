import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { DynamicSpawningSystem } from './DynamicSpawningSystem';
import { SpawnableEntity, EntityLifecycleState, SpawningConfig } from '../../types/SpawnableEntity';
import { EnemyType } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { SafeZoneManager } from './SafeZoneManager';

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
  private safeZoneManager: SafeZoneManager;
  private isPlayerInSafeZone: boolean = false;

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
      maxEntityDistance: 80,
      minSpawnDistance: 20,
      maxSpawnDistance: 40,
      maxEntities: 3, // Reduced from 8 to 3 (approx 70% reduction)
      baseSpawnInterval: 16000, // Increased from 5000 to 16000 (3.2x slower, 70% reduction in frequency)
      spawnCountPerTrigger: 1, // Reduced from 2 to 1 (50% reduction)
      aggressiveCleanupDistance: 100,
      fadedOutTimeout: 10000
    };
    
    super(scene, { ...defaultConfig, ...config });
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Initialize safe zone manager with exact tavern dimensions
    this.safeZoneManager = new SafeZoneManager({
      minX: -6,
      maxX: 6,
      minZ: -6,
      maxZ: 6
    });

    // Set up safe zone callbacks
    this.safeZoneManager.setCallbacks(
      () => this.onPlayerEnterSafeZone(),
      () => this.onPlayerExitSafeZone()
    );
    
    console.log(`[DynamicEnemySpawningSystem] Initialized with reduced spawning (70% decrease)`);
  }

  private onPlayerEnterSafeZone(): void {
    this.isPlayerInSafeZone = true;
    console.log(`🛡️ [DynamicEnemySpawningSystem] Player entered safe zone - switching all enemies to passive mode`);
    
    // Switch all existing enemies to passive mode
    this.entities.forEach(wrapper => {
      const enemy = wrapper.getEnemy();
      enemy.setPassiveMode(true);
    });
  }

  private onPlayerExitSafeZone(): void {
    this.isPlayerInSafeZone = false;
    console.log(`⚔️ [DynamicEnemySpawningSystem] Player exited safe zone - switching all enemies to aggressive mode`);
    
    // Switch all existing enemies back to aggressive mode
    this.entities.forEach(wrapper => {
      const enemy = wrapper.getEnemy();
      enemy.setPassiveMode(false);
    });
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // Update safe zone status
    if (playerPosition) {
      this.safeZoneManager.updatePlayerPosition(playerPosition);
    }

    // Reduce spawn rate when player is in safe zone (even more reduction)
    if (this.isPlayerInSafeZone) {
      // Much slower spawning in safe zone (20x slower instead of 10x)
      this.spawnTimer += deltaTime * 1000 * 0.05;
    } else {
      this.spawnTimer += deltaTime * 1000;
    }

    // Call parent update method
    super.update(deltaTime, playerPosition);
  }

  protected createEntity(isInitial: boolean, playerPosition?: THREE.Vector3): SpawnableEnemyWrapper {
    // Generate spawn position that avoids safe zone
    const spawnPosition = this.safeZoneManager.generateSafeSpawnPosition(
      this.config.minSpawnDistance,
      this.config.maxSpawnDistance,
      playerPosition
    );
    
    // Create the actual enemy
    const enemy = Enemy.createRandomEnemy(
      this.scene,
      spawnPosition,
      this.effectsManager,
      this.audioManager,
      this.difficulty
    );

    // Set initial passive state based on player location
    enemy.setPassiveMode(this.isPlayerInSafeZone);
    
    // Wrap it in the spawnable interface
    const wrapper = new SpawnableEnemyWrapper(enemy);
    wrapper.initialize(spawnPosition);
    
    console.log(`[DynamicEnemySpawningSystem] Created enemy at safe position:`, spawnPosition);
    return wrapper;
  }

  protected updateEntities(deltaTime: number, playerPosition?: THREE.Vector3): void {
    for (const entity of this.entities) {
      // Update distance from player
      if (playerPosition) {
        entity.distanceFromPlayer = entity.mesh.position.distanceTo(playerPosition);
      }
      
      // Update entity - let the enemy handle its own safe zone avoidance
      entity.update(deltaTime, playerPosition || new THREE.Vector3());
    }
  }

  protected getSystemName(): string {
    return 'DynamicEnemySpawningSystem';
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
  
  public getSafeZoneManager(): SafeZoneManager {
    return this.safeZoneManager;
  }
}
