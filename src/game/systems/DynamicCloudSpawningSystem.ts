
import * as THREE from 'three';
import { DynamicSpawningSystem } from './DynamicSpawningSystem';
import { CloudEntity } from '../entities/CloudEntity';
import { SpawningConfig, SpawnZone } from '../../types/SpawnableEntity';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';
import { GlobalFeatureManager } from './GlobalFeatureManager';

export class DynamicCloudSpawningSystem extends DynamicSpawningSystem<CloudEntity> {
  private cloudMaterial: THREE.MeshLambertMaterial;
  private globalFeatureManager: GlobalFeatureManager;
  
  constructor(scene: THREE.Scene) {
    const config: SpawningConfig = {
      playerMovementThreshold: 5,
      fadeInDistance: RENDER_DISTANCES.FADE_IN_DISTANCE,
      fadeOutDistance: RENDER_DISTANCES.FADE_OUT_DISTANCE,
      maxEntityDistance: RENDER_DISTANCES.CLOUDS,
      minSpawnDistance: 200, // Increased distance
      maxSpawnDistance: 400, // Reduced max distance
      maxEntities: 4, // Reduced from 8
      baseSpawnInterval: 8000, // Doubled interval (slower spawning)
      spawnCountPerTrigger: 1, // Reduced from 2
      aggressiveCleanupDistance: RENDER_DISTANCES.MASTER_CULL_DISTANCE,
      fadedOutTimeout: 3000
    };
    
    super(scene, config);
    this.globalFeatureManager = GlobalFeatureManager.getInstance(scene);
    
    // Create cloud material with better visibility
    this.cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6, // Increased from 0.4
      fog: true // Allow fog to affect clouds naturally
    });
    
    console.log('DynamicCloudSpawningSystem initialized');
  }
  
  protected createEntity(isInitial: boolean = false, playerPosition?: THREE.Vector3): CloudEntity {
    const cloud = new CloudEntity(this.cloudMaterial);
    
    // Calculate spawn position with proper altitude
    const cloudHeight = 60 + Math.random() * 30; // 60-90 altitude for visibility
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
    
    // Register with global feature manager for persistent rendering
    const cloudId = `cloud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.globalFeatureManager.registerFeature(
      cloudId, 
      cloud.mesh, // CloudEntity uses mesh property directly
      spawnPosition, 
      'cloud', 
      playerPosition || new THREE.Vector3(0, 0, 0)
    );
    
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
