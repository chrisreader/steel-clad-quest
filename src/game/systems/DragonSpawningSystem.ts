import * as THREE from 'three';
import { RedDragon } from '../entities/dragons/RedDragon';
import { SpawnableEntity, SpawningConfig } from '../../types/SpawnableEntity';
import { DragonType } from '../../types/GameTypes';

export interface DragonSpawningConfig extends SpawningConfig {
  dragonTypes: DragonType[];
  dragonTerritorySize: number;
  spawnHeightOffset: number;
  minDistanceFromPlayer: number;
}

export class DragonSpawningSystem {
  private scene: THREE.Scene;
  private dragon: SpawnableEntity | null = null; // Only one dragon
  private config: DragonSpawningConfig;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerMovementAccumulator: number = 0;
  private lastSpawnTime: number = 0;
  private dragonIdCounter: number = 0;
  private hasSpawned: boolean = false;

  constructor(scene: THREE.Scene, config?: Partial<DragonSpawningConfig>) {
    this.scene = scene;
    this.config = {
      // Movement tracking
      playerMovementThreshold: 50, // Higher threshold for dragon spawning
      
      // Distance settings
      fadeInDistance: 100,
      fadeOutDistance: 150,
      maxEntityDistance: 200,
      minSpawnDistance: 60, // Spawn further away
      maxSpawnDistance: 120,
      
      // Spawn settings
      maxEntities: 1, // Only one dragon
      baseSpawnInterval: 30000, // 30 seconds
      spawnCountPerTrigger: 1,
      
      // Cleanup settings
      aggressiveCleanupDistance: 300,
      fadedOutTimeout: 15000, // Longer timeout for dragons
      
      // Dragon-specific settings
      dragonTypes: [DragonType.RED],
      dragonTerritorySize: 100,
      spawnHeightOffset: 0, // Spawn at ground level
      minDistanceFromPlayer: 80, // Minimum distance from player
      
      ...config
    };

    console.log('🐉 [DragonSpawningSystem] Initialized with config:', this.config);
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Track player movement
    const movementDistance = playerPosition.distanceTo(this.lastPlayerPosition);
    this.playerMovementAccumulator += movementDistance;
    this.lastPlayerPosition.copy(playerPosition);

    // Update existing dragon
    if (this.dragon) {
      this.dragon.update(deltaTime, playerPosition);
      this.updateDragonOpacity(this.dragon, playerPosition);
      
      // Handle dragon lifecycle
      if (this.dragon.state === 'despawning' || this.dragon.state === 'dead') {
        this.removeDragon();
      }
    }

    // Check if we should spawn the dragon (only if we haven't spawned one yet)
    if (!this.hasSpawned) {
      this.checkSpawning(playerPosition);
    }
  }

