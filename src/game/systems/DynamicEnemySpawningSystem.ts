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
      maxEntities: 8,
      baseSpawnInterval: 5000,
      spawnCountPerTrigger: 2,
      aggressiveCleanupDistance: 100,
      fadedOutTimeout: 10000
    };
    
    super(scene, { ...defaultConfig, ...config });
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Initialize safe zone manager (tavern area)
    this.safeZoneManager = new SafeZoneManager({
      center: new THREE.Vector3(0, 0, 0),
      radius: 15
    });

    // Set up safe zone callbacks
    this.safeZoneManager.setCallbacks(
      () => this.onPlayerEnterSafeZone(),
      () => this.onPlayerExitSafeZone()
    );
    
    console.log(`[DynamicEnemySpawningSystem] Initialized with safe zone protection`);
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

    // Reduce spawn rate when player is in safe zone
    if (this.isPlayerInSafeZone) {
      // Much slower spawning in safe zone
      this.spawnTimer += deltaTime * 1000 * 0.1; // 10x slower
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
      
      // Prevent enemies from entering safe zone
      const enemy = entity.getEnemy();
      const enemyPosition = enemy.getPosition();
      
      if (this.safeZoneManager.isPositionInSafeZone(enemyPosition)) {
        // Push enemy out of safe zone
        const safeZoneCenter = this.safeZoneManager.getSafeZoneCenter();
        const direction = new THREE.Vector3()
          .subVectors(enemyPosition, safeZoneCenter)
          .normalize();
        
        const safeDistance = this.safeZoneManager.getSafeZoneRadius() + 2;
        const safePosition = safeZoneCenter.clone().add(direction.multiplyScalar(safeDistance));
        safePosition.y = 0;
        
        enemy.getMesh().position.copy(safePosition);
        console.log(`🛡️ [DynamicEnemySpawningSystem] Pushed enemy out of safe zone`);
      }
      
      // Update entity
      entity.update(deltaTime, playerPosition || new THREE.Vector3());
    }
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
  
  public getSafeZoneManager(): SafeZoneManager {
    return this.safeZoneManager;
  }
}
