import * as THREE from 'three';
import { CrowBird } from '../entities/birds/CrowBird';
import { SpawnableEntity, SpawningConfig } from '../../types/SpawnableEntity';
import { BirdType } from '../../types/GameTypes';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';
import { GlobalFeatureManager } from './GlobalFeatureManager';

export interface BirdSpawningConfig extends SpawningConfig {
  birdTypes: BirdType[];
  birdDensity: number;
  preferredHeights: { min: number; max: number };
  territorySize: number;
}

export class BirdSpawningSystem {
  private scene: THREE.Scene;
  private birds: Map<string, SpawnableEntity> = new Map();
  private birdCorpses: Map<string, SpawnableEntity> = new Map();
  private config: BirdSpawningConfig;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerMovementAccumulator: number = 0;
  private lastSpawnTime: number = 0;
  private birdIdCounter: number = 0;
  private globalFeatureManager: GlobalFeatureManager;

  constructor(scene: THREE.Scene, config?: Partial<BirdSpawningConfig>) {
    this.scene = scene;
    this.globalFeatureManager = GlobalFeatureManager.getInstance(scene);
    this.config = {
      // Movement tracking
      playerMovementThreshold: 15,
      
      // Distance settings - use unified render distances
      fadeInDistance: RENDER_DISTANCES.FADE_IN_DISTANCE,
      fadeOutDistance: RENDER_DISTANCES.FADE_OUT_DISTANCE,
      maxEntityDistance: RENDER_DISTANCES.BIRDS,
      minSpawnDistance: RENDER_DISTANCES.SPAWN.MIN_DISTANCE,
      maxSpawnDistance: RENDER_DISTANCES.SPAWN.MAX_DISTANCE,
      
      // Spawn settings
      maxEntities: 8,
      baseSpawnInterval: 8000, // 8 seconds
      spawnCountPerTrigger: 1,
      
      // Cleanup settings
      aggressiveCleanupDistance: RENDER_DISTANCES.MASTER_CULL_DISTANCE,
      fadedOutTimeout: 5000,
      
      // Bird-specific settings
      birdTypes: [BirdType.CROW],
      birdDensity: 0.3,
      preferredHeights: { min: 0, max: 0 }, // Spawn birds at ground level only
      territorySize: 15,
      
      ...config
    };

    console.log('🐦 [BirdSpawningSystem] Initialized with config:', this.config);
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Track player movement
    const movementDistance = playerPosition.distanceTo(this.lastPlayerPosition);
    this.playerMovementAccumulator += movementDistance;
    this.lastPlayerPosition.copy(playerPosition);

    // Update existing birds
    this.updateBirds(deltaTime, playerPosition);

    // Cleanup dead/distant birds
    this.cleanupBirds(playerPosition);

    // Check if we should spawn new birds
    this.checkSpawning(playerPosition);
  }

  private updateBirds(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.birds.forEach((bird, id) => {
      bird.update(deltaTime, playerPosition);
      
      // Handle opacity fading based on distance
      this.updateBirdOpacity(bird, playerPosition);
      
      // Check if bird died and became corpse
      if ((bird as any).isDead && (bird as any).birdState === 'dead') {
        console.log(`🐦💀 [BirdSpawningSystem] Bird ${id} died, moving to corpses`);
        this.birdCorpses.set(id, bird);
        this.birds.delete(id);
        return;
      }
      
      // Mark for cleanup if needed
      if (bird.state === 'despawning' || bird.state === 'dead') {
        this.removeBird(id);
      }
    });
    
    // Update corpses (they just wait for cleanup timer)
    this.birdCorpses.forEach((corpse, id) => {
      corpse.update(deltaTime, playerPosition);
      if (corpse.state === 'despawning') {
        this.removeCorpse(id);
      }
    });
  }