  private updateDragonOpacity(dragon: SpawnableEntity, playerPosition: THREE.Vector3): void {
    const distance = dragon.position.distanceTo(playerPosition);
    
    if (distance < this.config.fadeInDistance) {
      dragon.opacity = 1.0;
    } else if (distance < this.config.fadeOutDistance) {
      const fadeRange = this.config.fadeOutDistance - this.config.fadeInDistance;
      const fadeProgress = (distance - this.config.fadeInDistance) / fadeRange;
      dragon.opacity = 1.0 - fadeProgress;
    } else {
      dragon.opacity = 0.0;
    }
    
    // Apply opacity to mesh
    if (dragon.mesh) {
      dragon.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if ('transparent' in mat) {
                mat.transparent = true;
                mat.opacity = dragon.opacity!;
              }
            });
          } else if ('transparent' in child.material) {
            child.material.transparent = true;
            child.material.opacity = dragon.opacity!;
          }
        }
      });
    }
  }

  private checkSpawning(playerPosition: THREE.Vector3): void {
    const now = Date.now();
    
    // Check movement threshold
    const shouldSpawnByMovement = this.playerMovementAccumulator >= this.config.playerMovementThreshold;
    
    // Check time threshold
    const shouldSpawnByTime = (now - this.lastSpawnTime) >= this.config.baseSpawnInterval;
    
    // Debug logging
    if (now % 5000 < 100) {
      console.log(`🐉 [DragonSpawningSystem] Status - Dragon: ${this.dragon ? 'exists' : 'none'}, Movement: ${this.playerMovementAccumulator.toFixed(1)}/${this.config.playerMovementThreshold}, Time since spawn: ${((now - this.lastSpawnTime) / 1000).toFixed(1)}s, Conditions: movement=${shouldSpawnByMovement}, time=${shouldSpawnByTime}`);
    }
    
    // Force spawn dragon for testing if none exists and some time has passed
    if (!this.dragon && now - this.lastSpawnTime > 5000) {
      console.log('🐉 [DragonSpawningSystem] Force spawning dragon for testing');
      this.spawnDragon(playerPosition);
      this.lastSpawnTime = now;
      this.hasSpawned = true;
      return;
    }
    
    if ((shouldSpawnByMovement || shouldSpawnByTime) && !this.dragon) {
      console.log('🐉 [DragonSpawningSystem] Spawning dragon due to conditions');
      this.spawnDragon(playerPosition);
      this.playerMovementAccumulator = 0;
      this.lastSpawnTime = now;
      this.hasSpawned = true;
    }
  }

  private spawnDragon(playerPosition: THREE.Vector3): void {
    const spawnPosition = this.findSuitableSpawnPosition(playerPosition);
    if (spawnPosition) {
      this.spawnDragonAtPosition(spawnPosition);
    }
  }

  private findSuitableSpawnPosition(playerPosition: THREE.Vector3): THREE.Vector3 | null {
    const maxAttempts = 15;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random position within spawn range (further away for dragons)
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.max(
        this.config.minDistanceFromPlayer,
        this.config.minSpawnDistance + Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance)
      );
      
      const x = playerPosition.x + Math.cos(angle) * distance;
      const z = playerPosition.z + Math.sin(angle) * distance;
      const y = this.config.spawnHeightOffset; // Spawn at ground level
      
      const candidatePosition = new THREE.Vector3(x, y, z);
      
      // Check if position is suitable (far enough from player)
      if (this.isPositionSuitable(candidatePosition, playerPosition)) {
        return candidatePosition;
      }
    }
    
    return null;
  }

  private isPositionSuitable(position: THREE.Vector3, playerPosition: THREE.Vector3): boolean {
    // Ensure minimum distance from player
    const distanceFromPlayer = position.distanceTo(playerPosition);
    return distanceFromPlayer >= this.config.minDistanceFromPlayer;
  }

  private spawnDragonAtPosition(position: THREE.Vector3): void {
    const dragonType = this.config.dragonTypes[Math.floor(Math.random() * this.config.dragonTypes.length)];
    const dragonId = `dragon_${dragonType}_${this.dragonIdCounter++}`;
    
    let dragon: SpawnableEntity;
    
    switch (dragonType) {
      case DragonType.RED:
        dragon = new RedDragon(dragonId);
        break;
      default:
        dragon = new RedDragon(dragonId); // Fallback to red dragon
        break;
    }
    
    dragon.initialize(position);
    this.dragon = dragon;
    this.scene.add(dragon.mesh);
    
    console.log(`🐉 [DragonSpawningSystem] Spawned ${dragonType} dragon at position:`, position);
  }

  private removeDragon(): void {
    if (this.dragon) {
      this.scene.remove(this.dragon.mesh);
      this.dragon.dispose();
      this.dragon = null;
      
      console.log('🐉 [DragonSpawningSystem] Removed dragon');
    }
  }

  public getDragonCount(): number {
    return this.dragon ? 1 : 0;
  }

  public getDragon(): SpawnableEntity | null {
    return this.dragon;
  }

  public dispose(): void {
    if (this.dragon) {
      this.removeDragon();
    }
    
    console.log('🐉 [DragonSpawningSystem] Disposed dragon spawning system');
  }
}