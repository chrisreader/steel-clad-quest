import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { Tavern } from '../entities/Tavern';
import { VolumetricFogSystem } from '../effects/VolumetricFogSystem';
import { DynamicCloudSystem } from '../utils/DynamicCloudSystem';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { EffectsManager, AudioManager } from '../managers';
import { PhysicsManager } from './PhysicsManager';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private camera: THREE.PerspectiveCamera | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private moon: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private volumetricFog: VolumetricFogSystem | null = null;
  private dynamicCloudSystem: DynamicCloudSystem | null = null;
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;
  private skybox: THREE.Mesh | null = null;
  private terrain: THREE.Mesh | null = null;
  private safeZoneRadius: number = 6;
  private safeZoneCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Time of day
  private timeOfDay: number = 0.25; // Start at dawn
  private timeSpeed: number = 0.0001;
  
  // Fog parameters
  private fogColor: THREE.Color = new THREE.Color(0x87CEEB);
  private fogDensity: number = 0.002;
  
  // Terrain parameters
  private terrainSize: number = 256;
  private terrainHeight: number = 40;
  private terrainDetail: number = 64;
  
  // Water parameters
  private waterLevel: number = 5;
  
  // Tavern instance
  private tavern: Tavern | null = null;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log("🏠 [SceneManager] Initialized");
  }
  
  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }
  
  public initializeEnemySpawning(effectsManager: EffectsManager, audioManager: AudioManager): void {
    if (!this.scene) {
      console.error("🏠 [SceneManager] Cannot initialize enemy spawning: scene not initialized");
      return;
    }
    
    // Initialize enemy spawning system with exact tavern dimensions
    this.enemySpawningSystem = new DynamicEnemySpawningSystem(this.scene, effectsManager, audioManager, {
      minSpawnDistance: 20,
      maxSpawnDistance: 40,
      maxEntities: 8,
      baseSpawnInterval: 5000,
      spawnCountPerTrigger: 2,
      aggressiveCleanupDistance: 100,
      fadedOutTimeout: 10000
    });
    
    console.log("🏠 [SceneManager] Enemy spawning system initialized with exact tavern safe zone");
  }
  
  public startEnemySpawning(playerPosition: THREE.Vector3): void {
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.startSpawning(playerPosition);
      console.log("🏠 [SceneManager] Enemy spawning started");
    } else {
      console.warn("🏠 [SceneManager] Enemy spawning system not initialized");
    }
  }
  
  public stopEnemySpawning(): void {
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.stopSpawning();
      console.log("🏠 [SceneManager] Enemy spawning stopped");
    } else {
      console.warn("🏠 [SceneManager] Enemy spawning system not initialized");
    }
  }
  
  public createDefaultWorld(): void {
    console.log("🏠 [SceneManager] Creating default world...");
    
    // Enable shadows
    this.scene.castShadow = true;
    this.scene.receiveShadow = true;
    
    // Add skybox
    this.createSkybox();
    
    // Add terrain
    this.createTerrain();
    
    // Add lighting
    this.createLighting();
    
    // Add volumetric fog
    this.createVolumetricFog();
    
    // Add dynamic clouds
    this.createDynamicClouds();
    
    // Add tavern
    this.createTavern();
    
    console.log("🏠 [SceneManager] Default world created!");
  }
  
  private createSkybox(): void {
    const skyboxTexture = new THREE.CubeTextureLoader().load([
      'assets/skybox/sky1_px.png',
      'assets/skybox/sky1_nx.png',
      'assets/skybox/sky1_py.png',
      'assets/skybox/sky1_ny.png',
      'assets/skybox/sky1_pz.png',
      'assets/skybox/sky1_nz.png'
    ]);
    
    this.scene.background = skyboxTexture;
    
    const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyboxMaterial = new THREE.MeshBasicMaterial({
      map: skyboxTexture,
      side: THREE.BackSide
    });
    
    this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    this.scene.add(this.skybox);
  }
  
  private createTerrain(): void {
    const terrainTexture = new THREE.TextureLoader().load('assets/terrain/terrain_01_diffuse.jpg');
    const terrainNormalMap = new THREE.TextureLoader().load('assets/terrain/terrain_01_normal.jpg');
    
    const geometry = new THREE.PlaneGeometry(
      this.terrainSize,
      this.terrainSize,
      this.terrainDetail,
      this.terrainDetail
    );
    
    geometry.rotateX(-Math.PI / 2);
    
    const vertices = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      const noise = Math.random() * this.terrainHeight;
      vertices[i + 1] = noise;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      normalMap: terrainNormalMap,
      side: THREE.DoubleSide
    });
    
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
    
    // Add terrain collision if the method exists
    if (this.physicsManager && typeof this.physicsManager.addCollision === 'function') {
      this.physicsManager.addCollision(this.terrain, 'terrain');
    }
  }
  
  private createLighting(): void {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(this.ambientLight);
    
    // Sun
    this.sun = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sun.position.set(100, 100, 50);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 1024;
    this.sun.shadow.mapSize.height = 1024;
    this.sun.shadow.camera.near = 50;
    this.sun.shadow.camera.far = 200;
    this.scene.add(this.sun);
    
    // Moon
    this.moon = new THREE.DirectionalLight(0x808080, 0.2);
    this.moon.position.set(-100, 100, -50);
    this.scene.add(this.moon);
  }
  
  private createVolumetricFog(): void {
    this.volumetricFog = new VolumetricFogSystem(this.scene, this.camera!);
    this.volumetricFog.setColor(this.fogColor);
    this.volumetricFog.setDensity(this.fogDensity);
    this.volumetricFog.setDistance(5, 100);
    this.volumetricFog.initialize();
  }
  
  private createDynamicClouds(): void {
    this.dynamicCloudSystem = new DynamicCloudSystem(this.scene);
    this.dynamicCloudSystem.initialize();
  }
  
  private createTavern(): void {
    this.tavern = new Tavern(this.scene, this.physicsManager);
    this.tavern.load().then(() => {
      console.log("🏠 [SceneManager] Tavern loaded successfully");
    }).catch(error => {
      console.error("🏠 [SceneManager] Error loading tavern:", error);
    });
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Update time of day
    this.timeOfDay += this.timeSpeed * deltaTime;
    this.timeOfDay %= 1;
    
    // Update lighting
    this.updateLighting();
    
    // Update fog
    this.updateFog();
    
    // Update volumetric fog
    if (this.volumetricFog) {
      this.volumetricFog.update(deltaTime);
    }
    
    // Update dynamic clouds
    if (this.dynamicCloudSystem) {
      this.dynamicCloudSystem.update(deltaTime);
    }
    
    // Update enemy spawning
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
    }
  }
  
  private updateLighting(): void {
    if (!this.sun || !this.moon || !this.ambientLight || !this.camera) return;
    
    const sunIntensity = Math.max(0, Math.sin(this.timeOfDay * Math.PI));
    const moonIntensity = Math.max(0, Math.cos(this.timeOfDay * Math.PI));
    
    this.sun.intensity = sunIntensity * 0.8;
    this.moon.intensity = moonIntensity * 0.2;
    
    // Calculate sun direction based on time of day
    const sunAngle = this.timeOfDay * Math.PI * 2;
    this.sun.position.x = Math.cos(sunAngle) * 100;
    this.sun.position.y = Math.sin(sunAngle) * 100;
    this.sun.position.z = 50;
    
    // Calculate moon direction opposite to sun
    this.moon.position.x = Math.cos(sunAngle + Math.PI) * 100;
    this.moon.position.y = Math.sin(sunAngle + Math.PI) * 100;
    this.moon.position.z = -50;
    
    // Calculate ambient light intensity
    const ambientIntensity = 0.3 + sunIntensity * 0.3;
    this.ambientLight.intensity = ambientIntensity;
    
    // Sun glow effect
    if (this.camera) {
      const sunPosition = this.sun.position.clone().normalize();
      const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
      const sunGlow = Math.max(0, sunPosition.dot(cameraDirection));
      this.scene.background = new THREE.Color(0.5 + sunGlow * 0.5, 0.6 + sunGlow * 0.4, 0.7 + sunGlow * 0.3);
    }
  }
  
  private updateFog(): void {
    if (!this.volumetricFog) return;
    
    const fogColor = new THREE.Color(
      0.5 + Math.sin(this.timeOfDay * Math.PI) * 0.5,
      0.6 + Math.sin(this.timeOfDay * Math.PI) * 0.4,
      0.7 + Math.sin(this.timeOfDay * Math.PI) * 0.3
    );
    
    this.volumetricFog.setColor(fogColor);
  }
  
  public getEnemies(): Enemy[] {
    if (!this.enemySpawningSystem) return [];
    return this.enemySpawningSystem.getEnemies();
  }
  
  public getSafeZoneRadius(): number {
    return this.safeZoneRadius;
  }
  
  public getSafeZoneCenter(): THREE.Vector3 {
    return this.safeZoneCenter.clone();
  }
  
  public dispose(): void {
    console.log("🏠 [SceneManager] Disposing scene manager...");
    
    // Dispose skybox
    if (this.skybox) {
      this.scene.remove(this.skybox);
      (this.skybox.geometry as THREE.BufferGeometry).dispose();
      (this.skybox.material as THREE.Material).dispose();
    }
    
    // Dispose terrain
    if (this.terrain) {
      this.scene.remove(this.terrain);
      (this.terrain.geometry as THREE.BufferGeometry).dispose();
      (this.terrain.material as THREE.Material).dispose();
      if (this.physicsManager && typeof this.physicsManager.removeCollision === 'function') {
        this.physicsManager.removeCollision(this.terrain);
      }
    }
    
    // Dispose lighting
    if (this.sun) {
      this.scene.remove(this.sun);
      (this.sun.shadow.map as THREE.WebGLRenderTarget).dispose();
    }
    if (this.moon) {
      this.scene.remove(this.moon);
    }
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }
    
    // Dispose volumetric fog
    if (this.volumetricFog) {
      this.volumetricFog.dispose();
    }
    
    // Dispose dynamic clouds
    if (this.dynamicCloudSystem) {
      this.dynamicCloudSystem.dispose();
    }
    
    // Dispose tavern
    if (this.tavern) {
      this.tavern.dispose();
    }
    
    // Dispose enemy spawning system
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.dispose();
    }
    
    console.log("🏠 [SceneManager] Scene manager disposed!");
  }
}
