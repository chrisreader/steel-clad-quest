

import * as THREE from 'three';
import { SpawnableEntity, SpawningConfig, SpawnZone, EntityLifecycleState } from '../../types/SpawnableEntity';

export abstract class DynamicSpawningSystem<T extends SpawnableEntity> {
  protected scene: THREE.Scene;
  protected entities: T[] = [];
  protected config: SpawningConfig;
  
  // Player tracking
  protected lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  protected playerMovementSpeed: number = 0;
  
  // Timing
  protected spawnTimer: number = 0;
  protected currentSpawnInterval: number;
  protected time: number = 0;
  
  constructor(scene: THREE.Scene, config: SpawningConfig) {
    this.scene = scene;
    this.config = config;
    this.currentSpawnInterval = config.baseSpawnInterval;
    
    console.log(`[DynamicSpawningSystem] Initialized with config:`, config);
  }
  
  // Abstract methods that subclasses must implement
  protected abstract createEntity(isInitial: boolean, playerPosition?: THREE.Vector3): T;
  protected abstract getSystemName(): string;
  
  public initialize(playerPosition?: THREE.Vector3): void {
    if (playerPosition) {
      this.lastPlayerPosition.copy(playerPosition);
    }
    
    // Create initial entities around player
    const initialCount = Math.floor(this.config.maxEntities * 0.6);
    for (let i = 0; i < initialCount; i++) {
      this.createAndAddEntity(true, playerPosition);
    }
    
    console.log(`[${this.getSystemName()}] Initialized with ${this.entities.length} entities around player`);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Track player movement
    let shouldRepositionSpawning = false;
    if (playerPosition) {
      const playerMovement = playerPosition.distanceTo(this.lastPlayerPosition);
      this.playerMovementSpeed = playerMovement / deltaTime;
      
      if (playerMovement > this.config.playerMovementThreshold) {
        shouldRepositionSpawning = true;
        console.log(`[${this.getSystemName()}] Player moved ${playerMovement.toFixed(1)} units - repositioning spawn zone`);
        
        // Immediate response: spawn entities around new position
        this.spawnEntitiesAroundPlayer(playerPosition, this.config.spawnCountPerTrigger);
        this.repositionDistantEntities(playerPosition);
        
        this.lastPlayerPosition.copy(playerPosition);
      }
      
      // Dynamic spawn rate based on movement
      this.updateSpawnInterval();
    }
    
    // Regular spawning based on timer
    if (this.spawnTimer >= this.currentSpawnInterval && this.entities.length < this.config.maxEntities) {
      this.createAndAddEntity(false, playerPosition);
      this.spawnTimer = 0;
    }
    
    // Update all entities
    this.updateEntities(deltaTime, playerPosition);
    
    // Cleanup dead entities (more lenient)
    this.cleanupEntities(playerPosition);
  }
  
  protected createAndAddEntity(isInitial: boolean, playerPosition?: THREE.Vector3): void {
    const entity = this.createEntity(isInitial, playerPosition);
    this.entities.push(entity);
    this.scene.add(entity.mesh);
  }
  
  protected spawnEntitiesAroundPlayer(playerPosition: THREE.Vector3, count: number): void {
    console.log(`[${this.getSystemName()}] Immediate spawn of ${count} entities around player`);
    for (let i = 0; i < count && this.entities.length < this.config.maxEntities; i++) {
      this.createAndAddEntity(false, playerPosition);
    }
  }
  
  protected repositionDistantEntities(playerPosition: THREE.Vector3): void {
    let repositioned = 0;
    this.entities.forEach(entity => {
      const distance = entity.mesh.position.distanceTo(playerPosition);
      if (distance > this.config.maxEntityDistance * 0.9) { // More lenient threshold
        // Move entity to new position around player
        const spawnZone = this.generateSpawnZone(playerPosition);
        const newPosition = this.getRandomPositionInZone(spawnZone);
        
        entity.mesh.position.copy(newPosition);
        entity.position.copy(newPosition);
        entity.age = 0; // Reset age
        entity.state = EntityLifecycleState.SPAWNING;
        repositioned++;
      }
    });
    
    if (repositioned > 0) {
      console.log(`[${this.getSystemName()}] Repositioned ${repositioned} distant entities`);
    }
  }
  
  protected updateSpawnInterval(): void {
    const baseInterval = this.config.baseSpawnInterval;
    if (this.playerMovementSpeed > 10) {
      this.currentSpawnInterval = baseInterval * 0.6; // 40% faster
    } else if (this.playerMovementSpeed > 5) {
      this.currentSpawnInterval = baseInterval * 0.8; // 20% faster
    } else {
      this.currentSpawnInterval = baseInterval;
    }
  }
  
  protected updateEntities(deltaTime: number, playerPosition?: THREE.Vector3): void {
    for (const entity of this.entities) {
      // Update distance from player
      if (playerPosition) {
        entity.distanceFromPlayer = entity.mesh.position.distanceTo(playerPosition);
      }
      
      // Update entity
      entity.update(deltaTime, playerPosition || new THREE.Vector3());
    }
  }
  
  protected cleanupEntities(playerPosition?: THREE.Vector3): void {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      
      let shouldRemove = false;
      let removeReason = '';
      
      // More lenient cleanup conditions
      
      // Remove entities that are extremely far (increased threshold)
      if (entity.distanceFromPlayer > this.config.aggressiveCleanupDistance) {
        shouldRemove = true;
        removeReason = 'extremely-far';
      }
      
      // Remove dead entities that have been dead for a long time
      if (entity.state === EntityLifecycleState.DEAD && entity.age > 30000) { // 30 seconds after death
        shouldRemove = true;
        removeReason = 'long-dead';
      }
      
      // Remove very old entities (but with longer threshold)
      if (entity.age > entity.maxAge) {
        shouldRemove = true;
        removeReason = 'max-age';
      }
      
      if (shouldRemove) {
        this.removeEntity(i, removeReason);
      }
    }
  }
  
  protected removeEntity(index: number, reason: string): void {
    const entity = this.entities[index];
    this.scene.remove(entity.mesh);
    entity.dispose();
    this.entities.splice(index, 1);
    
    console.log(`[${this.getSystemName()}] Removed entity (${reason}) - remaining: ${this.entities.length}`);
  }
  
  protected generateSpawnZone(playerPosition: THREE.Vector3): SpawnZone {
    return {
      center: playerPosition.clone(),
      radius: this.config.maxSpawnDistance - this.config.minSpawnDistance
    };
  }
  
  protected getRandomPositionInZone(zone: SpawnZone): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = this.config.minSpawnDistance + Math.random() * zone.radius;
    
    const x = zone.center.x + Math.cos(angle) * distance;
    const z = zone.center.z + Math.sin(angle) * distance;
    
    return new THREE.Vector3(x, zone.center.y, z);
  }
  
  public getEntityCount(): number {
    return this.entities.length;
  }
  
  public getActiveEntityCount(): number {
    return this.entities.filter(e => e.state === EntityLifecycleState.ACTIVE).length;
  }
  
  public dispose(): void {
    this.entities.forEach(entity => {
      this.scene.remove(entity.mesh);
      entity.dispose();
    });
    this.entities = [];
    
    console.log(`[${this.getSystemName()}] Disposed`);
  }
}
