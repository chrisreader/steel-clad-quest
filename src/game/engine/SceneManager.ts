import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { DynamicCloudSpawningSystem } from '../systems/DynamicCloudSpawningSystem';
import { EnvironmentCollisionManager } from '../systems/EnvironmentCollisionManager';
import { PhysicsManager } from './PhysicsManager';
import { Level, TerrainConfig, TerrainFeature, LightingConfig } from '../../types/GameTypes';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { RingQuadrantSystem, RegionCoordinates, Region } from '../world/RingQuadrantSystem';
import { TerrainFeatureGenerator } from '../world/TerrainFeatureGenerator';
import { StructureGenerator } from '../world/StructureGenerator';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { Enemy } from '../entities/Enemy';
import { BuildingManager } from '../buildings/BuildingManager';
import { SafeZoneManager } from '../systems/SafeZoneManager';
import { VolumetricFogSystem } from '../effects/VolumetricFogSystem';
import { MoonCycleSystem } from '../effects/MoonCycleSystem'; // NEW: Import moon cycle system

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private environmentCollisionManager: EnvironmentCollisionManager;
  
  // NEW: Camera reference for sun direction calculations
  private camera: THREE.PerspectiveCamera | null = null;
  
  // Ring-quadrant world system
  private ringSystem: RingQuadrantSystem;
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  private structureGenerator: StructureGenerator;
  private loadedRegions: Map<string, Region> = new Map();
  private renderDistance: number = 800;
  private debugMode: boolean = true;
  
  // Building management system
  private buildingManager: BuildingManager;
  
  // Enhanced lighting system for realistic shadows
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private tavernLight: THREE.PointLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  
  // Dynamic shadow system
  private shadowCameraSize: number = 200;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private shadowUpdateThreshold: number = 10;
  
  // Environment
  private currentLevel: Level | null = null;
  private skybox: THREE.Mesh | null = null;
  private ground: THREE.Mesh | null = null;
  
  // Enhanced 3D sun, moon and star system
  private sun: THREE.Mesh | null = null;
  private moon: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  private cloudSpawningSystem: DynamicCloudSpawningSystem | null = null;
  
  // Distance-based fog system
  private fog: THREE.Fog;
  
  // Enhanced time of day system (1-minute cycle)
  private timeOfDay: number = 0.25;
  private dayNightCycleEnabled: boolean = true;
  private dayNightCycleSpeed: number = 1 / 60;
  private sunRadius: number = 150;
  private moonRadius: number = 140;
  
  // UPDATED: Adjusted time phases for 15% sunset-to-night transition
  private readonly TIME_PHASES = {
    DEEP_NIGHT_START: 0.0,
    DEEP_NIGHT_END: 0.15,     // Extended deep night when moon is high
    DAWN_START: 0.15,
    DAWN_END: 0.25,
    DAY_START: 0.25,
    DAY_END: 0.75,
    // UPDATED: 15% total for sunset-to-night transition (9 seconds)
    SUNSET_START: 0.75,
    SUNSET_END: 0.7875,       // 3.75% for sunset (2.25 seconds)
    EVENING_START: 0.7875,
    EVENING_END: 0.825,       // 3.75% for evening (2.25 seconds)
    TWILIGHT_START: 0.825,
    TWILIGHT_END: 0.8625,     // 3.75% for twilight (2.25 seconds)
    RAPID_NIGHT_START: 0.8625,
    RAPID_NIGHT_END: 0.9,     // 3.75% for final darkness transition (2.25 seconds)
    EXTENDED_DEEP_NIGHT_START: 0.9,
    EXTENDED_DEEP_NIGHT_END: 1.0   // 10% in full darkness
  };
  
  // Enemy spawning system
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;
  
  // NEW: Moon cycle system for dynamic night lighting
  private moonCycleSystem: MoonCycleSystem | null = null;
  
  // NEW: Volumetric fog system
  private volumetricFogSystem: VolumetricFogSystem | null = null;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    console.log("SceneManager initialized with synchronized day/night cycle system");
    
    // Initialize ring-quadrant system
    this.ringSystem = new RingQuadrantSystem(new THREE.Vector3(0, 0, 0));
    
    // Initialize terrain feature generator
    this.terrainFeatureGenerator = new TerrainFeatureGenerator(this.ringSystem, this.scene);
    
    // Initialize structure generator with PhysicsManager
    this.structureGenerator = new StructureGenerator(this.ringSystem, this.scene, this.physicsManager);
    
    // Initialize building manager
    this.buildingManager = new BuildingManager(this.scene, this.physicsManager);
    
    // Connect StructureGenerator with BuildingManager
    this.structureGenerator.setBuildingManager(this.buildingManager);
    
    // Setup distance-based fog with visible fog layer
    this.setupEnhancedFog();
    
    // Setup enhanced lighting with day/night cycle
    this.setupDayNightLighting();
    
    // Initialize moon cycle system
    this.moonCycleSystem = new MoonCycleSystem(0); // Start at New Moon
    console.log("🌙 Moon cycle system initialized for dynamic night lighting");
    
    // Initialize volumetric fog system with horizon blocking
    this.volumetricFogSystem = new VolumetricFogSystem(this.scene);
    console.log("VolumetricFogSystem with horizon blocking initialized");
    
    // Add debug ring markers
    if (this.debugMode) {
      this.ringSystem.createDebugRingMarkers(this.scene);
    }
    
    // Initialize cloud spawning system
    this.cloudSpawningSystem = new DynamicCloudSpawningSystem(this.scene);
    
    // Initialize environment collision manager
    this.environmentCollisionManager = new EnvironmentCollisionManager(this.scene, this.physicsManager);
    
    // Set up collision registration callback
    this.terrainFeatureGenerator.setCollisionRegistrationCallback((object: THREE.Object3D) => {
      this.environmentCollisionManager.registerSingleObject(object);
    });
    console.log('🔧 Synchronized day/night cycle collision system established');
  }

  // NEW: Method to set camera reference for proper sun glow calculations
  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    console.log("📹 [SceneManager] Camera reference set for sun glow calculations");
  }

  private setupEnhancedFog(): void {
    // Enhanced fog system that changes color based on time of day
    const fogColor = this.getSynchronizedFogColorForTime(this.timeOfDay);
    const fogNear = 25;
    const fogFar = 120; // Increased for better volumetric fog blending
    
    this.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(fogColor);
    
    console.log("Enhanced synchronized day/night fog system initialized");
  }
  
  private lerpColor(color1: THREE.Color, color2: THREE.Color, factor: number): THREE.Color {
    const result = new THREE.Color();
    result.lerpColors(color1, color2, Math.max(0, Math.min(1, factor)));
    return result;
  }
  
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  
  // UPDATED: Moon elevation-based night intensity calculation
  private getMoonElevationFactor(): number {
    if (!this.moon) return 0;
    
    // Calculate moon's elevation (-1 = below horizon, 1 = zenith)
    const moonElevation = this.moon.position.y / this.moonRadius;
    
    // When moon is high (near zenith), night should be darkest
    // When moon is low/setting, night should be lighter
    const elevationFactor = Math.max(0, moonElevation); // 0 when below horizon, 1 at zenith
    
    return elevationFactor;
  }
  
  // UPDATED: Synchronized fog color system with updated time phases
  private getSynchronizedFogColorForTime(time: number): number {
    const normalizedTime = time % 1;
    
    // Define key colors with deeper night progression
    const keyColors = {
      deepNight: new THREE.Color(0x000008),     // Extremely dark when moon is high
      lightNight: new THREE.Color(0x000020),   // Lighter when moon is low
      dawn: new THREE.Color(0xFF6B35),         // Orange dawn
      noon: new THREE.Color(0x4682B4),         // Steel blue for day
      sunset: new THREE.Color(0xFF8C42),       // Orange sunset
      dusk: new THREE.Color(0x1a0030),         // Dark purple dusk
      rapidNight: new THREE.Color(0x000010)    // NEW: Rapid transition to darkness
    };
    
    let resultColor: THREE.Color;
    
    // Get moon elevation factor for dynamic night darkness
    const moonElevation = this.getMoonElevationFactor();
    
    if (normalizedTime >= this.TIME_PHASES.DEEP_NIGHT_START && normalizedTime <= this.TIME_PHASES.DEEP_NIGHT_END) {
      // Deep night (0.0 - 0.15) - Darkness varies with moon elevation
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation);
      resultColor = nightColor;
    } else if (normalizedTime >= this.TIME_PHASES.DAWN_START && normalizedTime <= this.TIME_PHASES.DAWN_END) {
      // Dawn transition (0.15 - 0.25)
      const factor = (normalizedTime - this.TIME_PHASES.DAWN_START) / (this.TIME_PHASES.DAWN_END - this.TIME_PHASES.DAWN_START);
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation);
      resultColor = this.lerpColor(nightColor, keyColors.dawn, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= this.TIME_PHASES.DAY_START && normalizedTime <= this.TIME_PHASES.DAY_END) {
      // Day period (0.25 - 0.75)
      const factor = (normalizedTime - this.TIME_PHASES.DAY_START) / (this.TIME_PHASES.DAY_END - this.TIME_PHASES.DAY_START);
      resultColor = this.lerpColor(keyColors.dawn, keyColors.noon, Math.sin(factor * Math.PI * 0.5));
    } else if (normalizedTime >= this.TIME_PHASES.SUNSET_START && normalizedTime <= this.TIME_PHASES.SUNSET_END) {
      // UPDATED: Sunset transition (0.75 - 0.7875) - 3.75% (2.25 seconds)
      const factor = (normalizedTime - this.TIME_PHASES.SUNSET_START) / (this.TIME_PHASES.SUNSET_END - this.TIME_PHASES.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      resultColor = this.lerpColor(keyColors.noon, keyColors.sunset, exponentialFactor);
    } else if (normalizedTime >= this.TIME_PHASES.EVENING_START && normalizedTime <= this.TIME_PHASES.EVENING_END) {
      // UPDATED: Evening transition (0.7875 - 0.825) - 3.75% (2.25 seconds)
      const factor = (normalizedTime - this.TIME_PHASES.EVENING_START) / (this.TIME_PHASES.EVENING_END - this.TIME_PHASES.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      resultColor = this.lerpColor(keyColors.sunset, keyColors.dusk, exponentialFactor);
    } else if (normalizedTime >= this.TIME_PHASES.TWILIGHT_START && normalizedTime <= this.TIME_PHASES.TWILIGHT_END) {
      // UPDATED: Twilight transition (0.825 - 0.8625) - 3.75% (2.25 seconds)
      const factor = (normalizedTime - this.TIME_PHASES.TWILIGHT_START) / (this.TIME_PHASES.TWILIGHT_END - this.TIME_PHASES.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      resultColor = this.lerpColor(keyColors.dusk, keyColors.rapidNight, exponentialFactor);
    } else if (normalizedTime >= this.TIME_PHASES.RAPID_NIGHT_START && normalizedTime <= this.TIME_PHASES.RAPID_NIGHT_END) {
      // UPDATED: Rapid night transition (0.8625 - 0.9) - 3.75% (2.25 seconds)
      const factor = (normalizedTime - this.TIME_PHASES.RAPID_NIGHT_START) / (this.TIME_PHASES.RAPID_NIGHT_END - this.TIME_PHASES.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation);
      resultColor = this.lerpColor(keyColors.rapidNight, nightColor, exponentialFactor);
    } else {
      // UPDATED: Deep night (0.9 - 1.0) - 10% in full darkness
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation);
      resultColor = nightColor;
    }
    
    return resultColor.getHex();
  }
  
  // NEW: Exponential decay helper for dramatic color transitions
  private exponentialDecay(factor: number, intensity: number = 3): number {
    return Math.pow(factor, intensity);
  }
  
  private setupDayNightLighting(): void {
    // Enhanced ambient light that varies with time - now using realistic night darkness
    this.ambientLight = new THREE.AmbientLight(0x404040, this.getSynchronizedAmbientIntensityForTime(this.timeOfDay));
    this.scene.add(this.ambientLight);
    console.log("Realistic night lighting ambient system initialized");
    
    // Main directional light (sun) - position will be updated dynamically
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.castShadow = true;
    
    // Enhanced shadow settings
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.left = -this.shadowCameraSize;
    this.directionalLight.shadow.camera.right = this.shadowCameraSize;
    this.directionalLight.shadow.camera.top = this.shadowCameraSize;
    this.directionalLight.shadow.camera.bottom = -this.shadowCameraSize;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.bias = -0.00005;
    this.directionalLight.shadow.normalBias = 0.003;
    this.directionalLight.shadow.camera.near = 0.1;
    
    this.scene.add(this.directionalLight);
    console.log("Dynamic sun lighting system initialized");
    
    // REALISTIC: Moon directional light with reduced intensity
    this.moonLight = new THREE.DirectionalLight(0x6495ED, 0.12); // Cooler blue moonlight, reduced intensity
    this.moonLight.castShadow = false; // Disable moon shadows for realism
    this.scene.add(this.moonLight);
    console.log("Realistic moon lighting system initialized");
    
    // REALISTIC: Fill light with day/night control - initially off
    this.fillLight = new THREE.DirectionalLight(0xB0E0E6, 0.0);
    this.fillLight.position.set(-10, 15, -10);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);
    
    // REALISTIC: Tavern light with enhanced nighttime prominence
    this.tavernLight = new THREE.PointLight(0xFFB366, 0.8, 30); // Warmer color temperature
    this.tavernLight.position.set(0, 6, 0);
    this.tavernLight.castShadow = true;
    this.tavernLight.shadow.mapSize.width = 1024;
    this.tavernLight.shadow.mapSize.height = 1024;
    this.tavernLight.shadow.bias = -0.00005;
    this.scene.add(this.tavernLight);
    
    // REALISTIC: Rim light with day/night control - initially off
    this.rimLight = new THREE.DirectionalLight(0xB0E0E6, 0.0);
    this.rimLight.position.set(-12, 8, -12);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);
    
    console.log("Complete realistic night lighting system initialized");
  }
  
  // UPDATED: Synchronized ambient intensity with realistic night darkness
  private getSynchronizedAmbientIntensityForTime(time: number): number {
    const normalizedTime = time % 1;
    const moonPhaseData = this.moonCycleSystem?.getCurrentPhaseData();
    const moonMultiplier = moonPhaseData?.ambientLightMultiplier || 0.1;
    
    let baseIntensity: number;
    
    if (normalizedTime >= this.TIME_PHASES.DEEP_NIGHT_START && normalizedTime <= this.TIME_PHASES.DEEP_NIGHT_END) {
      // UPDATED: Night intensity now varies with moon phase (0.02-0.25 range)
      const minNightIntensity = 0.02;
      const maxNightIntensity = 0.25;
      baseIntensity = minNightIntensity + (maxNightIntensity - minNightIntensity) * moonMultiplier;
    } else if (normalizedTime >= this.TIME_PHASES.DAWN_START && normalizedTime <= this.TIME_PHASES.DAWN_END) {
      // Dawn transition
      const factor = (normalizedTime - this.TIME_PHASES.DAWN_START) / (this.TIME_PHASES.DAWN_END - this.TIME_PHASES.DAWN_START);
      const nightIntensity = 0.02 + (0.25 - 0.02) * moonMultiplier;
      baseIntensity = nightIntensity + (1.0 - nightIntensity) * this.smoothStep(0, 1, factor);
    } else if (normalizedTime >= this.TIME_PHASES.DAY_START && normalizedTime <= this.TIME_PHASES.DAY_END) {
      // Day period - bright and stable
      baseIntensity = 1.8;
    } else if (normalizedTime >= this.TIME_PHASES.SUNSET_START && normalizedTime <= this.TIME_PHASES.SUNSET_END) {
      // Sunset transition with exponential decay
      const factor = (normalizedTime - this.TIME_PHASES.SUNSET_START) / (this.TIME_PHASES.SUNSET_END - this.TIME_PHASES.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      baseIntensity = 1.8 - (1.8 - 1.2) * exponentialFactor;
    } else if (normalizedTime >= this.TIME_PHASES.EVENING_START && normalizedTime <= this.TIME_PHASES.EVENING_END) {
      // Evening transition with aggressive decay
      const factor = (normalizedTime - this.TIME_PHASES.EVENING_START) / (this.TIME_PHASES.EVENING_END - this.TIME_PHASES.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      baseIntensity = 1.2 - (1.2 - 0.4) * exponentialFactor;
    } else if (normalizedTime >= this.TIME_PHASES.TWILIGHT_START && normalizedTime <= this.TIME_PHASES.TWILIGHT_END) {
      // Twilight transition with very aggressive decay
      const factor = (normalizedTime - this.TIME_PHASES.TWILIGHT_START) / (this.TIME_PHASES.TWILIGHT_END - this.TIME_PHASES.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      baseIntensity = 0.4 - (0.4 - 0.15) * exponentialFactor;
    } else if (normalizedTime >= this.TIME_PHASES.RAPID_NIGHT_START && normalizedTime <= this.TIME_PHASES.RAPID_NIGHT_END) {
      // Rapid night transition to final darkness
      const factor = (normalizedTime - this.TIME_PHASES.RAPID_NIGHT_START) / (this.TIME_PHASES.RAPID_NIGHT_END - this.TIME_PHASES.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      const nightIntensity = 0.02 + (0.25 - 0.02) * moonMultiplier;
      baseIntensity = 0.15 - (0.15 - nightIntensity) * exponentialFactor;
    } else {
      // Deep night with moon phase variation
      const nightIntensity = 0.02 + (0.25 - 0.02) * moonMultiplier;
      baseIntensity = nightIntensity;
    }
    
    return baseIntensity;
  }
  
  // UPDATED: Replace moon elevation with moon phase intensity
  private getMoonPhaseIntensity(): number {
    const moonPhaseData = this.moonCycleSystem?.getCurrentPhaseData();
    return moonPhaseData?.directionalLightMultiplier || 0.0;
  }

  // UPDATED: Synchronized fog color updates
  private updateSynchronizedFogForTime(): void {
    const newFogColor = this.getSynchronizedFogColorForTime(this.timeOfDay);
    this.fog.color.setHex(newFogColor);
    this.scene.background = new THREE.Color(newFogColor);
    
    if (this.volumetricFogSystem) {
      console.log(`Synchronized fog color updated for time ${(this.timeOfDay * 24).toFixed(1)}h: #${newFogColor.toString(16).padStart(6, '0')}`);
    }
  }
  
  // NEW: Debug method to set specific time
  public setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, time));
    console.log(`Time set to: ${(this.timeOfDay * 24).toFixed(1)} hours`);
  }
  
  // NEW: Debug method to toggle day/night cycle
  public toggleDayNightCycle(): void {
    this.dayNightCycleEnabled = !this.dayNightCycleEnabled;
    console.log(`Day/night cycle: ${this.dayNightCycleEnabled ? 'enabled' : 'disabled'}`);
  }
  
  // NEW: Debug method to adjust cycle speed
  public setCycleSpeed(speed: number): void {
    this.dayNightCycleSpeed = speed;
    console.log(`Day/night cycle speed set to: ${speed} (${60/speed} seconds per cycle)`);
  }
  
  public createDefaultWorld(): void {
    console.log('Creating default world with synchronized day/night cycle...');
    
    this.createSimpleGround();
    console.log('Simple ground plane created at origin');
    
    const startRegion = { ringIndex: 0, quadrant: 0 };
    this.loadRegion(startRegion);
    console.log('🔧 Starting region loaded');
    
    this.buildingManager.createBuilding({
      type: 'tavern',
      position: new THREE.Vector3(0, 0, 0)
    });
    console.log('🏗️ Tavern created using BuildingManager');
    
    this.structureGenerator.createTestHill(20, 0, 30, 15, 8);
    console.log('Test hill created for shadow testing');
    
    // Create synchronized day/night skybox
    this.createDayNightSkybox();
    console.log('Synchronized day/night skybox created');
    
    // Create 3D sun and moon
    this.create3DSunAndMoon();
    console.log('3D sun and moon created');
    
    // Create star field
    this.createStarField();
    console.log('Star field created');
    
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.initialize();
      console.log('Dynamic cloud spawning system initialized');
    }
    
    // Force initial updates with synchronized system
    this.updateDayNightSkybox();
    this.updateSynchronizedDayNightLighting();
    this.updateStarVisibility();
    
    console.log('🔧 Registering environment collisions...');
    this.environmentCollisionManager.registerEnvironmentCollisions();
    console.log('🔧 Environment collision system initialized');
    
    console.log('Synchronized world with moon-based day/night cycle complete. Current time:', (this.timeOfDay * 24).toFixed(1), 'hours');
    
    // Add debug commands to window for testing
    if (this.debugMode) {
      (window as any).sceneDebug = {
        setTime: (time: number) => this.setTimeOfDay(time / 24),
        toggleCycle: () => this.toggleDayNightCycle(),
        setSpeed: (speed: number) => this.setCycleSpeed(speed),
        getCurrentTime: () => (this.timeOfDay * 24).toFixed(1) + ' hours',
        getMoonElevation: () => this.getMoonElevationFactor().toFixed(2)
      };
      console.log('Debug commands available: sceneDebug.setTime(hour), sceneDebug.toggleCycle(), sceneDebug.setSpeed(speed), sceneDebug.getMoonElevation()');
    }
  }

  private loadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.loadedRegions.has(regionKey)) return;
    
    console.log(`Loading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const terrain = this.createRegionTerrain(region, centerPosition);
    
    const newRegion: Region = {
      coordinates: region,
      centerPosition,
      terrain,
      isLoaded: true
    };
    
    this.loadedRegions.set(regionKey, newRegion);
    this.terrainFeatureGenerator.generateFeaturesForRegion(region);
    this.structureGenerator.generateStructuresForRegion(region);
  }
  
  private unloadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const loadedRegion = this.loadedRegions.get(regionKey);
    
    if (!loadedRegion) return;
    
    console.log(`Unloading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    this.structureGenerator.cleanupStructuresForRegion(region);
    this.terrainFeatureGenerator.cleanupFeaturesForRegion(region);
    
    if (loadedRegion.terrain) {
      this.scene.remove(loadedRegion.terrain);
      
      if (loadedRegion.terrain.geometry) {
        loadedRegion.terrain.geometry.dispose();
      }
      
      if (loadedRegion.terrain.material) {
        if (Array.isArray(loadedRegion.terrain.material)) {
          loadedRegion.terrain.material.forEach(m => m.dispose());
        } else {
          loadedRegion.terrain.material.dispose();
        }
      }
    }
    
    this.loadedRegions.delete(regionKey);
  }
  
  private createSimpleGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x5FAD5F,
      map: TextureGenerator.createGrassTexture(),
      transparent: false
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  
  private createRegionTerrain(region: RegionCoordinates, centerPosition: THREE.Vector3): THREE.Mesh {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    let terrainGeometry: THREE.BufferGeometry;
    let terrainPosition: THREE.Vector3;
    
    if (region.ringIndex === 0) {
      terrainGeometry = new THREE.CircleGeometry(ringDef.outerRadius, 32);
      terrainPosition = new THREE.Vector3(0, 0, 0);
      console.log('Creating center ring terrain at origin');
    } else {
      const innerRadius = ringDef.innerRadius;
      const outerRadius = ringDef.outerRadius;
      terrainGeometry = this.createQuadrantGeometry(innerRadius, outerRadius, region.quadrant);
      terrainPosition = new THREE.Vector3(0, 0, 0);
      console.log(`Creating ring ${region.ringIndex} quadrant ${region.quadrant} with geometry in world coordinates`);
    }
    
    const terrainMaterial = new THREE.MeshLambertMaterial({ 
      color: ringDef.terrainColor,
      map: TextureGenerator.createGrassTexture(),
      transparent: false
    });
    
    console.log(`Terrain for ring ${region.ringIndex}, quadrant ${region.quadrant} created with level floor`);
    
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.copy(terrainPosition);
    terrain.position.y = 0;
    terrain.receiveShadow = true;
    
    this.scene.add(terrain);
    
    return terrain;
  }
  
  private createQuadrantGeometry(innerRadius: number, outerRadius: number, quadrant: number): THREE.BufferGeometry {
    const quadrantAngles = [
      { start: 0, end: Math.PI / 2 },
      { start: Math.PI / 2, end: Math.PI },
      { start: Math.PI, end: 3 * Math.PI / 2 },
      { start: 3 * Math.PI / 2, end: 2 * Math.PI }
    ];
    
    const angles = quadrantAngles[quadrant];
    const radialSegments = 16;
    const ringSegments = 1;
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    for (let j = 0; j <= ringSegments; j++) {
      const radius = innerRadius + (outerRadius - innerRadius) * (j / ringSegments);
      
      for (let i = 0; i <= radialSegments; i++) {
        const angle = angles.start + (angles.end - angles.start) * (i / radialSegments);
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 0;
        
        vertices.push(x, y, z);
        
        const u = i / radialSegments;
        const v = j / ringSegments;
        uvs.push(u, v);
      }
    }
    
    for (let j = 0; j < ringSegments; j++) {
      for (let i = 0; i < radialSegments; i++) {
        const a = (radialSegments + 1) * j + i;
        const b = (radialSegments + 1) * (j + 1) + i;
        const c = (radialSegments + 1) * (j + 1) + i + 1;
        const d = (radialSegments + 1) * j + i + 1;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    geometry.computeVertexNormals();
    
    console.log(`Created quadrant ${quadrant} geometry in XY plane with ${vertices.length / 3} vertices and ${indices.length / 3} triangles`);
    
    return geometry;
  }

  public loadLevel(levelName: string): void {
    console.log(`Loading level: ${levelName}`);
    this.clearScene();
    
    switch (levelName) {
      case 'tavern':
        this.loadTavernLevel();
        break;
      case 'forest':
        this.loadForestLevel();
        break;
      default:
        this.loadDefaultLevel();
    }
  }

  private clearScene(): void {
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => this.scene.remove(obj));
  }

  private loadTavernLevel(): void {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.addTavernFurniture();
  }

  private loadForestLevel(): void {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x228B22,
      map: TextureGenerator.createGrassTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.addTrees();
  }

  private loadDefaultLevel(): void {
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x90EE90,
      map: TextureGenerator.createGrassTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private addTavernFurniture(): void {
    const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const tableMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(3, 0.5, 0);
    table.castShadow = true;
    this.scene.add(table);

    for (let i = 0; i < 4; i++) {
      const chairGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
      const chairMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x654321,
        map: TextureGenerator.createWoodTexture()
      });
      const chair = new THREE.Mesh(chairGeometry, chairMaterial);
      const angle = (i / 4) * Math.PI * 2;
      chair.position.set(3 + Math.cos(angle) * 1.5, 0.5, Math.sin(angle) * 1.5);
      chair.castShadow = true;
      this.scene.add(chair);
    }
  }

  private addTrees(): void {
    for (let i = 0; i < 20; i++) {
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3);
      const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513,
        map: TextureGenerator.createWoodTexture()
      });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

      const leavesGeometry = new THREE.SphereGeometry(1.5);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 2.5;

      const tree = new THREE.Group();
      tree.add(trunk);
      tree.add(leaves);

      tree.position.set(
        (Math.random() - 0.5) * 40,
        1.5,
        (Math.random() - 0.5) * 40
      );

      tree.castShadow = true;
      this.scene.add(tree);
    }
  }

  public getCurrentLevel(): string {
    return this.currentLevel?.name || 'default';
  }
  
  public getSafeZoneManager(): SafeZoneManager | null {
    return this.buildingManager.getSafeZoneManager();
  }
  
  public dispose(): void {
    this.scene.fog = null;
    
    if (this.environmentCollisionManager) {
      this.environmentCollisionManager.dispose();
    }
    
    if (this.buildingManager) {
      this.buildingManager.dispose();
    }
    
    if (this.structureGenerator) {
      this.structureGenerator.dispose();
    }
    
    if (this.terrainFeatureGenerator) {
      this.terrainFeatureGenerator.dispose();
    }
    
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.dispose();
      this.cloudSpawningSystem = null;
    }
    
    // Dispose volumetric fog system
    if (this.volumetricFogSystem) {
      this.volumetricFogSystem.dispose();
      this.volumetricFogSystem = null;
    }
    
    // Clean up day/night cycle objects
    if (this.sun) {
      this.scene.remove(this.sun);
      if (this.sun.geometry) this.sun.geometry.dispose();
      if (this.sun.material instanceof THREE.Material) {
        this.sun.material.dispose();
      }
      this.sun = null;
    }
    
    if (this.moon) {
      this.scene.remove(this.moon);
      if (this.moon.geometry) this.moon.geometry.dispose();
      if (this.moon.material instanceof THREE.Material) {
        this.moon.material.dispose();
      }
      this.moon = null;
    }
    
    if (this.stars) {
      this.scene.remove(this.stars);
      if (this.stars.geometry) this.stars.geometry.dispose();
      if (this.stars.material instanceof THREE.Material) {
        this.stars.material.dispose();
      }
      this.stars = null;
    }
    
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.dispose();
      this.enemySpawningSystem = null;
    }
    
    for (const [regionKey, region] of this.loadedRegions.entries()) {
      this.unloadRegion(region.coordinates);
    }
    this.loadedRegions.clear();
    
    console.log("SceneManager with synchronized day/night cycle and volumetric fog disposed");
  }
  
  public getEnvironmentCollisionManager(): EnvironmentCollisionManager {
    return this.environmentCollisionManager;
  }

  public getBuildingManager(): BuildingManager {
    return this.buildingManager;
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public updateShadowCamera(playerPosition: THREE.Vector3): void {
    const distanceMoved = this.lastPlayerPosition.distanceTo(playerPosition);
    
    if (distanceMoved > this.shadowUpdateThreshold || this.lastPlayerPosition.length() === 0) {
      const shadowCamera = this.directionalLight.shadow.camera;
      const expandedSize = this.shadowCameraSize * 1.2;
      
      shadowCamera.left = playerPosition.x - expandedSize;
      shadowCamera.right = playerPosition.x + expandedSize;
      shadowCamera.top = playerPosition.z + expandedSize;
      shadowCamera.bottom = playerPosition.z - expandedSize;
      
      shadowCamera.updateProjectionMatrix();
      
      if (!this.directionalLight.target) {
        this.directionalLight.target = new THREE.Object3D();
        this.scene.add(this.directionalLight.target);
      }
      
      const targetPosition = playerPosition.clone();
      const hillPosition = new THREE.Vector3(20, 0, 30);
      const toHill = hillPosition.clone().sub(playerPosition).normalize().multiplyScalar(10);
      targetPosition.add(toHill);
      
      this.directionalLight.target.position.copy(targetPosition);
      this.lastPlayerPosition.copy(playerPosition);
      
      console.log(`Enhanced shadow camera updated for position: ${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)} with dynamic sun tracking`);
    }
  }
}
