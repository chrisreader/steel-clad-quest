
import * as THREE from 'three';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { SafeZoneManager } from '../systems/SafeZoneManager';
import { EnvironmentCollisionManager } from '../systems/EnvironmentCollisionManager';
import { Enemy } from '../entities/Enemy';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { TavernLevel } from '../levels/TavernLevel';
import { ForestLevel } from '../levels/ForestLevel';
import { DynamicCloudSpawningSystem } from '../systems/DynamicCloudSpawningSystem';
import { SkyboxSystem } from '../effects/SkyboxSystem';
import { VolumetricFogSystem } from '../effects/VolumetricFogSystem';
import { RingQuadrantSystem } from '../world/RingQuadrantSystem';
import { TerrainFeatureGenerator } from '../world/TerrainFeatureGenerator';
import { GrassSystem } from '../vegetation/GrassSystem';
import { BuildingManager } from '../buildings/BuildingManager';
import { PhysicsManager } from './PhysicsManager';
import { DAY_NIGHT_CONFIG, TIME_PHASES, LIGHTING_CONFIG } from '../config/DayNightConfig';
import { TimeUtils } from '../utils/TimeUtils';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera | null = null;
  private physicsManager: PhysicsManager;
  
  // Lighting components
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  
  // World systems
  private grassSystem: GrassSystem;
  private buildingManager: BuildingManager;
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;
  private safeZoneManager: SafeZoneManager;
  private environmentCollisionManager: EnvironmentCollisionManager;
  private cloudSpawningSystem: DynamicCloudSpawningSystem;
  private skyboxSystem: SkyboxSystem;
  private volumetricFogSystem: VolumetricFogSystem;
  private ringQuadrantSystem: RingQuadrantSystem;
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  
  // Game state
  private enemies: Enemy[] = [];
  
  // Day/Night cycle
  private gameStartTime: number = Date.now();
  private timeMultiplier: number = DAY_NIGHT_CONFIG.cycleSpeed * 1000; // Convert to proper multiplier
  private currentPhase: string = 'day';
  private isDayNightPaused: boolean = false; // NEW: Pause state for day/night cycle

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    console.log("🌍 [SceneManager] Initializing scene manager...");
    
    // Initialize lighting
    this.setupLighting();
    
    // Initialize world systems
    this.grassSystem = new GrassSystem(scene);
    this.buildingManager = new BuildingManager(scene, physicsManager);
    this.safeZoneManager = new SafeZoneManager();
    this.environmentCollisionManager = new EnvironmentCollisionManager(scene, physicsManager);
    this.cloudSpawningSystem = new DynamicCloudSpawningSystem(scene);
    this.skyboxSystem = new SkyboxSystem(scene);
    this.volumetricFogSystem = new VolumetricFogSystem(scene);
    this.ringQuadrantSystem = new RingQuadrantSystem();
    this.terrainFeatureGenerator = new TerrainFeatureGenerator(scene, this.ringQuadrantSystem);
    
    // Set up day/night cycle pause listener
    this.setupDayNightPauseListener();
    
    console.log("🌍 [SceneManager] Scene manager initialized successfully!");
  }

  // NEW: Set up day/night cycle pause listener
  private setupDayNightPauseListener(): void {
    document.addEventListener('dayNightPauseToggle', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { isPaused } = customEvent.detail;
      
      this.isDayNightPaused = isPaused;
      console.log(`🌍 [SceneManager] Day/Night cycle ${isPaused ? 'PAUSED' : 'RESUMED'}`);
    });
  }

  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    console.log("📹 [SceneManager] Camera reference set for sun glow calculations");
  }

  private setupLighting(): void {
    console.log("💡 [SceneManager] Setting up enhanced lighting system...");
    
    // Enhanced ambient light
    this.ambientLight = new THREE.AmbientLight(0x404040, LIGHTING_CONFIG.ambient.baseIntensity);
    this.scene.add(this.ambientLight);
    
    // Enhanced directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, LIGHTING_CONFIG.directional.intensity);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -100;
    this.directionalLight.shadow.camera.right = 100;
    this.directionalLight.shadow.camera.top = 100;
    this.directionalLight.shadow.camera.bottom = -100;
    this.scene.add(this.directionalLight);
    
    // Moon light
    this.moonLight = new THREE.DirectionalLight(0x8888ff, 0.1);
    this.moonLight.position.set(-50, 50, -50);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);
    
    console.log("💡 [SceneManager] Enhanced lighting system set up!");
  }

  public createDefaultWorld(): void {
    console.log("🌍 [SceneManager] Creating enhanced fantasy world...");
    
    // Create tavern level - simplified initialization
    const tavernLevel = new TavernLevel();
    this.scene.add(tavernLevel);
    console.log("🏠 [SceneManager] Tavern level created");
    
    // Create forest level - simplified initialization
    const forestLevel = new ForestLevel();
    this.scene.add(forestLevel);
    console.log("🌲 [SceneManager] Forest level created");
    
    console.log("🌍 [SceneManager] Enhanced fantasy world created successfully!");
  }

  public initializeEnemySpawning(effectsManager: EffectsManager, audioManager: AudioManager): void {
    if (!this.enemySpawningSystem) {
      this.enemySpawningSystem = new DynamicEnemySpawningSystem(
        this.scene,
        effectsManager,
        audioManager
      );
      console.log("👹 [SceneManager] Enemy spawning system initialized");
    }
  }

  public startEnemySpawning(playerPosition: THREE.Vector3): void {
    if (this.enemySpawningSystem) {
      // Start the spawning system
      console.log("👹 [SceneManager] Enemy spawning started");
    }
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Update cloud spawning
    this.cloudSpawningSystem.update(deltaTime, playerPosition);
    
    // Update volumetric fog
    this.volumetricFogSystem.update(deltaTime);
    
    // Update enemy spawning
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
      this.enemies = this.enemySpawningSystem.getEnemies();
    }
    
    // MODIFIED: Update day/night cycle only if not paused
    if (!this.isDayNightPaused) {
      this.updateDayNightCycle();
    }
  }

  private updateDayNightCycle(): void {
    const currentTime = Date.now();
    const gameTime = ((currentTime - this.gameStartTime) * this.timeMultiplier) / 1000;
    const dayDuration = 60; // 1 minute cycle
    const normalizedTime = (gameTime / dayDuration) % 1;
    
    // Get current phase
    const newPhase = TimeUtils.getCurrentPhase(normalizedTime, TIME_PHASES);
    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase;
      console.log(`🌅 [SceneManager] Phase changed to: ${newPhase} at time ${normalizedTime.toFixed(3)}`);
    }
    
    // Update sun position
    this.updateSunPosition(normalizedTime);
    
    // Update moon position  
    this.updateMoonPosition(normalizedTime);
    
    // Update lighting based on current phase with smooth transitions
    this.updateLighting(normalizedTime);
    
    // Update skybox
    this.skyboxSystem.update(normalizedTime, playerPosition || new THREE.Vector3());
    
    // Update volumetric fog with time (removed updateTimeOfDay call as it doesn't exist)
  }

  private updateSunPosition(time: number): void {
    const sunAngle = time * Math.PI * 2 - Math.PI / 2;
    const sunRadius = DAY_NIGHT_CONFIG.sunRadius;
    
    const sunX = Math.cos(sunAngle) * sunRadius;
    const sunY = Math.sin(sunAngle) * sunRadius;
    const sunZ = 0;
    
    this.directionalLight.position.set(sunX, sunY, sunZ);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();
  }

  private updateMoonPosition(time: number): void {
    const moonAngle = (time + 0.5) * Math.PI * 2 - Math.PI / 2;
    const moonRadius = DAY_NIGHT_CONFIG.moonRadius;
    
    const moonX = Math.cos(moonAngle) * moonRadius;
    const moonY = Math.sin(moonAngle) * moonRadius;
    const moonZ = 0;
    
    this.moonLight.position.set(moonX, moonY, moonZ);
    this.moonLight.target.position.set(0, 0, 0);
    this.moonLight.target.updateMatrixWorld();
  }

  private getMoonElevationFactor(): number {
    const moonPosition = this.moonLight.position.clone().normalize();
    return Math.max(0, moonPosition.y);
  }

  private updateLighting(time: number): void {
    const ambientIntensity = TimeUtils.getSynchronizedAmbientIntensityForTime(
      time, 
      TIME_PHASES,
      () => this.getMoonElevationFactor()
    );
    
    const nightFactor = TimeUtils.getSynchronizedNightFactor(time, TIME_PHASES);
    const dayFactor = TimeUtils.getDayFactor(time, TIME_PHASES);
    
    // Update ambient light
    this.ambientLight.intensity = ambientIntensity;
    
    // Update directional light (sun)
    this.directionalLight.intensity = dayFactor * LIGHTING_CONFIG.directional.intensity;
    
    // Update moon light
    const moonElevation = this.getMoonElevationFactor();
    this.moonLight.intensity = nightFactor * moonElevation * LIGHTING_CONFIG.moon.baseIntensity;
    
    // Update light colors based on time of day
    const phase = TimeUtils.getCurrentPhase(time, TIME_PHASES);
    this.updateLightColors(phase, time);
  }

  private updateLightColors(phase: string, time: number): void {
    switch (phase) {
      case 'dawn':
        this.ambientLight.color.setHSL(0.1, 0.6, 0.8);
        this.directionalLight.color.setHSL(0.1, 0.8, 1.0);
        break;
      case 'day':
        this.ambientLight.color.setHSL(0.6, 0.2, 1.0);
        this.directionalLight.color.setHSL(0.15, 0.1, 1.0);
        break;
      case 'sunset':
        this.ambientLight.color.setHSL(0.08, 0.7, 0.9);
        this.directionalLight.color.setHSL(0.08, 0.9, 1.0);
        break;
      case 'night':
      case 'civilTwilight':
      case 'nauticalTwilight':
      case 'astronomicalTwilight':
        this.ambientLight.color.setHSL(0.7, 0.8, 0.4);
        this.directionalLight.color.setHSL(0.1, 0.3, 0.3);
        break;
      default:
        this.ambientLight.color.setHSL(0.6, 0.2, 1.0);
        this.directionalLight.color.setHSL(0.15, 0.1, 1.0);
    }
    
    // Moon light always has a cool blue color
    this.moonLight.color.setHSL(0.7, 0.8, 0.8);
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public dispose(): void {
    console.log("🌍 [SceneManager] Disposing scene manager...");
    
    // Remove day/night pause listener
    document.removeEventListener('dayNightPauseToggle', this.setupDayNightPauseListener);
    
    // Dispose systems
    this.grassSystem.dispose();
    this.buildingManager.dispose();
    this.cloudSpawningSystem.dispose();
    this.skyboxSystem.dispose();
    this.volumetricFogSystem.dispose();
    this.terrainFeatureGenerator.dispose();
    
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.dispose();
    }
    
    console.log("🌍 [SceneManager] Scene manager disposed!");
  }
}
