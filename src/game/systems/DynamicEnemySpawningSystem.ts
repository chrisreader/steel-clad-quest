import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { DynamicSpawningSystem } from './DynamicSpawningSystem';
import { SpawnableEntity, EntityLifecycleState, SpawningConfig } from '../../types/SpawnableEntity';
import { EnemyType } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { SafeZoneManager } from './SafeZoneManager';
import { LineOfSightDetector } from './LineOfSightDetector';
import { EnemyStateManager, EnemyAIState } from './EnemyStateManager';

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
  private lineOfSightDetector: LineOfSightDetector;
  private isPlayerInSafeZone: boolean = false;
  private lastSpawnTime: number = 0;
  private spawnCooldown: number = 18000; // 18 seconds between spawns
  private playerRotation: number = 0;

  constructor(
    scene: THREE.Scene, 
    effectsManager: EffectsManager, 
    audioManager: AudioManager,
    config?: Partial<SpawningConfig>
  ) {
    const defaultConfig: SpawningConfig = {
      playerMovementThreshold: 10, // Reduced movement sensitivity 
      fadeInDistance: 30,
      fadeOutDistance: 80,
      maxEntityDistance: 150, // Increased cleanup distance
      minSpawnDistance: 45, // Far enough to be out of sight
      maxSpawnDistance: 90, // MMORPG-style spawn range
      maxEntities: 7, // More enemies for engaging gameplay
      baseSpawnInterval: 18000, // Fixed interval spawning
      spawnCountPerTrigger: 1, // Single enemy spawns
      aggressiveCleanupDistance: 120,
      fadedOutTimeout: 15000
    };
    
    super(scene, { ...defaultConfig, ...config });
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.lineOfSightDetector = new LineOfSightDetector(scene);
    
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
    
    console.log(`[DynamicEnemySpawningSystem] Initialized MMORPG-style spawning (${this.config.maxEntities} enemies max, ${this.spawnCooldown/1000}s intervals)`);
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
    const now = Date.now();
    
    // Update safe zone status
    if (playerPosition) {
      this.safeZoneManager.updatePlayerPosition(playerPosition);
    }

    // MMORPG-style fixed interval spawning
    const timeSinceLastSpawn = now - this.lastSpawnTime;
    const shouldSpawn = timeSinceLastSpawn >= this.spawnCooldown && 
                       this.entities.length < this.config.maxEntities &&
                       playerPosition;

    if (shouldSpawn) {
      this.spawnEnemyMMORPGStyle(playerPosition!);
      this.lastSpawnTime = now;
    }

    // Update all entities with enhanced AI
    this.updateEntities(deltaTime, playerPosition);
    
    // Cleanup distant/dead entities
    this.cleanupEntities();
  }

  private spawnEnemyMMORPGStyle(playerPosition: THREE.Vector3): void {
    // Get optimal spawn position using line-of-sight detection
    const spawnPosition = this.lineOfSightDetector.getBestSpawnPosition(
      playerPosition,
      this.playerRotation,
      this.config.minSpawnDistance,
      this.config.maxSpawnDistance
    );
    
    // Ensure spawn position avoids safe zone
    const finalPosition = this.isInSafeZone(spawnPosition) ? 
      this.safeZoneManager.generateSafeSpawnPosition(
        this.config.minSpawnDistance,
        this.config.maxSpawnDistance,
        new THREE.Vector3(spawnPosition.x, spawnPosition.y, spawnPosition.z)
      ) : spawnPosition;
    
    // Create the enemy
    const enemy = Enemy.createRandomEnemy(
      this.scene,
      finalPosition,
      this.effectsManager,
      this.audioManager,
      this.difficulty
    );

    // Enemies start in wandering state, not immediately aggressive
    enemy.setPassiveMode(true);
    
    // Wrap it in the spawnable interface
    const wrapper = new SpawnableEnemyWrapper(enemy);
    wrapper.initialize(finalPosition);
    
    // Add to entities list and scene
    this.entities.push(wrapper);
    
    console.log(`🗡️ [MMORPG Spawning] Created enemy at position:`, finalPosition, `Distance: ${finalPosition.distanceTo(playerPosition).toFixed(1)}`);
  }

  protected createEntity(isInitial: boolean, playerPosition?: THREE.Vector3): SpawnableEnemyWrapper {
    // This method is kept for compatibility but redirects to MMORPG spawning
    if (playerPosition) {
      this.spawnEnemyMMORPGStyle(playerPosition);
      return this.entities[this.entities.length - 1];
    }
    
    // Fallback for initial spawning
    const spawnPosition = this.safeZoneManager.generateSafeSpawnPosition(
      this.config.minSpawnDistance,
      this.config.maxSpawnDistance,
      playerPosition
    );
    
    const enemy = Enemy.createRandomEnemy(
      this.scene,
      spawnPosition,
      this.effectsManager,
      this.audioManager,
      this.difficulty
    );

    enemy.setPassiveMode(true);
    const wrapper = new SpawnableEnemyWrapper(enemy);
    wrapper.initialize(spawnPosition);
    
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
  
  public updatePlayerRotation(rotation: number): void {
    this.playerRotation = rotation;
  }
  
  public getLineOfSightDetector(): LineOfSightDetector {
    return this.lineOfSightDetector;
  }
  
  public setSpawnCooldown(cooldown: number): void {
    this.spawnCooldown = Math.max(5000, cooldown); // Minimum 5 seconds
    console.log(`[DynamicEnemySpawningSystem] Spawn cooldown set to ${cooldown/1000}s`);
  }
  
  private isInSafeZone(position: THREE.Vector3): boolean {
    return this.safeZoneManager.isPositionInSafeZone(position);
  }
}