  private updateBirdOpacity(bird: SpawnableEntity, playerPosition: THREE.Vector3): void {
    const distance = bird.position.distanceTo(playerPosition);
    
    if (distance < this.config.fadeInDistance) {
      bird.opacity = 1.0;
    } else if (distance < this.config.fadeOutDistance) {
      const fadeRange = this.config.fadeOutDistance - this.config.fadeInDistance;
      const fadeProgress = (distance - this.config.fadeInDistance) / fadeRange;
      bird.opacity = 1.0 - fadeProgress;
    } else {
      bird.opacity = 0.0;
    }
    
    // Apply opacity to mesh
    if (bird.mesh) {
      bird.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if ('transparent' in mat) {
                mat.transparent = true;
                mat.opacity = bird.opacity!;
              }
            });
          } else if ('transparent' in child.material) {
            child.material.transparent = true;
            child.material.opacity = bird.opacity!;
          }
        }
      });
    }
  }

  private cleanupBirds(playerPosition: THREE.Vector3): void {
    const birdsToRemove: string[] = [];
    
    this.birds.forEach((bird, id) => {
      const distance = bird.position.distanceTo(playerPosition);
      
      // Mark for cleanup if too far away
      if (distance > this.config.maxEntityDistance) {
        birdsToRemove.push(id);
      }
      
      // Mark for cleanup if faded out for too long
      if (bird.opacity === 0 && Date.now() - bird.age > this.config.fadedOutTimeout) {
        birdsToRemove.push(id);
      }
    });
    
    birdsToRemove.forEach(id => this.removeBird(id));
  }

  private checkSpawning(playerPosition: THREE.Vector3): void {
    const now = Date.now();
    
    // Check movement threshold
    const shouldSpawnByMovement = this.playerMovementAccumulator >= this.config.playerMovementThreshold;
    
    // Check time threshold
    const shouldSpawnByTime = (now - this.lastSpawnTime) >= this.config.baseSpawnInterval;
    
    // Check bird count
    const hasSpaceForMore = this.birds.size < this.config.maxEntities;
    
    // Debug logging more frequently (every 2 seconds)
    if (now % 2000 < 100) {
      console.log(`🐦 [BirdSpawningSystem] Status - Birds: ${this.birds.size}/${this.config.maxEntities}, Movement: ${this.playerMovementAccumulator.toFixed(1)}/${this.config.playerMovementThreshold}, Time since spawn: ${((now - this.lastSpawnTime) / 1000).toFixed(1)}s, Conditions: movement=${shouldSpawnByMovement}, time=${shouldSpawnByTime}, space=${hasSpaceForMore}`);
    }
    
    // Force spawn at least one bird for testing if none exist (reduce wait time)
    if (this.birds.size === 0 && now - this.lastSpawnTime > 1000) {
      console.log('🐦 [BirdSpawningSystem] Force spawning bird for testing');
      this.spawnBirds(playerPosition);
      this.lastSpawnTime = now;
      return;
    }
    
    if ((shouldSpawnByMovement || shouldSpawnByTime) && hasSpaceForMore) {
      console.log('🐦 [BirdSpawningSystem] Spawning birds due to conditions');
      this.spawnBirds(playerPosition);
      this.playerMovementAccumulator = 0;
      this.lastSpawnTime = now;
    }
  }

  private spawnBirds(playerPosition: THREE.Vector3): void {
    const spawnCount = Math.min(
      this.config.spawnCountPerTrigger,
      this.config.maxEntities - this.birds.size
    );
    
    for (let i = 0; i < spawnCount; i++) {
      const spawnPosition = this.findSuitableSpawnPosition(playerPosition);
      if (spawnPosition) {
        this.spawnBirdAtPosition(spawnPosition);
      }
    }
  }

  private findSuitableSpawnPosition(playerPosition: THREE.Vector3): THREE.Vector3 | null {
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random position within spawn range
      const angle = Math.random() * Math.PI * 2;
      const distance = this.config.minSpawnDistance + 
        Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
      
      const x = playerPosition.x + Math.cos(angle) * distance;
      const z = playerPosition.z + Math.sin(angle) * distance;
      
      // Choose appropriate height
      const heightVariation = this.config.preferredHeights.max - this.config.preferredHeights.min;
      const y = this.config.preferredHeights.min + Math.random() * heightVariation;
      
      const candidatePosition = new THREE.Vector3(x, y, z);
      
      // Check if position is suitable (not too close to other birds)
      if (this.isPositionSuitable(candidatePosition)) {
        return candidatePosition;
      }
    }
    
    return null;
  }

  private isPositionSuitable(position: THREE.Vector3): boolean {
    const minDistanceBetweenBirds = 8;
    
    for (const bird of this.birds.values()) {
      if (position.distanceTo(bird.position) < minDistanceBetweenBirds) {
        return false;
      }
    }
    
    return true;
  }

  private spawnBirdAtPosition(position: THREE.Vector3): void {
    const birdType = this.config.birdTypes[Math.floor(Math.random() * this.config.birdTypes.length)];
    const birdId = `bird_${birdType}_${this.birdIdCounter++}`;
    
    let bird: SpawnableEntity;
    
    switch (birdType) {
      case BirdType.CROW:
        bird = new CrowBird(birdId);
        break;
      default:
        bird = new CrowBird(birdId); // Fallback to crow
        break;
    }
    
    bird.initialize(position);
    this.birds.set(birdId, bird);
    this.scene.add(bird.mesh);
    
    // Register with global feature manager for persistent rendering
    this.globalFeatureManager.registerFeature(
      birdId, 
      bird.mesh, 
      position, 
      'bird', 
      position // Use spawn position as reference player position
    );
    
    console.log(`🐦 [BirdSpawningSystem] Spawned ${birdType} at position:`, position);
  }

  private removeBird(birdId: string): void {
    const bird = this.birds.get(birdId);
    if (bird) {
      this.scene.remove(bird.mesh);
      bird.dispose();
      this.birds.delete(birdId);
      
      console.log(`🐦 [BirdSpawningSystem] Removed bird: ${birdId}`);
    }
  }
  
  private removeCorpse(corpseId: string): void {
    const corpse = this.birdCorpses.get(corpseId);
    if (corpse) {
      this.scene.remove(corpse.mesh);
      corpse.dispose();
      this.birdCorpses.delete(corpseId);
      
      console.log(`🐦💀 [BirdSpawningSystem] Removed corpse: ${corpseId}`);
    }
  }

  public getBirdCount(): number {
    return this.birds.size;
  }

  public getAllBirds(): SpawnableEntity[] {
    return Array.from(this.birds.values());
  }
  
  public getAllLivingBirds(): SpawnableEntity[] {
    return Array.from(this.birds.values()).filter(bird => !(bird as any).isDead);
  }
  
  public getCorpseCount(): number {
    return this.birdCorpses.size;
  }

  public dispose(): void {
    this.birds.forEach((bird, id) => {
      this.removeBird(id);
    });
    
    this.birdCorpses.forEach((corpse, id) => {
      this.removeCorpse(id);
    });
    
    console.log('🐦 [BirdSpawningSystem] Disposed all birds and corpses');
  }
}