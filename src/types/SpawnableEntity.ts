
import * as THREE from 'three';

export enum EntityLifecycleState {
  SPAWNING = 'spawning',
  ACTIVE = 'active',
  DESPAWNING = 'despawning',
  DEAD = 'dead'
}

export interface SpawnableEntity {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  age: number;
  maxAge: number;
  state: EntityLifecycleState;
  distanceFromPlayer: number;
  
  // Lifecycle methods
  initialize(position: THREE.Vector3): void;
  update(deltaTime: number, playerPosition: THREE.Vector3): void;
  dispose(): void;
  
  // Optional properties
  velocity?: THREE.Vector3;
  opacity?: number;
  health?: number;
  aiState?: any;
}

export interface SpawningConfig {
  // Movement tracking
  playerMovementThreshold: number;
  
  // Distance settings
  fadeInDistance: number;
  fadeOutDistance: number;
  maxEntityDistance: number;
  minSpawnDistance: number;
  maxSpawnDistance: number;
  
  // Spawn settings
  maxEntities: number;
  baseSpawnInterval: number;
  spawnCountPerTrigger: number;
  
  // Cleanup settings
  aggressiveCleanupDistance: number;
  fadedOutTimeout: number;
}

export interface SpawnZone {
  center: THREE.Vector3;
  radius: number;
  bias?: THREE.Vector3; // Optional directional bias
}
