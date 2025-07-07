
import * as THREE from 'three';
import { DynamicSpawningSystem } from './DynamicSpawningSystem';
import { CloudEntity } from '../entities/CloudEntity';
import { SpawningConfig, SpawnZone } from '../../types/SpawnableEntity';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';

export class DynamicCloudSpawningSystem extends DynamicSpawningSystem<CloudEntity> {
  private cloudMaterial: THREE.MeshLambertMaterial;
  
  constructor(scene: THREE.Scene) {
    const config: SpawningConfig = {
      playerMovementThreshold: 3,
      fadeInDistance: RENDER_DISTANCES.LOD_MEDIUM,
      fadeOutDistance: RENDER_DISTANCES.LOD_FAR,
      maxEntityDistance: RENDER_DISTANCES.CLOUDS,
      minSpawnDistance: RENDER_DISTANCES.SPAWN.MIN_DISTANCE * 3, // Clouds spawn farther
      maxSpawnDistance: RENDER_DISTANCES.SPAWN.MAX_DISTANCE,
      maxEntities: 8,
      baseSpawnInterval: 4000,
      spawnCountPerTrigger: 2,
      aggressiveCleanupDistance: RENDER_DISTANCES.CLEANUP.CLOUDS,
      fadedOutTimeout: 2000
    };
    
    super(scene, config);
    
    // Create cloud material
    this.cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      fog: false
    });
    
    console.log('DynamicCloudSpawningSystem initialized');
  }
  
  protected createEntity(isInitial: boolean = false, playerPosition?: THREE.Vector3): CloudEntity {
    const cloud = new CloudEntity(this.cloudMaterial);
    
    // Calculate spawn position
    const cloudHeight = 35 + Math.random() * 15;
    const centerX = playerPosition ? playerPosition.x : 0;
    const centerZ = playerPosition ? playerPosition.z : 0;
    
    let spawnX, spawnZ;
    
    if (isInitial) {
      // Initial clouds: distribute in a circle around player
      const angle = Math.random() * Math.PI * 2;
      const distance = this.config.minSpawnDistance + Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
      spawnX = centerX + Math.cos(angle) * distance;
      spawnZ = centerZ + Math.sin(angle) * distance;
    } else {
      // New clouds: spawn around player with upwind bias
      const angle = Math.random() * Math.PI * 2;
      const distance = this.config.minSpawnDistance + Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
      
      // Bias toward upwind direction for natural flow
      const upwindBias = Math.random();
      if (upwindBias > 0.3) {
        const windDirection = new THREE.Vector3(1.0, 0, 0.5).normalize();
        const upwindAngle = Math.atan2(-windDirection.z, -windDirection.x);
        const biasedAngle = upwindAngle + (Math.random() - 0.5) * Math.PI;
        spawnX = centerX + Math.cos(biasedAngle) * distance;
        spawnZ = centerZ + Math.sin(biasedAngle) * distance;
      } else {
        spawnX = centerX + Math.cos(angle) * distance;
        spawnZ = centerZ + Math.sin(angle) * distance;
      }
    }
    
    const spawnPosition = new THREE.Vector3(spawnX, cloudHeight, spawnZ);
    cloud.initialize(spawnPosition);
    
    return cloud;
  }
  
  protected getRandomPositionInZone(zone: SpawnZone): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = this.config.minSpawnDistance + Math.random() * zone.radius;
    
    // Always use sky height for clouds instead of player's Y position
    const cloudHeight = 35 + Math.random() * 15;
    
    const x = zone.center.x + Math.cos(angle) * distance;
    const z = zone.center.z + Math.sin(angle) * distance;
    
    return new THREE.Vector3(x, cloudHeight, z);
  }
  
  protected getSystemName(): string {
    return 'DynamicCloudSpawningSystem';
  }
  
  public dispose(): void {
    super.dispose();
    
    if (this.cloudMaterial) {
      this.cloudMaterial.dispose();
    }
    
    console.log('DynamicCloudSpawningSystem disposed');
  }
}
