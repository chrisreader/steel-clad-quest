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
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';
import { GlobalFeatureManager } from './GlobalFeatureManager';

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
  private spawnCooldown: number = 15000; // 15 seconds between spawns
  private playerRotation: number = 0;
  private hasInitialSpawn: boolean = false;
  private globalFeatureManager: GlobalFeatureManager;

  constructor(
    scene: THREE.Scene, 
    effectsManager: EffectsManager, 
    audioManager: AudioManager,
    config?: Partial<SpawningConfig>
  ) {
    const defaultConfig: SpawningConfig = {
      playerMovementThreshold: 15, // Increased to prevent constant spawning 
      fadeInDistance: RENDER_DISTANCES.FADE_IN_DISTANCE,
      fadeOutDistance: RENDER_DISTANCES.FADE_OUT_DISTANCE,
      maxEntityDistance: RENDER_DISTANCES.ENEMIES, // Use unified enemy distance
      minSpawnDistance: RENDER_DISTANCES.SPAWN.MIN_DISTANCE, // Use unified spawn distances
      maxSpawnDistance: RENDER_DISTANCES.SPAWN.MAX_DISTANCE,
      maxEntities: 8, // More enemies for engaging gameplay
      baseSpawnInterval: 15000, // Fixed interval spawning
      spawnCountPerTrigger: 1, // Single enemy spawns
      aggressiveCleanupDistance: RENDER_DISTANCES.MASTER_CULL_DISTANCE,
      fadedOutTimeout: 20000
    };
    
    super(scene, { ...defaultConfig, ...config });
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.lineOfSightDetector = new LineOfSightDetector(scene);
    this.globalFeatureManager = GlobalFeatureManager.getInstance(scene);
    
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

  // Override base class initialize to use MMORPG-style initial spawning
  public initialize(playerPosition?: THREE.Vector3): void {
    if (playerPosition) {
      this.lastPlayerPosition.copy(playerPosition);
      // Trigger initial spawn immediately
      this.performInitialSpawn(playerPosition);
      this.hasInitialSpawn = true;
      console.log(`[DynamicEnemySpawningSystem] MMORPG initial spawn completed with ${this.entities.length} enemies`);
    }
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

    // Initial spawn on game load - spawn 3-4 enemies around player immediately
    if (!this.hasInitialSpawn && playerPosition) {
      this.performInitialSpawn(playerPosition);
      this.hasInitialSpawn = true;
    }

    // MMORPG-style fixed interval spawning (45-90 unit range for ongoing spawns)
    const timeSinceLastSpawn = now - this.lastSpawnTime;
    const shouldSpawn = timeSinceLastSpawn >= this.spawnCooldown && 
                       this.entities.length < this.config.maxEntities &&
                       playerPosition;

    if (shouldSpawn) {
      this.spawnEnemyMMORPGStyle(playerPosition!, true); // true for ongoing spawn
      this.lastSpawnTime = now;
    }

    // Update all entities with enhanced AI
    this.updateEntities(deltaTime, playerPosition);
    
    // Cleanup distant/dead entities
    this.cleanupEntities();
  }

  private performInitialSpawn(playerPosition: THREE.Vector3): void {
    const initialEnemyCount = 3 + Math.floor(Math.random() * 2); // 3-4 enemies
    console.log(`🚀 [MMORPG Initial Spawn] Creating ${initialEnemyCount} enemies around player on game start`);
    
    for (let i = 0; i < initialEnemyCount; i++) {
      // Spawn in a ring around player at safe initial distances
      const angle = (i / initialEnemyCount) * Math.PI * 2 + Math.random() * 0.5; // Add randomness
      const distance = this.config.minSpawnDistance + Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
      
      const spawnPosition = new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        0,
        playerPosition.z + Math.sin(angle) * distance
      );
      
      // Ensure not in safe zone
      const finalPosition = this.isInSafeZone(spawnPosition) ? 
        this.safeZoneManager.generateSafeSpawnPosition(
          this.config.minSpawnDistance,
          this.config.maxSpawnDistance,
          spawnPosition
        ) : spawnPosition;
      
      this.spawnEnemyAtPosition(finalPosition, false); // false for initial spawn
    }
  }

  private spawnEnemyMMORPGStyle(playerPosition: THREE.Vector3, isOngoingSpawn: boolean = true): void {
    let spawnPosition: THREE.Vector3;
    
    if (isOngoingSpawn) {
      // Ongoing spawns use line-of-sight detection and larger distances (45-90 units)
      spawnPosition = this.lineOfSightDetector.getBestSpawnPosition(
        playerPosition,
        this.playerRotation,
        45, // Increased min distance for ongoing spawns
        90  // Increased max distance for ongoing spawns
      );
    } else {
      // Initial spawns use closer, visible distances (35-60 units)
      const angle = Math.random() * Math.PI * 2;
      const distance = 35 + Math.random() * 25; // 35-60 units
      spawnPosition = new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        0,
        playerPosition.z + Math.sin(angle) * distance
      );
    }
    
    // Ensure spawn position avoids safe zone
    const finalPosition = this.isInSafeZone(spawnPosition) ? 
      this.safeZoneManager.generateSafeSpawnPosition(
        isOngoingSpawn ? 45 : 35,
        isOngoingSpawn ? 90 : 60,
        new THREE.Vector3(spawnPosition.x, spawnPosition.y, spawnPosition.z)
      ) : spawnPosition;
    
    this.spawnEnemyAtPosition(finalPosition, isOngoingSpawn);
  }

  private spawnEnemyAtPosition(position: THREE.Vector3, isOngoingSpawn: boolean): void {
    // Create the enemy
    const enemy = Enemy.createRandomEnemy(
      this.scene,
      position,
      this.effectsManager,
      this.audioManager,
      this.difficulty
    );

    // All enemies start passive and transition to aggressive based on AI state management
    enemy.setPassiveMode(true);
    
    // Wrap it in the spawnable interface
    const wrapper = new SpawnableEnemyWrapper(enemy);
    wrapper.initialize(position);
    
    // Register with global feature manager for persistent rendering
    const enemyId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.globalFeatureManager.registerFeature(
      enemyId, 
      enemy.getMesh(), 
      position, 
      'enemy', 
      position // Use spawn position as reference player position
    );
    
    // Add to entities list and scene
    this.entities.push(wrapper);
    
    const spawnType = isOngoingSpawn ? "ongoing" : "initial";
    console.log(`🗡️ [MMORPG ${spawnType} spawn] Created enemy at distance: ${position.distanceTo(new THREE.Vector3()).toFixed(1)}`);
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
  
  public forceInitialSpawn(playerPosition: THREE.Vector3): void {
    if (!this.hasInitialSpawn) {
      this.performInitialSpawn(playerPosition);
      this.hasInitialSpawn = true;
    }
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
