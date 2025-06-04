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
    // ENHANCED: Increased ambient light to compensate for disabled fill/rim lights
    this.ambientLight = new THREE.AmbientLight(0x404040, this.getSynchronizedAmbientIntensityForTime(this.timeOfDay) * 1.5);
    this.scene.add(this.ambientLight);
    console.log("Enhanced ambient lighting system initialized (compensated for disabled fill/rim lights)");
    
    // Main directional light (sun) - position will be updated dynamically
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.4); // Slightly increased intensity
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
    console.log("Dynamic sun lighting system initialized with enhanced intensity");
    
    // REALISTIC: Moon directional light with reduced intensity
    this.moonLight = new THREE.DirectionalLight(0x6495ED, 0.12); // Cooler blue moonlight, reduced intensity
    this.moonLight.castShadow = false; // Disable moon shadows for realism
    this.scene.add(this.moonLight);
    console.log("Realistic moon lighting system initialized");
    
    // DISABLED: Fill light - permanently disabled to remove light beams
    this.fillLight = new THREE.DirectionalLight(0xB0E0E6, 0.0);
    this.fillLight.position.set(-10, 15, -10);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);
    console.log("Fill light disabled to eliminate vertical light beams");
    
    // REALISTIC: Tavern light with enhanced nighttime prominence
    this.tavernLight = new THREE.PointLight(0xFFB366, 0.8, 30); // Warmer color temperature
    this.tavernLight.position.set(0, 6, 0);
    this.tavernLight.castShadow = true;
    this.tavernLight.shadow.mapSize.width = 1024;
    this.tavernLight.shadow.mapSize.height = 1024;
    this.tavernLight.shadow.bias = -0.00005;
    this.scene.add(this.tavernLight);
    
    // DISABLED: Rim light - permanently disabled to remove light beams
    this.rimLight = new THREE.DirectionalLight(0xB0E0E6, 0.0);
    this.rimLight.position.set(-12, 8, -12);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);
    console.log("Rim light disabled to eliminate vertical light beams");
    
    console.log("Complete lighting system initialized without beam-causing directional lights");
  }
  
  // UPDATED: Enhanced ambient intensity with compensation for disabled lights
  private getSynchronizedAmbientIntensityForTime(time: number): number {
    const normalizedTime = time % 1;
    const moonElevation = this.getMoonElevationFactor();
    
    let baseIntensity: number;
    
    if (normalizedTime >= this.TIME_PHASES.DEEP_NIGHT_START && normalizedTime <= this.TIME_PHASES.DEEP_NIGHT_END) {
      // ENHANCED: Slightly brighter night ambient to compensate for disabled lights
      const minNightIntensity = 0.04;  // Increased from 0.02
      const maxNightIntensity = 0.12;  // Increased from 0.08
      baseIntensity = minNightIntensity + (maxNightIntensity - minNightIntensity) * (1 - moonElevation);
    } else if (normalizedTime >= this.TIME_PHASES.DAWN_START && normalizedTime <= this.TIME_PHASES.DAWN_END) {
      // Dawn transition
      const factor = (normalizedTime - this.TIME_PHASES.DAWN_START) / (this.TIME_PHASES.DAWN_END - this.TIME_PHASES.DAWN_START);
      const nightIntensity = 0.04 + (0.12 - 0.04) * (1 - moonElevation);
      baseIntensity = nightIntensity + (1.2 - nightIntensity) * this.smoothStep(0, 1, factor); // Increased day target
    } else if (normalizedTime >= this.TIME_PHASES.DAY_START && normalizedTime <= this.TIME_PHASES.DAY_END) {
      // ENHANCED: Brighter day period to compensate for disabled lights
      baseIntensity = 2.1; // Increased from 1.8
    } else if (normalizedTime >= this.TIME_PHASES.SUNSET_START && normalizedTime <= this.TIME_PHASES.SUNSET_END) {
      // Sunset transition with exponential decay
      const factor = (normalizedTime - this.TIME_PHASES.SUNSET_START) / (this.TIME_PHASES.SUNSET_END - this.TIME_PHASES.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      baseIntensity = 2.1 - (2.1 - 1.4) * exponentialFactor; // Adjusted range
    } else if (normalizedTime >= this.TIME_PHASES.EVENING_START && normalizedTime <= this.TIME_PHASES.EVENING_END) {
      // Evening transition with aggressive decay
      const factor = (normalizedTime - this.TIME_PHASES.EVENING_START) / (this.TIME_PHASES.EVENING_END - this.TIME_PHASES.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      baseIntensity = 1.4 - (1.4 - 0.6) * exponentialFactor; // Adjusted range
    } else if (normalizedTime >= this.TIME_PHASES.TWILIGHT_START && normalizedTime <= this.TIME_PHASES.TWILIGHT_END) {
      // Twilight transition with very aggressive decay
      const factor = (normalizedTime - this.TIME_PHASES.TWILIGHT_START) / (this.TIME_PHASES.TWILIGHT_END - this.TIME_PHASES.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      baseIntensity = 0.6 - (0.6 - 0.25) * exponentialFactor; // Adjusted range
    } else if (normalizedTime >= this.TIME_PHASES.RAPID_NIGHT_START && normalizedTime <= this.TIME_PHASES.RAPID_NIGHT_END) {
      // Rapid night transition to final darkness
      const factor = (normalizedTime - this.TIME_PHASES.RAPID_NIGHT_START) / (this.TIME_PHASES.RAPID_NIGHT_END - this.TIME_PHASES.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      const nightIntensity = 0.04 + (0.12 - 0.04) * (1 - moonElevation);
      baseIntensity = 0.25 - (0.25 - nightIntensity) * exponentialFactor;
    } else {
      // Deep night with enhanced brightness
      const nightIntensity = 0.04 + (0.12 - 0.04) * (1 - moonElevation);
      baseIntensity = nightIntensity;
    }
    
    return baseIntensity;
  }
  
  private getSynchronizedNightFactor(time: number): number {
    const normalizedTime = time % 1;
    
    if (normalizedTime >= this.TIME_PHASES.DEEP_NIGHT_START && normalizedTime <= this.TIME_PHASES.DEEP_NIGHT_END) {
      return 1.0;  // Full night
    } else if (normalizedTime >= this.TIME_PHASES.DAWN_START && normalizedTime <= this.TIME_PHASES.DAWN_END) {
      const factor = (normalizedTime - this.TIME_PHASES.DAWN_START) / (this.TIME_PHASES.DAWN_END - this.TIME_PHASES.DAWN_START);
      return 1.0 - this.smoothStep(0, 1, factor);
    } else if (normalizedTime >= this.TIME_PHASES.DAY_START && normalizedTime <= this.TIME_PHASES.DAY_END) {
      return 0.0;  // No night factor during day
    } else if (normalizedTime >= this.TIME_PHASES.SUNSET_START && normalizedTime <= this.TIME_PHASES.SUNSET_END) {
      // UPDATED: Begin night factor with exponential increase
      const factor = (normalizedTime - this.TIME_PHASES.SUNSET_START) / (this.TIME_PHASES.SUNSET_END - this.TIME_PHASES.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      return exponentialFactor * 0.3;
    } else if (normalizedTime >= this.TIME_PHASES.EVENING_START && normalizedTime <= this.TIME_PHASES.EVENING_END) {
      // UPDATED: Rapid night factor increase
      const factor = (normalizedTime - this.TIME_PHASES.EVENING_START) / (this.TIME_PHASES.EVENING_END - this.TIME_PHASES.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      return 0.3 + 0.4 * exponentialFactor;
    } else if (normalizedTime >= this.TIME_PHASES.TWILIGHT_START && normalizedTime <= this.TIME_PHASES.TWILIGHT_END) {
      // UPDATED: Very rapid increase to near full night
      const factor = (normalizedTime - this.TIME_PHASES.TWILIGHT_START) / (this.TIME_PHASES.TWILIGHT_END - this.TIME_PHASES.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      return 0.7 + 0.25 * exponentialFactor;
    } else if (normalizedTime >= this.TIME_PHASES.RAPID_NIGHT_START && normalizedTime <= this.TIME_PHASES.RAPID_NIGHT_END) {
      // UPDATED: Final push to full night
      const factor = (normalizedTime - this.TIME_PHASES.RAPID_NIGHT_START) / (this.TIME_PHASES.RAPID_NIGHT_END - this.TIME_PHASES.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      return 0.95 + 0.05 * exponentialFactor;
    } else {
      // UPDATED: Full night
      return 1.0;
    }
  }
  
  private getSynchronizedLightColorForTime(time: number): THREE.Color {
    const normalizedTime = time % 1;
    
    // Define key light colors
    const nightColor = new THREE.Color(0x4169E1);       // Cool night blue
    const dawnColor = new THREE.Color(0xFFF4E6);        // Warm dawn light
    const noonColor = new THREE.Color(0xFFFAF0);        // Bright white light
    const sunsetColor = new THREE.Color(0xFFE4B5);      // Warm sunset light
    const duskColor = new THREE.Color(0x6A5ACD);        // Purple dusk light
    const rapidNightColor = new THREE.Color(0x2F4F4F);  // NEW: Dark slate for rapid transition
    
    if (normalizedTime >= this.TIME_PHASES.DEEP_NIGHT_START && normalizedTime <= this.TIME_PHASES.DEEP_NIGHT_END) {
      return nightColor;
    } else if (normalizedTime >= this.TIME_PHASES.DAWN_START && normalizedTime <= this.TIME_PHASES.DAWN_END) {
      const factor = (normalizedTime - this.TIME_PHASES.DAWN_START) / (this.TIME_PHASES.DAWN_END - this.TIME_PHASES.DAWN_START);
      return this.lerpColor(nightColor, dawnColor, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= this.TIME_PHASES.DAY_START && normalizedTime <= this.TIME_PHASES.DAY_END) {
      const factor = (normalizedTime - this.TIME_PHASES.DAY_START) / (this.TIME_PHASES.DAY_END - this.TIME_PHASES.DAY_START);
      return this.lerpColor(dawnColor, noonColor, Math.sin(factor * Math.PI * 0.5));
    } else if (normalizedTime >= this.TIME_PHASES.SUNSET_START && normalizedTime <= this.TIME_PHASES.SUNSET_END) {
      // UPDATED: Sunset light transition with exponential change
      const factor = (normalizedTime - this.TIME_PHASES.SUNSET_START) / (this.TIME_PHASES.SUNSET_END - this.TIME_PHASES.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      return this.lerpColor(noonColor, sunsetColor, exponentialFactor);
    } else if (normalizedTime >= this.TIME_PHASES.EVENING_START && normalizedTime <= this.TIME_PHASES.EVENING_END) {
      // UPDATED: Evening light transition
      const factor = (normalizedTime - this.TIME_PHASES.EVENING_START) / (this.TIME_PHASES.EVENING_END - this.TIME_PHASES.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      return this.lerpColor(sunsetColor, duskColor, exponentialFactor);
    } else if (normalizedTime >= this.TIME_PHASES.TWILIGHT_START && normalizedTime <= this.TIME_PHASES.TWILIGHT_END) {
      // UPDATED: Twilight light transition
      const factor = (normalizedTime - this.TIME_PHASES.TWILIGHT_START) / (this.TIME_PHASES.TWILIGHT_END - this.TIME_PHASES.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      return this.lerpColor(duskColor, rapidNightColor, exponentialFactor);
    } else if (normalizedTime >= this.TIME_PHASES.RAPID_NIGHT_START && normalizedTime <= this.TIME_PHASES.RAPID_NIGHT_END) {
      // UPDATED: Rapid night light transition to full night
      const factor = (normalizedTime - this.TIME_PHASES.RAPID_NIGHT_START) / (this.TIME_PHASES.RAPID_NIGHT_END - this.TIME_PHASES.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      return this.lerpColor(rapidNightColor, nightColor, exponentialFactor);
    } else {
      // UPDATED: Full night
      return nightColor;
    }
  }
  
  private create3DSunAndMoon(): void {
    // Create sun
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC,
      emissive: 0xFFD700,
      emissiveIntensity: 0.2, // Reduced from 0.5 to 0.2
      fog: false
    });
    
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Add much more subtle sun glow effect
    const sunGlowGeometry = new THREE.SphereGeometry(8.5, 16, 16); // Reduced from 9 to 8.5
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFAA,
      transparent: true,
      opacity: 0.08, // Reduced from 0.15 to 0.08
      fog: false
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    this.sun.add(sunGlow);
    
    this.scene.add(this.sun);
    
    // NEW: Create moon
    const moonGeometry = new THREE.SphereGeometry(6, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC,
      emissive: 0x444444,
      emissiveIntensity: 0.1,
      fog: false
    });
    
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Add subtle moon glow
    const moonGlowGeometry = new THREE.SphereGeometry(9, 16, 16);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xB0C4DE,
      transparent: true,
      opacity: 0.2,
      fog: false
    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    this.moon.add(moonGlow);
    
    this.scene.add(this.moon);
    
    // Initial positioning
    this.updateSunAndMoonPositions();
    
    console.log("3D sun and moon created with significantly reduced sun glow effect");
  }
  
  // NEW: Create star field for night sky
  private createStarField(): void {
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    
    // Generate random star positions on a sphere
    for (let i = 0; i < starCount; i++) {
      const radius = 300;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      
      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.sin(phi);
      
      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = Math.abs(y);
      starPositions[i * 3 + 2] = z;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 2,
      transparent: true,
      opacity: 0.8,
      fog: false
    });
    
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
    
    console.log("Star field created with", starCount, "stars");
  }
  
  // NEW: Update sun and moon positions based on time of day
  private updateSunAndMoonPositions(): void {
    if (!this.sun || !this.moon) return;
    
    // Convert time of day to angle (0 = midnight, 0.5 = noon)
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const moonAngle = sunAngle + Math.PI;
    
    // Calculate sun position (rises in east +X, sets in west -X)
    const sunHeight = Math.sin(sunAngle) * this.sunRadius;
    const sunX = Math.cos(sunAngle) * this.sunRadius;
    const sunY = Math.max(sunHeight, -50);
    
    this.sun.position.set(sunX, sunY, 0);
    
    // Calculate moon position (opposite to sun)
    const moonHeight = Math.sin(moonAngle) * this.moonRadius;
    const moonX = Math.cos(moonAngle) * this.moonRadius;
    const moonY = Math.max(moonHeight, -50);
    
    this.moon.position.set(moonX, moonY, 0);
    
    // Update directional lights to follow sun and moon
    this.directionalLight.position.copy(this.sun.position);
    this.moonLight.position.copy(this.moon.position);
    
    // Update light targets
    if (!this.directionalLight.target) {
      this.directionalLight.target = new THREE.Object3D();
      this.scene.add(this.directionalLight.target);
    }
    if (!this.moonLight.target) {
      this.moonLight.target = new THREE.Object3D();
      this.scene.add(this.moonLight.target);
    }
    
    this.directionalLight.target.position.set(0, 0, 0);
    this.moonLight.target.position.set(0, 0, 0);
    
    // REALISTIC: Sun shadows only when sun is above horizon
    const sunIntensity = Math.max(0, Math.sin(sunAngle)) * 1.2;
    this.directionalLight.intensity = sunIntensity;
    this.directionalLight.castShadow = sunY > 0; // Only cast shadows when sun is visible
    
    // REALISTIC: Reduced moon intensity with elevation variation
    const moonIntensity = Math.max(0, Math.sin(moonAngle)) * 0.12; // Reduced from 0.3 to 0.12
    this.moonLight.intensity = moonIntensity;
    
    // Update sun and moon visibility
    this.sun.visible = sunY > -10;
    this.moon.visible = moonY > -10;
  }
  
  // NEW: Update star visibility based on time of day
  private updateStarVisibility(): void {
    if (!this.stars) return;
    
    // Stars are visible during night (when sun is down)
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const starOpacity = Math.max(0, -Math.sin(sunAngle)) * 0.8;
    
    (this.stars.material as THREE.PointsMaterial).opacity = starOpacity;
  }
  
  // UPDATED: Synchronized skybox with updated time phases
  private createDayNightSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        timeOfDay: { value: this.timeOfDay },
        sunPosition: { value: new THREE.Vector3() },
        moonElevation: { value: 0.0 }  // NEW: Moon elevation for night darkness
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDirection = normalize(worldPosition.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float timeOfDay;
        uniform vec3 sunPosition;
        uniform float moonElevation;
        
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        vec3 lerpColor(vec3 a, vec3 b, float factor) {
          return mix(a, b, clamp(factor, 0.0, 1.0));
        }
        
        // NEW: Exponential decay function for aggressive color transitions
        float exponentialDecay(float factor, float intensity) {
          return pow(clamp(factor, 0.0, 1.0), intensity);
        }
        
        // UPDATED: Updated atmospheric scattering with new time phases
        vec3 getAtmosphericColor(vec3 direction, vec3 sunDir, float timeNormalized, float moonElev) {
          float height = direction.y;
          float sunDot = dot(direction, normalize(sunDir));
          
          // Define atmospheric color zones with new transition phases
          vec3 deepNightZenith = vec3(0.001, 0.001, 0.015);
          vec3 lightNightZenith = vec3(0.005, 0.005, 0.035);
          vec3 zenithDawn = vec3(0.3, 0.5, 0.8);
          vec3 zenithDay = vec3(0.1, 0.35, 0.75);
          vec3 zenithSunset = vec3(0.6, 0.4, 0.8);
          vec3 zenithDusk = vec3(0.2, 0.1, 0.4);        // NEW: Dusk zenith
          vec3 zenithRapidNight = vec3(0.02, 0.02, 0.1); // NEW: Rapid night zenith
          
          vec3 deepNightHorizon = vec3(0.005, 0.005, 0.04);
          vec3 lightNightHorizon = vec3(0.015, 0.015, 0.08);
          vec3 horizonDawn = vec3(1.0, 0.6, 0.3);
          vec3 horizonDay = vec3(0.6, 0.8, 0.95);
          vec3 horizonSunset = vec3(1.0, 0.4, 0.1);
          vec3 horizonDusk = vec3(0.8, 0.3, 0.2);       // NEW: Dusk horizon
          vec3 horizonRapidNight = vec3(0.1, 0.05, 0.2); // NEW: Rapid night horizon
          
          vec3 zenithColor, horizonColor;
          
          // Calculate night colors based on moon elevation
          vec3 nightZenith = lerpColor(lightNightZenith, deepNightZenith, moonElev);
          vec3 nightHorizon = lerpColor(lightNightHorizon, deepNightHorizon, moonElev);
          
          // UPDATED: Updated time phases for 15% transition
          if (timeNormalized <= 0.15) {
            // Deep night (0.0 - 0.15)
            zenithColor = nightZenith;
            horizonColor = nightHorizon;
          } else if (timeNormalized <= 0.25) {
            // Dawn transition (0.15 - 0.25)
            float factor = smoothstep(0.15, 0.25, timeNormalized);
            zenithColor = lerpColor(nightZenith, zenithDawn, factor);
            horizonColor = lerpColor(nightHorizon, horizonDawn, factor);
          } else if (timeNormalized <= 0.75) {
            // Day period (0.25 - 0.75)
            float factor = smoothstep(0.25, 0.75, timeNormalized);
            zenithColor = lerpColor(zenithDawn, zenithDay, factor);
            horizonColor = lerpColor(horizonDawn, horizonDay, factor);
          } else if (timeNormalized <= 0.7875) {
            // UPDATED: Sunset (0.75 - 0.7875) with exponential decay
            float factor = (timeNormalized - 0.75) / 0.0375;
            float expFactor = exponentialDecay(factor, 2.0);
            zenithColor = lerpColor(zenithDay, zenithSunset, expFactor);
            horizonColor = lerpColor(horizonDay, horizonSunset, expFactor);
          } else if (timeNormalized <= 0.825) {
            // UPDATED: Evening (0.7875 - 0.825) with aggressive decay
            float factor = (timeNormalized - 0.7875) / 0.0375;
            float expFactor = exponentialDecay(factor, 3.0);
            zenithColor = lerpColor(zenithSunset, zenithDusk, expFactor);
            horizonColor = lerpColor(horizonSunset, horizonDusk, expFactor);
          } else if (timeNormalized <= 0.8625) {
            // UPDATED: Twilight (0.825 - 0.8625) with very aggressive decay
            float factor = (timeNormalized - 0.825) / 0.0375;
            float expFactor = exponentialDecay(factor, 4.0);
            zenithColor = lerpColor(zenithDusk, zenithRapidNight, expFactor);
            horizonColor = lerpColor(horizonDusk, horizonRapidNight, expFactor);
          } else if (timeNormalized <= 0.9) {
            // UPDATED: Rapid night (0.8625 - 0.9) with extreme decay
            float factor = (timeNormalized - 0.8625) / 0.0375;
            float expFactor = exponentialDecay(factor, 5.0);
            zenithColor = lerpColor(zenithRapidNight, nightZenith, expFactor);
            horizonColor = lerpColor(horizonRapidNight, nightHorizon, expFactor);
          } else {
            // UPDATED: Deep night (0.9 - 1.0)
            zenithColor = nightZenith;
            horizonColor = nightHorizon;
          }
          
          // Create vertical atmospheric gradient
          float heightFactor = (height + 1.0) * 0.5;
          heightFactor = pow(heightFactor, 0.6);
          
          vec3 baseAtmosphereColor = lerpColor(horizonColor, zenithColor, heightFactor);
          
          // Sun glow effect
          float sunInfluence = 0.0;
          if (sunDir.y > -0.2) {
            float sunDistance = 1.0 - sunDot;
            
            float innerGlow = pow(max(0.0, 1.0 - sunDistance * 8.0), 4.0);
            float middleGlow = pow(max(0.0, 1.0 - sunDistance * 4.0), 6.0);
            float outerGlow = pow(max(0.0, 1.0 - sunDistance * 2.0), 8.0);
            
            sunInfluence = innerGlow * 0.8 + middleGlow * 0.5 + outerGlow * 0.2;
            sunInfluence *= max(0.0, (sunDir.y + 0.2) / 1.2);
          }
          
          vec3 sunGlowColor = vec3(1.0, 0.9, 0.6);
          if (timeNormalized > 0.75 && timeNormalized < 0.9) {
            // UPDATED: Sunset glow color transition for new phases
            float sunsetFactor = (timeNormalized - 0.75) / 0.15;
            float expSunsetFactor = exponentialDecay(sunsetFactor, 3.0);
            sunGlowColor = lerpColor(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.6, 0.3), expSunsetFactor);
          }
          
          vec3 finalColor = lerpColor(baseAtmosphereColor, sunGlowColor, sunInfluence * 0.6);
          
          // Add stars during night with moon elevation consideration
          if (timeNormalized < 0.25 || timeNormalized > 0.9) {
            float starField = fract(sin(dot(direction.xz * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
            if (starField > 0.999 && direction.y > 0.3) {
              float nightFactor = 1.0;
              if (timeNormalized < 0.25) {
                nightFactor = 1.0 - (timeNormalized / 0.25);
              } else {
                nightFactor = (timeNormalized - 0.9) / 0.1;
              }
              // Stars more visible when moon is high
              float starIntensity = 0.3 + 0.4 * moonElev;
              finalColor += vec3(0.8, 0.8, 1.0) * starIntensity * nightFactor;
            }
          }
          
          return finalColor;
        }
        
        void main() {
          vec3 direction = normalize(vDirection);
          vec3 sunDir = normalize(sunPosition);
          float normalizedTime = mod(timeOfDay, 1.0);
          
          vec3 skyColor = getAtmosphericColor(direction, sunDir, normalizedTime, moonElevation);
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      fog: false
    });
    
    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skybox);
    console.log('Atmospheric gradient skybox created with 15% sunset-to-night transition (9 seconds)');
  }
  
  private updateDayNightSkybox(): void {
    if (!this.skybox || !this.skybox.material) return;
    
    const material = this.skybox.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      material.uniforms.timeOfDay.value = this.timeOfDay;
      material.uniforms.moonElevation.value = this.getMoonElevationFactor();
      
      // FIXED: Calculate sun direction relative to camera position
      if (this.sun && this.camera) {
        const sunDirection = new THREE.Vector3();
        sunDirection.subVectors(this.sun.position, this.camera.position);
        sunDirection.normalize();
        
        material.uniforms.sunPosition.value.copy(sunDirection);
        console.log("☀️ [SceneManager] Sun direction updated relative to camera:", sunDirection);
      } else if (this.sun) {
        // Fallback to world position if camera not available
        material.uniforms.sunPosition.value.copy(this.sun.position);
      }
      
      material.needsUpdate = true;
    }
  }

  // NEW: Enemy spawning methods that GameEngine expects
  public initializeEnemySpawning(effectsManager: EffectsManager, audioManager: AudioManager): void {
    if (!this.enemySpawningSystem) {
      this.enemySpawningSystem = new DynamicEnemySpawningSystem(
        this.scene,
        effectsManager,
        audioManager
      );
      console.log("Enemy spawning system initialized");
    }
  }
  
  public startEnemySpawning(playerPosition: THREE.Vector3): void {
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.initialize(playerPosition);
      console.log("Enemy spawning started at player position:", playerPosition);
    }
  }
  
  public getEnemies(): Enemy[] {
    if (this.enemySpawningSystem) {
      return this.enemySpawningSystem.getEnemies();
    }
    return [];
  }
  
  public updateDistanceFog(playerPosition: THREE.Vector3): void {
    this.lastPlayerPosition.copy(playerPosition);
    this.updateShadowCamera(playerPosition);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // UPDATED: Synchronized day/night cycle with moon-based lighting
    if (this.dayNightCycleEnabled) {
      this.timeOfDay += deltaTime * this.dayNightCycleSpeed;
      if (this.timeOfDay >= 1.0) {
        this.timeOfDay -= 1.0;
      }
      
      // Update sun and moon positions
      this.updateSunAndMoonPositions();
      
      // Update lighting based on time with synchronized transitions
      this.updateSynchronizedDayNightLighting();
      
      // Update skybox
      this.updateDayNightSkybox();
      
      // Update star visibility
      this.updateStarVisibility();
      
      // Update fog color with synchronized system
      this.updateSynchronizedFogForTime();
    }
    
    // Update cloud spawning system
    if (this.cloudSpawningSystem && playerPosition) {
      this.cloudSpawningSystem.update(deltaTime, playerPosition);
    } else if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.update(deltaTime);
    }
    
    // Update enemy spawning system
    if (this.enemySpawningSystem && playerPosition) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
    }
    
    // Update shadow camera based on player position
    if (playerPosition) {
      this.updateShadowCamera(playerPosition);
    }
    
    // Manage region loading/unloading
    if (playerPosition) {
      const activeRegions = this.ringSystem.getActiveRegions(playerPosition, this.renderDistance);
      const activeRegionKeys = new Set<string>();
      
      for (const region of activeRegions) {
        const regionKey = this.ringSystem.getRegionKey(region);
        activeRegionKeys.add(regionKey);
        
        if (!this.loadedRegions.has(regionKey)) {
          this.loadRegion(region);
        }
      }
      
      for (const [regionKey, region] of this.loadedRegions.entries()) {
        if (!activeRegionKeys.has(regionKey)) {
          this.unloadRegion(region.coordinates);
        }
      }
    }
    
    if (playerPosition) {
      this.lastPlayerPosition.copy(playerPosition);
    }
    
    // Update volumetric fog system
    if (this.volumetricFogSystem && playerPosition) {
      this.volumetricFogSystem.update(deltaTime, this.timeOfDay, playerPosition);
    }
  }
  
  // UPDATED: Simplified lighting transitions without fill and rim lights
  private updateSynchronizedDayNightLighting(): void {
    // Update ambient light intensity with enhanced compensation
    this.ambientLight.intensity = this.getSynchronizedAmbientIntensityForTime(this.timeOfDay) * 1.5;
    
    // DISABLED: Fill and rim lights are permanently off - no updates needed
    // this.fillLight.intensity = 0.0; // Always disabled
    // this.rimLight.intensity = 0.0; // Always disabled
    
    // Update tavern light intensity with enhanced nighttime prominence
    const moonElevation = this.getMoonElevationFactor();
    const nightFactor = this.getSynchronizedNightFactor(this.timeOfDay);
    
    // REALISTIC: Tavern light becomes primary light source at night
    this.tavernLight.intensity = 0.6 + (1.2 * nightFactor) + (0.4 * moonElevation * nightFactor);
    
    // Update directional light color with synchronized transitions
    const lightColor = this.getSynchronizedLightColorForTime(this.timeOfDay);
    this.directionalLight.color.copy(lightColor);
    
    // REALISTIC: Enhanced moon light color temperature
    this.moonLight.color.setHex(0x4169E1); // Cool blue moonlight
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
    
    console.log("SceneManager with enhanced lighting (no beam lights) disposed");
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
